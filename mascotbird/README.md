# FUFİT maskot videoları

- **saksagan.PNG** – Statik görsel (poster olarak kullanılır).
- **saksagan_elsallama.mov** – El sallama animasyonu (QuickTime).

Tarayıcıda animasyonun oynatılması için **MP4** kullanılmalı (Chrome/Edge .mov desteklemez).

## MP4 oluşturma

ffmpeg yüklüyse proje kökünde:

```bash
npm run mascot:convert
```

Veya elle:

```bash
ffmpeg -y -i mascotbird/saksagan_elsallama.mov -c:v libx264 -c:a aac -movflags +faststart public/mascotbird/saksagan_elsallama.mp4
```

Oluşan `public/mascotbird/saksagan_elsallama.mp4` dosyası uygulama tarafından otomatik kullanılır.
