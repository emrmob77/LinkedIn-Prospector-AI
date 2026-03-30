# Tasarım Dokümanı: LinkedIn Prospector AI

## Genel Bakış

LinkedIn Prospector AI, yapay zeka destekli gönderi tarama, filtreleme ve kişiselleştirilmiş mesaj oluşturma yoluyla LinkedIn potansiyel müşteri yaratmayı otomatikleştiren bağımsız bir SaaS uygulamasıdır. Sistem, ilgili potansiyel müşterileri akıllıca tanımlayarak ve zorunlu insan onayı ile özelleştirilmiş iletişim mesajları oluşturarak manuel araştırma süresini günlük 3-4 saatten 30 dakikaya düşürür.

Uygulama, 6 aşamalı (İletişim Kurulacak → İletişim Kuruldu → Cevap Alındı → Görüşme → Teklif → Arşiv) eksiksiz bir satış hattı yönetim sistemi olarak çalışır ve harici CRM entegrasyonu ihtiyacını ortadan kaldırır.

### Temel Tasarım İlkeleri

- **İnsan Döngüde**: Tüm yapay zeka tarafından oluşturulan mesajlar gönderilmeden önce açık insan onayı gerektirir
- **Aktivite Kaydı**: Her kullanıcı ve sistem eylemi denetim ve analitik için kaydedilir
- **Bağımsız Mimari**: Harici CRM bağımlılığı yok; yerleşik eksiksiz hat yönetimi
- **Hız Limiti Dayanıklılığı**: LinkedIn ve API hız limitlerinin üstel geri çekilme ile zarif şekilde ele alınması
- **Veri Gizliliği**: Şifreli depolama, HTTPS iletimi, GDPR uyumluluğu

### Teknoloji Yığını

- **Frontend**: Next.js 14 + React 18 + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **AI Engine**: Claude API (Anthropic) for classification, scoring, and message generation
- **Scraping**: Playwright for LinkedIn data extraction
- **Queue System**: BullMQ with Redis for background job processing
- **Authentication**: Supabase Auth

## Mimari

### Sistem Mimarisi Diyagramı

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Next.js UI]
        Dashboard[Dashboard Page]
        Search[LinkedIn Search Page]
        Pipeline[Contact Pipeline Page]
        Reports[Reporting Page]
    end
    
    subgraph "API Layer"
        API[Next.js API Routes]
        SearchAPI[/api/search/run]
        LeadsAPI[/api/leads]
        MessagesAPI[/api/messages]
        ActivityAPI[/api/activity-log]
        StatsAPI[/api/dashboard/stats]
    end
    
    subgraph "Service Layer"
        Scraper[LinkedIn Scraper Service]
        AIEngine[AI Classification Service]
        Parser[HTML Parser]
        Dedup[Deduplication Service]
        Export[Export Service]
    end
    
    subgraph "Queue Layer"
        Queue[BullMQ Job Queue]
        ScrapeJobs[Scraping Jobs]
        AIJobs[AI Processing Jobs]
    end
    
    subgraph "Data Layer"
        DB[(Supabase PostgreSQL)]
        Cache[Redis Cache]
    end
    
    subgraph "External Services"
        LinkedIn[LinkedIn]
        Claude[Claude API]
    end
    
    UI --> API
    Dashboard --> StatsAPI
    Search --> SearchAPI
    Pipeline --> LeadsAPI
    Reports --> ActivityAPI
    
    API --> Queue
    API --> DB
    API --> Cache
    
    Queue --> Scraper
    Queue --> AIEngine
    
    Scraper --> LinkedIn
    Scraper --> Parser
    Parser --> Dedup
    Dedup --> DB
    
    AIEngine --> Claude
    AIEngine --> DB
    
    Export --> DB
```

### Mimari Katmanlar

#### 1. Frontend Katmanı (Next.js + React)

Frontend, dört ana sayfaya sahip sunucu tarafında render edilen bir Next.js uygulamasıdır:

- **Dashboard**: Metrikleri, mini hat hunisini ve son aktiviteleri gösterir
- **LinkedIn Arama**: Anahtar kelime girişi, AI sınıflandırma rozetleri ile sonuç listesi
- **İletişim Hattı**: 6 aşamalı sütunlarla tablo görünümü, potansiyel müşteri detay paneli
- **Raporlama**: Filtreleme ve dashboard metrikleri ile aktivite kaydı

Tüm sayfalar tutarlı tasarım için shadcn/ui bileşenlerini ve stil için Tailwind CSS kullanır.

#### 2. API Katmanı (Next.js API Routes)

RESTful API endpoint'leri tüm iş mantığını yönetir:

- `POST /api/search/run`: LinkedIn tarama işini başlatır
- `GET /api/leads`: Filtrelerle sayfalandırılmış potansiyel müşteri listesi döndürür
- `GET /api/leads/:id`: Detaylı potansiyel müşteri bilgisi döndürür
- `PATCH /api/leads/:id/stage`: Hat aşamasını günceller
- `POST /api/leads/:id/generate-message`: AI mesaj oluşturmayı tetikler
- `POST /api/messages/:id/approve`: Gönderim için mesajı onaylar
- `GET /api/activity-log`: Filtrelenmiş aktivite kaydı döndürür
- `GET /api/dashboard/stats`: Toplu metrikleri döndürür

#### 3. Servis Katmanı

Kapsüllenmiş iş mantığı servisleri:

- **LinkedIn Scraper Service**: Hız sınırlama ile Playwright tabanlı tarama (3-5 saniye gecikmeler)
- **AI Classification Service**: Filtreleme, puanlama ve mesaj oluşturma için Claude API entegrasyonu
- **HTML Parser**: LinkedIn HTML'inden yapılandırılmış veri çıkarır
- **Deduplication Service**: LinkedIn URL'sine göre yinelenen potansiyel müşterileri tespit eder
- **Export Service**: CSV/JSON dışa aktarımları oluşturur

#### 4. Kuyruk Katmanı (BullMQ + Redis)

Uzun süren işlemler için arka plan iş işleme:

- **Scraping Jobs**: Asenkron LinkedIn veri çıkarma
- **AI Processing Jobs**: Toplu sınıflandırma ve puanlama
- **Retry Logic**: Başarısız işler için üstel geri çekilme

#### 5. Veri Katmanı

- **Supabase PostgreSQL**: 5 çekirdek tablo ile birincil veri deposu
- **Redis Cache**: Oturum depolama ve iş kuyruğu yönetimi

### Veri Akışı

#### Tarama Akışı

1. Kullanıcı anahtar kelimeleri gönderir → `POST /api/search/run`
2. API `search_runs` kaydı oluşturur ve tarama işini kuyruğa alır
3. Scraper, hız sınırlama ile LinkedIn'den gönderileri çıkarır
4. Parser, HTML'yi yapılandırılmış veriye dönüştürür
5. Gönderiler `search_run_id`'ye bağlı olarak `posts` tablosunda saklanır
6. Her gönderi için AI sınıflandırma işi kuyruğa alınır
7. AI Engine ilgiliği sınıflandırır ve potansiyel müşterileri çıkarır
8. Potansiyel müşteriler yineleme kontrolü ile `leads` tablosunda saklanır
9. Aktivite süreç boyunca kaydedilir

#### Mesaj Oluşturma Akışı

1. Kullanıcı "Mesaj Oluştur"a tıklar → `POST /api/leads/:id/generate-message`
2. API potansiyel müşteri ve ilişkili gönderi verilerini alır
3. AI Engine, Claude API kullanarak kişiselleştirilmiş mesaj oluşturur
4. Mesaj taslağı status='pending' ile `messages` tablosunda saklanır
5. Frontend kullanıcı incelemesi için taslağı gösterir
6. Kullanıcı onaylar → `POST /api/messages/:id/approve`
7. Mesaj durumu 'approved' olarak güncellenir
8. Aktivite kaydedilir

## Bileşenler ve Arayüzler

### Frontend Bileşenleri

#### Dashboard Bileşenleri

```typescript
// MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: number;
  change?: number; // percentage change
  icon: React.ReactNode;
}

