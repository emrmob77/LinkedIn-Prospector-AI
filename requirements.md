# Gereksinimler Dokümanı

## Giriş

LinkedIn Prospector AI, satış ekipleri için LinkedIn lead üretim sürecini otomatikleştirmek ve optimize etmek üzere tasarlanmış bağımsız bir SaaS uygulamasıdır. Sistem, AI destekli filtreleme, sınıflandırma ve kişiselleştirilmiş mesaj üretimi kullanarak manuel prospecting süresini günde 3-4 saatten yaklaşık 30 dakikaya düşürür. Uygulama, harici CRM entegrasyonuna ihtiyaç duymadan 6 aşamalı satış pipeline yönetim sistemi ile bağımsız bir platform olarak çalışır.

## Sözlük

- **Sistem**: LinkedIn Prospector AI uygulaması
- **Lead**: LinkedIn paylaşımları üzerinden tespit edilen potansiyel müşteri
- **Paylaşım**: Potansiyel lead içerebilecek LinkedIn yayını
- **Pipeline**: 6 aşamalı satış süreci (İletişim Kurulacak → İletişim Kuruldu → Cevap Alındı → Görüşme → Teklif → Arşiv)
- **AI_Motoru**: Sınıflandırma, skorlama ve mesaj üretimi için Claude API destekli bileşen
- **Scraper**: LinkedIn veri çıkarımı için Playwright/Puppeteer tabanlı bileşen
- **Tarama_Çalıştırması**: Belirli anahtar kelimelerle LinkedIn tarama sürecinin tek bir yürütülmesi
- **Aktivite_Logu**: Tüm kullanıcı ve sistem eylemlerinin sistem tarafından oluşturulan kaydı
- **İnsan_Onayı**: Mesaj göndermeden önce insan incelemesi gerektiren onay mekanizması
- **Lead_Skoru**: Lead kalitesini gösteren AI tarafından üretilen sayısal değer (0-100)
- **Mesaj_Taslağı**: Onay bekleyen AI tarafından üretilmiş kişiselleştirilmiş iletişim mesajı
- **Dashboard**: Metrikleri ve analizleri gösteren raporlama arayüzü
- **Frontend**: Next.js + React 18 + Tailwind CSS + shadcn/ui arayüzü
- **Backend**: Next.js API Routes sunucu tarafı mantığı
- **Veritabanı**: Supabase PostgreSQL veri depolama
- **Parser**: LinkedIn HTML'inden yapılandırılmış veri çıkaran bileşen
- **Pretty_Printer**: Verileri görüntüleme veya dışa aktarma için biçimlendiren bileşen

## Gereksinimler

### Gereksinim 1: LinkedIn Paylaşım Tarama

**Kullanıcı Hikayesi:** Satış uzmanı olarak, ilgili konuları tartışan potansiyel leadleri belirleyebilmek için LinkedIn paylaşımlarını anahtar kelimelerle aramak istiyorum.

#### Kabul Kriterleri

1. Kullanıcı arama anahtar kelimeleri sağladığında, Scraper bu anahtar kelimeleri içeren LinkedIn paylaşımlarını alacaktır
2. Bir arama başlatıldığında, Sistem zaman damgası ve parametrelerle bir Tarama_Çalıştırması kaydı oluşturacaktır
3. Scraper paylaşım içeriğini, yazar bilgilerini, etkileşim metriklerini ve yayın tarihini çıkaracaktır
4. Tarama tamamlandığında, Sistem ham paylaşım verilerini Veritabanında saklayacaktır
5. LinkedIn hız sınırlaması tespit edilirse, Scraper duraklatacak ve üstel geri çekilme ile yeniden deneyecektir
6. Sistem kimlik doğrulama hatalarını işleyecek ve kullanıcıyı bilgilendirecektir
7. Birden fazla sonuç sayfası mevcut olduğunda, Scraper yapılandırılabilir bir limite kadar sonuçlar arasında sayfalama yapacaktır

