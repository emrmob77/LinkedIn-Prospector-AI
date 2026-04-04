import type { AIClient } from '@/lib/ai-client';
import { DEFAULT_MODELS } from '@/lib/ai-client';
import type { Post, Lead } from '@/types/models';
import type { AIClassification, LeadScore, MessageDraft } from '@/types/services';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Sabitler
// ============================================

const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
const DEFAULT_TEMPERATURE = 0.3;
const BATCH_DELAY_MS = 500;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

// ============================================
// Firma bağlamı (Yapılandırma sayfasından gelir)
// ============================================

export interface BusinessContext {
  classificationPrompt: string;
  companyContext: string;
  messagePrompt: string;
  aiTemperature?: number;
}

const DEFAULT_CONTEXT: BusinessContext = {
  classificationPrompt: 'Kurumsal hediye, promosyon ürünleri, çalışan motivasyonu, etkinlik organizasyonu ile ilgili postları ilgili olarak işaretle. B2B hediye alımı sinyallerini ve rakip firma aktivitelerini de yakala.',
  companyContext: 'Kurumsal hediye ve promosyon sektöründe faaliyet gösteren bir firmayız. Ürünlerimiz: kurumsal hediyeler, promosyon ürünleri, çalışan motivasyon paketleri. Hedef müşterilerimiz: B2B firmalar, İK departmanları, pazarlama ekipleri.',
  messagePrompt: 'Samimi ve profesyonel ton kullan. Satış baskısı yapma, değer önerisi sun. Kişinin paylaşımını referans al. Türkçe yaz.',
};

// ============================================
// Dinamik prompt oluşturucular
// ============================================

function buildClassificationSystemPrompt(ctx: BusinessContext): string {
  return `Sen bir LinkedIn gönderi analistisin. Gönderileri analiz ederek potansiyel müşteri adaylarını belirle.

Firma bağlamı:
${ctx.companyContext}

Sınıflandırma talimatı:
${ctx.classificationPrompt}

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "isRelevant": boolean,
  "confidence": number (0-100),
  "theme": string,
  "giftType": string | null,
  "competitor": string | null,
  "reasoning": string
}

isRelevant: Gönderi talimattaki kriterlere uyuyorsa true
confidence: Ne kadar emin olduğun (0-100)
theme: Ana tema (sektöre uygun kısa açıklama)
giftType: Spesifik ürün/hizmet türü varsa, yoksa null
competitor: Rakip firma adı görüyorsan, yoksa null
reasoning: 1-2 cümlelik Türkçe açıklama`;
}

function buildScoringSystemPrompt(ctx: BusinessContext): string {
  return `Sen bir B2B satış analistisin. Verilen lead bilgilerini değerlendir ve kalite puanı hesapla.

Firma bağlamı:
${ctx.companyContext}

Yanıtını SADECE aşağıdaki JSON formatında ver:
{
  "total": number (0-100),
  "breakdown": {
    "companySize": number (0-30),
    "projectClarity": number (0-25),
    "industryFit": number (0-20),
    "timing": number (0-15),
    "competitorStatus": number (0-10)
  }
}

Puanlama kriterleri:
- companySize (0-30): Büyük/orta ölçekli firmalar daha yüksek puan
- projectClarity (0-25): Net bir proje/ihtiyaç belirtmişse yüksek puan
- industryFit (0-20): Firma sektörüne uygunluk
- timing (0-15): Acil/yakın zamanlı ihtiyaç sinyalleri
- competitorStatus (0-10): Rakip kullanmıyorsa veya memnun değilse yüksek puan`;
}

function buildMessageSystemPrompt(ctx: BusinessContext): string {
  return `Sen bir satış uzmanısın. Kişiselleştirilmiş iletişim mesajları oluştur.

Firma bağlamı:
${ctx.companyContext}

Mesaj talimatı:
${ctx.messagePrompt}

Yanıtını SADECE aşağıdaki JSON formatında ver:
{
  "subject": string,
  "dmVersion": string,
  "emailVersion": string
}

Kurallar:
- dmVersion: LinkedIn DM için kısa (3-4 cümle)
- emailVersion: E-posta için detaylı (5-6 cümle)
- subject: E-posta konu satırı
- Kişinin adını, şirketini ve paylaşımını referans al`;
}

// ============================================
// Yardımcı fonksiyonlar
// ============================================

/**
 * Claude API'ye istek gonderir. Rate limit (429) durumunda retry yapar.
 */
