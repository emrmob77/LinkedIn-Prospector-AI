import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PIPELINE_STAGES } from '@/types/enums';

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

    // Haric tutulan markalari cek
    let excludedBrands: string[] = [];
    try {
      const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select('excluded_brands, company_name')
        .eq('user_id', user.id)
        .single();
      if (settings) {
        const brands = Array.isArray(settings.excluded_brands)
          ? settings.excluded_brands
          : JSON.parse(settings.excluded_brands || '[]');
        excludedBrands = brands.filter((b: unknown) => typeof b === 'string' && b);
        if (settings.company_name && typeof settings.company_name === 'string') {
          const cn = settings.company_name.trim();
          if (cn && !excludedBrands.some((b: string) => b.toLowerCase() === cn.toLowerCase())) {
            excludedBrands.push(cn);
          }
        }
      }
    } catch { /* ignore */ }

    // Tüm aktif lead'leri getir (sadece stage, score)
    let query = supabase
      .from('leads')
      .select('stage, score')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Haric tutulan markalari filtrele (name + company, wildcard escape)
    for (const brand of excludedBrands) {
      const escaped = brand.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.not('name', 'ilike', `%${escaped}%`);
      query = query.not('company', 'ilike', `%${escaped}%`);
    }

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

    return NextResponse.json({ stages, total, avgScore });
  } catch (error) {
    console.error('Leads stats error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
