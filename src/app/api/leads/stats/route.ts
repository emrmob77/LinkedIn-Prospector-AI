import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
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

    // Tüm aktif lead'leri getir (sadece stage ve score)
    const { data: leads, error } = await supabase
      .from('leads')
      .select('stage, score')
      .eq('user_id', user.id)
      .eq('is_active', true);

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
