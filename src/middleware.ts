import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
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