// PipelineFunnel.tsx
interface PipelineFunnelProps {
  stages: Array<{
    name: string;
    count: number;
    conversionRate?: number;
  }>;
}

// RecentActivity.tsx
interface RecentActivityProps {
  activities: ActivityLog[];
  limit: number;
}
```

#### Arama Bileşenleri

```typescript
// SearchForm.tsx
interface SearchFormProps {
  onSubmit: (keywords: string[]) => Promise<void>;
  savedSearches: SavedSearch[];
}

// PostList.tsx
interface PostListProps {
  posts: Post[];
  onClassify: (postId: string) => void;
  showIrrelevant: boolean;
}

// PostCard.tsx
interface PostCardProps {
  post: Post;
  classification?: AIClassification;
  onExtractLead: (postId: string) => void;
}
```

#### Hat Bileşenleri

```typescript
// PipelineTable.tsx
interface PipelineTableProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: PipelineStage) => Promise<void>;
  onSelectLead: (leadId: string) => void;
}

// LeadDetailPanel.tsx
interface LeadDetailPanelProps {
  lead: Lead;
  posts: Post[];
  messages: Message[];
  onGenerateMessage: () => Promise<void>;
  onApproveMessage: (messageId: string) => Promise<void>;
}

// StageColumn.tsx
interface StageColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onDrop: (leadId: string) => void;
}
```

### Backend Servisleri

#### LinkedIn Scraper Service

```typescript
interface ScraperService {
  /**
   * Verilen anahtar kelimeler için LinkedIn gönderilerini tarar
   * @param keywords - Arama terimleri
   * @param maxPosts - Alınacak maksimum gönderi sayısı
   * @returns Ham gönderi verisi dizisi
   */
  scrapeLinkedInPosts(
    keywords: string[],
    maxPosts: number
  ): Promise<RawPost[]>;

  /**
   * Üstel geri çekilme ile hız sınırlamayı yönetir
   * @param retryCount - Mevcut yeniden deneme girişimi
   */
  handleRateLimit(retryCount: number): Promise<void>;
}

interface RawPost {
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
```

#### AI Classification Service

```typescript
interface AIClassificationService {
  /**
   * Claude API kullanarak gönderi ilgililiğini sınıflandırır
   * @param post - Sınıflandırılacak gönderi
   * @returns Sınıflandırma sonucu
   */
  classifyPost(post: Post): Promise<AIClassification>;

  /**
   * Potansiyel müşteri kalitesini puanlar (0-100)
   * @param lead - Puanlanacak potansiyel müşteri
   * @returns Dökümü ile sayısal puan
   */
  scoreLead(lead: Lead): Promise<LeadScore>;

  /**
   * Kişiselleştirilmiş iletişim mesajı oluşturur
   * @param lead - Hedef potansiyel müşteri
   * @param post - İlişkili gönderi
   * @returns Konu ve gövde ile mesaj taslağı
   */
  generateMessage(lead: Lead, post: Post): Promise<MessageDraft>;
}

interface AIClassification {
  isRelevant: boolean;
  confidence: number; // 0-100
  theme: string;
  giftType?: string;
  competitor?: string;
  reasoning: string;
}

interface LeadScore {
  total: number; // 0-100
  breakdown: {
    companySize: number; // %30 ağırlık
    projectClarity: number; // %25 ağırlık
    industryFit: number; // %20 ağırlık
    timing: number; // %15 ağırlık
    competitorStatus: number; // %10 ağırlık
  };
}

interface MessageDraft {
  subject: string;
  body: string;
  dmVersion: string; // 3-4 cümle
  emailVersion: string; // 5-6 cümle
}
```

#### Parser Service

```typescript
interface ParserService {
  /**
   * LinkedIn HTML'ini yapılandırılmış veriye ayrıştırır
   * @param html - Ham HTML string
   * @returns Ayrıştırılmış gönderi verisi
   */
  parsePost(html: string): ParsedPost;

  /**
   * Ayrıştırılmış veri yapısını doğrular
   * @param data - Ayrıştırılmış veri
   * @returns Doğrulama sonucu
   */
  validate(data: ParsedPost): ValidationResult;

  /**
   * Ayrıştırılmış veriyi görüntüleme için biçimlendirir
   * @param data - Ayrıştırılmış veri
   * @returns Biçimlendirilmiş string
   */
  prettyPrint(data: ParsedPost): string;
}

interface ParsedPost {
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
```

#### Deduplication Service

```typescript
interface DeduplicationService {
  /**
   * Potansiyel müşterinin zaten var olup olmadığını kontrol eder
   * @param linkedinUrl - LinkedIn profil URL'si
   * @returns Mevcut potansiyel müşteri veya null
   */
  findDuplicate(linkedinUrl: string): Promise<Lead | null>;

