# CLAUDE.md — FoClock AI Geliştirme Standartları

Bu dosya Claude Code'un bu projede nasıl davranacağını tanımlar.
Tüm yanıtlar ve kod değişiklikleri bu kurallara uymalıdır.

---

## Genel Yaklaşım

- Gereksiz açıklama veya özet yazma. Doğrudan dosya içeriğine veya koda odaklan.
- Değişiklik yapmadan önce ilgili dosyayı oku.
- İstenenin ötesine geçme: tek bir hata düzeltmesi için çevre kodunu refactor etme.
- Kullanılmayan `_variable`, yorum satırı kalıntısı, geriye dönük uyumluluk shim'i bırakma.

---

## Dil ve Kod Stili

- **TypeScript** kullan, `any` türünden kaçın. Tip tanımları `src/types/index.ts`'de.
- Kod içi yorumlar **Türkçe** olmalı. İngilizce yorum ekleme.
- Yorum yalnızca mantık açık değilse: rutin satırları açıklama.
- Fonksiyonlar küçük ve tek sorumlu olsun. Bir fonksiyon 40 satırı geçerse bölünmeli.
- `import` sırası: React → üçüncü taraf → `@/services` → `@/types` → `@/locales`.

---

## Dosya Yapısı Kuralları

- Yeni bileşenler `src/components/` altına, yeni servisler `src/services/` altına gider.
- Genel tip tanımı ekleniyorsa `src/types/index.ts`'e eklenir, ayrı dosya açılmaz.
- Çeviri dizesi ekleniyorsa `src/locales/index.ts`'e hem `tr` hem `en` anahtarıyla eklenir.
- `src/version.ts` dokunulmaz; sürüm buradaki `VERSION` objesiyle yönetilir.

---

## Supabase Kuralları

- Yeni tablo veya politika ekleniyorsa `supabase/migrations/` altına sıra numaralı yeni bir `.sql` dosyası açılır. Mevcut migration dosyaları düzenlenmez.
- RLS politikası recursive döngüye girme riski varsa `SECURITY DEFINER` RPC kullan.
- Client tarafından direkt `profiles` tablosuna `INSERT` yapma; `create_user_profile` RPC kullan.
- Yeni RPC'ler `GRANT EXECUTE ... TO authenticated;` ile yetkilendirilmelidir.

---

## Gemini Entegrasyon Kuralları

- `geminiService.ts` tek erişim noktasıdır. Başka dosyadan direkt API çağrısı yapma.
- Her istekte kullanıcının `field` ve `projectTags` değerleri prompt bağlamına eklenir.
- `userMemoryService.ts` üzerinden hafıza kayıtları prompt'a eklenir (1.5.D+).
- Gemini yanıtı parse edilemezse: logla, kullanıcıya genel hata göster, uygulama çökmemeli.

---

## Hata Ayıklama Yaklaşımı

1. **Önce logları incele** — tarayıcı konsolu ve Supabase Dashboard → Logs.
2. RLS hatası geliyorsa: migration'ların sırasıyla uygulandığını kontrol et (001 → 007).
3. Supabase hatalarında `error.code` ve `error.message`'ı logla, ham response'u sakla.
4. Gemini hatalarında `status` ve `response.text` logla.
5. Aynı aracı iki kez aynı şekilde çalıştırma; önce hatanın nedenini anla.

---

## Commit Mesajı Formatı

```
<tip>: <kısa açıklama>

Tip seçenekleri: feat, fix, refactor, docs, chore, style
Örnek: fix: profiles RLS politikası eklendi (006_fix_rls)
Örnek: feat: pair mode davet akışı tamamlandı
```

---

## Yapılmaması Gerekenler

- `supabase.ts`'e doğrudan credentials yazma — env değişkenlerine taşı (teknik borç).
- `console.log` üretim koduna bırakma; geliştirme sırasında kullan, commit'te temizle.
- `// TODO` veya `// FIXME` yorumu bırakma; bunun yerine `CONTEXT.md`'e teknik borç olarak ekle.
- Yeni dosya açmadan önce benzer işlevi olan mevcut servis olup olmadığını kontrol et.
- `any` tipi kullanma. Bilinmeyen tür için `unknown` kullan ve daralt.
