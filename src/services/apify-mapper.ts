import type { Post } from '@/types/models';
import type {
  ApifyPost,
  ApifyAuthor,
  LeadCandidate,
} from '@/types/apify';
import type { ValidationResult } from '@/types/services';

// ============================================
// Apify JSON → Post mapper
// ============================================

type MappedPost = Omit<Post, 'id' | 'searchRunId' | 'createdAt' | 'updatedAt' | 'scrapedAt'>;

/**
 * Apify supreme_coder/linkedin-post çıktısını Post tipine dönüştürür.
 */
export function mapApifyPost(raw: ApifyPost): MappedPost {
  const authorTitle = extractAuthorTitle(raw);
  const authorCompany = extractAuthorCompany(raw);

  return {
    content: raw.text || '',
    authorName: raw.authorName || '',
    authorTitle,
    authorCompany,
    authorLinkedinUrl: cleanUrl(raw.authorProfileUrl || ''),
    linkedinPostUrl: cleanUrl(raw.url || ''),
    engagementLikes: raw.numLikes ?? 0,
    engagementComments: raw.numComments ?? 0,
    engagementShares: raw.numShares ?? 0,
    publishedAt: new Date(raw.postedAtISO || raw.postedAtTimestamp),
    rawHtml: null,

    // Apify ek alanları
    authorProfilePicture: raw.authorProfilePicture || null,
    authorFollowersCount: raw.authorFollowersCount || null,
    authorType: raw.authorType === 'Company' ? 'Company' : 'Person',
    images: raw.images || [],
    linkedinUrn: raw.urn || null,
    rawJson: raw as unknown as Record<string, unknown>,

    // AI alanları — henüz sınıflandırılmadı
    isRelevant: null,
    relevanceConfidence: null,
    theme: null,
    giftType: null,
    competitor: null,
    classificationReasoning: null,
    classifiedAt: null,
  };
}

/**
 * Birden fazla Apify gönderisini toplu dönüştürür.
 * Opsiyonel dil filtresi ile sadece belirli dildeki gönderiler alınır.
 */
export function mapApifyPosts(rawPosts: ApifyPost[], languageFilter?: 'tr' | 'en' | 'all'): MappedPost[] {
  return rawPosts
    .filter((raw) => validateApifyPost(raw).isValid)
    .filter((raw) => {
      if (!languageFilter || languageFilter === 'all') return true;
      if (languageFilter === 'tr') return isTurkishContent(raw.text || '');
      if (languageFilter === 'en') return isEnglishContent(raw.text || '');
      return true;
    })
    .map(mapApifyPost);
}

/**
 * Türkçe içerik tespiti — Türkçe'ye özgü karakterler ve yaygın kelimeler.
 * Hem karakter hem kelime eşiği gerekir — tek başına Türkçe karakter yetmez.
 */
function isTurkishContent(text: string): boolean {
  if (!text || text.length < 30) return false;

  // Türkçe'ye özgü karakter sayısı (en az 3 tane)
  const turkishCharMatches = text.match(/[çğıöşüÇĞİÖŞÜ]/g);
  const turkishCharCount = turkishCharMatches ? turkishCharMatches.length : 0;

  // Yaygın Türkçe kelimeler
  const lower = text.toLowerCase();
  const turkishWords = [
    'bir ', 'için ', 'olan ', 'ile ', 'olarak ', 'değil', 'gibi ',
    'daha ', 'çok ', 'ancak', 'şirket', 'firma', 'çalışan',
    'müşteri', 'ürün', 'hizmet', 'proje', 'olarak', 'oldu',
    'yapı', 'konu', 'sonuç', 'devam', 'büyük', 'küçük',
    'yılı', 'günü', 'aras', 'hakkı', 'veril', 'sağl',
    'bugün', 'yarın', 'geçen', 'yeni ', 'eski ', 'kadar',
  ];
  const wordMatchCount = turkishWords.filter((w) => lower.includes(w)).length;

  // Arapça/Farsça karakter kontrolü — bunları kesin çıkar
  const arabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (arabicChars.test(text)) return false;

  // Kiril karakter kontrolü — Bulgarca vb. çıkar
  const cyrillicChars = /[\u0400-\u04FF]/;
  if (cyrillicChars.test(text)) return false;

  // En az 3 Türkçe karakter VEYA en az 3 Türkçe kelime eşleşmesi
  return turkishCharCount >= 3 || wordMatchCount >= 3;
}

