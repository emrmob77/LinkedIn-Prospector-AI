import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getUserAIClient } from '@/lib/ai-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { analyzePostImages } from '@/services/imageAnalysisService';
import type { ImageAnalysisResult } from '@/types/models';
import { withRateLimit, AI_RATE_LIMIT } from '@/lib/with-rate-limit';

// Cache süresi: 24 saat (ms)
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

async function handler(
  request: NextRequest,
  context?: unknown
) {
  const { params } = context as { params: { id: string } };
  try {
    // Auth kontrolü
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik doğrulama gerekli' },
        { status: 401 }
      );
    }

    const postId = params.id;

    // Request body (opsiyonel force parametresi)
    let force = false;
    try {
      const body = await request.json();
      force = body.force === true;
    } catch {
      // Body boş olabilir, sorun değil
    }

    // Post'u getir (user'ın erişebileceği bir post olmalı)
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, images, image_analysis, image_analyzed_at, search_run_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Gönderi bulunamadı' },
        { status: 404 }
      );
    }

    // Search run'ın bu kullanıcıya ait olduğunu doğrula
    const { data: searchRun } = await supabaseAdmin
      .from('search_runs')
      .select('user_id')
      .eq('id', post.search_run_id)
      .single();

    if (!searchRun || searchRun.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Bu gönderiye erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // Görsel kontrolü
    const images: string[] = post.images || [];
    if (images.length === 0) {
      return NextResponse.json(
        { error: 'Bu gönderide görsel bulunmuyor' },
        { status: 400 }
      );
    }

    // Cache kontrolü: Zaten analiz edilmişse ve 24 saatten yeni ise cache'ten dön
    if (!force && post.image_analysis && post.image_analyzed_at) {
      const analyzedAt = new Date(post.image_analyzed_at).getTime();
      const now = Date.now();
      if (now - analyzedAt < CACHE_DURATION_MS) {
        return NextResponse.json({
          analysis: post.image_analysis as ImageAnalysisResult,
          analyzedAt: post.image_analyzed_at,
          cached: true,
        });
      }
    }

    // Firma bağlamını user_settings'ten al
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('company_name, company_sector, product_description, vision_model')
      .eq('user_id', user.id)
      .single();

    const companyContext = {
      companyName: settings?.company_name || '',
      companySector: settings?.company_sector || '',
      productDescription: settings?.product_description || '',
    };

    // AI client al ve analiz yap
    const aiClient = await getUserAIClient(user.id);
    const visionModel = (settings?.vision_model as string) || undefined;
    const analysis = await analyzePostImages(aiClient, images, companyContext, 3, visionModel);

    const now = new Date().toISOString();

    // DB'ye kaydet
    const { error: updateError } = await supabaseAdmin
      .from('posts')
      .update({
        image_analysis: analysis,
        image_analyzed_at: now,
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Image analysis DB update error:', updateError);
      // Analiz başarılı ama kaydetme başarısız — yine de sonucu dön
    }

    return NextResponse.json({
      analysis,
      analyzedAt: now,
      cached: false,
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    const message = error instanceof Error ? error.message : 'Görsel analiz sırasında bir hata oluştu';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, AI_RATE_LIMIT);
