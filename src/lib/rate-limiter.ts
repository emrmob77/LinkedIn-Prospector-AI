/**
 * In-memory sliding window rate limiter.
 * MVP seviyesi — Redis gerektirmez, tek process icin uygundur.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Her 60 saniyede eski kayitlari temizle (memory leak onleme)
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      // En son istegi windowMs'den eski olan kayitlari sil
      // Genel olarak 2 dakikadan eski timestamp'ler kesinlikle gereksiz
      entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    });
  }, CLEANUP_INTERVAL_MS);

  // Node.js'de timer'in process'i acik tutmasini engelle
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Sliding window rate limit kontrolu yapar.
 *
 * @param key - Benzersiz anahtar (ornegin IP veya userId:endpoint)
 * @param maxRequests - Pencere icerisinde izin verilen maksimum istek
 * @param windowMs - Pencere suresi (milisaniye)
 * @returns Rate limit durumu
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Pencere disindaki eski timestamp'leri temizle
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    // En eski istekten itibaren window sonunu hesapla
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Istegi kaydet
  entry.timestamps.push(now);

  const remaining = maxRequests - entry.timestamps.length;
  const resetAt = entry.timestamps[0] + windowMs;

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

/**
 * Test amaciyla store'u temizler.
 */
export function clearRateLimitStore() {
  store.clear();
}
