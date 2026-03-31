import {
  PipelineStage,
  MessageStatus,
  SearchRunStatus,
  ActionType,
  MessageType,
  EntityType,
} from './enums';

// ============================================
// Veritabanı modelleri
// ============================================

export interface Post {
  id: string;
  searchRunId: string;
  content: string;
  authorName: string;
  authorTitle: string | null;
  authorCompany: string | null;
  authorLinkedinUrl: string;
  linkedinPostUrl: string;
  engagementLikes: number;
  engagementComments: number;
  engagementShares: number;
  publishedAt: Date;
  scrapedAt: Date;
  rawHtml: string | null;
  isRelevant: boolean | null;
  relevanceConfidence: number | null;
  theme: string | null;
  giftType: string | null;
  competitor: string | null;
  classificationReasoning: string | null;
  classifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  userId: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedinUrl: string;
  stage: PipelineStage;
  score: number;
  scoreBreakdown: LeadScoreBreakdown | null;
  painPoints: string[];
  keyInterests: string[];
  firstPostId: string | null;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface LeadScoreBreakdown {
  companySize: number;
  projectClarity: number;
  industryFit: number;
  timing: number;
  competitorStatus: number;
}

export interface Message {
  id: string;
  leadId: string;
  userId: string;
  messageType: MessageType;
  subject: string | null;
  body: string;
  status: MessageStatus;
  generatedAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  sentAt: Date | null;
  originalBody: string | null;
  editCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  actionType: ActionType;
  userId: string | null;
  isSystemAction: boolean;
  entityType: EntityType | null;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
}

export interface SearchRun {
  id: string;
  userId: string;
  keywords: string[];
  maxPosts: number;
  status: SearchRunStatus;
  postsFound: number;
  postsRelevant: number;
  leadsExtracted: number;
  startedAt: Date | null;
  completedAt: Date | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  keywords: string[];
  maxPosts: number;
  createdAt: Date;
  updatedAt: Date;
}
