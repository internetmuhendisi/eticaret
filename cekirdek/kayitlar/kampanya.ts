// Kuponların kaydı (kart 0312, karar 0187). Tür ve kapsam adları veritabanına yazılır: yayınlandıktan sonra ancak eski
// kayıtları dönüştüren bir veri değişikliğiyle değişir. Veritabanındaki denetimler (kuponlar_tur, kuponlar_kapsam) bu
// listelerle aynıdır, bunu cekirdek/moduller/kampanya/testler/servis.test.ts denetler.
//
// - yuzde: kapsamdaki ürünlerin tutarından yüzde (1–100) indirim.
// - tutar: kapsamdaki ürünlerin tutarından sabit indirim; ürünlerin tutarını aşmaz, kargoya uygulanmaz.
// - ucretsiz-kargo: ücretli kargo ücretsiz olur; ürünlere indirim yoktur.
export const kuponTurleri = ["yuzde", "tutar", "ucretsiz-kargo"] as const;
export type KuponTuru = (typeof kuponTurleri)[number];

// Kuponun geçtiği ürünler: bütün ürünler, seçili ürünler ya da seçili kategorilerin (alt kategorileriyle) ürünleri.
export const kuponKapsamlari = ["hepsi", "urunler", "kategoriler"] as const;
export type KuponKapsami = (typeof kuponKapsamlari)[number];

// Kuponun geçmeme nedenleri; sırası denetimin sırasıdır (ilk tutmayan söylenir). Kapalı ya da silinmiş kupon
// "bulunamadi"dır: kodun var olduğu belli olmaz.
// - kullanildi: kişi başı sınır doldu (yalnız ödemede, müşterinin hesabı ya da e-postası bilinince denetlenir).
// - urun-yok: sepette kapsama giren ve (kupon istiyorsa) indirimde olmayan satılabilir ürün yok.
// - en-az: sepetin ara toplamı en az tutarın altında (kalan tutarla söylenir).
export const kuponRedNedenleri = [
  "bulunamadi",
  "baslamadi",
  "suresi-doldu",
  "sinir-doldu",
  "kullanildi",
  "urun-yok",
  "en-az",
] as const;
export type KuponRedNedeni = (typeof kuponRedNedenleri)[number];

// Kod: harf, rakam ve tire. Büyük küçük harfin fark edip etmediği altyapı sahibinin ayarıdır (kuponKoduHarfDuyarli);
// tekillik her zaman harf ayrımsız aranır (aynı kodun yalnız harf büyüklüğüyle ayrılan iki kuponu açılmaz).
export const kuponKoduKalibi = /^[\p{L}\p{N}-]+$/u;

export const kuponSinirlari = {
  kodEnAz: 3,
  kodEnCok: 30,
  adEnCok: 100,
  yuzdeEnAz: 1,
  yuzdeEnCok: 100,
  // Kuruş; tutar kuponunun ve en az sepet tutarının üst sınırı.
  tutarEnCok: 100_000_000_00,
  kullanimEnCok: 1_000_000_000,
  kapsamEnCok: 500,
} as const;
