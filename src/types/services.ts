import type { Post, Lead } from './models';

// ============================================
// Servis arayüzleri
// ============================================

export interface RawPost {
  content: string;
  authorName: string;
  authorTitle: string;
  authorCompany: string;
  linkedinUrl: string;
  engagementMetrics: {
    likes: number;
    comments: number;
    shares: number;
  };
  publishedAt: Date;
  rawHtml: string;
}

export interface AIClassification {
  isRelevant: boolean;
  confidence: number;
  theme: string;
  giftType?: string;
  competitor?: string;
  reasoning: string;
}

export interface LeadScore {
  total: number;
  breakdown: {
    companySize: number;
    projectClarity: number;
    industryFit: number;
    timing: number;
    competitorStatus: number;
  };
}

export interface MessageDraft {
  subject: string;
  body: string;
  dmVersion: string;
  emailVersion: string;
}

export interface ParsedPost {
  author: {
    name: string;
    title: string;
    company: string;
    profileUrl: string;
  };
  content: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================
// Servis interface'leri
// ============================================

export interface AIClassificationService {
  classifyPost(post: Post): Promise<AIClassification>;
  scoreLead(lead: Lead): Promise<LeadScore>;
  generateMessage(lead: Lead, post: Post): Promise<MessageDraft>;
}

export interface DeduplicationService {
  findDuplicate(linkedinUrl: string): Promise<Lead | null>;
  mergeLead(existingLead: Lead, newData: Partial<Lead>): Promise<Lead>;
}

export interface ExportService {
  exportToCsv(leads: Lead[], filters?: Record<string, unknown>): Promise<string>;
  exportToJson(leads: Lead[], filters?: Record<string, unknown>): Promise<string>;
}