  /**
   * Yinelenen potansiyel müşteri verisini birleştirir
   * @param existingLead - Mevcut potansiyel müşteri kaydı
   * @param newData - Yeni potansiyel müşteri bilgisi
   * @returns Güncellenmiş potansiyel müşteri
   */
  mergeLead(existingLead: Lead, newData: Partial<Lead>): Promise<Lead>;
}
```

### API Arayüzleri

#### Request/Response Tipleri

```typescript
// POST /api/search/run
interface SearchRunRequest {
  keywords: string[];
  maxPosts?: number;
}

interface SearchRunResponse {
  searchRunId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime: number; // seconds
}

// GET /api/leads
interface LeadsListRequest {
  stage?: PipelineStage;
  minScore?: number;
  page?: number;
  limit?: number;
}

interface LeadsListResponse {
  leads: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

// PATCH /api/leads/:id/stage
interface UpdateStageRequest {
  newStage: PipelineStage;
  notes?: string;
}

interface UpdateStageResponse {
  lead: Lead;
  activityLogId: string;
}

// POST /api/leads/:id/generate-message
interface GenerateMessageRequest {
  messageType: 'dm' | 'email' | 'both';
}

interface GenerateMessageResponse {
  message: Message;
  estimatedTime: number;
}

// POST /api/messages/:id/approve
interface ApproveMessageRequest {
  editedSubject?: string;
  editedBody?: string;
}

interface ApproveMessageResponse {
  message: Message;
  activityLogId: string;
}
```

## Veri Modelleri

### Veritabanı Şeması

#### 1. posts Tablosu

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_run_id UUID NOT NULL REFERENCES search_runs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_title VARCHAR(255),
  author_company VARCHAR(255),
  author_linkedin_url VARCHAR(500) NOT NULL,
  linkedin_post_url VARCHAR(500) NOT NULL UNIQUE,
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,
  published_at TIMESTAMP NOT NULL,
  scraped_at TIMESTAMP NOT NULL DEFAULT NOW(),
  raw_html TEXT,
  
  -- AI Sınıflandırma alanları
  is_relevant BOOLEAN,
  relevance_confidence DECIMAL(5,2), -- 0-100
  theme VARCHAR(255),
  gift_type VARCHAR(255),
  competitor VARCHAR(255),
  classification_reasoning TEXT,
  classified_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_search_run ON posts(search_run_id);
CREATE INDEX idx_posts_relevance ON posts(is_relevant, relevance_confidence);
CREATE INDEX idx_posts_author_url ON posts(author_linkedin_url);
```

#### 2. leads Tablosu

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  linkedin_url VARCHAR(500) NOT NULL UNIQUE,
  
  -- Hat yönetimi
  stage VARCHAR(50) NOT NULL DEFAULT 'İletişim Kurulacak',
  -- Aşamalar: İletişim Kurulacak, İletişim Kuruldu, Cevap Alındı, Görüşme, Teklif, Arşiv
  
  -- AI Puanlama
  score DECIMAL(5,2) NOT NULL, -- 0-100
  score_breakdown JSONB, -- {companySize: 30, projectClarity: 25, ...}
  
  -- Potansiyel müşteri bağlamı
  pain_points TEXT[],
  key_interests TEXT[],
  
  -- Metadata
  first_post_id UUID REFERENCES posts(id),
  post_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE INDEX idx_leads_stage ON leads(stage) WHERE is_active = TRUE;
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_linkedin_url ON leads(linkedin_url);

-- Potansiyel müşteri-gönderi ilişkileri için bağlantı tablosu (çoktan-çoğa)
CREATE TABLE lead_posts (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, post_id)
);
```

#### 3. messages Tablosu

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Mesaj içeriği
  message_type VARCHAR(20) NOT NULL, -- 'dm' or 'email'
  subject VARCHAR(500),
  body TEXT NOT NULL,
  
  -- Onay iş akışı
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, sent
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMP,
  
  -- Düzenleme geçmişi
  original_body TEXT,
  edit_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_status ON messages(status);
```

#### 4. activity_logs Tablosu

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Eylem detayları
  action_type VARCHAR(50) NOT NULL,
  -- Tipler: search_started, search_completed, post_classified, lead_created,
  --        lead_stage_changed, message_generated, message_approved, message_sent,
  --        lead_merged, export_created
  
  -- Aktör
  user_id UUID REFERENCES auth.users(id),
  is_system_action BOOLEAN DEFAULT FALSE,
  
  -- Etkilenen varlıklar
  entity_type VARCHAR(50), -- post, lead, message, search_run
  entity_id UUID,
  
  -- Ek bağlam
  details JSONB,
  -- Örnekler:
  -- {oldStage: "İletişim Kurulacak", newStage: "İletişim Kuruldu"}
  -- {keywords: ["kurumsal hediye", "yılbaşı"], postsFound: 47}
  -- {confidence: 87, theme: "corporate gifting"}
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action_type);
```

#### 5. search_runs Tablosu

```sql
CREATE TABLE search_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Arama parametreleri
  keywords TEXT[] NOT NULL,
  max_posts INTEGER DEFAULT 100,
  
  -- Yürütme durumu
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  -- Durum: queued, processing, completed, failed, cancelled
  
  -- Sonuçlar
  posts_found INTEGER DEFAULT 0,
  posts_relevant INTEGER DEFAULT 0,
  leads_extracted INTEGER DEFAULT 0,
  
