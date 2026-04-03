import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  // Extension API routes: skip cookie-based session check.
  // These endpoints handle their own Bearer token auth internally.
  if (request.nextUrl.pathname.startsWith('/api/extension/')) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    return NextResponse.next();
  }

  // API route'ları için auth kontrolü farklı: HTML redirect yerine 401 JSON
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = await updateSession(request);
    // Redirect response ise, API client'a 401 JSON dön
    if (response.status === 307 || response.status === 308) {
      const jsonResponse = NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Kimlik doğrulama gerekli' } },
        { status: 401 }
      );
      // Forward session cookies (cleanup/refresh) from Supabase auth flow
      response.cookies.getAll().forEach((cookie) => {
        jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return jsonResponse;
    }
    return response;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Şu path'ler hariç tüm route'ları eşleştir:
     * - _next/static (statik dosyalar)
     * - _next/image (image optimizasyonu)
     * - favicon.ico (favicon)
     * - public dosyaları
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