### Gereksinim 2: AI Destekli Paylaşım Filtreleme

**Kullanıcı Hikayesi:** Satış uzmanı olarak, yalnızca yüksek kaliteli leadleri inceleyebilmek için AI'ın alakasız paylaşımları otomatik olarak filtrelemesini istiyorum.

#### Kabul Kriterleri

1. Paylaşımlar tarandığında, AI_Motoru her paylaşımı alakalı veya alakasız olarak sınıflandıracaktır
2. AI_Motoru her paylaşım için bir alaka skoru (0-100) sağlayacaktır
3. AI_Motoru sınıflandırma kararları için gerekçe sağlayacaktır
4. Bir paylaşım alakasız olarak sınıflandırıldığında, Sistem onu işaretleyecek ancak Veritabanında tutacaktır
5. Sistem varsayılan olarak kullanıcılara yalnızca alakalı paylaşımları gösterecektir
6. Kullanıcı "tüm paylaşımları göster" seçeneğini etkinleştirdiğinde, Sistem hem alakalı hem de alakasız paylaşımları gösterecektir

### Gereksinim 3: Lead Çıkarımı ve Skorlama

**Kullanıcı Hikayesi:** Satış uzmanı olarak, iletişim çabalarımı önceliklendirmek için AI'ın lead bilgilerini çıkarmasını ve potansiyellerini skorlamasını istiyorum.

#### Kabul Kriterleri

1. Bir paylaşım alakalı olarak sınıflandırıldığında, AI_Motoru lead bilgilerini (ad, ünvan, şirket, LinkedIn URL) çıkaracaktır
2. AI_Motoru alaka, etkileşim ve profil kalitesine dayalı bir Lead_Skoru (0-100) oluşturacaktır
3. AI_Motoru paylaşımda bahsedilen temel sorun noktalarını veya ihtiyaçları belirleyecektir
4. Sistem çıkarılan lead verilerini leads tablosunda saklayacaktır
5. Sistem her lead'i kaynak paylaşıma bağlayacaktır
6. Lead çıkarımı başarısız olduğunda, Sistem hatayı kaydedecek ve paylaşımı manuel inceleme için işaretleyecektir

### Gereksinim 4: İletişim Pipeline Yönetimi

**Kullanıcı Hikayesi:** Satış uzmanı olarak, satış sürecimi sistematik olarak takip edebilmek için leadleri 6 aşamalı bir pipeline üzerinden yönetmek istiyorum.

#### Kabul Kriterleri

1. Sistem altı pipeline aşamasını destekleyecektir: İletişim Kurulacak, İletişim Kuruldu, Cevap Alındı, Görüşme, Teklif, Arşiv
2. Yeni bir lead oluşturulduğunda, Sistem onu varsayılan olarak "İletişim Kurulacak" aşamasına yerleştirecektir
3. Kullanıcı bir lead'i aşamalar arasında taşıdığında, Sistem lead durumunu güncelleyecek ve aktiviteyi kaydedecektir
4. Sistem leadleri pipeline aşamasına göre gruplandırılmış olarak gösterecektir
5. Sistem her aşama içinde leadlerin filtrelenmesine ve sıralanmasına izin verecektir
6. Bir lead "Arşiv"e taşındığında, Sistem onu inaktif olarak işaretleyecek ancak tüm geçmiş verileri tutacaktır
7. Sistem açık kullanıcı onayı olmadan leadlerin pipeline'da geriye taşınmasını engelleyecektir

### Gereksinim 5: AI Mesaj Üretimi

**Kullanıcı Hikayesi:** Satış uzmanı olarak, leadlerle alakalı, özelleştirilmiş iletişim kurmak için AI'ın kişiselleştirilmiş iletişim mesajları üretmesini istiyorum.

#### Kabul Kriterleri

