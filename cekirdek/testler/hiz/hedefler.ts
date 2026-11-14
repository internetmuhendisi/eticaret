// Vitrinin hız hedefleri (kart 0146, karar 0124, .claude/rules/performans.md). Hız ölçümü (hiz-olcumu.test.ts) her
// vitrin sayfa türünü yavaş telefon koşuluyla açar; ortanca ölçüm bu sınırları aşarsa kontrol hattı durur.
// Sınır değiştirilirse karar kaydına ve kural dosyasına neden yazılır.
export const hizHedefleri = {
  // Ana içeriğin görünme süresi (Largest Contentful Paint), milisaniye.
  anaIcerik: 2500,
  // Yüklenirken kayma (Cumulative Layout Shift), birimsiz.
  kayma: 0.1,
  // Tıklamaya tepki (Interaction to Next Paint; menü düğmesine basılınca), milisaniye.
  tepki: 200,
  // Sayfayla tarayıcıya giden kod (JavaScript), sıkıştırılmış, kilobayt. Ölçülen en büyük sayfa 298 KB'tı
  // (kart 0146); sınır büyümeyi durdurur, inmesi kart 0194'tür.
  kod: 320,
} as const;

// Yavaş telefon koşulu: Lighthouse'un telefon ölçümüyle aynı ağ (yavaş 4G) ve 390 px ekran. İşlemci yavaşlatması
// makinenin hızına göre ayarlanır (hiz-olcumu.test.ts): referans makinede 4 kat.
export const yavasTelefon = {
  ekran: { width: 390, height: 844 },
  gecikme: 150,
  indirme: (1.6 * 1024 * 1024) / 8,
  yukleme: (750 * 1024) / 8,
  islemciYavaslatma: 4,
  // Referans makinede işlemci ölçüsünün süresi (milisaniye): bu makinede yavaşlatma 4 kattır.
  referansIslemciSuresi: 170,
} as const;

// Her sayfa kaç kez ölçülür; ortancası hedefle karşılaştırılır.
export const olcumSayisi = 3;
