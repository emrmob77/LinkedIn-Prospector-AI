export type PipelineStage =
  | 'İletişim Kurulacak'
  | 'İletişim Kuruldu'
  | 'Cevap Alındı'
  | 'Görüşme'
  | 'Teklif'
  | 'Arşiv';

export const PIPELINE_STAGES: PipelineStage[] = [
  'İletişim Kurulacak',
  'İletişim Kuruldu',
  'Cevap Alındı',
  'Görüşme',
  'Teklif',
  'Arşiv',
];

export type MessageStatus = 'pending' | 'approved' | 'rejected' | 'sent';

export type SearchRunStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ActionType =
  | 'search_started'
  | 'search_completed'
  | 'post_classified'
  | 'lead_created'
  | 'lead_stage_changed'
  | 'message_generated'
  | 'message_approved'
  | 'message_sent'
  | 'lead_merged'
  | 'export_created'
  | 'extension_import'
  | 'competitor_toggled';

export type MessageType = 'dm' | 'email';

export type EntityType = 'post' | 'lead' | 'message' | 'search_run' | 'export';

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
