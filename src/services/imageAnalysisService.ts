import type { AIClient, VisionImageInput } from '@/lib/ai-client';
import type { ImageAnalysisResult } from '@/types/models';
import type { AIProvider } from '@/types/models';

// Gorsel analiz icin vision destekli modeller (provider bazli)
const VISION_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash',
  openrouter: 'google/gemma-4-26b-a4b-it', // ucuz, vision destekli
};

// ============================================
// Görsel Analiz Servisi
// ============================================

interface CompanyContext {
  companyName: string;
  companySector: string;
  productDescription: string;
}

/**
 * LinkedIn CDN URL'sinden görseli fetch edip base64'e çevirir.
 */
export async function fetchImageAsBase64(
  imageUrl: string
): Promise<VisionImageInput> {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LinkedInProspector/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Görsel indirilemedi: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  // MIME type normalize
  let mimeType: VisionImageInput['mimeType'] = 'image/jpeg';
  if (contentType.includes('png')) mimeType = 'image/png';
  else if (contentType.includes('gif')) mimeType = 'image/gif';
  else if (contentType.includes('webp')) mimeType = 'image/webp';

  return { base64, mimeType };
}

/**
 * Firma bağlamını prompt'a ekleyerek görsel analiz yapar.
 * En fazla maxImages adet görsel analiz edilir (varsayılan 3).
 */
export async function analyzePostImages(
  aiClient: AIClient,
  imageUrls: string[],
  companyContext: CompanyContext,
  maxImages = 3
): Promise<ImageAnalysisResult> {
  const urls = imageUrls.slice(0, maxImages);

  // Görselleri paralel olarak indir
  const images = await Promise.all(
    urls.map((url) => fetchImageAsBase64(url))
  );

  const systemPrompt = buildSystemPrompt(companyContext);
  const userMessage = buildUserMessage(urls.length);

  // Kullanicinin sectiyi model vision desteklemeyebilir, vision model kullan
  const model = VISION_MODELS[aiClient.provider];

  const result = await aiClient.chatWithVision({
    model,
    maxTokens: 1500,
    temperature: 0.3,
    systemPrompt,
    userMessage,
    images,
  });

  return parseAnalysisResult(result.text);
}

function buildSystemPrompt(ctx: CompanyContext): string {
  return `Sen bir LinkedIn görsel analiz uzmanısın. Görevlerin:
1. Görseldeki ürünleri, markaları ve etkinlik türlerini tespit et.
2. Görselin kalitesini değerlendir.
3. Görselin aşağıdaki firma bağlamına uygunluğunu 0-100 arası puanla.

FIRMA BAĞLAMI:
- Firma Adı: ${ctx.companyName || 'Belirtilmemiş'}
- Sektör: ${ctx.companySector || 'Belirtilmemiş'}
- Ürün/Hizmet: ${ctx.productDescription || 'Belirtilmemiş'}

YANITINI SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma:
{
  "products": ["ürün1", "ürün2"],
  "brands": ["marka1", "marka2"],
  "eventType": "etkinlik türü veya null",
  "qualityAssessment": "kısa kalite değerlendirmesi",
  "relevanceScore": 75,
  "relevanceSummary": "kısa uygunluk açıklaması"
}

KURALLAR:
- products: Görselde görünen somut ürünler (boş array olabilir)
- brands: Görselde görünen veya tespit edilen markalar (boş array olabilir)
- eventType: Etkinlik türü (kutlama, lansman, toplantı, fuar, ödül töreni vb.) veya null
- qualityAssessment: "Yüksek", "Orta", "Düşük" + kısa açıklama
- relevanceScore: 0-100, firma sektörüne uygunluk
- relevanceSummary: 1-2 cümle Türkçe açıklama`;
}

function buildUserMessage(imageCount: number): string {
  if (imageCount === 1) {
    return 'Bu LinkedIn gönderisindeki görseli analiz et.';
  }
  return `Bu LinkedIn gönderisindeki ${imageCount} görseli birlikte analiz et.`;
}

function parseAnalysisResult(text: string): ImageAnalysisResult {
  // JSON bloğunu bul (```json ... ``` veya direkt JSON)
  let jsonStr = text;

  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  } else {
    // İlk { ile son } arasını al
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = text.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);

    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      brands: Array.isArray(parsed.brands) ? parsed.brands : [],
      eventType: parsed.eventType || null,
      qualityAssessment: parsed.qualityAssessment || 'Değerlendirilemedi',
      relevanceScore: typeof parsed.relevanceScore === 'number'
        ? Math.min(100, Math.max(0, parsed.relevanceScore))
        : 0,
      relevanceSummary: parsed.relevanceSummary || 'Analiz tamamlandı.',
    };
  } catch {
    // JSON parse edilemezse varsayılan sonuç dön
    return {
      products: [],
      brands: [],
      eventType: null,
      qualityAssessment: 'Değerlendirilemedi',
      relevanceScore: 0,
      relevanceSummary: 'Görsel analiz sonucu ayrıştırılamadı.',
    };
  }
}
