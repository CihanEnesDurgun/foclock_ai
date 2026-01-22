<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

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
   `scripts/fix-profiles-rls.sql` dosyasını **Supabase Dashboard → SQL Editor**’da çalıştırın.

2. **"Email not confirmed"**  
   Girişte bu hata çıkıyorsa, Supabase Auth e-posta doğrulaması açıktır.  
   - İlgili e-postaya gelen doğrulama linkine tıklayın, veya  
   - **Supabase → Authentication → Providers → Email** içinde "Confirm email" ayarını geçici olarak kapatıp test edin.
