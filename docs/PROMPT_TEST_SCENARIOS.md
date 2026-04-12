# Fufit AI — Sistem Prompt Test Senaryoları

Bu doküman, yeni adaptif sistem promptunun doğruluğunu ve kalitesini ölçmek için kullanılacak test senaryolarını içerir.
Her senaryo; **beklenen davranışı**, **başarı kriterlerini** ve **kırmızı bayrakları** tanımlar.

---

## TEST MATRİSİ

| # | Senaryo | Test Edilen Boyut | Beklenen Profil |
|---|---|---|---|
| 1 | "E-postamı okuyacağım" | MICRO görev | 1 × 10-15 dk |
| 2 | "Matematik ödevim var, ne önerirsin?" (bellek yok) | Tanı sorusu | Soru sormalı |
| 3 | "Pomodoro sevmiyorum, uzun çalışmayı tercih ederim" | Profil tanıma | ADVANCED / 90dk |
| 4 | "Çok dağınık biriyim, odaklanamıyorum" | NOVICE | 15-5 / 25-5 |
| 5 | "TÜBİTAK projem var, 3 günde bitirmem lazım" | MARATHON | Güne böl |
| 6 | "Yarım saatlik bir rapor yazacağım" | LIGHT + Yaratıcı | 20dk ısınma + 1 blok |
| 7 | "Kod review yapacağım, tekrar iş" | ROTE + Analitik | Max 25-30 dk blok |
| 8 | Kullanıcı onaylıyor → "Başla" | Faz geçişi | [EXECUTE_BLUEPRINT] |
| 9 | Deadline baskısı: "1 saatim var, makale yazmam lazım" | Parkinson Yasası | Kısa timebox + aciliyet |
| 10 | Tekrar kullanan kullanıcı (bellek dolu) | Bellek entegrasyonu | Soru sormadan profil uygula |

---

## SENARYO DETAYLARI

---

### SENARYO 1 — Micro Görev
**Amaç:** Küçük göreve 90 dakikalık blok önermiyor mu?

**Kullanıcı Girdisi:**
> "E-postalarımı okuyup cevaplamam gerekiyor."

**Beklenen Davranış:**
- Görevi MICRO olarak sınıflandırmalı
- **1 adet 10–15 dakikalık blok** önermelidir
- "2 × 90 dakika" gibi bir öneri KESİNLİKLE yapmamalı
- Gerekçesini kısaca açıklamalı: "Bu görev tek oturuşta tamamlanabilir."

**Başarı Kriterleri:**
- [ ] Önerilen toplam süre ≤ 20 dakika
- [ ] Tek blok önerildi
- [ ] Süre gerekçelendirildi
- [ ] Gereksiz yapı yok (birden fazla blok, uzun açıklamalar vb.)

**Kırmızı Bayraklar:**
- ❌ 90 dakikalık blok önerisi
- ❌ "Ultradian ritme göre..." gibi alakasız bilimsel referans
- ❌ Birden fazla oturum önerisi

---

### SENARYO 2 — Tanı Sorusu (Bellek Yok)
**Amaç:** Kullanıcı profili belirsizken doğru soru soruyor mu?

**Kullanıcı Girdisi:**
> "Matematik ödevim var, bugün çalışmak istiyorum."

**Kullanıcı Belleği:** BOŞ

**Beklenen Davranış:**
- Direkt plan önerisi yapmadan önce **tek bir tanı sorusu** sormalı
- Soru odak kapasitesini ölçmeye yönelik olmalı
- Birden fazla soru sormamamlı

**Başarı Kriterleri:**
- [ ] Tam olarak 1 soru soruldu
- [ ] Soru odak süresi / kapasitesi hakkında
- [ ] Plan önerisi HENÜZ yapılmadı
- [ ] Soru doğal bir diyalog tonunda soruldu

**Kırmızı Bayraklar:**
- ❌ Soru sormadan direkt 90dk blok önerisi
- ❌ Birden fazla soru
- ❌ "Kaç saatlik ödev?", "Hangi konular?", "Deneyimin var mı?" gibi aşırı sorgu

---

### SENARYO 3 — Uzun Çalışma Tercihi (Advanced Profil)
**Amaç:** Kullanıcı kendi profilini söylüyor, doğru karşılık veriyor mu?

**Kullanıcı Girdisi:**
> "Pomodoro hiç sevmiyorum, 25 dakikada kopuyor insan. Ben saatlerce çalışabilirim, kesmeden."

**Beklenen Davranış:**
- Kullanıcıyı **ADVANCED veya HYPERFOCUS** profil olarak tanımlamamlı
- 90 dk / 20 dk veya 60–90 dk bloklar önermeli
- "Bu çok uzun, 25 dakika daha sağlıklı" gibi kullanıcı tercihini reddeden bir yanıt vermemeli
- Yine de zorunlu mola konusunda küçük bir not düşürebilir (dayatmadan)

