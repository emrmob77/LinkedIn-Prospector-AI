import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getExcludedBrands, applyBrandFilter } from '@/lib/brand-filter';
import { PIPELINE_STAGES } from '@/types/enums';
import { get, set, cacheKey } from '@/lib/cache';

const CACHE_TTL_MS = 30_000; // 30 saniye

export async function GET() {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    // Cache kontrol
    const key = cacheKey(user.id, 'leads:stats');
    const cached = get<{ stages: Record<string, number>; total: number; avgScore: number }>(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    // Haric tutulan markalari cek
    const excludedBrands = await getExcludedBrands(user.id);

    // Tüm aktif lead'leri getir (sadece stage, score)
    let query = supabase
      .from('leads')
      .select('stage, score')
      .eq('user_id', user.id)
      .eq('is_active', true);

    query = applyBrandFilter(query, excludedBrands);

    const { data: leads, error } = await query;

    if (error) {
      console.error('Leads stats query error:', error);
      return NextResponse.json(
        { error: 'Lead istatistikleri alinamadi' },
        { status: 500 }
      );
    }

    const allLeads = leads || [];
    const total = allLeads.length;

    // Her aşamadaki lead sayısı
    const stages: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) {
      stages[stage] = 0;
    }
    for (const lead of allLeads) {
      if (lead.stage in stages) {
        stages[lead.stage]++;
      }
    }

    // Ortalama skor
    const avgScore = total > 0
      ? Math.round((allLeads.reduce((sum, l) => sum + (l.score || 0), 0) / total) * 100) / 100
      : 0;

    const responseData = { stages, total, avgScore };

    // Sonucu cache'le (30sn)
    set(key, responseData, CACHE_TTL_MS);

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('Leads stats error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