1. Kullanıcı bir lead için mesaj talep ettiğinde, AI_Motoru kişiselleştirilmiş bir Mesaj_Taslağı oluşturacaktır
2. AI_Motoru lead'e özgü bağlamı (paylaşım içeriği, sorun noktaları, şirket, rol) dahil edecektir
3. AI_Motoru genel şablonlardan kaçınacak ve her lead için benzersiz mesajlar oluşturacaktır
4. Mesaj_Taslağı bir konu satırı ve mesaj gövdesi içerecektir
5. Sistem Mesaj_Taslağını belirli lead'e bağlı olarak saklayacaktır
6. Sistem kullanıcıların onaydan önce Mesaj_Taslaklarını düzenlemesine izin verecektir
7. Sistem lead başına birden fazla mesaj varyasyonunu destekleyecektir

### Gereksinim 6: İnsan Onayı

**Kullanıcı Hikayesi:** Satış uzmanı olarak, iletişim kalitemi kontrol altında tutabilmek için göndermeden önce tüm AI tarafından üretilen mesajları incelemek ve onaylamak istiyorum.

#### Kabul Kriterleri

1. Sistem herhangi bir mesaj gönderilmeden önce açık insan onayı gerektirecektir
2. Bir Mesaj_Taslağı oluşturulduğunda, Sistem onu kullanıcı incelemesi için gösterecektir
3. Sistem her Mesaj_Taslağını onaylama, düzenleme veya reddetme seçenekleri sunacaktır
4. Kullanıcı bir Mesaj_Taslağını düzenlediğinde, Sistem düzenlenmiş versiyonu kaydedecektir
5. Sistem onay olmadan otomatik mesaj gönderimini engelleyecektir
6. Sistem tüm onay kararlarını Aktivite_Logunda kaydedecektir

### Gereksinim 7: Aktivite Loglama

**Kullanıcı Hikayesi:** Satış uzmanı olarak, hangi eylemlerin gerçekleştirildiğini takip edebilmek için tüm sistem aktivitelerinin kronolojik bir logunu görmek istiyorum.

#### Kabul Kriterleri

1. Sistem tüm kullanıcı eylemlerini (aramalar, lead hareketleri, mesaj onayları) kaydedecektir
2. Sistem tüm sistem eylemlerini (tarama, AI sınıflandırmaları, skorlama) kaydedecektir
3. Bir eylem gerçekleştiğinde, Sistem zaman damgası, eylem türü, kullanıcı ve etkilenen varlıkları kaydedecektir
4. Aktivite_Logu ters kronolojik sırada (en yeni önce) gösterilecektir
5. Sistem Aktivite_Logunu tarih aralığı, eylem türü ve kullanıcıya göre filtrelemeye izin verecektir
6. Sistem Aktivite_Logu kayıtlarını denetim amaçları için süresiz olarak tutacaktır

### Gereksinim 8: Dashboard ve Metrikler

**Kullanıcı Hikayesi:** Satış müdürü olarak, prospecting etkinliğini ölçebilmek için temel metrikleri ve analizleri görmek istiyorum.

#### Kabul Kriterleri

1. Dashboard pipeline aşamasına göre toplam leadleri gösterecektir
2. Dashboard pipeline aşamaları arasındaki dönüşüm oranlarını gösterecektir
3. Dashboard aşamaya göre ortalama Lead_Skorunu gösterecektir
4. Dashboard zaman içinde arama aktivitesini gösterecektir
5. Dashboard mesaj onay oranlarını gösterecektir
6. Dashboard metriklerin tarih aralığına göre filtrelenmesine izin verecektir
7. Dashboard veri değiştikçe metrikleri gerçek zamanlı olarak yenileyecektir

### Gereksinim 9: Veri Kalıcılığı ve Bütünlüğü

**Kullanıcı Hikayesi:** Sistem yöneticisi olarak, hiçbir bilginin kaybolmaması için tüm verilerin Supabase'de güvenilir şekilde saklanmasını istiyorum.

#### Kabul Kriterleri

