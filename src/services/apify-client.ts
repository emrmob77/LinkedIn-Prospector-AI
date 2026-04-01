import type { ApifyPost, ApifySearchParams, ApifyRunResult } from '@/types/apify';

// ============================================
// Apify REST API client (fetch tabanlı, webpack uyumlu)
// ============================================

const ACTOR_ID = 'supreme_coder~linkedin-post';
const APIFY_BASE_URL = 'https://api.apify.com/v2';
const DEFAULT_MAX_POSTS = 50;
const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 300000; // 5 dakika

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN environment variable tanımlı değil');
  }
  return token;
}

// ============================================
// Arama URL oluşturucu
// ============================================

// Türkiye geoId'si
const DEFAULT_GEO_ID = '102105699';

export function buildSearchUrl(params: ApifySearchParams): string {
  const keywords = params.keywords.join(' ');
  const geoId = params.geoId || DEFAULT_GEO_ID;

  // LinkedIn URL'ini manuel oluştur — searchParams.set bazı değerleri yanlış encode ediyor
  let url = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keywords)}&origin=FACETED_SEARCH`;

  if (params.dateFilter) {
    url += `&datePosted=%22${params.dateFilter}%22`;
  }

  url += `&geoUrn=urn%3Ali%3Ageo%3A${geoId}`;

  return url;
}

export function buildCompanyPostsUrl(companySlug: string): string {
  return `https://www.linkedin.com/company/${companySlug}/posts/?feedView=all`;
}

// ============================================
// Apify REST API çağrıları
// ============================================

async function startActorRun(input: Record<string, unknown>): Promise<{ id: string; defaultDatasetId: string; status: string }> {
  const token = getToken();
  const res = await fetch(`${APIFY_BASE_URL}/acts/${ACTOR_ID}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify Actor başlatılamadı (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.data;
}

async function getRun(runId: string): Promise<{ status: string; defaultDatasetId: string }> {
  const token = getToken();
  const res = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`);

  if (!res.ok) {
    throw new Error(`Apify run durumu alınamadı (${res.status})`);
  }

  const data = await res.json();
  return data.data;
}

async function waitForRun(runId: string): Promise<{ status: string; defaultDatasetId: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const run = await getRun(runId);

    if (['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status)) {
      return run;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Apify Actor zaman aşımına uğradı');
}

async function getDatasetItems(datasetId: string): Promise<ApifyPost[]> {
  const token = getToken();
  const res = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&format=json&clean=true`
  );

  if (!res.ok) {
    throw new Error(`Apify dataset alınamadı (${res.status})`);
  }

  return res.json();
}

// ============================================
// Ana fonksiyonlar
// ============================================

export async function runSearch(params: ApifySearchParams): Promise<ApifyRunResult> {
  const limitPerSource = params.maxPosts ?? DEFAULT_MAX_POSTS;

  // URL'ler doğrudan verilmişse onları kullan, yoksa keywords'den oluştur
  const urls = params.urls && params.urls.length > 0
    ? params.urls
    : [buildSearchUrl(params)];

  const input: Record<string, unknown> = {
    urls,
    deepScrape: params.deepScrape ?? true,
    limitPerSource,
    rawData: false,
  };

  if (params.scrapeUntil) {
    input.scrapeUntil = params.scrapeUntil;
  }

  const run = await startActorRun(input);

  const completedRun = await waitForRun(run.id);

  if (completedRun.status !== 'SUCCEEDED') {
    return {
      runId: run.id,
      datasetId: completedRun.defaultDatasetId || '',
      posts: [],
      status: completedRun.status as ApifyRunResult['status'],
    };
  }

  const posts = await getDatasetItems(completedRun.defaultDatasetId);

  return {
    runId: run.id,
    datasetId: completedRun.defaultDatasetId,
    posts,
    status: 'SUCCEEDED',
  };
}

export async function runCompanySearch(
  companySlug: string,
  maxPosts?: number
): Promise<ApifyRunResult> {
  const companyUrl = buildCompanyPostsUrl(companySlug);

  const run = await startActorRun({
    urls: [companyUrl],
    deepScrape: true,
    limitPerSource: maxPosts ?? DEFAULT_MAX_POSTS,
    rawData: false,
  });

  const completedRun = await waitForRun(run.id);

  if (completedRun.status !== 'SUCCEEDED') {
    return {
      runId: run.id,
      datasetId: completedRun.defaultDatasetId || '',
      posts: [],
      status: completedRun.status as ApifyRunResult['status'],
    };
  }

  const posts = await getDatasetItems(completedRun.defaultDatasetId);

  return {
    runId: run.id,
    datasetId: completedRun.defaultDatasetId,
    posts,
    status: 'SUCCEEDED',
  };
}

export async function fetchDatasetResults(datasetId: string): Promise<ApifyPost[]> {
  return getDatasetItems(datasetId);
}

export async function getRunStatus(runId: string): Promise<string> {
  const run = await getRun(runId);
  return run.status;
}

// ============================================
// Yeniden deneme ile çalıştırma
// ============================================

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
