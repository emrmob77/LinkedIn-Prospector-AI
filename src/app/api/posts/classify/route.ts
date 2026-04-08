import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { classifyPostsBatch, scoreLead } from '@/services/aiClassificationService';
import type { BusinessContext } from '@/services/aiClassificationService';
import { extractLeadsBatch } from '@/services/leadExtractionService';
import { getUserAIClient } from '@/lib/ai-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Post, Lead } from '@/types/models';
import { logActivity } from '@/services/activityLogService';
import { withRateLimit, AI_RATE_LIMIT } from '@/lib/with-rate-limit';

async function handler(request: NextRequest) {
  try {
    // Auth kontrolu
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    // Request body
    const body = await request.json();
    const { searchRunId, postIds } = body as {
      searchRunId?: string;
      postIds?: string[];
    };

    if (!searchRunId && (!postIds || postIds.length === 0)) {
      return NextResponse.json(
        { error: 'searchRunId veya postIds parametresi gerekli' },
        { status: 400 }
      );
    }

    // Postlari cek
    let query = supabase
      .from('posts')
      .select('*');

    if (searchRunId) {
      // searchRunId ile filtreleme — henuz siniflandirilmamis postlari al
      query = query
        .eq('search_run_id', searchRunId)
        .is('classified_at', null);
    } else if (postIds) {
      query = query.in('id', postIds);
    }

    const { data: posts, error: fetchError } = await query;

    if (fetchError) {
      console.error('Postlari cekme hatasi:', fetchError);
      return NextResponse.json(
        { error: 'Postlar veritabanindan cekilemedi' },
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        classified: 0,
        relevant: 0,
        irrelevant: 0,
        message: 'Siniflandirilacak post bulunamadi',
      });
    }

    // DB satirlarini Post tipine donustur
    const typedPosts: Post[] = posts.map((row) => ({
      id: row.id,
      searchRunId: row.search_run_id,
      content: row.content,
      authorName: row.author_name,
      authorTitle: row.author_title,
      authorCompany: row.author_company,
      authorLinkedinUrl: row.author_linkedin_url,
      linkedinPostUrl: row.linkedin_post_url,
      engagementLikes: row.engagement_likes ?? 0,
      engagementComments: row.engagement_comments ?? 0,
      engagementShares: row.engagement_shares ?? 0,
      publishedAt: new Date(row.published_at),
      scrapedAt: new Date(row.scraped_at || row.created_at),
      rawHtml: row.raw_html,
      authorProfilePicture: row.author_profile_picture,
      authorFollowersCount: row.author_followers_count,
      authorType: row.author_type || 'Person',
      images: row.images || [],
      linkedinUrn: row.linkedin_urn,
      rawJson: row.raw_json,
      isRelevant: row.is_relevant,
      relevanceConfidence: row.relevance_confidence,
      theme: row.theme,
      giftType: row.gift_type,
      competitor: row.competitor,
      classificationReasoning: row.classification_reasoning,
      classifiedAt: row.classified_at ? new Date(row.classified_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    // Kullanıcının AI client ve firma bağlamını al
    const aiClient = await getUserAIClient(user.id);

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
          aiTemperature: settings.ai_temperature != null ? Number(settings.ai_temperature) : undefined,
        };
      }
    } catch { /* varsayılan context kullanılır */ }

    // Siniflandirma islemini baslat
    const result = await classifyPostsBatch(typedPosts, supabase, aiClient, businessCtx);

    // searchRunId varsa search_run tablosundaki posts_relevant alanini guncelle
    if (searchRunId) {
      await supabase
        .from('search_runs')
        .update({ posts_relevant: result.relevant })
        .eq('id', searchRunId);
    }

    // --- Lead extraction: ilgili postlardan lead cikar ---
    let leadsCreated = 0;
    let leadsUpdated = 0;
    let leadsScored = 0;

    if (result.relevant > 0) {
      // DB'den siniflandirilmis ve relevant postlari cek
      // (classifyPostsBatch DB'yi gunceller, typedPosts'ta yansimaz)
      const postIdsToCheck = typedPosts.map((p) => p.id);
      const { data: classifiedRows } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIdsToCheck)
        .eq('is_relevant', true);

      if (classifiedRows && classifiedRows.length > 0) {
        const relevantPosts: Post[] = classifiedRows.map((row) => ({
          id: row.id,
          searchRunId: row.search_run_id,
          content: row.content,
          authorName: row.author_name,
          authorTitle: row.author_title,
          authorCompany: row.author_company,
          authorLinkedinUrl: row.author_linkedin_url,
          linkedinPostUrl: row.linkedin_post_url,
          engagementLikes: row.engagement_likes ?? 0,
          engagementComments: row.engagement_comments ?? 0,
          engagementShares: row.engagement_shares ?? 0,
          publishedAt: new Date(row.published_at),
          scrapedAt: new Date(row.scraped_at || row.created_at),
          rawHtml: row.raw_html,
          authorProfilePicture: row.author_profile_picture,
          authorFollowersCount: row.author_followers_count,
          authorType: row.author_type || 'Person',
          images: row.images || [],
          linkedinUrn: row.linkedin_urn,
          rawJson: row.raw_json,
          isRelevant: row.is_relevant,
          relevanceConfidence: row.relevance_confidence,
          theme: row.theme,
          giftType: row.gift_type,
          competitor: row.competitor,
          classificationReasoning: row.classification_reasoning,
          classifiedAt: row.classified_at ? new Date(row.classified_at) : null,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }));

        // Haric tutulan markalari ayarlardan cek
        let excludedBrands: string[] = [];
        try {
          const { data: settingsRow } = await supabaseAdmin
            .from('user_settings')
            .select('excluded_brands, company_name')
            .eq('user_id', user.id)
            .single();
          if (settingsRow) {
            const brands = Array.isArray(settingsRow.excluded_brands)
              ? settingsRow.excluded_brands
              : JSON.parse(settingsRow.excluded_brands || '[]');
            excludedBrands = brands.filter((b: unknown) => typeof b === 'string' && b);
            if (settingsRow.company_name && !excludedBrands.some((b: string) => b.toLowerCase() === (settingsRow.company_name as string).toLowerCase())) {
              excludedBrands.push(settingsRow.company_name as string);
            }
          }
        } catch { /* ignore */ }

        const leadResult = await extractLeadsBatch(relevantPosts, supabase, user.id, excludedBrands);
        leadsCreated = leadResult.created;
        leadsUpdated = leadResult.updated;

        // --- Lead Scoring: yeni oluşturulan lead'leri puanla (max 5) ---
        if (leadsCreated > 0) {
          try {
            // Yeni oluşturulan lead'leri çek (score = 0 ve score_breakdown = null olanlar)
            const relevantLinkedinUrls = relevantPosts
              .map((p) => p.authorLinkedinUrl)
              .filter(Boolean);

            const { data: newLeadRows } = await supabase
              .from('leads')
              .select('*')
              .eq('user_id', user.id)
              .eq('score', 0)
              .is('score_breakdown', null)
              .in('linkedin_url', relevantLinkedinUrls)
              .limit(5);

            if (newLeadRows && newLeadRows.length > 0) {
              for (const row of newLeadRows) {
                const lead: Lead = {
                  id: row.id,
                  userId: row.user_id,
                  name: row.name,
                  title: row.title,
                  company: row.company,
                  linkedinUrl: row.linkedin_url,
                  stage: row.stage,
                  score: Number(row.score),
                  scoreBreakdown: row.score_breakdown,
                  painPoints: row.pain_points || [],
                  keyInterests: row.key_interests || [],
                  firstPostId: row.first_post_id,
                  postCount: row.post_count || 1,
                  isActive: row.is_active ?? true,
                  source: row.source || 'post_author',
                  profilePicture: row.profile_picture || null,
                  projectType: row.project_type || null,
                  isCompetitor: row.is_competitor ?? false,
                  createdAt: new Date(row.created_at),
                  updatedAt: new Date(row.updated_at),
                  archivedAt: row.archived_at ? new Date(row.archived_at) : null,
                };

                const scoreResult = await scoreLead(lead, aiClient, businessCtx);

                const { error: scoreUpdateError } = await supabase
                  .from('leads')
                  .update({
                    score: scoreResult.total,
                    score_breakdown: scoreResult.breakdown,
                  })
                  .eq('id', lead.id);

                if (scoreUpdateError) {
                  console.error('Lead skor guncelleme hatasi:', scoreUpdateError, { leadId: lead.id });
                } else {
                  leadsScored++;
                }
              }
            }
          } catch (scoreError) {
            console.error('Lead scoring hatasi (devam ediliyor):', scoreError);
          }
        }

        // searchRunId varsa leads_extracted alanini guncelle
        if (searchRunId) {
          await supabase
            .from('search_runs')
            .update({ leads_extracted: leadsCreated + leadsUpdated })
            .eq('id', searchRunId);
        }
      }
    }

    // Activity log — post_classified (fire-and-forget)
    logActivity({
      supabase,
      actionType: 'post_classified',
      userId: user.id,
      entityType: 'search_run',
      entityId: searchRunId,
      details: {
        classified: result.classified,
        relevant: result.relevant,
        irrelevant: result.irrelevant,
        leadsScored,
      },
    });

    return NextResponse.json({
      classified: result.classified,
      relevant: result.relevant,
      irrelevant: result.irrelevant,
      leadsCreated,
      leadsUpdated,
      leadsScored,
    });
  } catch (error) {
    console.error('Siniflandirma API hatasi:', error);
    return NextResponse.json(
      { error: 'Sınıflandırma sırasında bir hata oluştu. Lütfen API anahtarınızı kontrol edin.' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, AI_RATE_LIMIT);