1. Veritabanı paylaşımları şu alanlarla saklayacaktır: id, content, author, url, engagement_metrics, scraped_at, search_run_id
2. Veritabanı leadleri şu alanlarla saklayacaktır: id, name, title, company, linkedin_url, score, stage, post_id, created_at
3. Veritabanı mesajları şu alanlarla saklayacaktır: id, lead_id, subject, body, status, created_at, approved_at
4. Veritabanı aktivite loglarını şu alanlarla saklayacaktır: id, timestamp, action_type, user_id, entity_type, entity_id, details
5. Veritabanı tarama çalıştırmalarını şu alanlarla saklayacaktır: id, keywords, started_at, completed_at, posts_found, status
6. Sistem ilişkili tablolar arasında referans bütünlüğünü zorunlu kılacaktır
7. Bir veritabanı işlemi başarısız olduğunda, Sistem üstel geri çekilme ile yeniden deneyecek ve hatayı kaydedecektir

### Gereksinim 10: Kullanıcı Kimlik Doğrulama ve Yetkilendirme

**Kullanıcı Hikayesi:** Kullanıcı olarak, verilerimin korunması için sisteme güvenli şekilde giriş yapmak istiyorum.

#### Kabul Kriterleri

1. Sistem tüm özellikler için kimlik doğrulama gerektirecektir
2. Sistem kullanıcı yönetimi için Supabase kimlik doğrulamasını kullanacaktır
3. Kullanıcı başarıyla giriş yaptığında, Sistem bir oturum oluşturacaktır
4. Bir oturum sona erdiğinde, Sistem kullanıcıyı giriş sayfasına yönlendirecektir
5. Sistem tüm verileri kimliği doğrulanmış kullanıcıyla ilişkilendirecektir
6. Sistem kullanıcıların diğer kullanıcıların verilerine erişmesini engelleyecektir

### Gereksinim 11: LinkedIn Veri Ayrıştırma

**Kullanıcı Hikayesi:** Geliştirici olarak, veri çıkarımının doğru ve sürdürülebilir olması için LinkedIn HTML'ini güvenilir şekilde ayrıştırmak istiyorum.

#### Kabul Kriterleri

1. Parser LinkedIn paylaşım HTML'inden yapılandırılmış veri çıkaracaktır
2. Parser LinkedIn'in HTML yapısındaki varyasyonları işleyecektir
3. LinkedIn'in HTML yapısı değiştiğinde, Parser ayrıştırma hatalarını kaydedecektir
4. Parser çıkarılan verileri saklamadan önce doğrulayacaktır
5. Pretty_Printer ayrıştırılan verileri UI'da görüntülenmek üzere biçimlendirecektir
6. TÜM geçerli ayrıştırılmış veriler için, ayrıştırma sonra pretty-printing sonra ayrıştırma orijinal ayrıştırılmış veriye eşdeğer veri üretecektir (round-trip özelliği)
7. Ayrıştırma başarısız olduğunda, Sistem ham HTML'i manuel inceleme için saklayacaktır

### Gereksinim 12: Arama Yapılandırması ve Yönetimi

**Kullanıcı Hikayesi:** Satış uzmanı olarak, tekrarlayan aramaları verimli şekilde çalıştırabilmek için arama yapılandırmalarını kaydetmek ve yeniden kullanmak istiyorum.

#### Kabul Kriterleri

1. Sistem kullanıcıların arama anahtar kelime yapılandırmalarını kaydetmesine izin verecektir
2. Sistem kullanıcıların kaydedilmiş aramaları adlandırmasına ve açıklamasına izin verecektir
3. Kullanıcı kaydedilmiş bir arama seçtiğinde, Sistem arama formunu kaydedilmiş parametrelerle dolduracaktır
4. Sistem arama geçmişini zaman damgaları ve sonuç sayılarıyla gösterecektir
5. Sistem kullanıcıların kaydedilmiş aramaları silmesine izin verecektir
6. Sistem hangi Tarama_Çalıştırmalarının hangi kaydedilmiş yapılandırmaları kullandığını takip edecektir

