import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getExcludedBrands, applyBrandFilter } from '@/lib/brand-filter';
import { mapLeadToResponse } from '@/lib/mappers';
import * as cache from '@/lib/cache';

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

    // Cache kontrolu (TTL: 15sn)
    const LEADS_CACHE_TTL = 15_000;
    const queryHash = cache.hashParams({ stage, minScore, sort, order, isCompetitor, projectType, page: String(page), limit: String(limit) });
    const cacheKey = `leads:list:${user.id}:${queryHash}`;
    const cached = cache.get<{ leads: unknown[]; total: number; page: number; totalPages: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

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

    const response = { leads, total, page, totalPages };
    cache.set(cacheKey, response, LEADS_CACHE_TTL);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Leads list error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

