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
  classificationPrompt: 'Kurumsal hediye, promosyon ürünleri, çalışan motivasyonu, etkinlik organizasyonu ile ilgili postları ilgili olarak işaretle. B2B hediye alımı sinyallerini ve rakip firma aktivitelerini de yakala.',
  companyContext: 'Kurumsal hediye ve promosyon sektöründe faaliyet gösteren bir firmayız. Ürünlerimiz: kurumsal hediyeler, promosyon ürünleri, çalışan motivasyon paketleri. Hedef müşterilerimiz: B2B firmalar, İK departmanları, pazarlama ekipleri.',
  messagePrompt: 'Samimi ve profesyonel ton kullan. Satış baskısı yapma, değer önerisi sun. Kişinin paylaşımını referans al. Türkçe yaz.',
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
      visionModel: null,
      aiTemperature: 0.3,
      autoClassify: true,
      companyName: DEFAULTS.companyName,
      companySector: DEFAULTS.companySector,
      productDescription: DEFAULTS.productDescription,
      targetCustomer: DEFAULTS.targetCustomer,
      companyWebsite: null,
      classificationPrompt: DEFAULTS.classificationPrompt,
      companyContext: DEFAULTS.companyContext,
      messagePrompt: DEFAULTS.messagePrompt,
      excludedBrands: [],
    };
  }

  // excluded_brands JSONB -> string[]
  let excludedBrands: string[] = [];
  if (row.excluded_brands) {
    try {
      excludedBrands = Array.isArray(row.excluded_brands)
        ? (row.excluded_brands as string[])
        : JSON.parse(row.excluded_brands as string);
    } catch {
      excludedBrands = [];
    }
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
    visionModel: (row.vision_model as string) || null,
    aiTemperature: Number(row.ai_temperature ?? 0.3),
    autoClassify: row.auto_classify !== false,
    companyName: (row.company_name as string) || DEFAULTS.companyName,
    companySector: (row.company_sector as string) || DEFAULTS.companySector,
    productDescription: (row.product_description as string) || DEFAULTS.productDescription,
    targetCustomer: (row.target_customer as string) || DEFAULTS.targetCustomer,
    companyWebsite: (row.company_website as string) || null,
    classificationPrompt: (row.classification_prompt as string) || DEFAULTS.classificationPrompt,
    companyContext: (row.company_context as string) || DEFAULTS.companyContext,
    messagePrompt: (row.message_prompt as string) || DEFAULTS.messagePrompt,
    excludedBrands,
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
      visionModel,
      aiTemperature,
      autoClassify,
      companyName,
      companySector,
      productDescription,
      targetCustomer,
      companyWebsite,
      classificationPrompt,
      companyContext,
      messagePrompt,
      excludedBrands,
    } = body as {
      anthropicApiKey?: string;
      openaiApiKey?: string;
      googleApiKey?: string;
      openrouterApiKey?: string;
      aiProvider?: AIProvider;
      aiModel?: string;
      visionModel?: string;
      aiTemperature?: number;
      autoClassify?: boolean;
      companyName?: string;
      companySector?: string;
      productDescription?: string;
      targetCustomer?: string;
      companyWebsite?: string;
      classificationPrompt?: string;
      companyContext?: string;
      messagePrompt?: string;
      excludedBrands?: string[];
    };

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

    if (visionModel !== undefined) {
      updates.vision_model = visionModel.trim() || null;
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
    if (classificationPrompt !== undefined) updates.classification_prompt = classificationPrompt.trim() || null;
    if (companyContext !== undefined) updates.company_context = companyContext.trim() || null;
    if (messagePrompt !== undefined) updates.message_prompt = messagePrompt.trim() || null;
    if (excludedBrands !== undefined) {
      if (!Array.isArray(excludedBrands) || !excludedBrands.every((b: unknown) => typeof b === 'string')) {
        return NextResponse.json({ error: 'excludedBrands string dizisi olmali' }, { status: 400 });
      }
      updates.excluded_brands = excludedBrands.map((b: string) => b.trim()).filter(Boolean);
    }

    // Atomik upsert
    const { error: upsertError } = await supabaseAdmin
      .from('user_settings')
      .upsert(updates, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Settings upsert hatası:', upsertError);
      return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 });
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