### Gereksinim 13: Lead Tekilleştirme

**Kullanıcı Hikayesi:** Satış uzmanı olarak, aynı kişiyle birden fazla kez iletişime geçmemek için sistemin tekrarlanan leadleri tespit etmesini istiyorum.

#### Kabul Kriterleri

1. Yeni bir lead çıkarıldığında, Sistem aynı LinkedIn URL'sine sahip mevcut leadleri kontrol edecektir
2. Bir tekrar tespit edilirse, Sistem yeni paylaşımı mevcut lead'e bağlayacaktır
3. Sistem her lead ile ilişkili tüm paylaşımları gösterecektir
4. Yeni bilgi skoru iyileştiriyorsa, Sistem Lead_Skorunu güncelleyecektir
5. Sistem tekrarlar tespit edildiğinde kullanıcıyı bilgilendirecektir
6. Sistem kullanıcıların gerekirse leadleri manuel olarak birleştirmesine izin verecektir

### Gereksinim 14: Dışa Aktarma İşlevselliği

**Kullanıcı Hikayesi:** Satış uzmanı olarak, lead verilerini diğer araçlarda kullanabilmek veya raporlama için dışa aktarmak istiyorum.

#### Kabul Kriterleri

1. Sistem leadlerin CSV formatına dışa aktarılmasına izin verecektir
2. Sistem leadlerin JSON formatına dışa aktarılmasına izin verecektir
3. Dışa aktarırken, Sistem tüm lead alanlarını ve mevcut pipeline aşamasını içerecektir
4. Sistem hangi leadlerin dışa aktarılacağını aşama, skor veya tarih aralığına göre filtrelemeye izin verecektir
5. Sistem dışa aktarma dosyalarını uygun kodlama (UTF-8) ile oluşturacaktır
6. Sistem tüm dışa aktarma eylemlerini Aktivite_Logunda kaydedecektir

### Gereksinim 15: Hata İşleme ve Kullanıcı Geri Bildirimi

**Kullanıcı Hikayesi:** Kullanıcı olarak, neler olduğunu anlayabilmek ve düzeltici eylem alabilmek için net hata mesajları ve geri bildirim istiyorum.

#### Kabul Kriterleri

1. Bir hata oluştuğunda, Sistem kullanıcı dostu bir hata mesajı gösterecektir
2. Sistem hata ayıklama için detaylı hata bilgilerini kaydedecektir
3. Uzun süren bir işlem devam ederken, Sistem bir ilerleme göstergesi gösterecektir
4. Bir işlem başarıyla tamamlandığında, Sistem bir başarı onayı gösterecektir
5. Sistem karmaşık özellikler için bağlamsal yardım metni sağlayacaktır
6. AI_Motoru kullanılamıyorsa, Sistem istekleri kuyruğa alacak ve kullanıcıyı bilgilendirecektir

### Gereksinim 16: Performans ve Ölçeklenebilirlik

**Kullanıcı Hikayesi:** Kullanıcı olarak, verimli çalışabilmek için sistemin hızlı yanıt vermesini istiyorum.

#### Kabul Kriterleri

1. Kullanıcı sayfalar arasında gezindiğinde, Frontend 2 saniye içinde yüklenecektir
2. Lead listesini görüntülerken, Sistem sayfa başına 50 lead göstermek için sayfalama yapacaktır
3. Veritabanı 10.000'den fazla lead içerdiğinde, Sistem sorgu yanıt sürelerini 1 saniyenin altında tutacaktır
4. Sistem sık erişilen veriler için önbellekleme uygulayacaktır
5. Sistem veritabanı sorgularını uygun indekslerle optimize edecektir
6. AI_Motoru istekleri işlerken, Sistem eşzamanlı istekleri verimli şekilde işleyecektir

### Gereksinim 17: MVP Faz Kapsamı

