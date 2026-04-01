import type { Post, Lead } from './models';
import type { ApifyPost, ApifySearchParams, ApifyRunResult, LeadCandidate } from './apify';

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

// ============================================
// Apify tabanlı servisler
// ============================================

export interface ApifyScraperService {
  runSearch(params: ApifySearchParams): Promise<ApifyRunResult>;
  buildSearchUrl(params: ApifySearchParams): string;
  getRunStatus(runId: string): Promise<string>;
}

export interface ApifyMapperService {
  mapPost(apifyPost: ApifyPost): Omit<Post, 'id' | 'searchRunId' | 'createdAt' | 'updatedAt' | 'scrapedAt'>;
  extractLeadCandidates(apifyPost: ApifyPost): LeadCandidate[];
  validate(apifyPost: ApifyPost): ValidationResult;
}

// ============================================
// Eski servisler (geriye uyumluluk)
// ============================================

/** @deprecated Apify entegrasyonu ile değiştirildi, ApifyScraperService kullanın */
export interface ScraperService {
  scrapeLinkedInPosts(keywords: string[], maxPosts: number): Promise<RawPost[]>;
  handleRateLimit(retryCount: number): Promise<void>;
}

export interface AIClassificationService {
  classifyPost(post: Post): Promise<AIClassification>;
  scoreLead(lead: Lead): Promise<LeadScore>;
  generateMessage(lead: Lead, post: Post): Promise<MessageDraft>;
}

/** @deprecated Apify entegrasyonu ile değiştirildi, ApifyMapperService kullanın */
export interface ParserService {
  parsePost(html: string): ParsedPost;
  validate(data: ParsedPost): ValidationResult;
  prettyPrint(data: ParsedPost): string;
}

export interface DeduplicationService {
  findDuplicate(linkedinUrl: string): Promise<Lead | null>;
  mergeLead(existingLead: Lead, newData: Partial<Lead>): Promise<Lead>;
}

export interface ExportService {
  exportToCsv(leads: Lead[], filters?: Record<string, unknown>): Promise<string>;
  exportToJson(leads: Lead[], filters?: Record<string, unknown>): Promise<string>;
}
