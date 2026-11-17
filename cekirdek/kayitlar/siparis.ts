// Siparişin kayıtları (kart 0214, karar 0141; .claude/rules/kayit-dosyalari.md). Durum ve geçmiş nedeni adları siparişe
// ve sipariş geçmişine yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir veri değişikliğiyle değişir.
// Veritabanındaki denetimler (siparisler_durum, siparis_gecmisi_neden) bu listelerle aynıdır, bunu
// cekirdek/moduller/siparis/testler/servis.test.ts denetler.

// Sipariş durumları. Kargoda, teslim edildi ve iade on üçüncü bölümde.
// - odeme-bekleniyor: havale ve kapıda ödemede sipariş ödeme alınana kadar bu durumdadır.
// - hazirlaniyor: ödeme alındı, sipariş hazırlanıyor (kartla ödemede sipariş bu durumla kurulur, kart 0215).
// - iptal: sipariş iptal oldu, düşen stok geri kondu.
// gecis: durumun geçebileceği durumlar (tek durum tanımı; panel, e-posta ve rapor bunu kullanır).
export const siparisDurumTanimlari = {
  "odeme-bekleniyor": { gecis: ["hazirlaniyor", "iptal"] },
  hazirlaniyor: { gecis: ["iptal"] },
  iptal: { gecis: [] },
} as const satisfies Record<string, { gecis: readonly string[] }>;
export type SiparisDurumu = keyof typeof siparisDurumTanimlari;
export const siparisDurumlari = Object.keys(siparisDurumTanimlari) as SiparisDurumu[];
export const gecebilirMi = (onceki: SiparisDurumu, sonraki: SiparisDurumu): boolean =>
  (siparisDurumTanimlari[onceki].gecis as readonly string[]).includes(sonraki);

// Sipariş geçmişinin nedenleri: durum neden değişti.
// - olusturuldu: müşteri siparişi verdi (önceki durum yoktur).
// - havale-suresi-doldu: havalenin ödeme süresi doldu, sipariş kendiliğinden iptal oldu.
// - havale-bildirildi: müşteri ödediğini bildirdi; durum değişmez, bildirim siparişe yazılır.
export const siparisGecmisiNedenleri = [
  "olusturuldu",
  "havale-suresi-doldu",
  "havale-bildirildi",
] as const;
export type SiparisGecmisiNedeni = (typeof siparisGecmisiNedenleri)[number];

// Sipariş alındı sayfasının çerezi: siparişi veren tarayıcıya verilen erişim anahtarı (veritabanında yalnız
// özeti durur). Yalnız sipariş alındı sayfasının yoluna gider, bir gün geçerlidir. Siparişleri ve sipariş takibi
// on üçüncü bölümdedir.
export const siparisErisimCerezi = {
  ad: "siparis-erisim",
  yol: "/siparis-alindi",
  saniye: 24 * 60 * 60,
} as const;

// Sipariş numarasının görünüşü: önek, tire ve sıra numarası ("ORN-1001").
export const siparisNumarasiKalibi = /^[A-Z]{2,5}-[1-9][0-9]{0,11}$/;

// İptal taramasının bir çalışmada iptal ettiği en çok sipariş: kalan bir sonraki çalışmaya kalır.
export const havaleIptalPartisi = 100;
