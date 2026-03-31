import type { PipelineStage, MessageType } from './enums';
import type { Lead, Message } from './models';

// ============================================
// API Request tipleri
// ============================================

export interface SearchRunRequest {
  keywords: string[];
  maxPosts?: number;
}

export interface LeadsListRequest {
  stage?: PipelineStage;
  minScore?: number;
  page?: number;
  limit?: number;
  sortBy?: 'score' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateStageRequest {
  newStage: PipelineStage;
  notes?: string;
}

export interface GenerateMessageRequest {
  messageType: MessageType | 'both';
}

export interface ApproveMessageRequest {
  editedSubject?: string;
  editedBody?: string;
}

export interface UpdateMessageRequest {
  subject?: string;
  body?: string;
}

export interface ExportRequest {
  format: 'csv' | 'json';
  stage?: PipelineStage;
  minScore?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityLogRequest {
  page?: number;
  limit?: number;
  actionType?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardStatsRequest {
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// API Response tipleri
// ============================================

export interface SearchRunResponse {
  searchRunId: string;
  status: string;
  estimatedTime: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface UpdateStageResponse {
  lead: Lead;
  activityLogId: string;
}

export interface GenerateMessageResponse {
  message: Message;
}

export interface ApproveMessageResponse {
  message: Message;
  activityLogId: string;
}

export interface DashboardStats {
  totalLeads: number;
  leadsByStage: Record<PipelineStage, number>;
  conversionRates: {
    fromStage: PipelineStage;
    toStage: PipelineStage;
    rate: number;
  }[];
  averageScoreByStage: Record<PipelineStage, number>;
  searchRunsOverTime: {
    date: string;
    count: number;
  }[];
  messageApprovalRate: number;
  totalSearchRuns: number;
  weeklySearchRuns: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
}
