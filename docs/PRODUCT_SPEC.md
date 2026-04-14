# PRODUCT_SPEC.md — FoClock AI Ürün Spesifikasyonu

Hedef kitle: Bu dosyayı okuyan bir AI veya mühendis, ürünün neden böyle tasarlandığını
ve her özelliğin altındaki mantığı anlamalıdır.

---

## 1. Temel Felsefe

FoClock AI'nın çekirdeğinde şu soru yatıyor: **"Maksimum süre çalışmak yerine, maksimum verimle çalışmak nasıl mümkün olur?"**

Bu sorunun cevabı üç nörobilim ilkesine dayanıyor:

### 1.1 Ultradian Ritimler (Kleitman, 1982)
İnsan beyni ~90 dakikalık yüksek enerji döngüleri ve ardından ~20 dakikalık zorunlu dinlenme döngüleriyle çalışır. Bu döngüyü görmezden gelen çalışma süreci bilişsel yorgunluğu hızlandırır. FoClock AI bu ritmi zorlamak yerine görünür kılar ve kullanıcıyı bu döngüye göre planlama yapmaya yönlendirir.

### 1.2 Flow State Protokolü (Csikszentmihalyi)
Flow durumuna girebilmek için görev zorluğu ile kullanıcının mevcut kapasitesi dengede olmalıdır. Çok kolay → sıkılma; çok zor → kaygı. AI planlama katmanı görevleri bu dengeyi gözetecek şekilde zaman bloklarına dağıtır. Prefrontal korteksin aşırı yüklenmesini önlemek için görev geçişleri arasına zorunlu boşluklar eklenir.

### 1.3 Bilişsel Yük Teorisi (Sweller, 1988)
Çalışma belleğinin kapasitesi sınırlıdır. Birden fazla aktif görev arasında bağlam geçişi bu kapasiteyi hızla tüketir. FoClock AI kullanıcıya aynı anda yalnızca **bir aktif görev** gösterir; kuyruktaki diğer görevler arka planda bekler.

---

## 2. AI Planlama Katmanı

### 2.1 Giriş
Kullanıcı doğal dilde görev tanımlar:
> "React projesi için component yapısını tasarla"

### 2.2 Gemini İşlem Akışı
1. `geminiService.ts` → kullanıcının `field` (alan), `projectTags` ve geçmiş oturum verilerini prompt'a ekler
2. Gemini görevi analiz eder, kaç odak bloğuna bölüneceğini ve her bloğun süresini önerir
3. Yanıt parse edilerek `PlannedTask` tipine dönüştürülür:
   ```typescript
   interface PlannedTask {
     id: string;
     title: string;
     durations: number[];     // Her bloğun dakika cinsinden süresi
     completedBlocks: number;
     totalMinutes: number;
   }
   ```
4. Kullanıcı onayladığında görev kuyruğa eklenir

### 2.3 Kullanıcı Hafızası (1.5.D — Adaptive AI Core)
`user_ai_memory` tablosunda kullanıcıya özgü hafıza kayıtları tutulur. Her yeni planlama isteğinde bu kayıtlar Gemini prompt'una eklenir. Böylece AI zaman içinde kullanıcının çalışma alışkanlıklarını öğrenir.

### 2.4 Konuşma Geçmişi
`ai_conversations` ve `ai_messages` tabloları Gemini sohbet geçmişini saklar. Kullanıcı önceki planlama oturumlarına dönebilir.

---

## 3. Timer Motoru

### 3.1 Durumlar
```
IDLE → RUNNING → PAUSED → RUNNING → COMPLETED
                    ↘ IDLE (iptal)
```

### 3.2 Modlar
| Mod | Varsayılan Süre | Tetikleyici |
|-----|-----------------|-------------|
| `FOCUS` | Göreve göre değişken | Kullanıcı başlatır |
| `SHORT_BREAK` | 5 dk | FOCUS tamamlandığında |
| `LONG_BREAK` | 20 dk | Her 90 dk sonra |

### 3.3 Test Modu
Ayarlardan aktif edildiğinde 1 dakika = 1 saniyeye eşlenir. Geliştirme ve demo amaçlı.

### 3.4 Aktif Oturum Senkronizasyonu
Timer çalışırken `active_sessions` tablosu güncellenir. Arkadaşlar bu tabloyu okuyarak canlı durumu görür. Güncelleme sıklığı: her 10 saniyede bir veya durum değiştiğinde.

---

## 4. Sosyal Katman

### 4.1 Arkadaş Sistemi
- `search_users_by_username` RPC ile prefix tabanlı kullanıcı arama
- `friend_requests` tablosu: `pending → accepted/rejected` geçiş durumu
- Kabul edilen istekler `get_friends` RPC ile çekilir (RLS bypass, `SECURITY DEFINER`)

### 4.2 Aktivite Takibi
Motivasyon mekanizması olarak tasarlandı. Arkadaşlar aktif çalışırken bunun görünür olması sosyal normatif baskı yaratır ve sürüklenen kullanıcıyı yeniden odaklanmaya iter. Veri: `active_sessions` tablosu, arkadaşa özel RLS politikasıyla.

### 4.3 Birlikte Çalış (Pair Mode)
```
Kullanıcı A → davet gönder → pair_invites (pending)
Kullanıcı B → kabul et   → co_work_pairs kaydı oluşur
                           + her kullanıcı kendi timer'ını çalıştırır
                           + active_sessions.paired_with_user_id dolar
```
İki kişi bağımsız timer kullanır ama birbirini "yan yana çalışıyor" olarak görür.

### 4.4 Odalar (Room Mode)
```
Host → rooms kaydı oluşturur (generate_room_code RPC)
Üye  → join_room_by_code RPC ile 6 karakterli koda girer
       → room_members kaydı eklenir
Host → room_sessions başlatır (ortak timer)
Üyeler → Supabase Realtime ile senkron güncelleme alır
```
Max 15 üye. `room_code` benzersizliği generate_room_code RPC garantiler.

---

## 5. Kullanıcı Profili Modeli

```typescript
interface User {
  id: string;           // Supabase auth.uid()
  name: string;
  username?: string;    // Benzersiz, küçük harfe normalize (username_lower)
  email: string;
  field: string;        // Örn: "Yazılım", "Tasarım", "Akademi"
  projectTags: string[];
  role: 'admin' | 'user';
  friends: string[];
  pendingRequests: string[];
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'tr' | 'en';
    notifications: boolean;
  };
}
```

`field` ve `projectTags` Gemini prompt context'ine beslenir; AI önerilerini bu alana göre kişiselleştirir.

---

## 6. Demo Modu

Kayıt gerektirmeden tüm UI akışı test edilebilir. Demo kullanıcısı için sabit fixture veri kullanılır. Supabase çağrıları yapılmamalıdır (mevcut teknik borç: yapılıyor, bkz. `CONTEXT.md`).

---

## 7. Çoklu Dil Desteği

`src/locales/index.ts` tek kaynak. Her string `tr` ve `en` anahtarıyla tanımlı. Dil tercihi `User.preferences.language`'de saklanır, uygulama yeniden başlatma gerekmeden anlık değişir.
