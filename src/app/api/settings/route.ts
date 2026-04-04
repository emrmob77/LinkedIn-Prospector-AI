import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { encryptApiKey, decryptApiKey, maskApiKey } from '@/lib/crypto';
import type { UserSettingsPublic, AIProvider } from '@/types/models';

const VALID_PROVIDERS: AIProvider[] = ['anthropic', 'openai', 'google', 'openrouter'];

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

/** Şifreli key'den maskelenmiş hint üretir */
function getKeyHint(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    return maskApiKey(decryptApiKey(encrypted));
  } catch {
    return '****';
  }
}

// Varsayılan firma bilgileri
const DEFAULTS = {
  companyName: 'Kurumsal Hediye Firmasi',
  companySector: 'Kurumsal hediye ve promosyon',
  productDescription: 'Kurumsal hediye, promosyon ürünleri, çalışan motivasyon paketleri, etkinlik organizasyonu malzemeleri',
  targetCustomer: 'B2B firmalar, kurumsal etkinlik organizatörleri, İK departmanları, pazarlama ekipleri',
};

/** DB row'dan UserSettingsPublic üretir */
function toPublic(row: Record<string, unknown> | null): UserSettingsPublic {
  if (!row) {
    return {
      hasAnthropicKey: false,
      hasOpenaiKey: false,
      hasGoogleKey: false,
      hasOpenrouterKey: false,
      anthropicKeyHint: null,
      openaiKeyHint: null,
      googleKeyHint: null,
      openrouterKeyHint: null,
      aiProvider: 'anthropic',
      aiModel: null,
      aiTemperature: 0.3,
      autoClassify: true,
      companyName: DEFAULTS.companyName,
      companySector: DEFAULTS.companySector,
      productDescription: DEFAULTS.productDescription,
      targetCustomer: DEFAULTS.targetCustomer,
      companyWebsite: null,
    };
  }

  return {
    hasAnthropicKey: !!row.anthropic_api_key_encrypted,
    hasOpenaiKey: !!row.openai_api_key_encrypted,
    hasGoogleKey: !!row.google_api_key_encrypted,
    hasOpenrouterKey: !!row.openrouter_api_key_encrypted,
    anthropicKeyHint: getKeyHint(row.anthropic_api_key_encrypted as string | null),
    openaiKeyHint: getKeyHint(row.openai_api_key_encrypted as string | null),
    googleKeyHint: getKeyHint(row.google_api_key_encrypted as string | null),
    openrouterKeyHint: getKeyHint(row.openrouter_api_key_encrypted as string | null),
    aiProvider: (row.ai_provider as AIProvider) || 'anthropic',
    aiModel: (row.ai_model as string) || null,
    aiTemperature: Number(row.ai_temperature ?? 0.3),
    autoClassify: row.auto_classify !== false,
    companyName: (row.company_name as string) || DEFAULTS.companyName,
    companySector: (row.company_sector as string) || DEFAULTS.companySector,
    productDescription: (row.product_description as string) || DEFAULTS.productDescription,
    targetCustomer: (row.target_customer as string) || DEFAULTS.targetCustomer,
    companyWebsite: (row.company_website as string) || null,
  };
}

/**
 * GET /api/settings — Kullanıcının ayarlarını döner (maskelenmiş key'ler)
 */
export async function GET() {
  try {
    const supabase = createSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }

    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json(toPublic(settings));
  } catch (error) {
    console.error('Settings GET hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * PUT /api/settings — Kullanıcı ayarlarını günceller/oluşturur
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const {
      anthropicApiKey,
      openaiApiKey,
      googleApiKey,
      openrouterApiKey,
      aiProvider,
      aiModel,
      aiTemperature,
      autoClassify,
      companyName,
      companySector,
      productDescription,
      targetCustomer,
      companyWebsite,
    } = body as {
      anthropicApiKey?: string;
      openaiApiKey?: string;
      googleApiKey?: string;
      openrouterApiKey?: string;
      aiProvider?: AIProvider;
      aiModel?: string;
      aiTemperature?: number;
      autoClassify?: boolean;
      companyName?: string;
      companySector?: string;
      productDescription?: string;
      targetCustomer?: string;
      companyWebsite?: string;
    };

    // Mevcut ayarları al
    const { data: existing } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Güncellenecek alanları hazırla
    const updates: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Her key için: string → şifrele, boş string → temizle, undefined → dokunma
    const keyFields: [string | undefined, string][] = [
      [anthropicApiKey, 'anthropic_api_key_encrypted'],
      [openaiApiKey, 'openai_api_key_encrypted'],
      [googleApiKey, 'google_api_key_encrypted'],
      [openrouterApiKey, 'openrouter_api_key_encrypted'],
    ];

    for (const [value, column] of keyFields) {
      if (value !== undefined) {
        updates[column] = value.trim() === '' ? null : encryptApiKey(value.trim());
      }
    }

    if (aiProvider !== undefined) {
      if (!VALID_PROVIDERS.includes(aiProvider)) {
        return NextResponse.json({ error: 'Geçersiz AI provider' }, { status: 400 });
      }
      updates.ai_provider = aiProvider;
    }

    if (aiModel !== undefined) {
      updates.ai_model = aiModel.trim() || null;
    }

    if (aiTemperature !== undefined) {
      updates.ai_temperature = Math.min(1, Math.max(0, aiTemperature));
    }

    if (autoClassify !== undefined) {
      updates.auto_classify = autoClassify;
    }

    // Firma bilgileri
    if (companyName !== undefined) updates.company_name = companyName.trim() || null;
    if (companySector !== undefined) updates.company_sector = companySector.trim() || null;
    if (productDescription !== undefined) updates.product_description = productDescription.trim() || null;
    if (targetCustomer !== undefined) updates.target_customer = targetCustomer.trim() || null;
    if (companyWebsite !== undefined) updates.company_website = companyWebsite.trim() || null;

    // Upsert
    if (existing) {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('Settings update hatası:', error);
        return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .insert(updates);

      if (error) {
        console.error('Settings insert hatası:', error);
        return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 });
      }
    }

    // Güncel ayarları döndür
    const { data: updated } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json(toPublic(updated));
  } catch (error) {
    console.error('Settings PUT hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
