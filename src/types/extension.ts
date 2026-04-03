// ============================================
// Chrome Extension integration types
// ============================================

/**
 * Post data scraped by the Chrome Extension content script.
 * Sent from the extension to POST /api/extension/import.
 */
export interface ExtensionPostData {
  content: string;
  authorName: string;
  authorTitle: string;
  authorCompany: string;
  authorLinkedinUrl: string;
  authorProfilePicture: string | null;
  authorType: 'Person' | 'Company';
  linkedinPostUrl: string;
  engagementLikes: number;
  engagementComments: number;
  engagementShares: number;
  publishedAt: string;
  images: string[];
}

/**
 * Request body for POST /api/extension/import
 */
export interface ExtensionImportRequest {
  posts: ExtensionPostData[];
  source: string;
  pageUrl: string;
}

/**
 * Response from POST /api/extension/import
 */
export interface ImportResult {
  searchRunId: string;
  postsImported: number;
  postsDuplicate: number;
  leadCandidatesCount: number;
  /** Alias fields expected by Chrome Extension */
  importedCount?: number;
  duplicateCount?: number;
  leadCount?: number;
  message?: string;
}
