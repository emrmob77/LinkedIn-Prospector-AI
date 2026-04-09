/**
 * Merkezi snake_case → camelCase mapper fonksiyonları.
 *
 * DB satırlarını API response formatına dönüştürür.
 * Tüm API route'lar bu dosyadaki mapper'ları kullanmalıdır.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapLeadToResponse(lead: any) {
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
    ...(firstPost ? { firstPost } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMessage(row: any) {
  return {
    id: row.id,
    leadId: row.lead_id,
    userId: row.user_id,
    messageType: row.message_type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    generatedAt: row.generated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    sentAt: row.sent_at,
    originalBody: row.original_body,
    editCount: row.edit_count,
    deliveryStatus: row.delivery_status || 'pending',
    deliveryError: row.delivery_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
