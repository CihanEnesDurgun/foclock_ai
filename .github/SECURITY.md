# Güvenlik Politikası

## Açık bildirimi

Bir güvenlik açığı bulduğunuzu düşünüyorsanız, lütfen **herkese açık bir issue
açmayın**. Bunun yerine GitHub üzerinden özel bildirim kullanın:

**[Security → Report a vulnerability](https://github.com/CihanEnesDurgun/foclock_ai/security/advisories/new)**

Bildiriminizde şunlar yer alırsa değerlendirme hızlanır:

- Açığın türü ve etkilenen bileşen (`api/gemini.ts`, RLS politikası, istemci kodu…)
- Yeniden üretme adımları veya kavram kanıtı
- Saldırganın elde edebileceği erişim ya da veri

İlk yanıt için hedef süre **72 saat**, doğrulanmış bulgular için düzeltme hedefi
**30 gündür**. Süreç boyunca sizi bilgilendiririz.

## Kapsam

Bu depodaki kod kapsam içindedir:

- `api/` — serverless fonksiyonlar
- `src/` — istemci uygulaması
- `supabase/migrations/` — şema, RLS politikaları ve RPC'ler
- `vercel.json` — HTTP güvenlik başlıkları
- `.github/workflows/` — CI yapılandırması

**Kapsam dışı:** üçüncü taraf servislerin kendi altyapıları (Supabase, Vercel,
Google Gemini), sosyal mühendislik, fiziksel erişim, hız sınırı olmayan
uç noktalara yönelik hacim tabanlı DoS denemeleri.

## Bilinen ve kabul edilen durumlar

Aşağıdakiler bilinçli tasarım kararlarıdır, açık olarak bildirilmesine gerek yoktur:

- **Supabase publishable (anon) anahtarı istemci paketinde görünür.** Tasarım
  gereği böyledir; asıl koruma Row Level Security politikalarıdır.
- **`check_username_available` anonim çağrılabilir.** Kayıt formu oturum
  açmadan çalıştığı için gereklidir.
- **Rate limit serverless instance belleğindedir.** Instance'lar arası
  paylaşılmaz; asıl kapı kimlik doğrulamadır.

## Denetim geçmişi

Projenin güvenlik denetim raporu, kapatılan bulgular ve doğrulama yöntemleriyle
birlikte [`docs/SECURITY.md`](../docs/SECURITY.md) dosyasındadır.
