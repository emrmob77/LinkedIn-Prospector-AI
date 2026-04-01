import { ApifyClient } from 'apify-client';
import type { ApifyPost, ApifySearchParams, ApifyRunResult } from '@/types/apify';

// ============================================
// Apify Client yapılandırması
// ============================================

const ACTOR_ID = 'supreme_coder/linkedin-post';
const DEFAULT_MAX_POSTS = 50;
const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY_MS = 1000;

function getClient(): ApifyClient {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN environment variable tanımlı değil');
  }
  return new ApifyClient({ token });
}

// ============================================
// Arama URL oluşturucu
// ============================================

/**
 * LinkedIn arama parametrelerinden arama URL'si oluşturur.
 */
export function buildSearchUrl(params: ApifySearchParams): string {
  const keywords = params.keywords.join(' ');
  const url = new URL('https://www.linkedin.com/search/results/content/');

  url.searchParams.set('keywords', keywords);
  url.searchParams.set('origin', 'FACETED_SEARCH');

  if (params.dateFilter) {
    url.searchParams.set('datePosted', `"${params.dateFilter}"`);
  }

  if (params.geoId) {
    url.searchParams.set('geoUrn', `urn:li:geo:${params.geoId}`);
  }

  return url.toString();
}

/**
 * LinkedIn şirket sayfası URL'si oluşturur.
 */
export function buildCompanyPostsUrl(companySlug: string): string {
  return `https://www.linkedin.com/company/${companySlug}/posts/?feedView=all`;
}

// ============================================
// Apify Actor çalıştırma
// ============================================

/**
 * Apify Actor'ü çalıştırır ve sonuçları döndürür.
 */
export async function runSearch(params: ApifySearchParams): Promise<ApifyRunResult> {
  const client = getClient();
  const searchUrl = buildSearchUrl(params);
  const maxPosts = params.maxPosts ?? DEFAULT_MAX_POSTS;

  const input = {
    urls: [searchUrl],
    maxPosts,
  };

  const run = await client.actor(ACTOR_ID).call(input, {
    waitSecs: 300,
  });

  if (!run.defaultDatasetId) {
    return {
      runId: run.id,
      datasetId: '',
      posts: [],
      status: run.status as ApifyRunResult['status'],
    };
  }

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems();

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    posts: items as unknown as ApifyPost[],
    status: run.status as ApifyRunResult['status'],
  };
}

/**
 * Doğrudan şirket sayfası gönderilerini çeker.
 */
export async function runCompanySearch(
  companySlug: string,
  maxPosts?: number
): Promise<ApifyRunResult> {
  const client = getClient();
  const companyUrl = buildCompanyPostsUrl(companySlug);

  const input = {
    urls: [companyUrl],
    maxPosts: maxPosts ?? DEFAULT_MAX_POSTS,
  };

  const run = await client.actor(ACTOR_ID).call(input, {
    waitSecs: 300,
  });

  if (!run.defaultDatasetId) {
    return {
      runId: run.id,
      datasetId: '',
      posts: [],
      status: run.status as ApifyRunResult['status'],
    };
  }

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems();

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    posts: items as unknown as ApifyPost[],
    status: run.status as ApifyRunResult['status'],
  };
}

/**
 * Mevcut bir Apify dataset'inden sonuçları çeker.
 */
export async function fetchDatasetResults(datasetId: string): Promise<ApifyPost[]> {
  const client = getClient();
  const { items } = await client.dataset(datasetId).listItems();
  return items as unknown as ApifyPost[];
}

/**
 * Apify Actor çalıştırma durumunu kontrol eder.
 */
export async function getRunStatus(runId: string): Promise<string> {
  const client = getClient();
  const run = await client.run(runId).get();
  return run?.status ?? 'UNKNOWN';
}

// ============================================
// Yeniden deneme ile çalıştırma
// ============================================

/**
 * Üstel geri çekilme ile yeniden deneme destekli arama.
 */
export async function runSearchWithRetry(
  params: ApifySearchParams,
  maxRetries: number = MAX_RETRY_COUNT
): Promise<ApifyRunResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await runSearch(params);

      if (result.status === 'SUCCEEDED') {
        return result;
      }

      if (result.status === 'FAILED' || result.status === 'ABORTED') {
        throw new Error(`Apify Actor ${result.status}: run ${result.runId}`);
      }

      // TIMED-OUT durumunda yeniden dene
      throw new Error(`Apify Actor TIMED-OUT: run ${result.runId}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('Apify arama başarısız oldu');
}
