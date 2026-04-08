import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getExcludedBrands, applyBrandFilter } from '@/lib/brand-filter';

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

    const { searchParams } = new URL(request.url);

    // Query params
    const stage = searchParams.get('stage');
    const minScore = searchParams.get('minScore');
    const sort = searchParams.get('sort') || 'score';
    const order = searchParams.get('order') || 'desc';
    const isCompetitor = searchParams.get('isCompetitor');
    const projectType = searchParams.get('projectType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Validate sort param
    const validSorts: Record<string, string> = {
      score: 'score',
      created_at: 'created_at',
      name: 'name',
    };
    const sortColumn = validSorts[sort] || 'score';
    const ascending = order === 'asc';

    // Build query
    let query = supabase
      .from('leads')
      .select(`
        *,
        first_post:posts!leads_first_post_id_fkey (
          id,
          content,
          author_name
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (stage) {
      query = query.eq('stage', stage);
    }

    if (minScore) {
      const scoreNum = parseFloat(minScore);
      if (!isNaN(scoreNum)) {
        query = query.gte('score', scoreNum);
      }
    }

    if (isCompetitor === 'true') {
      query = query.eq('is_competitor', true);
    }

    if (projectType) {
      query = query.eq('project_type', projectType);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query
      .order(sortColumn, { ascending })
      .range(from, to);

    // Haric tutulan markalari cek ve sorguya ekle
    const excludedBrands = await getExcludedBrands(user.id);
    query = applyBrandFilter(query, excludedBrands);

    const { data, error, count } = await query;

    if (error) {
      console.error('Leads query error:', error);
      return NextResponse.json(
        { error: 'Lead listesi alinamadi' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // snake_case -> camelCase mapping
    const leads = (data || []).map((lead) => mapLeadToResponse(lead));

    return NextResponse.json({ leads, total, page, totalPages });
  } catch (error) {
    console.error('Leads list error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLeadToResponse(lead: any) {
  const firstPost = lead.first_post
    ? {
        id: lead.first_post.id,
        contentSnippet: lead.first_post.content
          ? lead.first_post.content.substring(0, 200)
          : null,
        authorName: lead.first_post.author_name,
      }
    : null;

  return {
    id: lead.id,
    userId: lead.user_id,
    name: lead.name,
    title: lead.title,
    company: lead.company,
    linkedinUrl: lead.linkedin_url,
    stage: lead.stage,
    score: lead.score,
    scoreBreakdown: lead.score_breakdown,
    painPoints: lead.pain_points,
    keyInterests: lead.key_interests,
    firstPostId: lead.first_post_id,
    postCount: lead.post_count,
    isActive: lead.is_active,
    source: lead.source,
    profilePicture: lead.profile_picture,
    projectType: lead.project_type || null,
    isCompetitor: lead.is_competitor ?? false,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
    archivedAt: lead.archived_at,
    firstPost,
  };
}
