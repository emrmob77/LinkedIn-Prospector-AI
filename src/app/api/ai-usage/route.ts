import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decryptApiKey } from '@/lib/crypto';

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

/**
 * GET /api/ai-usage — OpenRouter API kullanim limitini doner
 */
export async function GET() {
  try {
    const supabase = createSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik dogrulama gerekli' }, { status: 401 });
    }

    // Kullanicinin ayarlarini al
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('ai_provider, openrouter_api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    if (!settings) {
      return NextResponse.json({
        provider: 'none',
        message: 'Ayarlar bulunamadi. Lutfen once AI provider ayarlayin.',
      });
    }

    // OpenRouter degilse bilgi mesaji dondur
    if (settings.ai_provider !== 'openrouter') {
      return NextResponse.json({
        provider: settings.ai_provider || 'other',
        message: 'Limit bilgisi sadece OpenRouter icin gecerli',
      });
    }

    // OpenRouter API key'i decrypt et
    if (!settings.openrouter_api_key_encrypted) {
      return NextResponse.json({
        provider: 'openrouter',
        message: 'OpenRouter API key ayarlanmamis',
      });
    }

    let apiKey: string;
    try {
      apiKey = decryptApiKey(settings.openrouter_api_key_encrypted);
    } catch {
      return NextResponse.json({
        provider: 'openrouter',
        message: 'API key cozumlenemedi',
      }, { status: 500 });
    }

    // OpenRouter /api/v1/auth/key endpoint'ini cagir
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        provider: 'openrouter',
        message: `OpenRouter API hatasi: ${response.status}`,
      }, { status: 502 });
    }

    const result = await response.json();
    const data = result.data;

    // limit null ise unlimited (ucretli plan)
    const limit = data.limit ?? null;
    const usage = data.usage ?? 0;
    const isFree = limit !== null;
    const remaining = isFree ? Math.max(0, limit - usage) : null;

    return NextResponse.json({
      provider: 'openrouter',
      usage,
      limit,
      remaining,
      isFree,
      label: data.label ?? null,
      rateLimitRequests: data.rate_limit?.requests ?? null,
      rateLimitInterval: data.rate_limit?.interval ?? null,
    });
  } catch (error) {
    console.error('AI Usage GET hatasi:', error);
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
