import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserAIClient } from '@/lib/ai-client';
import { generateMessage, BusinessContext } from '@/services/aiClassificationService';
import type { Lead, Post } from '@/types/models';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Auth kontrolu
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Lead'i getir (RLS ile user_id kontrolu)
    const { data: row, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (leadError || !row) {
      return NextResponse.json(
        { error: 'Lead bulunamadi' },
        { status: 404 }
      );
    }

    // Lead'i camelCase'e map et
    const lead: Lead = {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      title: row.title,
      company: row.company,
      linkedinUrl: row.linkedin_url,
      email: row.email || null,
      stage: row.stage,
      score: row.score,
      scoreBreakdown: row.score_breakdown,
      painPoints: row.pain_points || [],
      keyInterests: row.key_interests || [],
      firstPostId: row.first_post_id,
      postCount: row.post_count,
      isActive: row.is_active,
      source: row.source,
      profilePicture: row.profile_picture,
      projectType: row.project_type || null,
      isCompetitor: row.is_competitor ?? false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      archivedAt: row.archived_at ? new Date(row.archived_at) : null,
    };

    // Lead'e bagli ilk post'u getir (lead_posts + posts JOIN)
    const { data: leadPostRow, error: postError } = await supabase
      .from('lead_posts')
      .select(`
        post:posts (
          id, search_run_id, content, author_name, author_title, author_company,
          author_linkedin_url, linkedin_post_url, engagement_likes,
          engagement_comments, engagement_shares, published_at, scraped_at,
          raw_html, author_profile_picture, author_followers_count, author_type,
          images, linkedin_urn, raw_json,
          is_relevant, relevance_confidence, theme, gift_type, competitor,
          classification_reasoning, classified_at, created_at, updated_at
        )
      `)
      .eq('lead_id', id)
      .limit(1)
      .single();

    if (postError || !leadPostRow?.post) {
      return NextResponse.json(
        { error: 'Lead ile iliskili post bulunamadi' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = leadPostRow.post as any;
    const post: Post = {
      id: p.id,
      searchRunId: p.search_run_id,
      content: p.content,
      authorName: p.author_name,
      authorTitle: p.author_title,
      authorCompany: p.author_company,
      authorLinkedinUrl: p.author_linkedin_url,
      linkedinPostUrl: p.linkedin_post_url,
      engagementLikes: p.engagement_likes,
      engagementComments: p.engagement_comments,
      engagementShares: p.engagement_shares,
      publishedAt: p.published_at ? new Date(p.published_at) : new Date(),
      scrapedAt: p.scraped_at ? new Date(p.scraped_at) : new Date(),
      rawHtml: p.raw_html,
      authorProfilePicture: p.author_profile_picture,
      authorFollowersCount: p.author_followers_count,
      authorType: p.author_type || 'Person',
      images: p.images || [],
      linkedinUrn: p.linkedin_urn,
      rawJson: p.raw_json,
      isRelevant: p.is_relevant,
      relevanceConfidence: p.relevance_confidence,
      theme: p.theme,
      giftType: p.gift_type,
      competitor: p.competitor,
      classificationReasoning: p.classification_reasoning,
      classifiedAt: p.classified_at ? new Date(p.classified_at) : null,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    };

    // AI client al
    const aiClient = await getUserAIClient(user.id);

    // User settings'den BusinessContext olustur
    let businessCtx: BusinessContext | undefined;
    try {
      const { data: settings } = await supabaseAdmin
        .from('user_settings')
        .select('classification_prompt, company_context, message_prompt, ai_temperature')
        .eq('user_id', user.id)
        .single();

      if (settings) {
        businessCtx = {
          classificationPrompt: settings.classification_prompt || '',
          companyContext: settings.company_context || '',
          messagePrompt: settings.message_prompt || '',
          aiTemperature: settings.ai_temperature ?? undefined,
        };
      }
    } catch {
      // Settings yoksa default context kullanilacak
    }

    // AI ile mesaj olustur
    const result = await generateMessage(lead, post, aiClient, businessCtx);

    if (!result.dmVersion && !result.emailVersion) {
      return NextResponse.json(
        { error: 'Mesaj olusturulamadi. Lutfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // DM mesaji kaydet
    const { data: dmMessage, error: dmError } = await supabase
      .from('messages')
      .insert({
        lead_id: id,
        user_id: user.id,
        message_type: 'dm' as const,
        subject: null,
        body: result.dmVersion,
        status: 'pending' as const,
        generated_at: now,
        original_body: result.dmVersion,
        edit_count: 0,
      })
      .select('*')
      .single();

    if (dmError) {
      console.error('DM mesaji kaydetme hatasi:', dmError);
      return NextResponse.json(
        { error: 'Mesaj kaydedilemedi' },
        { status: 500 }
      );
    }

    // Email mesaji kaydet
    const { data: emailMessage, error: emailError } = await supabase
      .from('messages')
      .insert({
        lead_id: id,
        user_id: user.id,
        message_type: 'email' as const,
        subject: result.subject,
        body: result.emailVersion,
        status: 'pending' as const,
        generated_at: now,
        original_body: result.emailVersion,
        edit_count: 0,
      })
      .select('*')
      .single();

    if (emailError) {
      console.error('Email mesaji kaydetme hatasi:', emailError);
      return NextResponse.json(
        { error: 'Mesaj kaydedilemedi' },
        { status: 500 }
      );
    }

    // Activity log kaydet
    await supabase
      .from('activity_logs')
      .insert({
        action_type: 'message_generated',
        user_id: user.id,
        is_system_action: false,
        entity_type: 'lead',
        entity_id: id,
        details: {
          leadName: lead.name,
          dmMessageId: dmMessage.id,
          emailMessageId: emailMessage.id,
        },
      });

    // Response: camelCase mapping
    const mapMessage = (m: Record<string, unknown>) => ({
      id: m.id,
      leadId: m.lead_id,
      userId: m.user_id,
      messageType: m.message_type,
      subject: m.subject,
      body: m.body,
      status: m.status,
      generatedAt: m.generated_at,
      approvedAt: m.approved_at,
      approvedBy: m.approved_by,
      sentAt: m.sent_at,
      originalBody: m.original_body,
      editCount: m.edit_count,
      deliveryStatus: (m.delivery_status as string) || 'pending',
      deliveryError: (m.delivery_error as string) || null,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    });

    return NextResponse.json({
      messages: [mapMessage(dmMessage), mapMessage(emailMessage)],
    });
  } catch (error) {
    console.error('Mesaj olusturma hatasi:', error);
    return NextResponse.json(
      { error: 'Mesaj olusturulurken bir hata olustu. Lutfen daha sonra tekrar deneyin.' },
      { status: 500 }
    );
  }
}
