import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { PIPELINE_STAGES, PipelineStage } from '@/types/enums';
import { logActivity } from '@/services/activityLogService';

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
    const { stage } = body as { stage: PipelineStage };

    // Validate stage
    if (!stage || !PIPELINE_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Gecersiz pipeline asamasi. Gecerli degerler: ${PIPELINE_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    // Lead'in var olduğunu ve kullanıcıya ait olduğunu kontrol et
    const { data: existingLead, error: checkError } = await supabase
      .from('leads')
      .select('id, stage, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existingLead) {
      return NextResponse.json(
        { error: 'Lead bulunamadi' },
        { status: 404 }
      );
    }

    // Stage ve updated_at güncelle
    const updateData: Record<string, unknown> = {
      stage,
      updated_at: new Date().toISOString(),
    };

    // Arşiv aşamasına geçiliyorsa archived_at set et
    if (stage === 'Arşiv') {
      updateData.archived_at = new Date().toISOString();
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Lead stage update error:', updateError);
      return NextResponse.json(
        { error: 'Lead asamasi guncellenemedi' },
        { status: 500 }
      );
    }

    // Activity log — lead_stage_changed (fire-and-forget)
    logActivity({
      supabase,
      actionType: 'lead_stage_changed',
      userId: user.id,
      entityType: 'lead',
      entityId: id,
      details: {
        oldStage: existingLead.stage,
        newStage: stage,
        leadName: existingLead.name,
      },
    });

    // Map to camelCase
    const lead = {
      id: updatedLead.id,
      userId: updatedLead.user_id,
      name: updatedLead.name,
      title: updatedLead.title,
      company: updatedLead.company,
      linkedinUrl: updatedLead.linkedin_url,
      stage: updatedLead.stage,
      score: updatedLead.score,
      scoreBreakdown: updatedLead.score_breakdown,
      painPoints: updatedLead.pain_points,
      keyInterests: updatedLead.key_interests,
      firstPostId: updatedLead.first_post_id,
      postCount: updatedLead.post_count,
      isActive: updatedLead.is_active,
      source: updatedLead.source,
      profilePicture: updatedLead.profile_picture,
      createdAt: updatedLead.created_at,
      updatedAt: updatedLead.updated_at,
      archivedAt: updatedLead.archived_at,
    };

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Lead stage update error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
