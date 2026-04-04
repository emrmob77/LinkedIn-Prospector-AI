import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post, Lead, LeadSource } from '@/types/models';
import type { PipelineStage } from '@/types/enums';

// ============================================
// Tipler
// ============================================

export interface LeadExtractionResult {
  created: number;
  updated: number;
  skipped: number;
}

interface LeadInsertData {
  user_id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedin_url: string;
  stage: PipelineStage;
  score: number;
  score_breakdown: null;
  pain_points: string[];
  key_interests: string[];
  first_post_id: string;
  post_count: number;
  is_active: boolean;
  source: LeadSource;
  profile_picture: string | null;
}

// ============================================
// Varsayilan degerler
// ============================================

const DEFAULT_STAGE: PipelineStage = 'İletişim Kurulacak';
const DEFAULT_SOURCE: LeadSource = 'post_author';

// ============================================
// Yardimci fonksiyonlar
// ============================================

/**
 * Post'un lead olarak cikarilabilir olup olmadigini kontrol eder.
 * authorLinkedinUrl bos veya gecersiz olan postlari atlar.
 */
/**
 * Çöp veri içeren title/company alanlarını temizler.
 * LinkedIn parser bazen "• 2.", "Web sitesini ziyaret edin", "4 ay • Düzenlendi •" gibi
 * değerler çıkarıyor — bunları null'a çevirir.
 */
function sanitizeField(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 3) return null;
  // Çöp pattern'ları
  const garbagePatterns = [
    /^•\s*\d/,                    // "• 2.", "• 3.+"
    /^\d+\s*(ay|gün|saat|dk)/i,   // "4 ay • Düzenlendi"
    /^web sitesini/i,              // "Web sitesini ziyaret edin"
    /düzenlendi/i,                 // "Düzenlendi •"
    /^takip/i,                     // "Takip et"
    /^bağlantı/i,                  // "Bağlantı kur"
  ];
  for (const pattern of garbagePatterns) {
    if (pattern.test(trimmed)) return null;
  }
  return trimmed;
}

function isExtractablePost(post: Post): boolean {
  if (!post.isRelevant) return false;
  if (!post.authorLinkedinUrl || post.authorLinkedinUrl.trim() === '') return false;
  if (!post.authorName || post.authorName.trim() === '') return false;
  return true;
}

// ============================================
// Deduplication
// ============================================

/**
 * Ayni linkedin_url + user_id kombinasyonuna sahip mevcut bir lead arar.
 * RLS sayesinde sadece ilgili kullanicinin lead'leri doner.
 */
export async function checkDuplicateLead(
  authorLinkedinUrl: string,
  userId: string,
  supabase: SupabaseClient
): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('linkedin_url', authorLinkedinUrl)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    // DB satirini Lead tipine donustur
    const lead: Lead = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      title: data.title,
      company: data.company,
      linkedinUrl: data.linkedin_url,
      stage: data.stage,
      score: Number(data.score),
      scoreBreakdown: data.score_breakdown,
      painPoints: data.pain_points || [],
      keyInterests: data.key_interests || [],
      firstPostId: data.first_post_id,
      postCount: data.post_count || 1,
      isActive: data.is_active ?? true,
      source: data.source || DEFAULT_SOURCE,
      profilePicture: data.profile_picture || null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      archivedAt: data.archived_at ? new Date(data.archived_at) : null,
    };

    return lead;
  } catch (error) {
    console.error('Duplicate lead kontrolu hatasi:', error, { authorLinkedinUrl });
    return null;
  }
}

// ============================================
// Tek post'tan lead cikarma
// ============================================

/**
 * Tek bir post'tan lead bilgisi cikarir.
 * - Duplicate varsa: mevcut lead'e yeni post'u baglar, post_count arttirir
 * - Duplicate yoksa: yeni lead olusturur ve lead_posts'a ekler
 *
 * Dondurulen deger: 'created' | 'updated' | 'skipped'
 */
