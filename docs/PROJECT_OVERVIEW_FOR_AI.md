## FoClock AI – Proje Tanıtımı (AI Araçları İçin)

Bu dosya, FoClock AI projesini diğer yapay zeka araçlarına (ör. kod yardımcıları, test ajanları, mimari analiz araçları) açıklamak için hazırlanmış, yüksek seviye bir özet dokümandır. Bu metni doğrudan prompt olarak verebilir, gerektiğinde kısaltarak veya belirli bölümlerini seçerek kullanabilirsiniz.

---

### 1. Amaç ve Ürün Özeti

FoClock AI, bilimsel temelli odak yönetimi sunan, **AI destekli bir Pomodoro / odak motoru** ve **görev planlama** uygulamasıdır. Ultradian ritimler, Flow State protokolü ve bilişsel yük yönetimi gibi kavramlara dayanarak, kullanıcının beyninin doğal çalışma döngülerine uyumlu çalışma blokları planlar.

Uygulama:
- Kullanıcının hedeflerini ve görev listesini alır,
- Google Gemini üzerinden akıllı bir çalışma planı ve görev blokları çıkarır,
- Her blok için odak/ara sürelerini ayarlar,
- Seansları Supabase üzerindeki veritabanına kaydeder,
- Arkadaşlar ve odalar üzerinden **eşzamanlı odaklanma (co-work)** deneyimi sunar,
- Geçmiş ve analitik ekranları ile performansı görselleştirir.

Hedef kitle: Ders çalışan öğrenciler, yazılımcılar, kreatif üreticiler ve ekip halinde deep work yapan profesyoneller.

---

### 2. Ana Özellikler ve Kullanıcı Akışları

#### 2.1. AI Destekli Planlama
- Kullanıcı, soldaki sohbet alanına yapılacak işleri serbest metin olarak yazar.
- `services/geminiService.ts` içindeki fonksiyonlar Gemini API’yi kullanarak:
  - Görevleri analiz eder,
  - Bunları zamana yayılmış **PlannedTask** bloklarına dönüştürür,
  - Kullanıcıya onaylatılacak bir çalışma planı üretir.
- Plan onaylandığında, oluşan görevler ve blok süreleri uygulamanın durumuna ve Supabase’e kaydedilir.

#### 2.2. Akıllı Zaman Yönetimi
- **Pomodoro / ultradian ritimler / Flow protokolü** odaklı zamanlayıcı:
  - `TimerStatus` ve `TimerMode` enum’ları (`types.ts`) ile odak/seans durumlarını yönetir.
  - `PomodoroSession` modeli, her odak oturumunu (görev, başlangıç/bitiş, süre, başarı durumu) temsil eder.
- Kullanıcı, kuyruktan bir görev seçer ve merkezdeki timer’ı başlatır.
- Oturumun bitiminde sonuçlar kayıt altına alınır ve istatistiklerde görünür.

#### 2.3. Sosyal Odak (Arkadaşlar, Co-Work, Odalar)
- Arkadaşlık sistemi:
  - `User`, `FriendRequest` ve arkadaş listeleri `Supabase` üzerinde tutulur.
  - `services/friendService.ts`, arkadaş ekleme, istek gönderme/kabul etme ve listelemeyi yönetir.
- İki kişilik co-work:
  - `CoWorkPair` modeli (`types.ts`) iki kullanıcının birlikte çalışmasını temsil eder.
  - `services/pairService.ts`, davet, eşleşme ve durum yönetimini yapar.
- Çok kişili odalar:
  - `Room`, `RoomMemberInfo` ve `RoomSessionState` tipleri (ortak timer’lı odalar için) `types.ts` içinde tanımlıdır.
  - `services/roomService.ts` odaların oluşturulması, üyelik, oda kodu ile katılım ve ortak seans durumunu yönetir.
  - `services/presenceService.ts` ve `services/friendActivityService.ts`, gerçek zamanlıya yakın “kim odakta, kim ara veriyor” bilgisini sağlar.

