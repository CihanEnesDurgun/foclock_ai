# FoClock AI - Yerel Test Rehberi

## Birlikte Çalış + Odalar Özellikleri

Bu rehber, yeni **Birlikte Çalış** ve **Odalar** özelliklerini yerelde test etmek için gereken adımları içerir.

## Ön Gereksinimler

1. **Node.js** v18+
2. **Supabase** hesabı
3. **Gemini API** anahtarı

## Kurulum Adımları

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Supabase SQL Şemasını Çalıştır

Supabase Dashboard → SQL Editor'da sırayla çalıştır:

1. **`scripts/schema.sql`** – Temel şema (profiles, friend_requests, active_sessions, RPC'ler)
2. **`scripts/schema-cowork-rooms.sql`** – Birlikte Çalış + Odalar şeması:
   - `sessions` tablosu (tamamlanan oturumlar)
   - `active_sessions` tablosuna `paired_with_user_id` kolonu
   - `co_work_pairs` tablosu (Birlikte Çalış)
   - `rooms`, `room_members`, `room_sessions` tabloları
   - `generate_room_code`, `join_room_by_code`, `get_room_members_with_profiles` RPC'leri

### 3. Ortam Değişkenleri

`.env.local` dosyasında:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Uygulamayı Başlat

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` adresine gidin.

## Test Senaryoları

### Birlikte Çalış (2 kişi, herkes kendi timer'ı)

1. İki farklı hesap ile giriş yapın (iki tarayıcı veya gizli pencere)
2. Birbirlerini arkadaş olarak ekleyin
3. Kullanıcı A: Bir görev seçip timer'ı başlatsın
4. Kullanıcı B: Sosyal panelde A'yı "flow" durumunda görsün
5. Kullanıcı B: "Birlikte Çalış" butonuna tıklasın
6. Kullanıcı B: Kendi timer'ı başlasın (25 dk varsayılan)
7. Her iki kullanıcı da birbirini "ile çalışıyor" olarak görsün

### Odalar (max 15 kişi, ortak timer)

1. Kullanıcı A: Odalar panelinden "Oda Oluştur" → Başlık ve süre gir
2. Oda kodu oluşturulur (örn. ABC123)
3. Kullanıcı A: "Kodu Kopyala" ile kodu paylaş
4. Kullanıcı B: "Odaya Katıl" → Kodu gir
5. Kullanıcı A: Arkadaş listesinden B'yi davet edebilir
6. Kullanıcı A (host): Görev adı gir → "Oturumu Başlat"
7. Tüm üyeler ortak timer'ı görsün
8. Timer bitince tüm üyelere oturum kaydedilir

## Sorun Giderme

- **"Oda bulunamadı"**: Oda kodunu büyük harfle girin (ABC123)
- **"Oda dolu"**: Max 15 üye sınırı
- **RLS hatası**: `schema-cowork-rooms.sql` tam çalıştı mı kontrol edin
- **Birlikte Çalış görünmüyor**: Arkadaş olmalı ve diğer kullanıcı aktif oturumda olmalı
