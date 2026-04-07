import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { scoreLead } from '@/services/aiClassificationService';
import type { BusinessContext } from '@/services/aiClassificationService';
import { getUserAIClient } from '@/lib/ai-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Lead } from '@/types/models';

/**
 * POST /api/leads/score — Skoru 0 olan lead'leri AI ile puanla
 */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }

    // Skoru 0 olan lead'leri çek (max 10)
    const { data: rows, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('score', 0)
      .eq('is_active', true)
      .limit(10);

    if (error || !rows || rows.length === 0) {
      return NextResponse.json({ scored: 0, message: 'Puanlanacak lead bulunamadı' });
    }

    // AI client ve business context
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
    } catch { /* varsayılan */ }

    let scored = 0;
    for (const row of rows) {
      try {
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

        const result = await scoreLead(lead, aiClient, businessCtx);

        await supabase
          .from('leads')
          .update({ score: result.total, score_breakdown: result.breakdown })
          .eq('id', lead.id);

        scored++;
      } catch (err) {
        console.error('Lead scoring hatası:', err, { leadId: row.id });
      }
    }

    return NextResponse.json({ scored, total: rows.length });
  } catch (error) {
    console.error('Lead score API hatası:', error);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
