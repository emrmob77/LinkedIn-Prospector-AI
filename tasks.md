# Uygulama Planı: LinkedIn Prospector AI

## Genel Bakış

Bu uygulama planı, LinkedIn Prospector AI özelliğini ayrı kodlama görevlerine ayırır. Sistem Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL), Claude API, Chrome Extension (LinkedIn veri yakalama) ve Redis ile BullMQ kullanılarak inşa edilmiştir.

Uygulama, her görevin önceki çalışma üzerine inşa edildiği, ilerlemeyi doğrulamak için kontrol noktalarının bulunduğu artımlı bir yaklaşımı takip eder. Tüm görevler izlenebilirlik için gereksinimler dokümanından belirli gereksinimlere referans verir.

## MVP Kapsamı (Faz 1)

Bu görev listesi MVP özelliklerini kapsar:
- Chrome Extension ile LinkedIn gönderi yakalama (arama, şirket, profil, feed sayfaları)
- AI destekli filtreleme ve sınıflandırma
- Potansiyel müşteri çıkarma ve puanlama
- Eksiksiz 6 aşamalı hat yönetimi
- İnsan onayı ile AI mesaj oluşturma
- Temel Aktivite Kaydı
- Kullanıcı kimlik doğrulama
- Temel metriklerle Dashboard

## Görevler

- [x] 1. Proje yapısını ve çekirdek altyapıyı kur
  - TypeScript, Tailwind CSS ve ESLint ile Next.js 14 projesini başlat
  - Supabase client ve environment variable'ları yapılandır
  - shadcn/ui bileşen kütüphanesini kur
  - Temel dizin yapısını oluştur: `/app`, `/components`, `/lib`, `/services`, `/types`
  - BullMQ için Redis bağlantısını yapılandır
  - Test framework'ünü kur (Jest + fast-check)
  - _Gereksinimler: 10.1, 10.2, 16.1_

- [x] 2. Veritabanı şeması ve migration'ları oluştur
  - [x] 2.1 Tüm tablolar için Supabase migration oluştur
    - Tüm alanlar ve indekslerle `posts` tablosu için SQL migration yaz
    - Tüm alanlar ve indekslerle `leads` tablosu için SQL migration yaz
    - Tüm alanlar ve indekslerle `messages` tablosu için SQL migration yaz
    - Tüm alanlar ve indekslerle `activity_logs` tablosu için SQL migration yaz
    - Tüm alanlar ve indekslerle `search_runs` tablosu için SQL migration yaz
    - `lead_posts` bağlantı tablosu için SQL migration yaz
    - Foreign key kısıtlamaları ve cascade kuralları ekle
    - _Gereksinimler: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 2.2 Veritabanı şema uyumluluğu için property test yaz
    - **Özellik 24: Veritabanı Şema Uyumluluğu**
    - **Doğrular: Gereksinim 9.1-9.5**
  
  - [ ]* 2.3 Foreign key bütünlüğü için property test yaz
    - **Özellik 25: Foreign Key Bütünlüğü**
    - **Doğrular: Gereksinim 9.6**


- [x] 3. TypeScript tip tanımlarını uygula
  - Tüm veri modelleri için tip tanımları oluştur: `Post`, `Lead`, `Message`, `ActivityLog`, `SearchRun`
  - API request ve response'ları için tip tanımları oluştur
  - Servis arayüzleri için tip tanımları oluştur: `ScraperService`, `AIClassificationService`, `ParserService`, `DeduplicationService`
  - Enum tipleri oluştur: `PipelineStage`, `MessageStatus`, `SearchRunStatus`, `ActionType`
  - _Gereksinimler: 4.1, 5.4, 9.1-9.5_

- [x] 4. Supabase Auth ile kimlik doğrulama kur
  - [x] 4.1 Kimlik doğrulama sayfalarını oluştur
    - Email/şifre formu ile login sayfası uygula
    - Email/şifre formu ile signup sayfası uygula
    - Şifre sıfırlama işlevselliği ekle
    - _Gereksinimler: 10.1, 10.2_
  
  - [x] 4.2 Kimlik doğrulama middleware'ini uygula
    - Korumalı route'larda kimlik doğrulamayı kontrol eden middleware oluştur
    - Oturum doğrulama ve yenileme mantığını uygula
    - Kimliği doğrulanmamış kullanıcılar için login'e yönlendirme ekle
    - _Gereksinimler: 10.3, 10.4_
  
  - [ ]* 4.3 Kimlik doğrulama gereksinimi için property test yaz
    - **Özellik 26: Kimlik Doğrulama Gereksinimi**
    - **Doğrular: Gereksinim 10.1**
  
  - [ ]* 4.4 Oturum oluşturma için property test yaz
    - **Özellik 27: Login'de Oturum Oluşturma**
    - **Doğrular: Gereksinim 10.3**
  
  - [ ]* 4.5 Veri izolasyonu için property test yaz
    - **Özellik 29: Veri İzolasyonu**
    - **Doğrular: Gereksinim 10.6**


