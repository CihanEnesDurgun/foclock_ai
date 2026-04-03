<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🧠 FoClock AI - Nöral Odak Motoru

**Neural Beta 1.5.C** (`package.json` **1.5.1**) · Bilimsel temellere dayalı, AI destekli odak yönetimi sistemi

FoClock AI, üretkenliğinizi artırmak için tasarlanmış, yapay zeka destekli bir Pomodoro timer ve görev planlama uygulamasıdır. Ultradian ritimler ve Flow State protokolü gibi bilimsel yaklaşımları kullanarak, beyninizin doğal çalışma döngülerine uyum sağlar ve maksimum verimlilik için optimize edilmiş çalışma oturumları oluşturur.

## ✨ Özellikler

### 🤖 AI Destekli Planlama
Google Gemini AI entegrasyonu ile görevlerinizi akıllıca planlayın. Sistem, alanınıza ve hedeflerinize göre özelleştirilmiş çalışma planları oluşturur ve her oturum için motivasyonel mesajlar sunar.

### ⏱️ Akıllı Zaman Yönetimi
- **Ultradian Ritimler**: 90 dakikalık derin odak blokları ve 20 dakikalık zorunlu resetler ile doğal ritminize uyum sağlayın
- **Flow State Protokolü**: Bilişsel yük teorisine dayalı sistem ile prefrontal korteksinizi aşırı yükten koruyun
- **Esnek Pomodoro**: Görevlerinize göre özelleştirilebilir zaman blokları

### 👥 Sosyal Özellikler
- **Arkadaş Sistemi**: Kullanıcı adı ile arkadaşlarınızı bulun ve ekleyin
- **Gerçek Zamanlı Aktivite Takibi**: Arkadaşlarınızın aktif çalışma oturumlarını görüntüleyin ve motivasyon alın
- **Sosyal Bağlantılar**: Arkadaşlık istekleri gönderin ve kabul edin

### 📊 Analitik ve İstatistikler
- Detaylı çalışma geçmişi
- Toplam odak süresi takibi
- Görev bazlı performans analizi
- Tamamlanan oturum özetleri

### 🎨 Modern ve Minimalist Arayüz
- Koyu/Açık tema desteği (varsayılan: açık tema)
- Karşılama ekranı: tam genişlik, tema geçişi, gerçek uygulama görüntüleri
- Türkçe ve İngilizce dil seçenekleri
- Responsive tasarım
- Akıcı animasyonlar ve geçişler

## 🚀 Nasıl Kullanılır?

### 1. Hesap Oluşturma
- Ana sayfada "Hesap Oluştur" butonuna tıklayın
- E-posta, şifre, ad, alan ve benzersiz bir kullanıcı adı girin
- Hesabınızı oluşturun ve giriş yapın

### 2. Görev Planlama
- Sol paneldeki sohbet alanına görevlerinizi yazın (örn: "React projesi için component yapısını tasarla")
- AI, görevlerinizi analiz eder ve size özel bir plan oluşturur
- Plan onaylandığında, görevler otomatik olarak kuyruğa eklenir

### 3. Çalışma Oturumu Başlatma
- Kuyruktan bir görevi seçin
- Merkezdeki timer'ı başlatın (▶️ butonu)
- Odaklanın ve çalışmaya başlayın
- Timer bittiğinde otomatik olarak tamamlanır ve istatistiklerinize eklenir

### 4. Sosyal Özellikler
- Sağ panelde "Hesap" sekmesine gidin
- Kullanıcı adı ile arkadaş arayın ve istek gönderin
- "Sosyal" sekmesinden arkadaşlarınızın aktif oturumlarını görüntüleyin

### 5. İstatistikleri İnceleme
- Sağ panelde "Geçmiş" sekmesine tıklayın
- Tamamlanan oturumlarınızı ve toplam odak sürenizi görüntüleyin

### 6. Ayarlar
- Sağ panelde "Ayarlar" sekmesinden:
  - Tema değiştirme (Koyu/Açık)
  - Dil seçimi (Türkçe/İngilizce)
  - Test modu (1 dakika = 1 saniye, hızlı test için)

## 🎯 Demo Modu
Hesap oluşturmadan önce uygulamayı test etmek isterseniz, giriş ekranında "Demo Dene" butonunu kullanabilirsiniz. Demo modunda tüm özellikler çalışır, ancak veriler kaydedilmez.

