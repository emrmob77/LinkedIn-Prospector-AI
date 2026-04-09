/**
 * In-memory TTL bazli cache.
 * MVP seviyesi — Redis gerektirmez, tek process (serverless) icin uygundur.
 * Vercel serverless ortaminda her cold start'ta sifirlanir, bu beklenen davranistir.
 */

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

const MAX_ENTRIES = 1000;
const store = new Map<string, CacheEntry>();

// Her 2 dakikada suresi dolmus kayitlari temizle (memory leak onleme)
const CLEANUP_INTERVAL_MS = 120_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
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
 * Maksimum entry sayisini asmamak icin en eski kaydi siler.
 * LRU degil, en eski createdAt'e gore siler (basit eviction).
 */
function evictOldest() {
  if (store.size < MAX_ENTRIES) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  store.forEach((entry, key) => {
    if (entry.createdAt < oldestTime) {
      oldestTime = entry.createdAt;
      oldestKey = key;
    }
  });

  if (oldestKey) {
    store.delete(oldestKey);
  }
}

/**
 * Cache'den veri okur. Suresi dolmussa null doner.
 */
export function get<T = unknown>(key: string): T | null {
  startCleanup();

  const entry = store.get(key);
  if (!entry) return null;

  // TTL kontrolu
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Cache'e veri yazar.
 *
 * @param key - Cache anahtari
 * @param data - Saklanacak veri
 * @param ttlMs - Yasam suresi (milisaniye)
 */
export function set<T = unknown>(key: string, data: T, ttlMs: number): void {
  startCleanup();
  evictOldest();

  const now = Date.now();
  store.set(key, {
    data,
    expiresAt: now + ttlMs,
    createdAt: now,
  });
}

/**
 * Belirli bir key'i cache'den siler.
 */
export function invalidate(key: string): void {
  store.delete(key);
}

/**
 * Belirli bir prefix ile baslayan tum key'leri siler.
 * Ornek: invalidatePattern('dashboard:stats') -> 'dashboard:stats:abc123' vb. silinir
 */
export function invalidatePattern(prefix: string): void {
  store.forEach((_entry, key) => {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  });
}

/**
 * Kullanici bazli cache key ureteci.
 * Format: "{endpoint}:{userId}"
 *
 * @param userId - Kullanici ID
 * @param endpoint - Endpoint tanimlayicisi (ornek: 'dashboard:stats')
 */
export function cacheKey(userId: string, endpoint: string): string {
  return `${endpoint}:${userId}`;
}

/**
 * Test amaciyla store'u temizler.
 */
export function clearCacheStore(): void {
  store.clear();
}