**Kullanıcı Hikayesi:** Ürün sahibi olarak, konsepti gerçek kullanıcılarla doğrulayabilmek için işlevsel bir MVP sunmak istiyorum.

#### Kabul Kriterleri

1. MVP anahtar kelime araması ile LinkedIn paylaşım taramasını içerecektir
2. MVP AI destekli filtreleme ve sınıflandırmayı içerecektir
3. MVP lead çıkarımı ve skorlamayı içerecektir
4. MVP tam 6 aşamalı pipeline yönetimini içerecektir
5. MVP insan onayı ile AI mesaj üretimini içerecektir
6. MVP temel Aktivite_Logu işlevselliğini içerecektir
7. MVP kullanıcı kimlik doğrulamasını içerecektir
8. MVP Kanban görünümünü İÇERMEYECEKTİR (Faz 2 için ayrılmıştır)
9. MVP gelişmiş otomasyonu İÇERMEYECEKTİR (Faz 2 için ayrılmıştır)
10. MVP e-posta entegrasyonunu İÇERMEYECEKTİR (Faz 3 için ayrılmıştır)

### Gereksinim 18: Yapılandırma Yönetimi

**Kullanıcı Hikayesi:** Sistem yöneticisi olarak, performansı ve davranışı optimize edebilmek için sistem parametrelerini yapılandırmak istiyorum.

#### Kabul Kriterleri

1. Sistem arama başına maksimum paylaşım sayısını yapılandırmaya izin verecektir
2. Sistem AI_Motoru sıcaklığını ve model parametrelerini yapılandırmaya izin verecektir
3. Sistem tarama hız limitlerini ve gecikmeleri yapılandırmaya izin verecektir
4. Sistem filtreleme için Lead_Skoru eşiklerini yapılandırmaya izin verecektir
5. Sistem yapılandırmayı ortam değişkenlerinde veya bir yapılandırma dosyasında saklayacaktır
6. Yapılandırma değiştiğinde, Sistem mümkün olduğunda yeniden dağıtım gerektirmeden değişiklikleri uygulayacaktır

### Gereksinim 19: Veri Gizliliği ve Uyumluluk

**Kullanıcı Hikayesi:** Uyumluluk görevlisi olarak, gizlilik düzenlemelerini karşılayabilmek için kullanıcı verilerinin güvenli şekilde işlenmesini istiyorum.

#### Kabul Kriterleri

1. Sistem tüm hassas verileri Veritabanında dinlenme halinde şifrelenmiş olarak saklayacaktır
2. Sistem tüm verileri HTTPS üzerinden iletecektir
3. Sistem LinkedIn şifrelerini veya kimlik doğrulama tokenlarını oturum süresinin ötesinde saklamayacaktır
4. Sistem kullanıcıların hesaplarını ve tüm ilişkili verileri silmesine izin verecektir
5. Sistem denetim amaçları için veri erişimini kaydedecektir
6. Sistem GDPR veri saklama ve silme gerekliliklerine uyacaktır

### Gereksinim 20: API Hız Sınırlama ve Dayanıklılık

**Kullanıcı Hikayesi:** Geliştirici olarak, geçici sorunların kullanıcı deneyimini bozmaması için sistemin API hatalarını zarif şekilde işlemesini istiyorum.

#### Kabul Kriterleri

1. Claude API bir hız sınırı hatası döndürdüğünde, Sistem isteği kuyruğa alacak ve belirtilen gecikmeden sonra yeniden deneyecektir
2. Claude API kullanılamadığında, Sistem bir bildirim gösterecek ve kullanıcıların diğer işlere devam etmesine izin verecektir
3. Sistem başarısız API istekleri için üstel geri çekilme uygulayacaktır
4. Sistem hız limitleri içinde kalmak için eşzamanlı API isteklerini sınırlayacaktır
5. LinkedIn taramayı engellediğinde, Sistem engeli tespit edecek ve kullanıcıyı bilgilendirecektir
6. Sistem tüm API hatalarını hata ayıklama için yeterli detayla kaydedecektir