## 🔧 Teknik Detaylar

### Gereksinimler
- Node.js (v18 veya üzeri)
- Gemini API anahtarı
- Supabase hesabı (veritabanı için)

### Kurulum ve Çalıştırma
Aşağıdaki bölümlerde detaylı kurulum talimatları bulunmaktadır.

---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1JuJYwml3vWDIXWKEhd1g8GJ-mjOH7LP-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

### Prerequisites
- Vercel hesabı ([vercel.com](https://vercel.com) üzerinden ücretsiz kayıt olabilirsiniz)
- GitHub hesabı (projenizi GitHub'a push etmeniz gerekiyor)

### Deployment Adımları

#### 1. Projeyi GitHub'a Push Edin

```bash
# Git repository'nizi başlatın (eğer yapmadıysanız)
git init
git add .
git commit -m "Initial commit"

# GitHub'da yeni bir repository oluşturun, sonra:
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git branch -M main
git push -u origin main
```

#### 2. Vercel'e Giriş Yapın ve Projeyi Import Edin

1. [vercel.com](https://vercel.com) adresine gidin ve "Sign Up" ile giriş yapın
2. "Add New..." → "Project" seçeneğine tıklayın
3. GitHub hesabınızı bağlayın (ilk kez ise)
4. Repository listenizden `foclock_ai` projenizi seçin
5. "Import" butonuna tıklayın

#### 3. Environment Variables Ayarlayın

Vercel proje ayarlarında "Environment Variables" bölümüne gidin ve şu değişkeni ekleyin:

- **Name:** `GEMINI_API_KEY`
- **Value:** Gemini API anahtarınız
- **Environment:** Production, Preview, Development (hepsini seçin)

#### 4. Build Ayarlarını Kontrol Edin

Vercel otomatik olarak şu ayarları algılamalı:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

Eğer otomatik algılanmazsa, `vercel.json` dosyası zaten hazır.

#### 5. Deploy Edin

"Deploy" butonuna tıklayın. Vercel otomatik olarak:
- Dependencies'leri yükleyecek
- Projeyi build edecek
- Production URL'i oluşturacak

#### 6. Beta Testlerine Başlayın

Deployment tamamlandıktan sonra:

1. **Production URL'i Paylaşın:**
   - Vercel dashboard'da size verilen URL'i (örn: `foclock-ai.vercel.app`) beta test kullanıcılarıyla paylaşın

2. **Preview Deployments:**
   - Her yeni commit otomatik olarak preview URL'i oluşturur
   - Bu URL'leri test için kullanabilirsiniz

3. **Custom Domain (Opsiyonel):**
   - Settings → Domains bölümünden kendi domain'inizi ekleyebilirsiniz

4. **Analytics ve Monitoring:**
   - Vercel Analytics'i aktif ederek kullanıcı davranışlarını takip edebilirsiniz

### Önemli Notlar

- **Environment Variables:** Production'da çalışması için `GEMINI_API_KEY` mutlaka ayarlanmalı
- **API Rate Limits:** Gemini API'nin rate limit'lerini kontrol edin
- **Supabase:** Şu anda Supabase credentials kod içinde hardcoded. Production için environment variables kullanmanız önerilir

### Sorun Giderme

- **Build Hataları:** Vercel dashboard'da "Deployments" sekmesinden log'ları kontrol edin
- **Environment Variables:** Değişkenlerin doğru şekilde ayarlandığından emin olun
- **404 Hataları:** `vercel.json` dosyasındaki rewrite kurallarının çalıştığını kontrol edin

#### Kayıt ol / Giriş ile ilgili

1. **"new row violates row-level security policy for table profiles"**  
   Kayıt sırasında bu hata alıyorsanız, Supabase’de `profiles` için RLS politikaları eksik demektir.  
   `supabase/migrations/001_initial_schema.sql` dosyasındaki RLS / `profiles` politikalarını **Supabase Dashboard → SQL Editor**’da güncelleyin veya ilgili migration’ı yeniden uygulayın.

2. **"Email not confirmed"**  
   Girişte bu hata çıkıyorsa, Supabase Auth e-posta doğrulaması açıktır.  
   - İlgili e-postaya gelen doğrulama linkine tıklayın, veya  
   - **Supabase → Authentication → Providers → Email** içinde "Confirm email" ayarını geçici olarak kapatıp test edin.