#### 2.4. Analitik, Geçmiş ve Özetler
- `PomodoroSession` kayıtları ve oturum logları Supabase üzerinde saklanır.
- Sağ paneldeki “Geçmiş” ve istatistik ekranları, tamamlanan seansları ve toplam odak süresini gösterir.
- `services/geminiService.ts` içindeki özetleyici fonksiyonlar, oturum sonunda kısa AI özetleri üretmek için kullanılabilir (ör. “bugünkü çalışma teması” gibi).

#### 2.5. Kullanıcı Hafızası ve AI Belleği
- `services/userMemoryService.ts`, kullanıcının çalışma alışkanlıkları ve tercihleriyle ilgili kalıcı “AI memory” verisini saklar.
- `supabase/migrations/005_schema_user_ai_memory.sql` bu veriyi tutan tabloları tanımlar.
- AI, yeni planlar üretirken bu hafızadan yararlanarak:
  - Kullanıcının dayanıklılık sınırlarına,
  - Önceki oturumlarda zorlandığı noktalara,
  - Tercih ettiği blok uzunluklarına göre öneriler yapabilir.

---

### 3. Yüksek Seviye Mimari ve Teknolojiler

- **Frontend**
  - React + TypeScript
  - Vite (geliştirme sunucusu ve build aracı)
  - Tailwind CSS (modern ve minimalist UI)
  - Giriş noktası: `index.html` + `index.tsx`, ana uygulama bileşeni `App.tsx`

- **AI Katmanı**
  - `@google/genai` kullanılarak Gemini API entegrasyonu (`services/geminiService.ts`)
  - Temel fonksiyonlar:
    - Plan ve görev üretimi (planlama / blueprint)
    - Görevlerin JSON şemaya göre yapılandırılması
    - Seans özetleri ve kısa motivasyon mesajları
    - Mesaj biçimlendirme (Markdown → HTML)

- **Veri ve Backend (BaaS)**
  - Supabase (Postgres + Auth + Row Level Security)
  - İstemci: `@supabase/supabase-js` (`services/supabase.ts`)
  - Ana servisler:
    - `authService.ts`: kimlik, kullanıcı profili, oturumlar, istatistikler
    - `friendService.ts`: arkadaşlık ilişkileri
    - `pairService.ts`: iki kişilik co-work
    - `roomService.ts`: odalar ve ortak seanslar
    - `presenceService.ts`: presence/heartbeat bilgisi
    - `friendActivityService.ts`: arkadaş aktivite özetleri
    - `chatService.ts`: AI sohbet geçmişi
    - `userMemoryService.ts`: kullanıcı AI hafızası
    - `calendarService.ts`: takvim entegrasyonu (gerektiğinde)
  - Şema ve RLS:
    - `supabase/migrations/` altındaki `001_*.sql` … dosyaları, tabloları ve politikaları tanımlar.

- **Dağıtım**
  - Hedef: Vercel (statik build + Supabase BaaS)
  - Konfigürasyon: `vercel.json`
  - Build:
    - `npm run build` → `dist` klasörü
    - Vercel, `npm install` + `npm run build` komutlarını çalıştırır ve output’u host eder.

---

### 4. Temel Veri Modelleri ve Kavramlar (Özet)

Kod seviyesinde detaylar `types.ts` içinde; burada sadece yüksek seviye kavramlar listelenir:

- **User**
  - Kimlik, e-posta, kullanıcı adı, isim
  - Alan (field), proje etiketleri (projectTags)
  - Rol (admin / user)
  - Arkadaş listeleri ve bekleyen istekler
  - Tercihler: tema, dil, bildirimler

- **PomodoroSession**
  - Tek bir odak oturumunu temsil eder (görev, başlangıç/bitiş zamanı, süre, mola, başarı durumu).
  - Geçmiş ve analitik ekranlarının temel veri kaynağıdır.

- **PlannedTask**
  - AI tarafından üretilen veya kullanıcı tarafından tanımlanan bir görevi temsil eder.
  - Birden fazla zaman bloğu (`durations`) ve tamamlanan blok sayısı içerir.

- **ChatMessage / AIConversation**
  - Kullanıcı ve AI arasındaki mesajları temsil eder.
  - Konuşma listesi ve geçmişi, planlama ve hafıza fonksiyonları için kullanılır.

