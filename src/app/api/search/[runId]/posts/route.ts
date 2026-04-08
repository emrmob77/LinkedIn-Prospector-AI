import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const { runId } = params;

    if (!runId) {
      return NextResponse.json(
        { error: 'runId parametresi gerekli' },
        { status: 400 }
      );
    }

    // Verify the search_run belongs to this user
    const { data: searchRun, error: runError } = await supabase
      .from('search_runs')
      .select('id')
      .eq('id', runId)
      .eq('user_id', user.id)
      .single();

    if (runError || !searchRun) {
      return NextResponse.json(
        { error: 'Arama calismasi bulunamadi' },
        { status: 404 }
      );
    }

    // Fetch posts for this search run
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(
        `id, content, author_name, author_title, author_company,
         author_linkedin_url, author_profile_picture, author_followers_count,
         author_type, linkedin_post_url, linkedin_urn,
         engagement_likes, engagement_comments, engagement_shares,
         published_at, images,
         is_relevant, relevance_confidence, theme,
         image_analysis, image_analyzed_at`
      )
      .eq('search_run_id', runId)
      .order('published_at', { ascending: false });

    if (postsError) {
      console.error('Posts query error:', postsError);
      return NextResponse.json(
        { error: 'Postlar alinamadi' },
        { status: 500 }
      );
    }

    // snake_case -> camelCase mapping (PostCardData interface'ine uygun)
    const mappedPosts = (posts || []).map((post) => ({
      id: post.linkedin_urn || post.id,
      dbId: post.id,
      authorName: post.author_name || '',
      authorTitle: post.author_title || '',
      authorCompany: post.author_company || '',
      authorProfileUrl: post.author_linkedin_url || '',
      authorProfilePicture: post.author_profile_picture || null,
      authorFollowersCount: post.author_followers_count || null,
      authorType: post.author_type || 'Person',
      linkedinPostUrl: post.linkedin_post_url || '',
      content: post.content || '',
      images: post.images || [],
      engagementLikes: post.engagement_likes || 0,
      engagementComments: post.engagement_comments || 0,
      engagementShares: post.engagement_shares || 0,
      publishedAt: post.published_at || '',
      timeSincePosted: '',
      isRelevant: post.is_relevant ?? null,
      relevanceConfidence: post.relevance_confidence ?? null,
      theme: post.theme ?? null,
      imageAnalysis: post.image_analysis ?? null,
      imageAnalyzedAt: post.image_analyzed_at ?? null,
    }));

    return NextResponse.json({ posts: mappedPosts });
  } catch (error) {
    console.error('Search run posts error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