export async function extractLeadFromPost(
  post: Post,
  supabase: SupabaseClient,
  userId: string
): Promise<'created' | 'updated' | 'skipped'> {
  // Cikarilabilirlik kontrolu
  if (!isExtractablePost(post)) {
    return 'skipped';
  }

  try {
    // Duplicate kontrolu
    const existingLead = await checkDuplicateLead(post.authorLinkedinUrl, userId, supabase);

    if (existingLead) {
      // --- Mevcut lead'i guncelle ---

      // lead_posts baglantisini ekle (duplicate ise hata vermez, PRIMARY KEY var)
      const { error: linkError } = await supabase
        .from('lead_posts')
        .upsert(
          { lead_id: existingLead.id, post_id: post.id },
          { onConflict: 'lead_id,post_id' }
        );

      if (linkError) {
        console.error('lead_posts baglantisi eklenemedi:', linkError, {
          leadId: existingLead.id,
          postId: post.id,
        });
      }

      // post_count artir
      const newPostCount = (existingLead.postCount || 1) + 1;

      const updatePayload: Record<string, unknown> = {
        post_count: newPostCount,
      };

      // Title veya company bilgisi eksikse ve yeni post'ta varsa guncelle
      if (!existingLead.title && post.authorTitle) {
        updatePayload.title = post.authorTitle;
      }
      if (!existingLead.company && post.authorCompany) {
        updatePayload.company = post.authorCompany;
      }

      // Profile picture eksikse guncelle
      if (!existingLead.profilePicture && post.authorProfilePicture) {
        updatePayload.profile_picture = post.authorProfilePicture;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Lead guncelleme hatasi:', updateError, { leadId: existingLead.id });
      }

      return 'updated';
    }

    // --- Yeni lead olustur ---
    // Çöp title/company verilerini temizle
    const cleanTitle = sanitizeField(post.authorTitle);
    const cleanCompany = sanitizeField(post.authorCompany);
    const cleanName = post.authorName.replace(/(.+)\s+\1/, '$1').trim(); // duplicate isim temizle

    const insertData: LeadInsertData = {
      user_id: userId,
      name: cleanName,
      title: cleanTitle,
      company: cleanCompany,
      linkedin_url: post.authorLinkedinUrl,
      stage: DEFAULT_STAGE,
      score: 0,
      score_breakdown: null,
      pain_points: [],
      key_interests: [],
      first_post_id: post.id,
      post_count: 1,
      is_active: true,
      source: DEFAULT_SOURCE,
      profile_picture: post.authorProfilePicture || null,
    };

    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert(insertData)
      .select('id')
      .single();

    if (insertError) {
      // UNIQUE constraint violation — baska bir islem ayni anda eklemis olabilir
      if (insertError.code === '23505') {
        console.warn('Lead zaten mevcut (concurrent insert):', post.authorLinkedinUrl);
        return 'skipped';
      }
      console.error('Lead olusturma hatasi:', insertError, { linkedinUrl: post.authorLinkedinUrl });
      return 'skipped';
    }

    if (!newLead) {
      console.error('Lead olusturuldu ancak ID donmedi');
      return 'skipped';
    }

    // lead_posts baglantisini ekle
    const { error: linkError } = await supabase
      .from('lead_posts')
      .insert({ lead_id: newLead.id, post_id: post.id });

    if (linkError) {
      console.error('lead_posts baglantisi eklenemedi (yeni lead):', linkError, {
        leadId: newLead.id,
        postId: post.id,
      });
    }

    // Activity log — lead_created
    await supabase
      .from('activity_logs')
      .insert({
        action_type: 'lead_created',
        user_id: userId,
        entity_type: 'lead',
        entity_id: newLead.id,
        details: {
          name: post.authorName,
          source: DEFAULT_SOURCE,
          from_post_id: post.id,
        },
      })
      .then(({ error }) => {
        if (error) {
          console.error('Activity log kaydi hatasi:', error);
        }
      });

    return 'created';
  } catch (error) {
    console.error('extractLeadFromPost beklenmeyen hata:', error, { postId: post.id });
    return 'skipped';
  }
}

// ============================================
// Toplu lead cikarma
// ============================================

/**
 * Birden fazla post'u sirayla isler.
 * Sadece is_relevant === true olan postlardan lead cikarir.
 *
 * @returns Olusturulan, guncellenen ve atlanan lead sayilari
 */
export async function extractLeadsBatch(
  posts: Post[],
  supabase: SupabaseClient,
  userId: string
): Promise<LeadExtractionResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    const result = await extractLeadFromPost(post, supabase, userId);

    switch (result) {
      case 'created':
        created++;
        break;
      case 'updated':
        updated++;
        break;
      case 'skipped':
        skipped++;
        break;
    }
  }

  return { created, updated, skipped };
}

/**
 * Post listesinden sadece relevant olanlari filtreler.
 * Classify route'tan gelen tum postlari surarak ilgili olanlari dondurur.
 */
export function filterRelevantPosts(posts: Post[]): Post[] {
  return posts.filter((post) => isExtractablePost(post));
}
