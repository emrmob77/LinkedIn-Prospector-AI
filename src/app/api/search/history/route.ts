import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

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

    // Optional source filter
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    let query = supabase
      .from('search_runs')
      .select('id, keywords, source, page_url, status, posts_found, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (source && (source === 'chrome_extension' || source === 'apify')) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Search history query error:', error);
      return NextResponse.json(
        { error: 'Arama gecmisi alinamadi' },
        { status: 500 }
      );
    }

    // snake_case -> camelCase mapping
    const history = (data || []).map((run) => ({
      id: run.id,
      keywords: run.keywords,
      source: run.source,
      pageUrl: run.page_url,
      status: run.status,
      postsFound: run.posts_found,
      createdAt: run.created_at,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Search history error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