- [ ] 5. Chrome Extension temel yapısını oluştur
  - [ ] 5.1 Extension proje yapısını kur
    - `extension/` dizininde Manifest V3 yapısını oluştur
    - TypeScript + build yapılandırması (webpack/vite)
    - `manifest.json`: permissions (activeTab, storage), host_permissions (linkedin.com)
    - Content script, popup ve background service worker dosyalarını oluştur
    - _Gereksinimler: 1.1, 11.1_

  - [ ] 5.2 LinkedIn DOM Parser'ı uygula (Content Script)
    - LinkedIn sayfasındaki post kartlarını DOM'dan parse eden fonksiyon yaz
    - Her post için çıkar: authorName, authorTitle, authorCompany, authorLinkedinUrl, authorProfilePicture, authorType, content, linkedinPostUrl, engagementLikes/Comments/Shares, publishedAt, images
    - Sayfa tipi algılama: arama (`/search/results/content/*`), şirket (`/company/*/posts/`), profil (`/in/*/recent-activity/`), feed (`/feed/`)
    - Defensive parsing: DOM değişse bile hata vermeden çalış
    - _Gereksinimler: 1.1, 1.3, 11.1, 11.2_

  - [ ] 5.3 Extension Popup UI'ı oluştur
    - Bulunan post sayısını göster
    - "İçe Aktar" butonu
    - Import durumu (loading, başarılı, hata)
    - Supabase auth bağlantısı (login durumu)
    - Sayfa tipi göstergesi (arama/şirket/profil/feed)
    - _Gereksinimler: 1.1, 15.3, 15.4_

  - [ ] 5.4 Background Service Worker'ı uygula
    - Content script ile popup arasında mesaj köprüsü
    - API'ye veri gönderme (`POST /api/extension/import`)
    - Supabase auth token yönetimi (storage'da saklama)
    - Hata yönetimi ve kullanıcı bildirimleri
    - _Gereksinimler: 1.2, 1.6, 10.1_

  - [ ] 5.5 TypeScript tip tanımlarını güncelle
    - `ExtensionPostData` tipi oluştur (Extension'ın gönderdiği veri yapısı)
    - `ExtensionImportRequest` ve `ExtensionImportResponse` tipleri
    - `PageType` enum ('search' | 'company_page' | 'profile' | 'feed')
    - _Gereksinimler: 4.1, 9.1_

  - [ ]* 5.6 Extension birim testleri yaz
    - DOM parser testleri (mock LinkedIn HTML ile)
    - Sayfa tipi algılama testleri
    - Veri doğrulama testleri
    - _Gereksinimler: 11.2, 11.3_

- [ ] 6. Extension Import API endpoint'ini uygula
  - [ ] 6.1 POST /api/extension/import endpoint'ini oluştur
    - Supabase auth kontrolü (extension'dan gelen token doğrulama)
    - Request body doğrulama (post dizisi, source tipi)
    - `search_runs` kaydı oluştur (source: 'chrome_extension', sayfa URL'si)
    - Post verilerini `posts` tablosuna kaydet (upsert — linkedin_post_url unique)
    - Mevcut `extractLeadCandidates()` mantığını kullanarak lead adaylarını çıkar
    - Sonuç döndür: postsImported, postsDuplicate, leadCandidatesCount
    - _Gereksinimler: 1.2, 1.4, 3.1, 3.4_

  - [ ] 6.2 Extension veri → Post model mapper fonksiyonu oluştur
    - `ExtensionPostData` → `Post` dönüşümü
    - Eksik veya hatalı alanlar için fallback ve hata yönetimi
    - Tarih parsing (LinkedIn'in göreceli tarih formatı: "3 gün", "2 hafta" vb.)
    - URL doğrulama ve normalizasyonu
    - _Gereksinimler: 11.1, 11.2, 11.4_

  - [ ] 6.3 Veritabanı migration'ı (gerekirse)
    - `search_runs` tablosuna `source` alanı ekle ('apify' | 'chrome_extension' | 'manual')
    - `search_runs` tablosuna `source_url` alanı ekle (LinkedIn sayfa URL'si)
    - _Gereksinimler: 9.5_

  - [ ]* 6.4 Import API birim testleri yaz
    - Başarılı import testi
    - Duplicate post testi (upsert davranışı)
    - Auth kontrolü testi
    - Geçersiz veri testi
    - _Gereksinimler: 1.2, 1.4, 10.1_

- [ ] 7. Kontrol noktası - Extension ve Import API entegrasyon testi
  - Extension'dan API'ye veri gönderim akışını test et
  - Post kaydetme ve lead çıkarma akışını doğrula
  - Tüm testlerin geçtiğinden emin ol, sorular ortaya çıkarsa kullanıcıya sor.


- [ ] 8. AI işleme için BullMQ iş kuyruğunu uygula
  - [ ] 8.1 BullMQ kuyruğu ve worker'ları kur
    - Redis bağlantısı ile `processing-queue` oluştur
    - AI sınıflandırma işlerini işleyen worker uygula
    - Üstel geri çekilme ile iş yeniden deneme mantığını yapılandır
    - İş ilerleme takibi ekle
    - _Gereksinimler: 1.5, 16.6_
  
  - [ ] 8.2 Arama çalıştırma yönetimi oluştur
    - `search_runs` kaydı oluşturan fonksiyon uygula
    - Arama çalıştırma durumunu güncelleyen fonksiyon uygula (queued → processing → completed/failed)
    - Bulunan gönderiler, ilgili gönderiler, çıkarılan potansiyel müşteri sayılarını sakla
    - Süreyi hesapla ve sakla
    - _Gereksinimler: 1.2, 1.4_
  
  - [ ]* 8.3 Arama çalıştırma oluşturma için property test yaz
    - **Özellik 2: Arama Çalıştırma Oluşturma**
    - **Doğrular: Gereksinim 1.2**
  
  - [ ]* 8.4 Gönderi kalıcılığı için property test yaz
    - **Özellik 4: Gönderi Kalıcılığı**
    - **Doğrular: Gereksinim 1.4**


- [ ] 9. Claude API ile AI Classification Service'i uygula
  - [ ] 9.1 Claude API client wrapper'ı oluştur
    - API anahtarı ile Anthropic client'ı başlat
    - Hata yönetimi ile request wrapper uygula
    - Hız limiti tespiti ve kuyruğa alma uygula
    - Üstel geri çekilme ile yeniden deneme mantığı ekle
    - _Gereksinimler: 2.1, 20.1, 20.3, 20.4_
  
  - [ ] 9.2 Gönderi sınıflandırma fonksiyonunu uygula
    - Gönderi ilgililik sınıflandırması için prompt şablonu oluştur
    - isRelevant, confidence, theme, giftType, competitor, reasoning çıkarmak için Claude yanıtını ayrıştır
    - Yanıt yapısını doğrula ve hatalı yanıtları yönet
    - Sınıflandırma sonuçlarını posts tablosunda sakla
    - _Gereksinimler: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 9.3 Potansiyel müşteri puanlama fonksiyonunu uygula
    - Potansiyel müşteri kalite puanlaması için prompt şablonu oluştur
    - Toplam puan ve dökümü çıkarmak için Claude yanıtını ayrıştır (companySize, projectClarity, industryFit, timing, competitorStatus)
    - Puanın 0-100 arasında olduğunu doğrula
    - Sorun noktalarını ve ana ilgi alanlarını çıkar
    - _Gereksinimler: 3.2, 3.3_
  
  - [ ]* 9.4 Sınıflandırma tamlığı için property test yaz
    - **Özellik 7: Gönderi Sınıflandırma Tamlığı**
    - **Doğrular: Gereksinim 2.1, 2.2, 2.3**
  
  - [ ]* 9.5 Potansiyel müşteri puan aralığı için property test yaz
    - **Özellik 10: Potansiyel Müşteri Puan Aralığı**
    - **Doğrular: Gereksinim 3.2**
  
  - [ ]* 9.6 Üstel geri çekilme için property test yaz
    - **Özellik 5: Hatalarda Üstel Geri Çekilme**
    - **Doğrular: Gereksinim 1.5, 9.7, 20.1, 20.3**
  
  - [ ]* 9.7 AI service hata yönetimi için birim testler yaz
    - Claude API hız sınırlama (429) yönetimini test et
    - API kullanılamama (5xx) yönetimini test et
    - Hatalı yanıt yönetimini test et
    - _Gereksinimler: 20.1, 20.2, 20.6_


- [ ] 10. Potansiyel müşteri çıkarma ve yineleme gidermeyi uygula
  - [ ] 10.1 Potansiyel müşteri çıkarma fonksiyonu oluştur
    - Sınıflandırılmış gönderilerden potansiyel müşteri bilgisini çıkar (ad, unvan, şirket, LinkedIn URL)
    - Varsayılan aşama "İletişim Kurulacak" ile potansiyel müşteri kaydı oluştur
    - lead_posts bağlantı tablosu üzerinden potansiyel müşteriyi kaynak gönderiye bağla
    - AI tarafından oluşturulan puanı ve sorun noktalarını sakla
    - _Gereksinimler: 3.1, 3.4, 4.2_
  
  - [ ] 10.2 Yineleme giderme servisini uygula
    - Yeni potansiyel müşteri oluşturmadan önce linkedin_url'ye göre mevcut potansiyel müşteriyi kontrol et
    - Yineleme bulunursa, yeni gönderiyi mevcut potansiyel müşteriye bağla
    - Yeni puan daha yüksekse potansiyel müşteri puanını güncelle
    - Mevcut potansiyel müşteri için post_count'u artır
    - _Gereksinimler: 13.1, 13.2, 13.3, 13.4_
  
  - [ ]* 10.3 Potansiyel müşteri çıkarma için property test yaz
    - **Özellik 9: İlgili Gönderilerden Potansiyel Müşteri Çıkarma**
    - **Doğrular: Gereksinim 3.1, 3.4**
  
  - [ ]* 10.4 Yineleme tespiti için property test yaz
    - **Özellik 33: Yinelenen Potansiyel Müşteri Tespiti**
    - **Doğrular: Gereksinim 13.1, 13.2**
  
  - [ ]* 10.5 Potansiyel müşteri-gönderi ilişkilendirmesi için property test yaz
    - **Özellik 34: Potansiyel Müşteri Gönderi İlişkilendirmesi**
    - **Doğrular: Gereksinim 13.3**
  
  - [ ]* 10.6 Varsayılan potansiyel müşteri aşaması için property test yaz
    - **Özellik 13: Varsayılan Potansiyel Müşteri Aşaması**
    - **Doğrular: Gereksinim 4.2**

- [ ] 11. Kontrol noktası - Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğinden emin ol, sorular ortaya çıkarsa kullanıcıya sor.


- [ ] 12. Aktivite Kayıt Servisini uygula
  - [ ] 12.1 Aktivite kayıt servisi oluştur
    - activity_log girişleri oluşturan fonksiyon uygula
    - Tüm eylem tiplerini destekle: search_started, search_completed, post_classified, lead_created, lead_stage_changed, message_generated, message_approved, message_sent, lead_merged, export_created
    - Zaman damgası, user_id, entity_type, entity_id ve details JSON'ı yakala
    - Sistem eylemlerini is_system_action=true ile işaretle
    - _Gereksinimler: 7.1, 7.2, 7.3_
  
  - [ ] 12.2 Uygulama genelinde kayıt entegrasyonu
    - Scraper service'te kayıt çağrıları ekle (search_started, search_completed)
    - AI service'te kayıt çağrıları ekle (post_classified, lead_created)
    - Hat yönetiminde kayıt çağrıları ekle (lead_stage_changed)
    - Mesaj servisinde kayıt çağrıları ekle (message_generated, message_approved)
    - _Gereksinimler: 7.1, 7.2, 6.6_
  
  - [ ]* 12.3 Kapsamlı kayıt için property test yaz
    - **Özellik 20: Kapsamlı Aktivite Kaydı**
    - **Doğrular: Gereksinim 7.1, 7.2, 7.3, 6.6**
  
  - [ ]* 12.4 Kayıt değiştirilemezliği için property test yaz
    - **Özellik 22: Aktivite Kaydı Değiştirilemezliği**
    - **Doğrular: Gereksinim 7.6**


- [ ] 13. Arama işlevselliği için API endpoint'leri oluştur
  - [ ] 13.1 POST /api/search/run endpoint'ini uygula
    - Keywords dizisinin boş olmadığını doğrula
    - status='queued' ile search_run kaydı oluştur
    - BullMQ ile tarama işini kuyruğa al
    - searchRunId ve tahmini süreyi döndür
    - search_started aktivitesini kaydet
    - _Gereksinimler: 1.1, 1.2, 15.1_
  
  - [ ] 13.2 GET /api/search/runs endpoint'ini uygula
    - Kullanıcının arama çalıştırmalarının sayfalandırılmış listesini döndür
    - Durum, anahtar kelimeler, sonuç sayıları ve zaman damgalarını dahil et
    - Sağlanmışsa duruma göre filtrele
    - _Gereksinimler: 12.4_
  
  - [ ] 13.3 GET /api/search/runs/:id endpoint'ini uygula
    - Detaylı arama çalıştırma bilgisini döndür
    - Sınıflandırma sonuçları ile ilişkili gönderileri dahil et
    - Arama çalıştırması bulunamazsa veya farklı kullanıcıya aitse 404 döndür
    - _Gereksinimler: 10.6_
  
  - [ ]* 13.4 Endpoint'lerde kimlik doğrulama için property test yaz
    - **Özellik 26: Kimlik Doğrulama Gereksinimi**
    - **Doğrular: Gereksinim 10.1**
  
  - [ ]* 13.5 Arama API'si için birim testler yaz
    - Boş anahtar kelime doğrulamasını test et
    - Başarılı arama çalıştırma oluşturmayı test et
    - Kullanıcı veri izolasyonunu test et
    - _Gereksinimler: 15.1, 10.6_


- [ ] 14. Potansiyel müşteri yönetimi için API endpoint'leri oluştur
  - [ ] 14.1 GET /api/leads endpoint'ini uygula
    - Sayfalandırılmış potansiyel müşteri listesi döndür (sayfa başına 50)
    - Aşama, minScore, tarih aralığına göre filtrelemeyi destekle
    - Puan, created_at'e göre sıralamayı destekle
    - post_count ve first_post önizlemesini dahil et
    - Yalnızca kimliği doğrulanmış kullanıcı için potansiyel müşterileri döndür
    - _Gereksinimler: 4.4, 4.5, 16.2, 10.6_
  
  - [ ] 14.2 GET /api/leads/:id endpoint'ini uygula
    - Detaylı potansiyel müşteri bilgisini döndür
    - lead_posts bağlantısı üzerinden tüm ilişkili gönderileri dahil et
    - Potansiyel müşteri için tüm mesajları dahil et
    - Potansiyel müşteri bulunamazsa veya farklı kullanıcıya aitse 404 döndür
    - _Gereksinimler: 13.3, 10.6_
  
  - [ ] 14.3 PATCH /api/leads/:id/stage endpoint'ini uygula
    - Yeni aşamanın geçerli bir PipelineStage değeri olduğunu doğrula
    - Veritabanında potansiyel müşteri aşamasını güncelle
    - Eski ve yeni aşama ile lead_stage_changed aktivitesini kaydet
    - Güncellenmiş potansiyel müşteriyi döndür
    - _Gereksinimler: 4.3, 7.3_
  
  - [ ]* 14.4 Hat aşaması geçerliliği için property test yaz
    - **Özellik 12: Hat Aşaması Geçerliliği**
    - **Doğrular: Gereksinim 4.1**
  
  - [ ]* 14.5 Aşama değişikliği kaydı için property test yaz
    - **Özellik 14: Aşama Değişikliği Kaydı**
    - **Doğrular: Gereksinim 4.3**
  
  - [ ]* 14.6 Sayfalandırma boyutu için property test yaz
    - **Özellik 39: Sayfalandırma Boyutu**
    - **Doğrular: Gereksinim 16.2**
  
  - [ ]* 14.7 Potansiyel müşteri API'si için birim testler yaz
    - Aşama doğrulamasını test et
    - Filtreleme ve sıralamayı test et
    - Kullanıcı veri izolasyonunu test et
    - _Gereksinimler: 4.1, 4.4, 10.6_


- [ ] 15. AI mesaj oluşturma servisini uygula
  - [ ] 15.1 Mesaj oluşturma fonksiyonu oluştur
    - Potansiyel müşteri bağlamını içeren prompt şablonu oluştur (ad, unvan, şirket, gönderi içeriği, sorun noktaları)
    - Kişiselleştirilmiş mesaj oluşturmak için Claude API'yi çağır
    - Konu ve gövdeyi çıkarmak için yanıtı ayrıştır
    - Hem DM versiyonu (3-4 cümle) hem de email versiyonu (5-6 cümle) oluştur
    - Mesaj taslağını status='pending' ile sakla
    - _Gereksinimler: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 15.2 POST /api/leads/:id/generate-message endpoint'ini uygula
    - Potansiyel müşterinin var olduğunu ve kullanıcıya ait olduğunu doğrula
    - Potansiyel müşteri ve ilişkili gönderileri al
    - Mesaj oluşturma servisini çağır
    - Mesajı messages tablosunda sakla
    - message_generated aktivitesini kaydet
    - Mesaj taslağını döndür
    - _Gereksinimler: 5.5, 7.3_
  
  - [ ]* 15.3 Mesaj gerekli alanları için property test yaz
    - **Özellik 16: Mesaj Taslağı Gerekli Alanlar**
    - **Doğrular: Gereksinim 5.4, 5.5**
  
  - [ ]* 15.4 Mesaj kişiselleştirme için property test yaz
    - **Özellik 17: Mesaj Kişiselleştirme**
    - **Doğrular: Gereksinim 5.2, 5.3**
  
  - [ ]* 15.5 Mesaj oluşturma için birim testler yaz
    - Çeşitli potansiyel müşteri bağlamları ile mesaj oluşturmayı test et
    - Claude API başarısız olduğunda hata yönetimini test et
    - _Gereksinimler: 5.1, 20.2_


- [ ] 16. Mesaj onay iş akışını uygula
  - [ ] 16.1 Düzenleme için PATCH /api/messages/:id endpoint'ini uygula
    - Onaydan önce konu ve gövde düzenlemeye izin ver
    - İlk düzenlemede original_body'yi sakla
    - edit_count'u artır
    - Güncellenmiş mesajı döndür
    - _Gereksinimler: 6.3, 6.4_
  
  - [ ] 16.2 POST /api/messages/:id/approve endpoint'ini uygula
    - Mesajın var olduğunu ve kullanıcının potansiyel müşterisine ait olduğunu doğrula
    - Mesaj durumunu 'approved' olarak güncelle
    - approved_at zaman damgasını ve approved_by user_id'yi ayarla
    - message_approved aktivitesini kaydet
    - Onaylanmış mesajı döndür
    - _Gereksinimler: 6.2, 6.6_
  
  - [ ] 16.3 POST /api/messages/:id/reject endpoint'ini uygula
    - Mesaj durumunu 'rejected' olarak güncelle
    - Aktiviteyi kaydet
    - Güncellenmiş mesajı döndür
    - _Gereksinimler: 6.3_
  
  - [ ]* 16.4 İnsan onayı gereksinimi için property test yaz
    - **Özellik 18: İnsan Onayı Gereksinimi**
    - **Doğrular: Gereksinim 6.1, 6.5**
  
  - [ ]* 16.5 Mesaj düzenleme kalıcılığı için property test yaz
    - **Özellik 19: Mesaj Düzenleme Kalıcılığı**
    - **Doğrular: Gereksinim 6.4**
  
  - [ ]* 16.6 Onay iş akışı için birim testler yaz
    - Onayın durumu ve zaman damgalarını güncellediğini test et
    - Reddetme iş akışını test et
    - Düzenleme takibini test et
    - _Gereksinimler: 6.2, 6.3, 6.4_

- [ ] 17. Kontrol noktası - Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğinden emin ol, sorular ortaya çıkarsa kullanıcıya sor.


- [ ] 18. Aktivite kaydı ve raporlama için API endpoint'leri oluştur
  - [ ] 18.1 Implement GET /api/activity-log endpoint
    - Return paginated activity log in reverse chronological order
    - Support filtering by date range, action_type, entity_type
    - Only return activities for authenticated user
    - _Requirements: 7.4, 7.5, 10.6_
  
  - [ ] 18.2 Implement GET /api/dashboard/stats endpoint
    - Calculate total leads by pipeline stage
    - Calculate conversion rates between stages
    - Calculate average lead score by stage
    - Count search runs over time
    - Calculate message approval rates
    - Support date range filtering
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 18.3 Write property test for activity log ordering
    - **Property 21: Activity Log Ordering**
    - **Validates: Requirements 7.4**
  
  - [ ]* 18.4 Write property test for dashboard metric accuracy
    - **Property 23: Dashboard Metric Accuracy**
    - **Validates: Requirements 8.1-8.5, 8.7**
  
  - [ ]* 18.5 Write unit tests for reporting endpoints
    - Test activity log filtering
    - Test dashboard calculations
    - Test date range filtering
    - _Requirements: 7.5, 8.6_


- [ ] 19. Dışa aktarma işlevselliğini uygula
  - [ ] 19.1 Create export service
    - Implement CSV export with proper UTF-8 encoding
    - Implement JSON export
    - Include all lead fields and current pipeline stage
    - Support filtering by stage, score, date range
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 19.2 Implement POST /api/export endpoint
    - Validate export format (csv or json)
    - Apply filters from request
    - Generate export file
    - Log export_created activity
    - Return download URL or file stream
    - _Requirements: 14.6_
  
  - [ ]* 19.3 Write property test for export format support
    - **Property 35: Export Format Support**
    - **Validates: Requirements 14.1, 14.2, 14.3**
  
  - [ ]* 19.4 Write property test for export encoding
    - **Property 36: Export Encoding**
    - **Validates: Requirements 14.5**
  
  - [ ]* 19.5 Write property test for export logging
    - **Property 37: Export Logging**
    - **Validates: Requirements 14.6**
  
  - [ ]* 19.6 Write unit tests for export functionality
    - Test CSV generation with Turkish characters
    - Test JSON generation
    - Test filtering logic
    - _Requirements: 14.4, 14.5_


- [ ] 20. Frontend oluştur: Dashboard sayfası
  - [ ] 20.1 Create dashboard layout and components
    - Create MetricCard component for displaying key metrics
    - Create PipelineFunnel component for mini funnel visualization
    - Create RecentActivity component for activity log preview
    - Implement dashboard page layout with grid
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 20.2 Integrate dashboard with API
    - Fetch stats from GET /api/dashboard/stats
    - Fetch recent activities from GET /api/activity-log
    - Implement real-time updates with Supabase subscriptions
    - Add date range filter controls
    - _Requirements: 8.6, 8.7_
  
  - [ ]* 20.3 Write unit tests for dashboard components
    - Test MetricCard rendering
    - Test PipelineFunnel calculations
    - Test RecentActivity display
    - _Requirements: 8.1-8.5_


- [ ] 21. Frontend oluştur: LinkedIn Arama sayfası
  - [ ] 21.1 Create search form and result components
    - Create SearchForm component with keyword input and saved searches dropdown
    - Create PostList component with filtering toggle for irrelevant posts
    - Create PostCard component displaying post content, author, engagement, and AI classification badge
    - Add "Extract Lead" button for relevant posts
    - _Requirements: 1.1, 2.5, 2.6_
  
  - [ ] 21.2 Integrate search page with API
    - Implement POST /api/search/run on form submit
    - Poll search run status and display progress
    - Fetch and display posts from GET /api/search/runs/:id
    - Implement "Extract Lead" action
    - Show classification badges (relevant/irrelevant, confidence, theme)
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 21.3 Write unit tests for search page components
    - Test SearchForm submission
    - Test PostCard rendering with classification
    - Test filtering toggle
    - _Requirements: 1.1, 2.5, 2.6_


- [ ] 22. Frontend oluştur: İletişim Hattı sayfası
  - [ ] 22.1 Create pipeline table and lead detail components
    - Create PipelineTable component with columns for each stage
    - Create StageColumn component displaying leads in each stage
    - Create LeadDetailPanel component showing lead info, posts, and messages
    - Add drag-and-drop or dropdown for stage changes
    - Add "Generate Message" button in lead detail panel
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 22.2 Integrate pipeline page with API
    - Fetch leads from GET /api/leads with stage grouping
    - Implement stage change via PATCH /api/leads/:id/stage
    - Fetch lead details from GET /api/leads/:id
    - Implement message generation via POST /api/leads/:id/generate-message
    - Display message drafts with edit and approve buttons
    - _Requirements: 4.3, 5.1, 6.2, 6.3, 6.4_
  
  - [ ] 22.3 Implement message approval UI
    - Display message draft in editable textarea
    - Add "Approve" and "Reject" buttons
    - Call PATCH /api/messages/:id for edits
    - Call POST /api/messages/:id/approve for approval
    - Show approval status and timestamp
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 22.4 Write unit tests for pipeline components
    - Test PipelineTable rendering
    - Test LeadDetailPanel display
    - Test message approval workflow
    - _Requirements: 4.1, 4.4, 6.2_

- [ ] 23. Kontrol noktası - Tüm testlerin geçtiğinden emin ol
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 24. Frontend oluştur: Raporlama sayfası
  - [ ] 24.1 Create activity log components
    - Create ActivityLogTable component with columns for timestamp, action, user, entity
    - Create ActivityLogFilter component for date range, action type, entity type filters
    - Implement pagination controls
    - _Requirements: 7.4, 7.5_
  
  - [ ] 24.2 Integrate reporting page with API
    - Fetch activity log from GET /api/activity-log
    - Implement filtering and pagination
    - Display activity details in expandable rows
    - Add export button for activity log
    - _Requirements: 7.4, 7.5_
  
  - [ ]* 24.3 Write unit tests for reporting components
    - Test ActivityLogTable rendering
    - Test filtering logic
    - Test pagination
    - _Requirements: 7.4, 7.5_


- [ ] 25. Kaydedilmiş arama işlevselliğini uygula
  - [ ] 25.1 Create saved search API endpoints
    - Implement POST /api/saved-searches to save search configuration
    - Implement GET /api/saved-searches to list user's saved searches
    - Implement DELETE /api/saved-searches/:id to delete saved search
    - Store keywords, max_posts, and optional name/description
    - _Requirements: 12.1, 12.2, 12.5_
  
  - [ ] 25.2 Integrate saved searches in search form
    - Add dropdown to select saved searches
    - Populate form fields when saved search selected
    - Add "Save Search" button to save current configuration
    - _Requirements: 12.3_
  
  - [ ]* 25.3 Write property test for saved search retrieval
    - **Property 32: Saved Search Retrieval**
    - **Validates: Requirements 12.3**
  
  - [ ]* 25.4 Write unit tests for saved search functionality
    - Test saving search configuration
    - Test loading saved search
    - Test deleting saved search
    - _Requirements: 12.1, 12.2, 12.5_


- [ ] 26. Yapılandırma yönetimini uygula
  - [ ] 26.1 Create configuration service
    - Load configuration from environment variables
    - Support max_posts, AI temperature, model name, rate limits, score thresholds
    - Provide getter functions for each config value
    - Support runtime updates where possible
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ] 26.2 Create admin configuration API (optional for MVP)
    - Implement GET /api/config to view current configuration
    - Implement PATCH /api/config to update configuration
    - Validate configuration values
    - _Requirements: 18.6_
  
  - [ ]* 26.3 Write property test for configuration application
    - **Property 41: Configuration Application**
    - **Validates: Requirements 18.1-18.4, 18.6**


- [ ] 27. Güvenlik ve veri gizliliği özelliklerini uygula
  - [ ] 27.1 Implement data encryption and HTTPS
    - Configure Supabase encryption at rest
    - Ensure all API routes use HTTPS
    - Implement HTTPS redirect middleware
    - _Requirements: 19.1, 19.2_
  
  - [ ] 27.2 Implement credential management
    - Store LinkedIn tokens only in session storage
    - Clear tokens on logout
    - Never persist tokens to database
    - _Requirements: 19.3_
  
  - [ ] 27.3 Implement account deletion
    - Create DELETE /api/account endpoint
    - Delete all user data: search_runs, posts, leads, messages, activity_logs
    - Use CASCADE delete for referential integrity
    - _Requirements: 19.4, 19.5_
  
  - [ ]* 27.4 Write property test for HTTPS enforcement
    - **Property 43: HTTPS Enforcement**
    - **Validates: Requirements 19.2**
  
  - [ ]* 27.5 Write property test for credential non-persistence
    - **Property 44: Credential Non-Persistence**
    - **Validates: Requirements 19.3**
  
  - [ ]* 27.6 Write property test for account deletion completeness
    - **Property 45: Account Deletion Completeness**
    - **Validates: Requirements 19.4**


- [ ] 28. Hata yönetimi ve kullanıcı geri bildirimi uygula
  - [ ] 28.1 Create error response utilities
    - Implement standardized ErrorResponse format
    - Create error code constants
    - Implement error logging with structured data
    - _Requirements: 15.1, 15.2_
  
  - [ ] 28.2 Add error handling to all API endpoints
    - Wrap endpoints in try-catch blocks
    - Return appropriate HTTP status codes
    - Log errors with context
    - _Requirements: 15.1, 15.2_
  
  - [ ] 28.3 Implement frontend error display
    - Create Toast/Notification component for errors
    - Display user-friendly error messages
    - Add progress indicators for long operations
    - Add success confirmations
    - _Requirements: 15.3, 15.4_
  
  - [ ]* 28.4 Write property test for error logging detail
    - **Property 38: Error Logging Detail**
    - **Validates: Requirements 15.2**
  
  - [ ]* 28.5 Write unit tests for error handling
    - Test error response format
    - Test error logging
    - Test user feedback display
    - _Requirements: 15.1, 15.2, 15.4_

- [ ] 29. Kontrol noktası - Tüm testlerin geçtiğinden emin ol
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 30. Performans optimizasyonlarını uygula
  - [ ] 30.1 Add database indexes
    - Create indexes on frequently queried fields (stage, score, linkedin_url, timestamp)
    - Verify indexes exist from migration
    - Test query performance with EXPLAIN
    - _Requirements: 16.3, 16.5_
  
  - [ ] 30.2 Implement caching
    - Cache dashboard stats with Redis (5-minute TTL)
    - Cache user session data
    - Implement cache invalidation on data changes
    - _Requirements: 16.4_
  
  - [ ] 30.3 Optimize frontend performance
    - Implement pagination for all list views
    - Add loading skeletons
    - Optimize bundle size with code splitting
    - _Requirements: 16.1, 16.2_
  
  - [ ]* 30.4 Write property test for concurrent request handling
    - **Property 40: Concurrent AI Request Handling**
    - **Validates: Requirements 16.6**


- [ ] 31. Arşiv işlevselliğini uygula
  - [ ] 31.1 Add archive logic to pipeline management
    - When lead moved to "Arşiv" stage, set is_active=false and archived_at timestamp
    - Preserve all historical data (posts, messages, activity logs)
    - Filter archived leads from default views
    - Add "Show Archived" toggle option
    - _Requirements: 4.6_
  
  - [ ] 31.2 Create archived leads view
    - Implement GET /api/leads/archived endpoint
    - Display archived leads in separate section
    - Allow viewing archived lead details
    - _Requirements: 4.6_
  
  - [ ]* 31.3 Write property test for archive preservation
    - **Property 15: Archive Preservation**
    - **Validates: Requirements 4.6**
  
  - [ ]* 31.4 Write unit tests for archive functionality
    - Test archiving sets correct flags
    - Test archived leads excluded from default views
    - Test historical data preservation
    - _Requirements: 4.6_


- [ ] 32. Potansiyel müşteri-gönderi referans bütünlüğü kontrollerini uygula
  - [ ] 32.1 Add validation for lead-post relationships
    - Ensure every lead has at least one linked post
    - Validate first_post_id references existing post
    - Add database constraints if not already present
    - _Requirements: 3.5_
  
  - [ ]* 32.2 Write property test for lead-post integrity
    - **Property 11: Lead-Post Referential Integrity**
    - **Validates: Requirements 3.5**


- [ ] 33. İlgisiz gönderi tutma ve filtrelemeyi uygula
  - [ ] 33.1 Add irrelevant post handling
    - Store posts classified as irrelevant with is_relevant=false
    - Default views show only relevant posts
    - Add "Show All Posts" toggle in search results
    - _Requirements: 2.4, 2.5, 2.6_
  
  - [ ]* 33.2 Write property test for irrelevant post retention
    - **Property 8: Irrelevant Post Retention**
    - **Validates: Requirements 2.4**
  
  - [ ]* 33.3 Write unit tests for post filtering
    - Test default view excludes irrelevant posts
    - Test toggle shows all posts
    - Test irrelevant posts stored correctly
    - _Requirements: 2.5, 2.6_


- [ ] 34. Veri sahipliği doğrulamasını uygula
  - [ ] 34.1 Add user_id to all user-created records
    - Ensure search_runs, leads, messages have user_id field
    - Set user_id on record creation from authenticated user
    - _Requirements: 10.5_
  
  - [ ] 34.2 Add data ownership checks to all queries
    - Filter all queries by user_id = authenticated user
    - Return 403 for unauthorized access attempts
    - _Requirements: 10.6_
  
  - [ ]* 34.3 Write property test for data ownership
    - **Property 28: Data Ownership**
    - **Validates: Requirements 10.5**


- [ ] 35. API hız sınırlama ve kuyruğa almayı uygula
  - [ ] 35.1 Add rate limit handling for Claude API
    - Detect 429 responses from Claude API
    - Extract retry-after delay from response headers
    - Queue failed requests with appropriate delay
    - Limit concurrent API requests
    - _Requirements: 20.1, 20.4_
  
  - [ ] 35.2 Add rate limit handling for LinkedIn scraping
    - Detect LinkedIn blocks and CAPTCHA challenges
    - Pause scraping and notify user
    - Implement exponential backoff
    - _Requirements: 1.5, 20.5_
  
  - [ ]* 35.3 Write property test for API rate limit queueing
    - **Property 46: API Rate Limit Queueing**
    - **Validates: Requirements 20.1, 20.4**
  
  - [ ]* 35.4 Write property test for API error logging
    - **Property 47: API Error Logging**
    - **Validates: Requirements 20.6**
  
  - [ ]* 35.5 Write unit tests for rate limiting
    - Test 429 detection and queueing
    - Test exponential backoff
    - Test concurrent request limiting
    - _Requirements: 20.1, 20.3, 20.4_

- [ ] 36. Kontrol noktası - Tüm testlerin geçtiğinden emin ol
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 37. Entegrasyon ve bağlantı
  - [ ] 37.1 Wire all components together
    - Connect frontend pages to API endpoints
    - Connect API endpoints to services
    - Connect services to database
    - Ensure BullMQ workers are processing jobs
    - Verify activity logging throughout the flow
    - _Requirements: All_
  
  - [ ] 37.2 Test end-to-end user flows
    - Test complete search flow: keywords → scraping → classification → lead extraction
    - Test complete pipeline flow: lead creation → stage changes → archiving
    - Test complete message flow: generation → editing → approval
    - Test complete reporting flow: activity logging → dashboard display
    - _Requirements: 17.1-17.7_
  
  - [ ]* 37.3 Write integration tests for critical flows
    - Test search-to-lead flow
    - Test lead-to-message flow
    - Test pipeline management flow
    - _Requirements: 17.1-17.7_


- [ ] 38. Son test ve doğrulama
  - [ ] 38.1 Run complete test suite
    - Run all unit tests (target: 80% coverage)
    - Run all property tests (47 properties, 100 iterations each)
    - Run all integration tests
    - Fix any failing tests
    - _Requirements: All_
  
  - [ ] 38.2 Perform manual testing
    - Test all pages in browser
    - Test authentication flows
    - Test error scenarios
    - Test with Turkish characters
    - Verify responsive design
    - _Requirements: 15.3, 15.4, 15.5, 16.1_
  
  - [ ] 38.3 Validate MVP scope completion
    - Verify all MVP requirements implemented (17.1-17.7)
    - Verify Phase 2 features NOT implemented (17.8)
    - Verify Phase 3 features NOT implemented (17.10)
    - _Requirements: 17.1-17.10_

- [ ] 39. Son kontrol noktası - Tüm testlerin geçtiğinden ve MVP'nin tamamlandığından emin ol
  - Ensure all tests pass, ask the user if questions arise.


## Notlar

- `*` ile işaretlenmiş görevler opsiyoneldir ve daha hızlı MVP teslimatı için atlanabilir
- Her görev izlenebilirlik için belirli gereksinimlere referans verir
- Kontrol noktaları uygulama boyunca artımlı doğrulama sağlar
- Property testler fast-check kullanarak evrensel doğruluk özelliklerini doğrular
- Birim testler belirli örnekleri, uç durumları ve entegrasyon noktalarını doğrular
- Tüm kod uygun tip güvenliği ile TypeScript'te yazılmalıdır
- Routing ve API endpoint'leri için Next.js 14 App Router konvansiyonlarını takip et
- Tutarlı UI tasarımı için shadcn/ui bileşenlerini kullan
- Tüm kullanıcıya yönelik metinlerin Türkçe dil ve karakterleri desteklediğinden emin ol
- Tüm işlemler boyunca kapsamlı aktivite kaydını koru

## Test Yürütme

Uygulama sırasında testleri çalıştırmak için:

```bash
# Tüm birim testlerini çalıştır
npm run test:unit

# Tüm property testlerini çalıştır
npm run test:property

# Tüm entegrasyon testlerini çalıştır
npm run test:integration

# Kapsam ile tüm testleri çalıştır
npm run test:coverage

# Belirli test dosyasını çalıştır
npm test -- path/to/test.test.ts
```

## Gerekli Environment Variable'lar

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Claude API
ANTHROPIC_API_KEY=your_claude_api_key

# Apify (opsiyonel — Chrome Extension birincil veri kaynağı)
APIFY_API_TOKEN=your_apify_api_token

# Redis
REDIS_URL=your_redis_url

# Configuration
MAX_POSTS_PER_SEARCH=100
AI_MODEL=claude-3-5-sonnet-20241022
AI_TEMPERATURE=0.7
SCRAPING_DELAY_MS=3000
LEAD_SCORE_THRESHOLD=50
```
