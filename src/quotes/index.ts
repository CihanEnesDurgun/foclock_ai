/**
 * Dönen alıntı listeleri — dil bazlı, sıra ile kullanılır.
 * Index 0'dan başlayıp ROTATION_INTERVAL_MS aralıklarla ilerler.
 */

export const ROTATION_INTERVAL_MS = 20_000;

export type QuoteLang = 'tr' | 'en';

const quotesTr: readonly string[] = [
  `"İnsan aklını dağıtan şeylerin esiri olursa, kendi kendini yönetme kudretini kaybeder." – Farabi`,
  `"Bilgi, dağınık bir zihinde barınmaz; tertipli bir akıl, ilmin ilk şartıdır." – İbn Sina`,
  `"Nefsine hükmedemeyen, zamanına da hükmedemez." – Gazali`,
  `"Bugünün işini yarına bırakan, farkında olmadan ömrünü israf eder." – Hasan-ı Basri`,
  `"Zihin bir at gibidir; yön verilmezse seni istediğin yere değil, alıştığı yere götürür." – Mevlana`,
  `"İlim talebi, süreklilik ister; kısa hevesler uzun yol aldırmaz." – İmam Şafii`,
  `"İnsanı yoran işin çokluğu değil, zihnin dağınıklığıdır." – İbn Haldun`,
  `"Kalp bir meclistir; her düşünceyi içeri alırsan, hakikate yer kalmaz." – Yunus Emre`,
  `"Az ama devamlı yapılan iş, çok ama düzensiz olandan üstündür." – Gazali`,
  `"Zaman kılıç gibidir; sen onu kesmezsen, o seni keser." – İmam Şafii`,
];

/** İngilizce alıntılar — çeviriler sonra eklenecek; şimdilik placeholder. */
const quotesEn: readonly string[] = [
  `"Placeholder EN 1"`,
  `"Placeholder EN 2"`,
  `"Placeholder EN 3"`,
  `"Placeholder EN 4"`,
  `"Placeholder EN 5"`,
  `"Placeholder EN 6"`,
  `"Placeholder EN 7"`,
  `"Placeholder EN 8"`,
  `"Placeholder EN 9"`,
  `"Placeholder EN 10"`,
];

export const quotes: Record<QuoteLang, readonly string[]> = {
  tr: quotesTr,
  en: quotesEn,
};

export function getQuote(lang: QuoteLang, index: number): string {
  const list = quotes[lang];
  const i = ((index % list.length) + list.length) % list.length;
  return list[i];
}

export function quoteCount(lang: QuoteLang): number {
  return quotes[lang].length;
}
