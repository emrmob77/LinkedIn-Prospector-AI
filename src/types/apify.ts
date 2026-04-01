// ============================================
// Apify supreme_coder/linkedin-post çıktı tipleri
// ============================================

export interface ApifyAuthor {
  firstName: string;
  lastName: string;
  occupation: string;
  id: string;
  publicId: string;
  trackingId: string;
  profileId: string;
  picture?: string;
  backgroundImage?: string;
  distance?: string;
}

export interface ApifyCompany {
  name: string;
  universalName: string;
  trackingId: string;
  active: boolean;
  showcase: boolean;
  entityUrn: string;
  logoUrl?: string;
}

export interface ApifyAttribute {
  start: number;
  length: number;
  type: string;
  company?: ApifyCompany;
}

export interface ApifyComment {
  time: number;
  link: string;
  text: string;
  entities: ApifyAttribute[];
  pinned: boolean;
  originalLanguage: string;
  author: ApifyAuthor;
}

export interface ApifyReaction {
  type: string;
  profile: ApifyAuthor;
}

export interface ApifyPost {
  // Gönderi tanımlayıcıları
  isActivity: boolean | null;
  urn: string;
  url: string;
  shareUrn: string;

  // İçerik
  text: string;
  type: string;
  images: string[];
  attributes: ApifyAttribute[];

  // Etkileşim
  numLikes: number;
  numComments: number;
  numShares: number;
  numImpressions: number | null;
  comments: ApifyComment[];
  reactions: ApifyReaction[];

  // Yazar bilgileri
  authorName: string;
  authorType: 'Person' | 'Company';
  authorProfileId: string;
  authorProfileUrl: string;
  authorProfilePicture: string | null;
  authorFollowersCount: string | null;
  authorUrn: string;
  author: ApifyAuthor | ApifyCompany;

  // Zaman bilgileri
  timeSincePosted: string;
  postedAtTimestamp: number;
  postedAtISO: string;

  // Erişim bilgileri
  canReact: boolean;
  canPostComments: boolean;
  canShare: boolean;
  allowedCommentersScope: string;
  commentingDisabled: boolean | null;
  rootShare: boolean;
  shareAudience: string;

  // Girdi izleme
  inputUrl: string;
}

// ============================================
// Mapper çıktı tipleri
// ============================================

export interface LeadCandidate {
  name: string;
  title: string;
  linkedinUrl: string;
  profilePicture: string | null;
  source: 'post_author' | 'commenter' | 'reactor';
  sourcePostUrn: string;
}

// ============================================
// Apify API Client tipleri
// ============================================

export interface ApifySearchParams {
  keywords: string[];
  maxPosts?: number;
  dateFilter?: 'past-24h' | 'past-week' | 'past-month';
  geoId?: string;
  urls?: string[];
  deepScrape?: boolean;
  scrapeUntil?: string;
}

export interface ApifyRunResult {
  runId: string;
  datasetId: string;
  posts: ApifyPost[];
  status: 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
}