**Başarı Kriterleri:**
- [ ] Önerilen blok süresi ≥ 60 dakika
- [ ] Kullanıcı tercihine saygı gösterildi
- [ ] Profil doğru sınıflandırıldı (Advanced/Hyperfocus)
- [ ] Mola konusunda zorlama yok, bilgi var

**Kırmızı Bayraklar:**
- ❌ "Bilimsel olarak 25 dakika daha iyidir" gibi paternalist yanıt
- ❌ 25 dk veya Pomodoro önerisi
- ❌ Kullanıcı tercihini görmezden gelmek

---

### SENARYO 4 — Düşük Odak Kapasitesi (Novice Profil)
**Amaç:** Dağınık kullanıcıya doğru reçete sunuluyor mu?

**Kullanıcı Girdisi:**
> "Çok dağınık bir yapım var, ne yapsam dikkatim dağılıyor. Ders çalışmam lazım ama 10 dakika geçmiyor."

**Beklenen Davranış:**
- Kullanıcıyı **NOVICE** olarak sınıflandırmış
- **15 dk / 5 dk** veya **20 dk / 5 dk** gibi kısa burst önerisi
- "Alışkanlık inşa etmek" çerçevesinde açıklama
- Motive edici ama abartısız ton

**Başarı Kriterleri:**
- [ ] Önerilen blok süresi ≤ 25 dakika
- [ ] "Alışkanlık önce, verim sonra" çerçevesi var
- [ ] 90 dk blok yok
- [ ] Ton yargılayıcı değil

**Kırmızı Bayraklar:**
- ❌ "90 dakika çalışmayı dene" önerisi
- ❌ "Sadece konsantre olmak zorundasın" gibi yargılayıcı ton
- ❌ Uzun, karmaşık yapı

---

### SENARYO 5 — Marathon Görev (Çok Günlü)
**Amaç:** Büyük projeyi tek oturuma sığdırmaya çalışmıyor mu?

**Kullanıcı Girdisi:**
> "TÜBİTAK proje raporumu yazmam lazım. Literatür taraması, yöntem bölümü, bulgular ve sonuç. Toplam 3 günüm var."

**Beklenen Davranış:**
- Görevi **MARATHON** olarak tanımlamalı
- **3 güne yayılmış** oturumlar önermeli
- Her gün için ayrı hedefler (Gün 1: Literatür, Gün 2: Yöntem+Bulgular, Gün 3: Sonuç+Revizyon)
- Her oturum içinde **MEDIUM veya DEEP** scope uygulamalı
- Spacing Effect referansı bekleniyor (öğrenme için)

**Başarı Kriterleri:**
- [ ] Çok günlü yapı önerildi
- [ ] Görevler mantıklı şekilde bölündü
- [ ] Tek oturumda "hepsini bitir" denmedi
- [ ] Günlük blok süresi makul (45–90 dk arası)

**Kırmızı Bayraklar:**
- ❌ "Bugün 4 × 90 dakika çalış" gibi öneri
- ❌ Günlere bölmeden plan
- ❌ Sadece toplam süreye odaklanmak

---

### SENARYO 6 — Yaratıcı Yazım (Light + Creative)
**Amaç:** Yaratıcı iş için ısınma bloğu öneriyor mu?

**Kullanıcı Girdisi:**
> "Kısa bir blog yazısı yazacağım, yarım saat yeter sanırım."

**Beklenen Davranış:**
- LIGHT scope
- Yaratıcı iş modifier devreye girmeli
- **20 dk divergent (fikir/taslak) + 25 dk yazım** veya benzer yapı
- Doğrudan "otur yaz" değil, "önce beyin ısınsın" çerçevesi

**Başarı Kriterleri:**
- [ ] Toplam süre 30–45 dk arası
- [ ] Yaratıcı ısınma süreci var veya ima edildi
- [ ] Blok yapısı basit tutuldu (1–2 blok)

**Kırmızı Bayraklar:**
- ❌ 90 dk blok
- ❌ Isınma önerisiz direk "yaz" komutu

---

### SENARYO 7 — Tekrarlı / Sıkıcı İş
**Amaç:** Rote görev için kısa blok öneriyor mu?

**Kullanıcı Girdisi:**
> "100 tane formu gözden geçirip onaylamam lazım, tekrar tekrar aynı işlemi yapıyorum."

**Beklenen Davranış:**
- ROTE/REPETITIVE modifier devreye girmeli
- **20–30 dk bloklar**, sık molalar
- "Dikkat dağılmasına karşı kısa blok" gerekçesi
- Monotonluğa karşı çalışma sırası önerisi (önce zorları vs. arka plana bırak)

**Başarı Kriterleri:**
- [ ] Blok süresi ≤ 30 dakika
- [ ] Sık mola önerildi
- [ ] Monotonluk riski fark edildi