async function callAI(
  client: AIClient,
  systemPrompt: string,
  userPrompt: string,
  temperature = DEFAULT_TEMPERATURE,
  retryCount = 0
): Promise<string> {
  try {
    const defaultModel = DEFAULT_MODELS[client.provider] || AI_MODEL;
    const result = await client.chat({
      model: client.model || defaultModel,
      maxTokens: 1024,
      temperature,
      systemPrompt,
      userMessage: userPrompt,
    });
    return result.text;
  } catch (error: unknown) {
    const isRateLimit =
      error instanceof Error &&
      ('status' in error && (error as { status: number }).status === 429);

    if (isRateLimit && retryCount < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
      console.warn(`Rate limit, ${delay}ms sonra tekrar deneniyor (deneme ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return callAI(client, systemPrompt, userPrompt, temperature, retryCount + 1);
    }

    throw error;
  }
}

/**
 * JSON string'i parse eder. Markdown code block icindeyse temizler.
 */
function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();
  // Markdown code block temizle
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  // JSON bloğunu bul (bazen AI önüne/arkasına metin ekliyor)
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('AI yanıtı JSON parse edilemedi:', text.slice(0, 200));
    throw new Error('AI yanıtı geçerli JSON formatında değil');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Ana fonksiyonlar
// ============================================

/**
 * Tek bir post'u Claude API ile siniflandirir.
 */
export async function classifyPost(post: Post, client: AIClient, ctx: BusinessContext = DEFAULT_CONTEXT): Promise<AIClassification> {
  try {
    const userPrompt = buildClassificationPrompt(post);
    const responseText = await callAI(client, buildClassificationSystemPrompt(ctx), userPrompt, ctx.aiTemperature);
    const result = parseJsonResponse<AIClassification>(responseText);

    // Validasyon
    return {
      isRelevant: Boolean(result.isRelevant),
      confidence: Math.min(100, Math.max(0, Number(result.confidence) || 0)),
      theme: result.theme || 'bilinmiyor',
      giftType: result.giftType || undefined,
      competitor: result.competitor || undefined,
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error('Post siniflandirma hatasi:', error, { postId: post.id });
    // Hata durumunda null döndür — post sınıflandırılmamış kalır, tekrar denenebilir
    throw error;
  }
}

/**
 * Lead bilgilerine gore kalite puani hesaplar.
 */
export async function scoreLead(lead: Lead, client: AIClient, ctx: BusinessContext = DEFAULT_CONTEXT): Promise<LeadScore> {
  try {
    const userPrompt = buildScoringPrompt(lead);
    const responseText = await callAI(client, buildScoringSystemPrompt(ctx), userPrompt, ctx.aiTemperature);
    const result = parseJsonResponse<LeadScore>(responseText);

    // Breakdown degerlerini sinirlara oturt
    const breakdown = {
      companySize: Math.min(30, Math.max(0, Number(result.breakdown?.companySize) || 0)),
      projectClarity: Math.min(25, Math.max(0, Number(result.breakdown?.projectClarity) || 0)),
      industryFit: Math.min(20, Math.max(0, Number(result.breakdown?.industryFit) || 0)),
      timing: Math.min(15, Math.max(0, Number(result.breakdown?.timing) || 0)),
      competitorStatus: Math.min(10, Math.max(0, Number(result.breakdown?.competitorStatus) || 0)),
    };

    const total = breakdown.companySize + breakdown.projectClarity + breakdown.industryFit + breakdown.timing + breakdown.competitorStatus;

    return { total, breakdown };
  } catch (error) {
    console.error('Lead puanlama hatasi:', error, { leadId: lead.id });
    return {
      total: 0,
      breakdown: {
        companySize: 0,
        projectClarity: 0,
        industryFit: 0,
        timing: 0,
        competitorStatus: 0,
      },
    };
  }
}

/**
 * Lead ve post bilgilerine gore kisisellestirilmis mesaj olusturur.
 */
export async function generateMessage(lead: Lead, post: Post, client: AIClient, ctx: BusinessContext = DEFAULT_CONTEXT): Promise<MessageDraft> {
  try {
    const userPrompt = buildMessagePrompt(lead, post);
    const responseText = await callAI(client, buildMessageSystemPrompt(ctx), userPrompt, ctx.aiTemperature);
    const result = parseJsonResponse<{ subject: string; dmVersion: string; emailVersion: string }>(responseText);

    return {
      subject: result.subject || `${lead.name} - Kurumsal Hediye Cozumleri`,
      body: result.emailVersion || '',
      dmVersion: result.dmVersion || '',
      emailVersion: result.emailVersion || '',
    };
  } catch (error) {
    console.error('Mesaj olusturma hatasi:', error, { leadId: lead.id, postId: post.id });
    return {
      subject: `${lead.name} - Kurumsal Hediye Cozumleri`,
      body: '',
      dmVersion: '',
      emailVersion: '',
    };
  }
}

/**
 * Birden fazla post'u sirayla siniflandirir ve sonuclari DB'ye kaydeder.
 * Rate limit'e dikkat ederek her post arasinda bekleme yapar.
 */
export async function classifyPostsBatch(
  posts: Post[],
  supabase: SupabaseClient,
  client: AIClient,
  ctx: BusinessContext = DEFAULT_CONTEXT
): Promise<{ classified: number; relevant: number; irrelevant: number }> {
  let classified = 0;
  let relevant = 0;
  let irrelevant = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    try {
      const classification = await classifyPost(post, client, ctx);
      classified++;

      if (classification.isRelevant) {
        relevant++;
      } else {
        irrelevant++;
      }

      // Sonucu DB'ye kaydet
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          is_relevant: classification.isRelevant,
          relevance_confidence: classification.confidence,
          theme: classification.theme,
          gift_type: classification.giftType || null,
          competitor: classification.competitor || null,
          classification_reasoning: classification.reasoning,
          classified_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (updateError) {
        console.error('Post siniflandirma DB guncelleme hatasi:', updateError, { postId: post.id });
      }
    } catch (error) {
      console.error('Batch siniflandirma hatasi (post atlanıyor):', error, { postId: post.id });
    }

    // Son post degilse bekleme yap (rate limit korumasi)
    if (i < posts.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { classified, relevant, irrelevant };
}

// ============================================
// Prompt builder fonksiyonlari
// ============================================

function buildClassificationPrompt(post: Post): string {
  const parts: string[] = [
    '## LinkedIn Gonderisi Analizi',
    '',
    `**Yazar:** ${post.authorName}`,
  ];

  if (post.authorTitle) parts.push(`**Unvan:** ${post.authorTitle}`);
  if (post.authorCompany) parts.push(`**Sirket:** ${post.authorCompany}`);

  parts.push(`**Yazar Turu:** ${post.authorType}`);
  parts.push('');
  parts.push('**Gonderi Icerigi:**');
  parts.push(post.content || '(icerik yok)');
  parts.push('');
  parts.push('**Etkilesim:**');
  parts.push(`- Begeni: ${post.engagementLikes}`);
  parts.push(`- Yorum: ${post.engagementComments}`);
  parts.push(`- Paylasim: ${post.engagementShares}`);

  if (post.publishedAt) {
    parts.push(`**Yayin Tarihi:** ${new Date(post.publishedAt).toLocaleDateString('tr-TR')}`);
  }

  return parts.join('\n');
}

function buildScoringPrompt(lead: Lead): string {
  const parts: string[] = [
    '## Lead Degerlendirmesi',
    '',
    `**Ad:** ${lead.name}`,
  ];

  if (lead.title) parts.push(`**Unvan:** ${lead.title}`);
  if (lead.company) parts.push(`**Sirket:** ${lead.company}`);

  parts.push(`**Kaynak:** ${lead.source}`);
  parts.push(`**Post Sayisi:** ${lead.postCount}`);

  if (lead.painPoints && lead.painPoints.length > 0) {
    parts.push(`**Sorun Alanlari:** ${lead.painPoints.join(', ')}`);
  }

  if (lead.keyInterests && lead.keyInterests.length > 0) {
    parts.push(`**Ilgi Alanlari:** ${lead.keyInterests.join(', ')}`);
  }

  return parts.join('\n');
}

function buildMessagePrompt(lead: Lead, post: Post): string {
  const parts: string[] = [
    '## Kisisellestirilmis Mesaj Olustur',
    '',
    '### Lead Bilgileri',
    `**Ad:** ${lead.name}`,
  ];

  if (lead.title) parts.push(`**Unvan:** ${lead.title}`);
  if (lead.company) parts.push(`**Sirket:** ${lead.company}`);

  if (lead.painPoints && lead.painPoints.length > 0) {
    parts.push(`**Sorun Alanlari:** ${lead.painPoints.join(', ')}`);
  }

  if (lead.keyInterests && lead.keyInterests.length > 0) {
    parts.push(`**Ilgi Alanlari:** ${lead.keyInterests.join(', ')}`);
  }

  parts.push('');
  parts.push('### Referans Gonderi');
  parts.push(`**Gonderi Icerigi:** ${post.content?.substring(0, 500) || '(icerik yok)'}`);

  if (post.authorCompany) {
    parts.push(`**Gonderi Yazarinin Sirketi:** ${post.authorCompany}`);
  }

  if (post.theme) {
    parts.push(`**Gonderi Temasi:** ${post.theme}`);
  }

  if (post.giftType) {
    parts.push(`**Hediye Turu:** ${post.giftType}`);
  }

  return parts.join('\n');
}