  -- Zamanlama
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Hata yönetimi
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_runs_user ON search_runs(user_id);
CREATE INDEX idx_search_runs_status ON search_runs(status);
CREATE INDEX idx_search_runs_created ON search_runs(created_at DESC);
```

### Tip Tanımları

```typescript
type PipelineStage =
  | 'İletişim Kurulacak'
  | 'İletişim Kuruldu'
  | 'Cevap Alındı'
  | 'Görüşme'
  | 'Teklif'
  | 'Arşiv';

type MessageStatus = 'pending' | 'approved' | 'rejected' | 'sent';

type SearchRunStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

type ActionType =
  | 'search_started'
  | 'search_completed'
  | 'post_classified'
  | 'lead_created'
  | 'lead_stage_changed'
  | 'message_generated'
  | 'message_approved'
  | 'message_sent'
  | 'lead_merged'
  | 'export_created';

interface Post {
  id: string;
  searchRunId: string;
  content: string;
  authorName: string;
  authorTitle: string;
  authorCompany: string;
  authorLinkedinUrl: string;
  linkedinPostUrl: string;
  engagementLikes: number;
  engagementComments: number;
  engagementShares: number;
  publishedAt: Date;
  scrapedAt: Date;
  rawHtml: string;
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

interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  stage: PipelineStage;
  score: number;
  scoreBreakdown: {
    companySize: number;
    projectClarity: number;
    industryFit: number;
    timing: number;
    competitorStatus: number;
  };
  painPoints: string[];
  keyInterests: string[];
  firstPostId: string;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

interface Message {
  id: string;
  leadId: string;
  messageType: 'dm' | 'email';
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

interface ActivityLog {
  id: string;
  timestamp: Date;
  actionType: ActionType;
  userId: string | null;
  isSystemAction: boolean;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, any>;
  createdAt: Date;
}

interface SearchRun {
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
```


## Doğruluk Özellikleri (Correctness Properties)

*Bir özellik (property), bir sistemin tüm geçerli yürütmelerinde doğru olması gereken bir karakteristik veya davranıştır—esasen, sistemin ne yapması gerektiği hakkında resmi bir ifadedir. Özellikler, insan tarafından okunabilir spesifikasyonlar ile makine tarafından doğrulanabilir doğruluk garantileri arasında köprü görevi görür.*

### Özellik Yansıması

Tüm kabul kriterlerini analiz ettikten sonra, birkaç fazlalık alanı tespit ettim:

1. **Kayıt özellikleri (7.1, 7.2, 7.3)** aktivite kaydı hakkında tek bir kapsamlı özellikte birleştirilebilir
2. **Şema doğrulama özellikleri (9.1-9.5)** gerekli veritabanı alanları hakkında tek bir özellikte birleştirilebilir
3. **İnsan onayı özellikleri (6.1, 6.5)** aynıdır ve birleştirilmelidir
4. **Dışa aktarma formatı özellikleri (14.1, 14.2)** dışa aktarma işlevselliği hakkında tek bir özellikte birleştirilebilir
5. **Yapılandırma özellikleri (18.1-18.4)** yapılandırma yönetimi hakkında tek bir özellikte birleştirilebilir
6. **API yeniden deneme özellikleri (1.5, 9.7, 20.1, 20.3)** aynı üstel geri çekilme modelini paylaşır ve birleştirilebilir

Aşağıdaki özellikler benzersiz, fazlalık içermeyen doğruluk gereksinimlerini temsil eder:

### Özellik 1: Tarama Anahtar Kelime Eşleştirme

*Herhangi bir* arama anahtar kelimesi seti için, scraper tarafından döndürülen tüm gönderiler içeriklerinde belirtilen anahtar kelimelerden en az birini içermelidir.

**Doğrular: Gereksinim 1.1**

### Özellik 2: Arama Çalıştırma Oluşturma

*Herhangi bir* arama başlatma için, sistem tarama başlamadan önce mevcut zaman damgası ve arama parametreleri ile bir search_run kaydı oluşturmalıdır.

**Doğrular: Gereksinim 1.2**

### Özellik 3: Gönderi Veri Tamlığı

*Herhangi bir* taranan gönderi için, çıkarılan veri tüm gerekli alanları içermelidir: içerik, yazar adı, yazar unvanı, yazar şirketi, LinkedIn URL'si, etkileşim metrikleri (beğeniler, yorumlar, paylaşımlar) ve yayın tarihi.

**Doğrular: Gereksinim 1.3**

### Özellik 4: Gönderi Kalıcılığı

*Herhangi bir* tamamlanmış tarama işlemi için, tüm çıkarılan gönderiler search_run_id'ye geçerli bir referansla veritabanında saklanmalıdır.

**Doğrular: Gereksinim 1.4**

### Özellik 5: Hatalarda Üstel Geri Çekilme

*Herhangi bir* başarısız işlem (tarama, veritabanı, API çağrısı) için hız sınırlama veya geçici hatalarla karşılaşıldığında, sistem üstel olarak artan gecikmelerle (örn. 1s, 2s, 4s, 8s) maksimum yeniden deneme sayısına kadar yeniden denemelidir.

**Doğrular: Gereksinim 1.5, 9.7, 20.1, 20.3**

### Özellik 6: Sayfalandırma Limit Uygulaması

*Herhangi bir* çoklu sayfa sonuçlu arama için, scraper yapılandırılmış maksimum gönderi sayısını aldıktan sonra durmalıdır.

**Doğrular: Gereksinim 1.7**

### Özellik 7: Gönderi Sınıflandırma Tamlığı

*Herhangi bir* taranan gönderi için, AI sınıflandırması bir boolean ilgililik değeri, 0-100 arası bir güven puanı ve boş olmayan bir gerekçe string'i üretmelidir.

**Doğrular: Gereksinim 2.1, 2.2, 2.3**

### Özellik 8: İlgisiz Gönderi Tutma

*Herhangi bir* ilgisiz olarak sınıflandırılan gönderi için, gönderi silinmek yerine is_relevant=false ile veritabanında kalmalıdır.

**Doğrular: Gereksinim 2.4**

### Özellik 9: İlgili Gönderilerden Potansiyel Müşteri Çıkarma

*Herhangi bir* ilgili olarak sınıflandırılan gönderi için, sistem ad, unvan, şirket ve LinkedIn URL'si dahil potansiyel müşteri bilgisini çıkarmalı ve leads tablosunda saklamalıdır.

**Doğrular: Gereksinim 3.1, 3.4**

### Özellik 10: Potansiyel Müşteri Puan Aralığı

*Herhangi bir* oluşturulan potansiyel müşteri puanı için, değer 0 ile 100 arasında (dahil) olmalı ve beş puanlama bileşenini (şirket büyüklüğü, proje netliği, sektör uyumu, zamanlama, rakip durumu) gösteren bir dökümle birlikte olmalıdır.

**Doğrular: Gereksinim 3.2**

### Özellik 11: Potansiyel Müşteri-Gönderi Referans Bütünlüğü

*Herhangi bir* veritabanındaki potansiyel müşteri için, lead_posts bağlantı tablosu üzerinden bağlantılı en az bir geçerli gönderi bulunmalı ve first_post_id mevcut bir gönderiyi referans etmelidir.

**Doğrular: Gereksinim 3.5**

### Özellik 12: Hat Aşaması Geçerliliği

*Herhangi bir* sistemdeki potansiyel müşteri için, stage alanı altı geçerli değerden biri olmalıdır: İletişim Kurulacak, İletişim Kuruldu, Cevap Alındı, Görüşme, Teklif veya Arşiv.

**Doğrular: Gereksinim 4.1**

### Özellik 13: Varsayılan Potansiyel Müşteri Aşaması

*Herhangi bir* yeni oluşturulan potansiyel müşteri için, başlangıç aşaması açıkça belirtilmedikçe "İletişim Kurulacak" olmalıdır.

**Doğrular: Gereksinim 4.2**

### Özellik 14: Aşama Değişikliği Kaydı

*Herhangi bir* potansiyel müşteri aşama geçişi için, sistem potansiyel müşterinin stage alanını güncellemeli ve eski ve yeni aşama değerlerini içeren action_type='lead_stage_changed' ile bir activity_log girişi oluşturmalıdır.

**Doğrular: Gereksinim 4.3**

### Özellik 15: Arşiv Koruma

*Herhangi bir* "Arşiv" aşamasına taşınan potansiyel müşteri için, is_active bayrağı false olarak ayarlanmalı, archived_at zaman damgası ayarlanmalı, ancak tüm geçmiş veriler (gönderiler, mesajlar, aktivite kayıtları) veritabanında kalmalıdır.

**Doğrular: Gereksinim 4.6**

### Özellik 16: Mesaj Taslağı Gerekli Alanlar

*Herhangi bir* oluşturulan mesaj taslağı için, hem bir konu satırı (email tipi için) hem de boş olmayan bir gövde içermeli ve belirli lead_id'ye bağlantı ile saklanmalıdır.

**Doğrular: Gereksinim 5.4, 5.5**

### Özellik 17: Mesaj Kişiselleştirme

*Herhangi iki* farklı potansiyel müşteri için, oluşturulan mesaj gövdeleri farklı olmalı ve potansiyel müşteriye özgü bağlamı (şirket adı, rol veya gönderide bahsedilen sorunlar) içermelidir.

**Doğrular: Gereksinim 5.2, 5.3**

### Özellik 18: İnsan Onayı Gereksinimi

*Herhangi bir* sistemdeki mesaj için, açık onay olmadan (yani approved_at zaman damgası ve approved_by user_id olmadan) sent_at zaman damgası olmamalıdır.

**Doğrular: Gereksinim 6.1, 6.5**

### Özellik 19: Mesaj Düzenleme Kalıcılığı

*Herhangi bir* onaydan önce düzenlenen mesaj için, sistem düzenlenmiş versiyonu body alanına kaydetmeli ve edit_count'u artırmalı, orijinal AI tarafından oluşturulan metni original_body'de korurken.

**Doğrular: Gereksinim 6.4**

### Özellik 20: Kapsamlı Aktivite Kaydı

*Herhangi bir* kullanıcı eylemi (arama, potansiyel müşteri aşama değişikliği, mesaj onayı) veya sistem eylemi (tarama, sınıflandırma, puanlama) için, zaman damgası, action_type, user_id (veya is_system_action=true), entity_type, entity_id ve details JSON ile bir activity_log girişi oluşturulmalıdır.

**Doğrular: Gereksinim 7.1, 7.2, 7.3, 6.6**

### Özellik 21: Aktivite Kaydı Sıralama

*Herhangi bir* aktivite kaydı sorgusu için, sonuçlar zaman damgasına göre azalan sırada (en son önce) sıralanmalıdır.

**Doğrular: Gereksinim 7.4**

### Özellik 22: Aktivite Kaydı Değiştirilemezliği

*Herhangi bir* activity_log girişi için, oluşturulduktan sonra asla silinmemelidir (activity_logs tablosunda DELETE işlemi yok).

**Doğrular: Gereksinim 7.6**

### Özellik 23: Dashboard Metrik Doğruluğu

*Herhangi bir* dashboard metriği (aşamaya göre potansiyel müşteri sayıları, dönüşüm oranları, ortalama puanlar) için, görüntülenen değer mevcut veri üzerinde karşılık gelen veritabanı toplama sorgusunun sonucuyla eşleşmelidir.

**Doğrular: Gereksinim 8.1, 8.2, 8.3, 8.4, 8.5, 8.7**

### Özellik 24: Veritabanı Şema Uyumluluğu

*Herhangi bir* posts, leads, messages, activity_logs veya search_runs tablolarındaki kayıt için, şemada belirtilen tüm gerekli alanlar null olmamalı ve doğru veri tipinde olmalıdır.

**Doğrular: Gereksinim 9.1, 9.2, 9.3, 9.4, 9.5**

### Özellik 25: Foreign Key Bütünlüğü

*Herhangi bir* foreign key referansı olan kayıt için (örn. post.search_run_id, lead.first_post_id, message.lead_id), referans edilen kayıt hedef tabloda bulunmalıdır.

**Doğrular: Gereksinim 9.6**

### Özellik 26: Kimlik Doğrulama Gereksinimi

*Herhangi bir* API endpoint'i için (login/signup hariç), geçerli bir kimlik doğrulama token'ı olmayan istekler 401 Unauthorized yanıtı ile reddedilmelidir.

**Doğrular: Gereksinim 10.1**

### Özellik 27: Login'de Oturum Oluşturma

*Herhangi bir* başarılı login girişimi için, sistem user_id ve bir son kullanma zaman damgası ile bir oturum kaydı oluşturmalıdır.

**Doğrular: Gereksinim 10.3**

### Özellik 28: Veri Sahipliği

*Herhangi bir* kullanıcı tarafından oluşturulan veri için (search_runs, leads, messages), kayıt onu oluşturan kimliği doğrulanmış kullanıcıyla eşleşen bir user_id alanına sahip olmalıdır.

**Doğrular: Gereksinim 10.5**

### Özellik 29: Veri İzolasyonu

*Herhangi bir* kullanıcının verileri için sorgu (leads, messages, search_runs), sonuçlar yalnızca user_id'nin kimliği doğrulanmış kullanıcının ID'siyle eşleştiği kayıtları içermelidir.

**Doğrular: Gereksinim 10.6**

### Özellik 30: Parser Gidiş-Dönüş Özelliği

*Herhangi bir* geçerli ayrıştırılmış gönderi verisi için, parse(html) → prettyPrint(data) → parse(formatted) işlem dizisi orijinal ayrıştırılmış veriye eşdeğer veri üretmelidir.

**Doğrular: Gereksinim 11.6**

### Özellik 31: Parser Doğrulama

*Herhangi bir* ayrıştırılmış gönderi verisi için, depolamadan önce doğrulama fonksiyonu gerekli alanların (yazar adı, içerik, LinkedIn URL) mevcut ve boş olmadığını doğrulamalıdır.

**Doğrular: Gereksinim 11.4**

### Özellik 32: Kaydedilmiş Arama Geri Getirme

*Herhangi bir* kaydedilmiş arama yapılandırması için, kullanıcı tarafından seçildiğinde arama formu kaydedilen tam anahtar kelimeler, max_posts ve diğer parametrelerle doldurulmalıdır.

**Doğrular: Gereksinim 12.3**

### Özellik 33: Yinelenen Potansiyel Müşteri Tespiti

*Herhangi bir* yeni çıkarılan potansiyel müşteri için, aynı linkedin_url'ye sahip bir potansiyel müşteri zaten mevcutsa, sistem yinelenen potansiyel müşteri kaydı oluşturmak yerine yeni gönderiyi mevcut potansiyel müşteriye bağlamalıdır.

**Doğrular: Gereksinim 13.1, 13.2**

### Özellik 34: Potansiyel Müşteri Gönderi İlişkilendirmesi

*Herhangi bir* potansiyel müşteri için, lead_posts bağlantı tablosu üzerinden ilişkili gönderileri sorgulamak o potansiyel müşterinin oluşturulmasına veya puan güncellemelerine katkıda bulunan tüm gönderileri döndürmelidir.

**Doğrular: Gereksinim 13.3**

### Özellik 35: Dışa Aktarma Format Desteği

*Herhangi bir* dışa aktarma isteği için, sistem istenen formatta (CSV veya JSON) filtrelenmiş potansiyel müşteriler için tüm potansiyel müşteri alanlarını ve mevcut hat aşamasını içeren bir dosya oluşturmalıdır.

**Doğrular: Gereksinim 14.1, 14.2, 14.3***

### Özellik 36: Dışa Aktarma Kodlama

*Herhangi bir* oluşturulan dışa aktarma dosyası için, karakter kodlaması UTF-8 olmalı, Türkçe karakterlerin (İ, ş, ğ, ü, ö, ç) ve diğer Unicode karakterlerin düzgün görüntülenmesini sağlamalıdır.

**Doğrular: Gereksinim 14.5**

### Özellik 37: Dışa Aktarma Kaydı

*Herhangi bir* tamamlanmış dışa aktarma işlemi için, format, filtre kriterleri ve dışa aktarılan potansiyel müşteri sayısı hakkında detaylar içeren action_type='export_created' ile bir activity_log girişi oluşturulmalıdır.

**Doğrular: Gereksinim 14.6**

### Özellik 38: Hata Kayıt Detayı

*Herhangi bir* sistemde oluşan hata için, hata mesajı, stack trace, zaman damgası, etkilenen varlık (varsa) ve kullanıcı bağlamı içeren bir kayıt girişi oluşturulmalıdır.

**Doğrular: Gereksinim 15.2**

### Özellik 39: Sayfalandırma Boyutu

*Herhangi bir* sayfalandırılmış potansiyel müşteri listesi sorgusu için, her sayfa en fazla 50 potansiyel müşteri içermeli, toplam sayı ve sayfa numarası yanıta dahil edilmelidir.

**Doğrular: Gereksinim 16.2**

### Özellik 40: Eşzamanlı AI İstek Yönetimi

*Herhangi bir* eşzamanlı AI Engine istekleri seti için, sistem bunları veri bozulması veya yarış koşulları olmadan işlemeli, doğru potansiyel müşteri-mesaj ilişkilendirmelerini korumalıdır.

**Doğrular: Gereksinim 16.6**

### Özellik 41: Yapılandırma Uygulaması

*Herhangi bir* yapılandırma parametresi için (max_posts, AI temperature, hız limitleri, puan eşikleri), değeri değiştirmek sistem yeniden başlatması gerektirmeden sonraki işlemleri etkilemelidir.

**Doğrular: Gereksinim 18.1, 18.2, 18.3, 18.4, 18.6**

### Özellik 42: Hassas Veri Şifreleme

*Herhangi bir* hassas veri alanı için (kullanıcı kimlik bilgileri, API anahtarları) veritabanında saklanan değer yapılandırılmış şifreleme algoritması kullanılarak şifrelenmiş olmalıdır.

**Doğrular: Gereksinim 19.1**

### Özellik 43: HTTPS Zorunluluğu

*Herhangi bir* uygulamaya HTTP isteği için, sunucu HTTPS'ye yönlendirmeli veya HTTPS kullanılmıyorsa isteği reddetmelidir.

**Doğrular: Gereksinim 19.2**

### Özellik 44: Kimlik Bilgisi Kalıcı Olmama

*Herhangi bir* kullanıcı oturumu için, LinkedIn kimlik doğrulama token'ları yalnızca bellekte veya kısa ömürlü oturum depolamada bulunmalı ve oturum süresinin ötesinde veritabanına yazılmamalıdır.

**Doğrular: Gereksinim 19.3**

### Özellik 45: Hesap Silme Tamlığı

*Herhangi bir* kullanıcı hesabı silme isteği için, tüm ilişkili veriler (search_runs, posts, leads, messages, activity_logs) veritabanından silinmeli, yetim kayıt kalmamalıdır.

**Doğrular: Gereksinim 19.4**

### Özellik 46: API Hız Limiti Kuyruğa Alma

*Herhangi bir* Claude API'den hız limiti hatası alan API isteği için, istek bir kuyruğa eklenmeli ve hız limiti yanıt başlıklarında belirtilen gecikmeden sonra yeniden denenmelidir.

**Doğrular: Gereksinim 20.1, 20.4**

### Özellik 47: API Hata Kaydı

*Herhangi bir* harici servislere (Claude API, LinkedIn) başarısız API isteği için, sistem hatayı istek parametreleri, yanıt durumu, hata mesajı ve yeniden deneme sayısı ile kaydetmelidir.

**Doğrular: Gereksinim 20.6**


## Hata Yönetimi

### Hata Kategorileri

#### 1. Harici Servis Hataları

**LinkedIn Tarama Hataları**
- **Hız Sınırlama**: HTTP 429 veya CAPTCHA zorlukları ile tespit edilir
  - Yanıt: Taramayı duraklat, 3-5 saniye bekle, üstel geri çekilme ile yeniden dene
  - Maksimum yeniden deneme: 5 girişim
  - Kullanıcı bildirimi: "LinkedIn hız limiti tespit edildi. Tarama geçici olarak duraklatıldı."
  
- **Kimlik Doğrulama Hataları**: Geçersiz veya süresi dolmuş LinkedIn oturumu
  - Yanıt: Taramayı durdur, kullanıcıyı bilgilendir, hatayı kaydet
  - Kullanıcı eylemi gerekli: LinkedIn ile yeniden kimlik doğrulama
  
- **HTML Yapı Değişiklikleri**: Parser beklenen alanları çıkaramıyor
  - Yanıt: Ham HTML'yi kaydet, gönderiyi manuel inceleme için işaretle, diğer gönderilerle devam et
  - Uyarı: Geliştiricileri potansiyel parser güncellemesi gerektiği konusunda bilgilendir

**Claude API Hataları**
- **Hız Sınırlama**: Anthropic'ten HTTP 429
  - Yanıt: İsteği kuyruğa al, Retry-After başlığında belirtilen gecikmeden sonra yeniden dene
  - Yedek: Kuyruk 100 öğeyi aşarsa, kullanıcıyı düşük hizmet kalitesinden haberdar et
  
- **API Kullanılamama**: Ağ hataları, zaman aşımları, 5xx yanıtları
  - Yanıt: Üstel geri çekilme (1s, 2s, 4s, 8s, 16s)
  - Maksimum yeniden deneme: 3 girişim
  - Kullanıcı bildirimi: "AI servisi geçici olarak kullanılamıyor. İsteğiniz kuyruğa alındı."
  
- **Geçersiz Yanıtlar**: Hatalı JSON, eksik gerekli alanlar
  - Yanıt: İstek/yanıt detayları ile hatayı kaydet, bir kez yeniden dene
  - Yedek: Yeniden deneme başarısız olursa öğeyi manuel inceleme için işaretle

#### 2. Veritabanı Hataları

**Bağlantı Hataları**
- Yanıt: Üstel geri çekilme ile yeniden dene (1s, 2s, 4s)
- Maksimum yeniden deneme: 5 girişim
- Yedek: Kullanıcıya hata göster, izleme için olayı kaydet

**Kısıtlama İhlalleri**
- **Unique Constraint**: Yinelenen linkedin_url, linkedin_post_url
  - Yanıt: Yineleme tespiti olarak değerlendir, mevcut kayda bağla
  
- **Foreign Key Violation**: Referans edilen kayıt mevcut değil
  - Yanıt: Hatayı kaydet, işlemi reddet, 400 Bad Request döndür
  
- **Not Null Violation**: Gerekli alan eksik
  - Yanıt: Hatayı kaydet, işlemi reddet, 400 Bad Request döndür

**Sorgu Zaman Aşımları**
- Yanıt: Sorguyu iptal et, yavaş sorgu detaylarını kaydet
- Kullanıcı bildirimi: "İşlem zaman aşımına uğradı. Lütfen tekrar deneyin."
- Eylem: Sorgu performansını gözden geçir, gerekirse indeksler ekle

#### 3. Doğrulama Hataları

**Girdi Doğrulama**
- Boş anahtar kelimeler: "En az bir anahtar kelime gerekli" mesajı ile 400 döndür
- Geçersiz aşama geçişi: "Geçersiz hat aşaması" mesajı ile 400 döndür
- Geçersiz puan aralığı: "Puan 0 ile 100 arasında olmalıdır" mesajı ile 400 döndür
- Geçersiz email formatı: "Geçersiz email adresi" mesajı ile 400 döndür

**İş Mantığı Doğrulama**
- Onaysız geriye aşama hareketi: "Potansiyel müşteriyi geriye taşımak için onay gerekli" mesajı ile 409 döndür
- Taslak olmadan mesaj onayı: "Mesaj taslağı bulunamadı" mesajı ile 404 döndür
- Yinelenen dışa aktarma isteği: "Dışa aktarma zaten devam ediyor" mesajı ile 429 döndür

#### 4. Kimlik Doğrulama/Yetkilendirme Hataları

**Kimlik Doğrulama Hataları**
- Eksik token: "Kimlik doğrulama gerekli" mesajı ile 401 döndür
- Geçersiz token: "Geçersiz veya süresi dolmuş token" mesajı ile 401 döndür
- Süresi dolmuş oturum: "Oturum süresi doldu. Lütfen tekrar giriş yapın." mesajı ile 401 döndür

**Yetkilendirme Hataları**
- Başka kullanıcının verisine erişim: "Erişim reddedildi" mesajı ile 403 döndür
- Yetersiz izinler: "Yetersiz izinler" mesajı ile 403 döndür

### Hata Yanıt Formatı

Tüm API hataları tutarlı bir JSON yapısını takip eder:

```typescript
interface ErrorResponse {
  error: {
    code: string; // Makine tarafından okunabilir hata kodu
    message: string; // İnsan tarafından okunabilir hata mesajı
    details?: Record<string, any>; // Ek bağlam
    timestamp: string; // ISO 8601 zaman damgası
    requestId: string; // Hata ayıklama için benzersiz istek tanımlayıcısı
  };
}
```

Örnek:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "LinkedIn hız limiti tespit edildi. Tarama geçici olarak duraklatıldı.",
    "details": {
      "retryAfter": 5,
      "retryCount": 2
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Hata Kayıt Stratejisi

Tüm hatalar izleme ve hata ayıklama için yapılandırılmış veri ile kaydedilir:

```typescript
interface ErrorLog {
  level: 'error' | 'warn' | 'info';
  timestamp: Date;
  errorCode: string;
  message: string;
  stackTrace?: string;
  context: {
    userId?: string;
    requestId: string;
    endpoint?: string;
    entityType?: string;
    entityId?: string;
  };
  metadata: Record<string, any>;
}
```

**Kayıt Seviyeleri**:
- **Error**: Sistem hataları, veri bozulması, kurtarılamaz hatalar
- **Warn**: Kurtarılabilir hatalar, hız limitleri, doğrulama hataları
- **Info**: Beklenen hatalar (örn. yineleme tespiti), kullanıcı tetiklemeli hatalar

**İzleme Uyarıları**:
- Hata oranı isteklerin %5'ini aşıyor: Nöbetçi mühendisi uyar
- Claude API 5 dakikadan fazla kullanılamıyor: Nöbetçi mühendisi uyar
- Veritabanı bağlantı hataları: Anında uyarı
- Parser hataları gönderilerin %10'unu aşıyor: Geliştirme ekibini uyar

### Zarif Bozulma

Harici servisler kullanılamadığında, sistem azaltılmış yeteneklerle çalışmaya devam eder:

1. **Claude API Kullanılamıyor**:
   - Tarama devam eder, gönderiler sınıflandırma olmadan saklanır
   - Kullanıcı gönderileri manuel olarak sınıflandırabilir
   - Servis iyileştiğinde yeniden deneme için sınıflandırma işleri kuyruğa alınır

2. **LinkedIn Tarama Engellendi**:
   - Kullanıcı URL üzerinden manuel olarak gönderi ekleyebilir
   - Mevcut potansiyel müşteriler ve hat yönetimi işlevsel kalır
   - Kullanıcı tarama sınırlamaları hakkında bilgilendirilir

3. **Veritabanı Salt Okunur Modu**:
   - Önbelleğe alınmış verileri göster
   - Yazma işlemlerini yeniden deneme için kuyruğa al
   - Kullanıcıyı geçici salt okunur durumdan haberdar et

## Test Stratejisi

### İkili Test Yaklaşımı

Test stratejisi, belirli örnekler ve uç durumlar için birim testleri ile evrensel doğruluk özellikleri için özellik tabanlı testleri birleştirir. Her iki yaklaşım da tamamlayıcıdır ve kapsamlı kapsam için gereklidir.

**Birim Testleri**: Belirli örneklere, entegrasyon noktalarına ve uç durumlara odaklanır
**Özellik Testleri**: Rastgele girdiler üzerinde evrensel özellikleri doğrular (test başına minimum 100 iterasyon)

### Özellik Tabanlı Test

TypeScript/JavaScript için özellik tabanlı test kütüphanemiz olarak **fast-check** kullanacağız. Tasarım dokümanındaki her doğruluk özelliği bir özellik tabanlı test olarak uygulanacaktır.

#### Özellik Test Yapılandırması

```typescript
import fc from 'fast-check';

// Tüm özellik testleri için standart yapılandırma
const propertyTestConfig = {
  numRuns: 100, // Minimum iterasyon
  verbose: true,
  seed: Date.now(), // Seed ile tekrarlanabilir
};

// Örnek özellik test yapısı
describe('Feature: linkedin-prospector, Property 1: Scraping Keyword Matching', () => {
  it('should return posts containing at least one search keyword', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (keywords) => {
          const posts = await scraperService.scrapeLinkedInPosts(keywords, 10);
          
          for (const post of posts) {
            const containsKeyword = keywords.some(keyword =>
              post.content.toLowerCase().includes(keyword.toLowerCase())
            );
            expect(containsKeyword).toBe(true);
          }
        }
      ),
      propertyTestConfig
    );
  });
});
```

#### Test Veri Üreticileri

Alan özelindeki veriler için özel üreticiler:

```typescript
// Geçerli hat aşamaları için üretici
const pipelineStageArb = fc.constantFrom(
  'İletişim Kurulacak',
  'İletişim Kuruldu',
  'Cevap Alındı',
  'Görüşme',
  'Teklif',
  'Arşiv'
);

// Potansiyel müşteri puanları için üretici (0-100)
const leadScoreArb = fc.integer({ min: 0, max: 100 });

// LinkedIn URL'leri için üretici
const linkedinUrlArb = fc.string({ minLength: 10 }).map(
  id => `https://www.linkedin.com/in/${id}/`
);

// Gönderi verisi için üretici
const postArb = fc.record({
  content: fc.lorem({ maxCount: 50 }),
  authorName: fc.fullName(),
  authorTitle: fc.jobTitle(),
  authorCompany: fc.company(),
  linkedinUrl: linkedinUrlArb,
  engagementLikes: fc.integer({ min: 0, max: 10000 }),
  engagementComments: fc.integer({ min: 0, max: 1000 }),
  engagementShares: fc.integer({ min: 0, max: 500 }),
  publishedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

// Potansiyel müşteri verisi için üretici
const leadArb = fc.record({
  name: fc.fullName(),
  title: fc.jobTitle(),
  company: fc.company(),
  linkedinUrl: linkedinUrlArb,
  stage: pipelineStageArb,
  score: leadScoreArb,
  painPoints: fc.array(fc.lorem({ maxCount: 10 }), { maxLength: 5 }),
});
```

### Birim Test Stratejisi

Birim testler aşağıdakileri kapsayarak özellik testlerini tamamlar:

1. **Belirli Örnekler**: Beklenen çıktılarla bilinen iyi/kötü girdiler
2. **Uç Durumlar**: Boş girdiler, sınır değerleri, özel karakterler
3. **Entegrasyon Noktaları**: API endpoint sözleşmeleri, veritabanı işlemleri
4. **Hata Koşulları**: Belirli hata senaryoları ve kurtarma

#### Birim Test Organizasyonu

```
tests/
├── unit/
│   ├── services/
│   │   ├── scraper.test.ts
│   │   ├── ai-classification.test.ts
│   │   ├── parser.test.ts
│   │   └── deduplication.test.ts
│   ├── api/
│   │   ├── search.test.ts
│   │   ├── leads.test.ts
│   │   ├── messages.test.ts
│   │   └── activity-log.test.ts
│   └── utils/
│       ├── validation.test.ts
│       └── formatting.test.ts
├── integration/
│   ├── search-flow.test.ts
│   ├── pipeline-flow.test.ts
│   └── message-flow.test.ts
└── property/
    ├── scraping.property.test.ts
    ├── classification.property.test.ts
    ├── pipeline.property.test.ts
    ├── messages.property.test.ts
    └── database.property.test.ts
```

#### Örnek Birim Testler

```typescript
// Belirli örnek test
describe('POST /api/search/run', () => {
  it('should create search run with valid keywords', async () => {
    const response = await request(app)
      .post('/api/search/run')
      .send({ keywords: ['kurumsal hediye', 'yılbaşı'] })
      .expect(200);
    
    expect(response.body).toHaveProperty('searchRunId');
    expect(response.body.status).toBe('queued');
  });
  
  // Uç durum testi
  it('should reject empty keywords array', async () => {
    const response = await request(app)
      .post('/api/search/run')
      .send({ keywords: [] })
      .expect(400);
    
    expect(response.body.error.code).toBe('INVALID_INPUT');
  });
});

// Hata koşulu testi
describe('AI Classification Service', () => {
  it('should queue request when Claude API returns 429', async () => {
    mockClaudeAPI.mockRejectedValueOnce({ status: 429, headers: { 'retry-after': '5' } });
    
    const result = await aiService.classifyPost(mockPost);
    
    expect(result.status).toBe('queued');
    expect(mockQueue.add).toHaveBeenCalledWith('classify-post', expect.any(Object), {
      delay: 5000,
    });
  });
});
```

### Test Kapsam Hedefleri

- **Birim Test Kapsamı**: Minimum %80 satır kapsamı
- **Özellik Test Kapsamı**: Tüm 47 doğruluk özelliği uygulanmış
- **Entegrasyon Test Kapsamı**: Tüm kritik kullanıcı akışları (arama → sınıflandır → çıkar → mesaj → onayla)
- **E2E Test Kapsamı**: 4 ana sayfanın her biri için mutlu yol

### Test Araçları

- **Birim Test**: Jest + Supertest (API testi)
- **Özellik Test**: fast-check
- **Entegrasyon Test**: Jest + Testcontainers (Supabase/Redis için)
- **E2E Test**: Playwright
- **Mocking**: Harici servisler için Jest mock'ları (LinkedIn, Claude API)
- **Test Veritabanı**: Supabase yerel örneği veya Docker PostgreSQL

### Sürekli Entegrasyon

Tüm testler her pull request'te çalışır:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - run: npm run test:e2e
```

**Test Yürütme Süresi Hedefleri**:
- Birim testler: < 30 saniye
- Özellik testleri: < 2 dakika (100 iterasyon × 47 özellik)
- Entegrasyon testleri: < 1 dakika
- E2E testleri: < 3 dakika

### Test Veri Yönetimi

**Test Fixture'ları**: Birim testler için `tests/fixtures/` içinde saklanan önceden tanımlanmış veriler
**Factory'ler**: `@faker-js/faker` gibi kütüphaneler kullanarak test veri oluşturucular
**Veritabanı Seed'leme**: Test veritabanını gerçekçi verilerle doldurmak için scriptler
**Temizleme**: İzolasyonu sağlamak için her testten sonra otomatik temizleme

