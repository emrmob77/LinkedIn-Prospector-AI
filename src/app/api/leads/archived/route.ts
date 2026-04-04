import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', false);

    const total = count || 0;

    const { data: rows, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', false)
      .order('archived_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Arşiv verileri alınamadı' }, { status: 500 });
    }

    const leads = (rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      company: row.company,
      linkedinUrl: row.linkedin_url,
      stage: row.stage,
      score: row.score,
      postCount: row.post_count,
      source: row.source,
      profilePicture: row.profile_picture,
      createdAt: row.created_at,
      archivedAt: row.archived_at,
    }));

    return NextResponse.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Archived leads error:', error);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
