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

    const isFree = data.is_free_tier === true;

    // Free tier: günlük 50 istek limiti (OpenRouter standart)
    // Bu bilgi /auth/key'den gelmiyor, sabit değer
    const FREE_DAILY_LIMIT = 50;

    if (isFree) {
      // Günlük kullanımı /api/v1/auth/key'den al
      const dailyUsage = data.usage_daily ?? 0;
      const limit = data.limit ?? FREE_DAILY_LIMIT;
      const remaining = Math.max(0, limit - dailyUsage);

      return NextResponse.json({
        provider: 'openrouter',
        usage: dailyUsage,
        limit,
        remaining,
        isFree: true,
        label: data.label ?? null,
      });
    }

    // Ücretli plan — limit yok
    return NextResponse.json({
      provider: 'openrouter',
      usage: data.usage ?? 0,
      limit: null,
      remaining: null,
      isFree: false,
      label: data.label ?? null,
    });
  } catch (error) {
    console.error('AI Usage GET hatasi:', error);
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
