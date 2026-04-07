import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * POST /api/leads/backfill-company
 * Company alani bos olan lead'lerin iliskili post'larindan company bilgisini doldurur.
 */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik dogrulama gerekli' }, { status: 401 });
    }

    // Company'si bos olan lead'leri bul
    const { data: emptyLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .is('company', null)
      .limit(200);

    if (leadsError || !emptyLeads || emptyLeads.length === 0) {
      return NextResponse.json({ updated: 0, message: 'Company alani bos lead bulunamadi' });
    }

    let updated = 0;

    for (const lead of emptyLeads) {
      // Bu lead'in post'larindan company bilgisi cek
      const { data: posts } = await supabase
        .from('lead_posts')
        .select('post:posts(author_company)')
        .eq('lead_id', lead.id);

      if (!posts || posts.length === 0) continue;

      // Non-null company degerlerini topla
      const companies = posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((lp: any) => lp.post?.author_company)
        .filter((c: unknown): c is string => typeof c === 'string' && c.trim().length >= 3);

      if (companies.length === 0) continue;

      // En sik gecen company'yi bul
      const freq: Record<string, number> = {};
      for (const c of companies) {
        const clean = c.trim();
        freq[clean] = (freq[clean] || 0) + 1;
      }
      const bestCompany = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];

      if (!bestCompany) continue;

      // "sirketi" suffix'ini strip et
      const finalCompany = bestCompany.replace(/\s+şirketi$/i, '').trim();
      if (finalCompany.length < 2) continue;

      const { error: updateError } = await supabase
        .from('leads')
        .update({ company: finalCompany })
        .eq('id', lead.id);

      if (!updateError) updated++;
    }

    return NextResponse.json({
      updated,
      total: emptyLeads.length,
      message: `${updated} lead'in company alani dolduruldu`,
    });
  } catch (error) {
    console.error('Backfill company error:', error);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
