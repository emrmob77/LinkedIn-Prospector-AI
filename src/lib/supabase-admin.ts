import { createClient } from '@supabase/supabase-js';

/**
 * Service role client — RLS bypass, sadece server-side kullanım.
 * Kullanıcı ayarlarını okuma/yazma gibi admin işlemleri için.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
