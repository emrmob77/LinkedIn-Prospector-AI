import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { mapMessage } from '@/lib/mappers';

/**
 * GET /api/messages — Tum mesajlari listele (lead bilgisiyle birlikte)
 *
 * Query params:
 *   status  — pending | approved | rejected | sent
 *   type    — dm | email
 *   search  — lead ismine gore arama
 *   limit   — sayfa basina kayit (default 50)
 *   offset  — pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);
    const offset = Number(searchParams.get('offset') || '0');

    // Mesajlari lead bilgisiyle birlikte cek
    let query = supabase
      .from('messages')
      .select(`
        *,
        lead:leads!messages_lead_id_fkey (
          id,
          name,
          title,
          company,
          linkedin_url,
          email,
          profile_picture,
          stage
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('message_type', type);
    }

    const { data: rows, error: queryError, count } = await query;

    if (queryError) {
      console.error('Messages query error:', queryError);
      return NextResponse.json(
        { error: 'Mesajlar alinamadi' },
        { status: 500 }
      );
    }

    // Lead ismine gore client-side filtreleme (Supabase join uzerinde ilike desteklemez)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filtered = rows || [];
    if (search) {
      const q = search.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filtered = filtered.filter((r: any) =>
        r.lead?.name?.toLowerCase().includes(q) ||
        r.lead?.company?.toLowerCase().includes(q)
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = filtered.map((r: any) => ({
      ...mapMessage(r),
      lead: r.lead ? {
        id: r.lead.id,
        name: r.lead.name,
        title: r.lead.title,
        company: r.lead.company,
        linkedinUrl: r.lead.linkedin_url,
        email: r.lead.email,
        profilePicture: r.lead.profile_picture,
        stage: r.lead.stage,
      } : null,
    }));

    return NextResponse.json({
      messages,
      total: count ?? messages.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Messages list error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
