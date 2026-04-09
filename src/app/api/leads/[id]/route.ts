import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // Lead'i getir
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead bulunamadi' },
        { status: 404 }
      );
    }

    // İlişkili post'ları lead_posts üzerinden getir
    const { data: leadPosts, error: postsError } = await supabase
      .from('lead_posts')
      .select(`
        post:posts (
          id,
          content,
          author_name,
          author_title,
          author_company,
          author_linkedin_url,
          linkedin_post_url,
          engagement_likes,
          engagement_comments,
          engagement_shares,
          published_at,
          is_relevant,
          relevance_confidence,
          theme,
          gift_type,
          competitor,
          classification_reasoning,
          classified_at,
          created_at
        )
      `)
      .eq('lead_id', id);

    if (postsError) {
      console.error('Lead posts query error:', postsError);
      return NextResponse.json(
        { error: 'Lead postlari alinamadi' },
        { status: 500 }
      );
    }

    // Map lead to camelCase
    const mappedLead = {
      id: lead.id,
      userId: lead.user_id,
      name: lead.name,
      title: lead.title,
      company: lead.company,
      linkedinUrl: lead.linkedin_url,
      email: lead.email || null,
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
    };

    // Map posts to camelCase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = (leadPosts || []).map((lp: any) => {
      const p = lp.post;
      if (!p) return null;
      return {
        id: p.id,
        content: p.content,
        authorName: p.author_name,
        authorTitle: p.author_title,
        authorCompany: p.author_company,
        authorLinkedinUrl: p.author_linkedin_url,
        linkedinPostUrl: p.linkedin_post_url,
        engagementLikes: p.engagement_likes,
        engagementComments: p.engagement_comments,
        engagementShares: p.engagement_shares,
        publishedAt: p.published_at,
        isRelevant: p.is_relevant,
        relevanceConfidence: p.relevance_confidence,
        theme: p.theme,
        giftType: p.gift_type,
        competitor: p.competitor,
        classificationReasoning: p.classification_reasoning,
        classifiedAt: p.classified_at,
        createdAt: p.created_at,
      };
    }).filter(Boolean);

    return NextResponse.json({ lead: mappedLead, posts });
  } catch (error) {
    console.error('Lead detail error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/leads/[id] — Lead bilgilerini gunceller (email, stage vb.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const body = await request.json();

    const { email, stage, title, company } = body as {
      email?: string | null;
      stage?: string;
      title?: string | null;
      company?: string | null;
    };

    // En az bir alan gerekli
    if (email === undefined && stage === undefined && title === undefined && company === undefined) {
      return NextResponse.json(
        { error: 'En az bir alan gerekli (email, stage, title, company)' },
        { status: 400 }
      );
    }

    // Lead'in var olup olmadigini kontrol et
    const { data: existing, error: fetchError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Lead bulunamadi' },
        { status: 404 }
      );
    }

    // Guncelleme objesi olustur
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (email !== undefined) {
      // Email validasyonu (null ise temizle)
      if (email !== null && email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return NextResponse.json(
            { error: 'Gecersiz email adresi' },
            { status: 400 }
          );
        }
        updateData.email = email.trim();
      } else {
        updateData.email = null;
      }
    }

    if (stage !== undefined) {
      const validStages = [
        'İletişim Kurulacak', 'İletişim Kuruldu', 'Cevap Alındı',
        'Görüşme', 'Teklif', 'Arşiv',
      ];
      if (!validStages.includes(stage)) {
        return NextResponse.json(
          { error: 'Gecersiz pipeline asamasi' },
          { status: 400 }
        );
      }
      updateData.stage = stage;
    }

    if (title !== undefined) updateData.title = title;
    if (company !== undefined) updateData.company = company;

    const { data: updated, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Lead update error:', updateError);
      return NextResponse.json(
        { error: 'Lead guncellenemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      lead: {
        id: updated.id,
        userId: updated.user_id,
        name: updated.name,
        title: updated.title,
        company: updated.company,
        linkedinUrl: updated.linkedin_url,
        email: updated.email || null,
        stage: updated.stage,
        score: updated.score,
        scoreBreakdown: updated.score_breakdown,
        painPoints: updated.pain_points,
        keyInterests: updated.key_interests,
        firstPostId: updated.first_post_id,
        postCount: updated.post_count,
        isActive: updated.is_active,
        source: updated.source,
        profilePicture: updated.profile_picture,
        projectType: updated.project_type || null,
        isCompetitor: updated.is_competitor ?? false,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        archivedAt: updated.archived_at,
      },
    });
  } catch (error) {
    console.error('Lead PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
