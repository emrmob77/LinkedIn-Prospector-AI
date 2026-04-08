import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * POST /api/leads/backfill-project-type
 * project_type alani bos olan lead'lerin iliskili post'larindan project_type bilgisini doldurur.
 * Post'un gift_type veya theme degerini kullanir.
 */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik dogrulama gerekli' }, { status: 401 });
    }

    // project_type'i bos olan lead'leri bul
    const { data: emptyLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .is('project_type', null)
      .limit(200);

    if (leadsError || !emptyLeads || emptyLeads.length === 0) {
      return NextResponse.json({ updated: 0, message: 'project_type alani bos lead bulunamadi' });
    }

    let updated = 0;

    for (const lead of emptyLeads) {
      // Bu lead'in post'larindan gift_type ve theme bilgisi cek
      const { data: posts } = await supabase
        .from('lead_posts')
        .select('post:posts(gift_type, theme)')
        .eq('lead_id', lead.id);

      if (!posts || posts.length === 0) continue;

      // gift_type || theme degerlerini topla
      const projectTypes = posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((lp: any) => {
          const p = lp.post;
          if (!p) return null;
          return p.gift_type || p.theme || null;
        })
        .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0);

      if (projectTypes.length === 0) continue;

      // En sik gecen project_type'i bul
      const freq: Record<string, number> = {};
      for (const t of projectTypes) {
        const clean = t.trim();
        freq[clean] = (freq[clean] || 0) + 1;
      }
      const bestType = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];

      if (!bestType) continue;

      const { error: updateError } = await supabase
        .from('leads')
        .update({ project_type: bestType })
        .eq('id', lead.id);

      if (!updateError) updated++;
    }

    return NextResponse.json({
      updated,
      total: emptyLeads.length,
      message: `${updated} lead'in project_type alani dolduruldu`,
    });
  } catch (error) {
    console.error('Backfill project_type error:', error);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