**Kırmızı Bayraklar:**
- ❌ 90 dk kesintisiz çalışma önerisi
- ❌ Rote görev için derin odak protokolü

---

### SENARYO 8 — Faz Geçişi (Onay → [EXECUTE_BLUEPRINT])
**Amaç:** Onay geldiğinde yalnızca execution çıktısı üretiyor mu?

**Önceki Konuşma Özeti:**
> Fufit AI, kullanıcıya "45 dk kodlama + 10 dk mola, 2 blok" önerdi.

**Kullanıcı Girdisi:**
> "Hadi başlayalım."

**Beklenen Davranış:**
- Sadece `[EXECUTE_BLUEPRINT]` + sabit onay mesajı
- **Planı tekrar açıklamamalı**
- Ek yorum, soru, öneri kesinlikle olmamalı

**Başarı Kriterleri:**
- [ ] Yanıt yalnızca `[EXECUTE_BLUEPRINT]` içeriyor
- [ ] Tekrar açıklama yok
- [ ] Ekstra cümle yok

**Kırmızı Bayraklar:**
- ❌ "Harika! İşte planın: ..." tekrarı
- ❌ "Başarılar!" gibi ek motivasyon cümlesi
- ❌ Yeni soru sorması

---

### SENARYO 9 — Deadline Baskısı (Parkinson Yasası)
**Amaç:** Zaman baskısını fırsata çevirebiliyor mu?

**Kullanıcı Girdisi:**
> "1 saatim var, bir makale yazmam lazım ama nereden başlayacağımı bile bilmiyorum."

**Beklenen Davranış:**
- Parkinson Yasası devreye girmeli: kısa, sıkı timebox → üretken baskı
- **10 dk taslak + 35 dk yazım + 15 dk revizyon** gibi yapı
- "1 saate sığdırmak zorundayız" gerçekçi çerçevesi
- Panik değil, odak tonunu korumalı

**Başarı Kriterleri:**
- [ ] Toplam plan ≤ 60 dakika
- [ ] Timebox yapısı açık ve net
- [ ] Parkinson / aciliyet dinamiği fark edildi
- [ ] Ton sakin, panik yok

**Kırmızı Bayraklar:**
- ❌ "1 saat yetmez, daha fazla zaman al" önerisi
- ❌ Belirsiz, uzun plan
- ❌ "Başarılar!" gibi boş motivasyon

---

### SENARYO 10 — Dolu Bellek (Profil Biliniyorsa Soru Sorma)
**Amaç:** Bellek dolu kullanıcıya tekrar soru sormuyor mu?

**Kullanıcı Belleği:**
```
- Kullanıcı genellikle 50 dakika odaklanabiliyor
- Sabah saatlerinde daha verimli
- Yazılım geliştirici, ağırlıklı olarak kodlama yapıyor
- Mola vermeyi sever, 10 dk mola tercih ediyor
- Focus Profile: INTERMEDIATE
```

**Kullanıcı Girdisi:**
> "Bugün yeni bir özellik geliştireceğim."

**Beklenen Davranış:**
- Tanı sorusu SORMAMALI (zaten biliniyor)
- Direkt **50 dk / 10 dk** planı önermeli
- Sabah saatine göre enerji notu düşebilir
- Kullanıcıya "zaten biliyorum seni" hissi vermeli

**Başarı Kriterleri:**
- [ ] Tanı sorusu sorulmadı
- [ ] Bellek verileri plana yansıdı (50dk, 10dk mola)
- [ ] Profil (INTERMEDIATE) doğru uygulandı
- [ ] Yanıt kısa ve özgüvenli

**Kırmızı Bayraklar:**
- ❌ "Kaç dakika odaklanabilirsin?" sorusu (zaten belleğinde var)
- ❌ Bellek verilerini görmezden gelip 90dk önermek
- ❌ Uzun ısınma soruları

---

## GENEL DEĞERLENDİRME TABLOSU

Her senaryo için şu puanlamayı kullan:

| Kriter | Ağırlık |
|---|---|
| Doğru blok süresi seçildi | 30% |
| Görev kapsamı doğru sınıflandırıldı | 20% |
| Kullanıcı profili doğru uygulandı | 20% |
| Gerekçe kısa ve ikna edici | 15% |
| Ton ve format kurallara uygun | 15% |

**Geçer not:** Her senaryo için %70 ve üzeri

---

## TEST NOTLARI

- Testler gerçek uygulama üzerinden (`npm run dev`) Fufit AI chat ekranında yapılmalıdır.
- Her senaryoyu yeni bir sohbet açarak test et (geçmiş konuşma kirliliği olmasın).
- Senaryo 10 için önce Supabase'e test kullanıcısı belleği elle eklenmelidir.
- `[EXECUTE_BLUEPRINT]` testi için önce gerçek bir plan onaylatılmalıdır.

---

*FoClock AI — Fufit AI Prompt Test Suite v1.0*