function isEnglishContent(text: string): boolean {
  const lower = text.toLowerCase();
  const englishWords = [
    'the ', 'and ', 'for ', 'with', 'that', 'this', 'from',
    'have', 'will', 'been', 'about', 'would', 'their',
  ];
  const matchCount = englishWords.filter((w) => lower.includes(w)).length;
  return matchCount >= 2;
}

// ============================================
// Lead adayı çıkarma
// ============================================

/**
 * Bir Apify gönderisinden tüm lead adaylarını çıkarır:
 * - Gönderi yazarı (Person tipindeyse)
 * - Yorumcular
 * - Beğenenler
 */
export function extractLeadCandidates(raw: ApifyPost): LeadCandidate[] {
  const candidates: LeadCandidate[] = [];
  const seen = new Set<string>();

  // 1. Gönderi yazarı (sadece Person)
  if (raw.authorType === 'Person') {
    const url = cleanUrl(raw.authorProfileUrl || '');
    if (url && !seen.has(url)) {
      seen.add(url);
      candidates.push({
        name: raw.authorName || '',
        title: extractAuthorTitle(raw) || '',
        linkedinUrl: url,
        profilePicture: raw.authorProfilePicture || null,
        source: 'post_author',
        sourcePostUrn: raw.urn,
      });
    }
  }

  // 2. Yorumcular
  for (const comment of raw.comments || []) {
    const candidate = mapAuthorToCandidate(comment.author, 'commenter', raw.urn);
    if (candidate && !seen.has(candidate.linkedinUrl)) {
      seen.add(candidate.linkedinUrl);
      candidates.push(candidate);
    }
  }

  // 3. Beğenenler
  for (const reaction of raw.reactions || []) {
    const candidate = mapAuthorToCandidate(reaction.profile, 'reactor', raw.urn);
    if (candidate && !seen.has(candidate.linkedinUrl)) {
      seen.add(candidate.linkedinUrl);
      candidates.push(candidate);
    }
  }

  return candidates;
}

// ============================================
// Doğrulama
// ============================================

/**
 * Apify gönderisinin gerekli alanlarını doğrular.
 */
export function validateApifyPost(raw: ApifyPost): ValidationResult {
  const errors: string[] = [];

  if (!raw.text && !raw.url) {
    errors.push('Gönderi içeriği (text) veya URL (url) zorunludur');
  }

  if (!raw.authorName) {
    errors.push('Yazar adı (authorName) zorunludur');
  }

  if (!raw.url) {
    errors.push('Gönderi URL (url) zorunludur');
  }

  if (!raw.postedAtISO && !raw.postedAtTimestamp) {
    errors.push('Yayın tarihi (postedAtISO veya postedAtTimestamp) zorunludur');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// Yardımcı fonksiyonlar
// ============================================

function extractAuthorTitle(raw: ApifyPost): string | null {
  // Person tipinde author objesinden occupation al
  if (raw.authorType === 'Person' && raw.author && 'occupation' in raw.author) {
    return (raw.author as ApifyAuthor).occupation || null;
  }
  return null;
}

function extractAuthorCompany(raw: ApifyPost): string | null {
  // attributes içinden ilk COMPANY_NAME'i al
  const companyAttr = (raw.attributes || []).find(
    (attr) => attr.type === 'COMPANY_NAME' && attr.company
  );
  if (companyAttr?.company) {
    return companyAttr.company.name;
  }

  // Company tipinde ise authorName'i şirket olarak kullan
  if (raw.authorType === 'Company') {
    return raw.authorName || null;
  }

  return null;
}

function buildLinkedinProfileUrl(publicId: string): string {
  return `https://www.linkedin.com/in/${encodeURIComponent(publicId)}`;
}

function mapAuthorToCandidate(
  author: ApifyAuthor,
  source: 'commenter' | 'reactor',
  sourcePostUrn: string
): LeadCandidate | null {
  if (!author || !author.publicId) return null;

  const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
  if (!name) return null;

  return {
    name,
    title: author.occupation || '',
    linkedinUrl: buildLinkedinProfileUrl(author.publicId),
    profilePicture: author.picture || null,
    source,
    sourcePostUrn,
  };
}

function cleanUrl(url: string): string {
  if (!url) return '';
  // UTM parametrelerini kaldır
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('rcm');
    return parsed.toString();
  } catch {
    return url;
  }
}
