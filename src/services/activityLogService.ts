import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActionType, EntityType } from '@/types/enums';

export interface LogActivityParams {
  supabase: SupabaseClient;
  actionType: ActionType;
  userId: string;
  entityType?: EntityType;
  entityId?: string;
  details?: Record<string, unknown>;
  isSystemAction?: boolean;
}

/**
 * Aktivite kaydı oluşturur.
 * Fire-and-forget: hata durumunda sessizce console.error yapar, throw etmez.
 * Ana işlemi bloklamaması için await edilmeden çağrılabilir.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { supabase, actionType, userId, entityType, entityId, details, isSystemAction } = params;

    const { error } = await supabase.from('activity_logs').insert({
      action_type: actionType,
      user_id: userId,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: details ?? null,
      is_system_action: isSystemAction ?? false,
    });

    if (error) {
      console.error(`[ActivityLog] ${actionType} kaydi basarisiz:`, error.message);
    }
  } catch (err) {
    console.error('[ActivityLog] Beklenmeyen hata:', err);
  }
}
