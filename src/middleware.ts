import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  // API route'ları için auth kontrolü farklı: HTML redirect yerine 401 JSON
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = await updateSession(request);
    // Redirect response ise, API client'a 401 JSON dön
    if (response.status === 307 || response.status === 308) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Kimlik doğrulama gerekli' } },
        { status: 401 }
      );
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