- **FriendActivity**
  - Arkadaşların durumunu özetler: `flow`, `rest`, `idle`, `paused` gibi modlarda,
  - Şu anki aktivite, kalan süre ve toplam süre bilgilerini taşır.

- **CoWorkPair**
  - İki kullanıcının birbirine bağlandığı eşli çalışma kaydıdır.

- **Room & RoomSessionState**
  - Ortak timer’lı çalışma odalarını ve bu odalardaki seans durumunu temsil eder.
  - Oda kodu, süre, maksimum kişi sayısı, üyeler ve ortak seans timer’ı bilgilerini içerir.

- **UserMemory / AI Memory**
  - Kullanıcının çalışma alışkanlıkları, zorlandığı noktalar ve tercihleri hakkında özet bilgiler.
  - Yeni plan üretimlerinde AI’nin kişiselleştirilmesi için kullanılır.

---

### 5. Ortam Değişkenleri ve Entegrasyonlar

- **GEMINI_API_KEY**
  - Gemini API’ye erişim için zorunlu.
  - Lokal geliştirmede `.env.local` içinde, Vercel’de environment variable olarak ayarlanır.

- **VITE_SUPABASE_URL** ve **VITE_SUPABASE_ANON_KEY** (önerilen yapı)
  - Supabase URL ve public anon key bilgileri.
  - İdeal olarak environment üzerinden geçmeli; şu an projede hardcoded kısımlar olsa da, üretim için env kullanılması tavsiye edilir.

Diğer AI araçlarına bu projeyi tanıtırken, gerektiğinde:
- Supabase instance’ınızın tablo şemalarına,
- Gemini model seçeneklerine (ör. kullanılan model ismi),
- RLS politikalarına dair ek notlar verebilirsiniz.

---

### 6. Örnek Kullanım Senaryoları

#### Senaryo 1: Tek Başına Derse Hazırlanan Öğrenci
1. Kullanıcı hesap oluşturur veya giriş yapar.
2. Chat paneline “Yarınki fizik sınavı için 3 ünite tekrar ve soru çözümü yapacağım” gibi bir hedef yazar.
3. AI, bunu 3–4 çalışma bloğuna böler (konu anlatımı, soru çözümü, tekrar) ve süre önerir.
4. Kullanıcı planı onaylar; görevler kuyruğa eklenir.
5. Kullanıcı sırayla blokları çalıştırır; her biten blok `PomodoroSession` olarak kaydedilir.
6. Gün sonunda geçmiş ekranında toplam çalışma süresini ve blok bazlı performansı görür.

#### Senaryo 2: İki Kişi ile Deep Work (Co-Work Pair)
1. Kullanıcı A ve Kullanıcı B, sistemde arkadaş olur.
2. A, `CoWorkPair` üzerinden B’ye birlikte çalışma daveti gönderir.
3. Herkes kendi timer’ını kullanarak, aynı zaman aralığında odaklanır.
4. Friend activity ekranı, iki kullanıcının da “flow” durumunda olduğunu ve kalan sürelerini gösterir.
5. Oturum bittiğinde, her iki kullanıcının geçmişinde de ilgili kayıtlar görünür.

#### Senaryo 3: Ekip Odasında Günlük Odak Bloğu
1. Takım lideri, belirli bir süre (ör. 60 dakika) için bir oda oluşturur.
2. Oda kodunu ekiple paylaşır; ekip üyeleri bu kod ile odaya katılır.
3. Oda timer’ı başlatıldığında, tüm üyeler aynı ortak zamanlayıcıyı görür.
4. `RoomSessionState` tüm katılımcılar için güncel kalır; arkadaş aktivite görünümü ekipçe akışı gösterir.
5. Oturum sonunda, herkes kendi hesabında bu odak bloğunun kaydını ve özetini görebilir.

---

Bu doküman, FoClock AI projesinin **ne yaptığı**, **hangi teknolojilerle çalıştığı** ve **temel veri/mimari yapısı** hakkında diğer yapay zeka araçlarına yeterli bağlam sağlamak için tasarlanmıştır. İhtiyaç halinde, belirli bir dosya veya modül için daha derin teknik detaylar eklenebilir.

