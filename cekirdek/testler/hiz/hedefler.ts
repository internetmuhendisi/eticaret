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
  // Sayfayla tarayıcıya giden kod (JavaScript), sıkıştırılmış, kilobayt. Ölçülen en büyük sayfa 298 KB'tı (kart
  // 0146), sınır 320'ydi. Vitrine yalnız vitrin metinleri gidince (kart 0253, karar 0152) en büyük sayfa 299 KB'tan
  // (havale bildirimi; önce 319) bu sınıra çekildi: büyümeyi durdurur, inmenin geri kalanı kart 0194'tür.
  kod: 305,
} as const;

// Yavaş telefon koşulu: Lighthouse'un telefon ayarının (yavaş 4G, 150 ms, 1,6 Mbit/s) tarayıcı içi yavaşlatmadaki
// karşılığı: Lighthouse bu yöntemde gecikmeyi 3,75 katına, hızı 0,9 katına çeker (gecikme her isteğe bir kez eklenir,
// bağlantı kurma gidiş-dönüşleri ayrıca taklit edilmez). Ekran 390 px. İşlemci yavaşlatması makinenin hızına göre
// ayarlanır (hiz-olcumu.test.ts): referans makinede 4 kat, hiçbir makinede enAzYavaslatma'dan az değil.
export const yavasTelefon = {
  ekran: { width: 390, height: 844 },
  gecikme: 150 * 3.75,
  indirme: (1.6 * 1024 * 1024 * 0.9) / 8,
  yukleme: (750 * 1024 * 0.9) / 8,
  islemciYavaslatma: 4,
  // Referans makinede işlemci ölçüsünün süresi (milisaniye): bu makinede yavaşlatma 4 kattır.
  referansIslemciSuresi: 170,
  // Ölçünün anlık bir yüke denk gelmesi yavaşlatmayı 1 kata düşürebiliyordu (bağımsız kontrolde ölçüldü: 3,8; 3,4;
  // 1,03): hattın makinesi referanstan yaklaşık iki kat yavaştır, alt sınır onun karşılığıdır.
  enAzYavaslatma: 2,
} as const;

// Bilinen aşımlar (kart 0146, kullanıcı kararı): hedefi bugün aşan sayfa ve ölçü, düzeltecek kartla. Listedeki ölçü
// hedefi aşabilir ama üst sınırını aşamaz (bugünkü ölçüm ve hattın dalgalanması için pay): sayfa daha da kötüleşirse
// hat durur. Listede olmayan her aşım hattı durdurur. Liste yalnız küçülebilir: düzelen sayfa listeden çıkarılır,
// yeni sayfa eklenmez (yalnız disiplin). Ölçüm, listedeki sayfa hedefe girince bunu çıktıya yazar.
// Ölçüldü (2026-11-14, yerelde, Lighthouse ağ değerleriyle): kategori 2,75 sn, bulunamadı 3,89 sn.
export const bilinenAsimlar: Readonly<
  Record<string, { olcu: keyof typeof hizHedefleri; ustSinir: number; kart: string }>
> = {
  kategori: { olcu: "anaIcerik", ustSinir: 3500, kart: "0196" },
  bulunamadi: { olcu: "anaIcerik", ustSinir: 4500, kart: "0196" },
};

// Her sayfa kaç kez ölçülür; ortancası hedefle karşılaştırılır.
export const olcumSayisi = 3;
