import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './rate-limiter';

interface RateLimitConfig {
  /** Pencere icerisinde izin verilen maksimum istek sayisi */
  maxRequests: number;
  /** Pencere suresi (milisaniye). Ornek: 60_000 = 1 dakika */
  windowMs: number;
}

/** Varsayilan AI endpoint limiti: 10 istek/dakika */
export const AI_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
};

/** Varsayilan genel limit: 60 istek/dakika */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000,
};

/**
 * IP adresini request header'larindan cikarir.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // İlk IP adresi gercek client IP'si
    return forwarded.split(',')[0].trim();
  }
  // Next.js'de request.ip mevcut olabilir
  return (request as unknown as { ip?: string }).ip || 'unknown';
}

/**
 * Rate limit header'larini response'a ekler.
 */
function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetAt: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
  return response;
}

/**
 * API route handler'ini rate limit ile sarar.
 *
 * Kullanim:
 * ```ts
 * import { withRateLimit, AI_RATE_LIMIT } from '@/lib/with-rate-limit';
 *
 * async function handler(request: NextRequest) {
 *   // ... normal handler kodu
 * }
 *
 * export const POST = withRateLimit(handler, AI_RATE_LIMIT);
 * ```
 *
 * @param handler - Orijinal route handler
 * @param config - Rate limit yapilandirmasi
 * @param keyPrefix - Opsiyonel endpoint tanimlayici (ayni IP/user icin farkli endpoint'ler ayri sayilsin)
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
  keyPrefix?: string
) {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    const ip = getClientIp(request);
    const prefix = keyPrefix || new URL(request.url).pathname;

    // IP bazli rate limit
    const ipKey = `ip:${prefix}:${ip}`;
    const ipResult = checkRateLimit(ipKey, config.maxRequests, config.windowMs);

    if (!ipResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Cok fazla istek gonderdiniz. Lutfen biraz bekleyin.',
          retryAfter: Math.ceil((ipResult.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
      return addRateLimitHeaders(response, config.maxRequests, 0, ipResult.resetAt);
    }

    // Handler'i calistir
    const response = await handler(request, context);

    // Basarili yanita rate limit header'larini ekle
    return addRateLimitHeaders(response, config.maxRequests, ipResult.remaining, ipResult.resetAt);
  };
}
