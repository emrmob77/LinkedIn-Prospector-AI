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

  // Ek alanlar
  authorProfilePicture: string | null;
  authorFollowersCount: string | null;
  authorType: 'Person' | 'Company';
  images: string[];
  linkedinUrn: string | null;
  rawJson: Record<string, unknown> | null;

  // AI Sınıflandırma alanları
  isRelevant: boolean | null;
  relevanceConfidence: number | null;
  theme: string | null;
  giftType: string | null;
  competitor: string | null;
  classificationReasoning: string | null;
  classifiedAt: Date | null;

  // AI Görsel Analiz alanları (opsiyonel — migration sonrası mevcut)
  imageAnalysis?: ImageAnalysisResult | null;
  imageAnalyzedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface ImageAnalysisResult {
  products: string[];        // Tespit edilen ürünler
  brands: string[];          // Tespit edilen markalar
  eventType: string | null;  // Etkinlik türü (kutlama, lansman, vb.)
  qualityAssessment: string; // Görsel kalite değerlendirmesi
  relevanceScore: number;    // 0-100 uygunluk skoru
  relevanceSummary: string;  // Kısa açıklama
}

export type LeadSource = 'post_author' | 'commenter' | 'reactor';

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
  source: LeadSource;
  profilePicture: string | null;
  projectType: string | null;
  isCompetitor: boolean;
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

export type DateFilter = 'past-24h' | 'past-week' | 'past-month';

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

  searchUrl: string | null;

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

// ============================================
// Kullanıcı Ayarları
// ============================================

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'openrouter';

export interface UserSettings {
  id: string;
  userId: string;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  googleApiKey: string | null;
  openrouterApiKey: string | null;
  aiProvider: AIProvider;
  aiModel: string | null;
  aiTemperature: number;
  autoClassify: boolean;
  companyName: string;
  companySector: string;
  productDescription: string;
  targetCustomer: string;
  companyWebsite: string | null;
  classificationPrompt: string;
  companyContext: string;
  messagePrompt: string;
  excludedBrands: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Client'a gönderilen maskelenmiş versiyon — raw key asla expose edilmez */
export interface UserSettingsPublic {
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
  hasGoogleKey: boolean;
  hasOpenrouterKey: boolean;
  anthropicKeyHint: string | null;
  openaiKeyHint: string | null;
  googleKeyHint: string | null;
  openrouterKeyHint: string | null;
  aiProvider: AIProvider;
  aiModel: string | null;
  aiTemperature: number;
  autoClassify: boolean;
  // Firma bilgileri
  companyName: string;
  companySector: string;
  productDescription: string;
  targetCustomer: string;
  companyWebsite: string | null;
  classificationPrompt: string;
  companyContext: string;
  messagePrompt: string;
  excludedBrands: string[];
}
