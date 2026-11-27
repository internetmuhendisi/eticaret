// Kuponların kaydı (kart 0312, karar 0187). Tür ve kapsam adları veritabanına yazılır: yayınlandıktan sonra ancak eski
// kayıtları dönüştüren bir veri değişikliğiyle değişir. Veritabanındaki denetimler (kuponlar_tur, kuponlar_kapsam) bu
// listelerle aynıdır, bunu cekirdek/moduller/kampanya/testler/servis.test.ts denetler.
//
// - yuzde: kapsamdaki ürünlerin tutarından yüzde (1–99) indirim.
// - tutar: kapsamdaki ürünlerin tutarından sabit indirim; ürünlerin tutarını aşmaz, kargoya uygulanmaz.
// - ucretsiz-kargo: ücretli kargo ücretsiz olur; ürünlere indirim yoktur.
import { kuponKoduSinirlari } from "./kupon-kodu.ts";

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
// - kargo-ucretsiz: ücretsiz kargo kuponu, kargosu zaten ücretsiz ya da kargosuz sepette (kullanıcı kararı: hak
//   harcanmaz). Kargo sepet hesabında bilindiği için orada denetlenir.
export const kuponRedNedenleri = [
  "bulunamadi",
  "baslamadi",
  "suresi-doldu",
  "sinir-doldu",
  "kullanildi",
  "urun-yok",
  "en-az",
  "kargo-ucretsiz",
] as const;
export type KuponRedNedeni = (typeof kuponRedNedenleri)[number];

// Kodun biçimi ve uzunluğu kupon-kodu.ts'tedir (vitrinin sepet deposu yalnız onu okur, kart 0329).
export { kuponKoduKalibi } from "./kupon-kodu.ts";

export const kuponSinirlari = {
  ...kuponKoduSinirlari,
  adEnCok: 100,
  yuzdeEnAz: 1,
  // Kupon ürünleri sıfıra indiremez (kullanıcı kararı, kart 0312): yüzde en çok 99, indirim en az 1 kuruş bırakır.
  yuzdeEnCok: 99,
  // Kuruş; tutar kuponunun ve en az sepet tutarının üst sınırı.
  tutarEnCok: 100_000_000_00,
  kullanimEnCok: 1_000_000_000,
  kapsamEnCok: 500,
  // Panelin listesinde arama (kod ve ad).
  aramaEnCok: 100,
} as const;

// Panelin kupon listesi (kart 0313, karar 0188). Durum kuponun bugünkü hâlidir, veritabanının saatiyle tek SQL
// ifadesinden bulunur (cekirdek/moduller/kampanya/panel.ts, kuponDurumuSql): kapalı; açıksa başlangıcı gelmemişse
// zamanlanmış, bitişi geçmişse (bitiş anı dahil) süresi dolmuş, öteki hâlde etkin. Sınırı dolmuş kupon etkindir.
export const kuponDurumlari = ["etkin", "zamanlanmis", "suresi-doldu", "kapali"] as const;
export type KuponDurumu = (typeof kuponDurumlari)[number];

// Listenin sıralamaları; ilki varsayılandır.
export const kuponPanelSiralamalari = [
  "yeni",
  "kod-artan",
  "kullanim-azalan",
  "bitis-artan",
] as const;
export type KuponPanelSiralamasi = (typeof kuponPanelSiralamalari)[number];

// Panelin kupon formunun ve servisinin hata kodları (alanın yoluyla döner; metinleri yonetim.kupon.hata.<kod>).
// - yuzde-gecersiz, tutar-gecersiz: indirim türünün sınırları dışında; deger-gecersiz: ücretsiz kargo kuponunda
//   indirim (ekran göndermez).
// - kullanildi: kullanılmış kuponun kodu, türü, indirimi, kapsamı ya da "indirimli ürünlerde geçmez"i değişmez.
// - kupon-degisti: ekranın gördüğü kupon arada değişti (çakışma).
export const kuponHatalari = [
  "kod-gecersiz",
  "kod-var",
  "yuzde-gecersiz",
  "tutar-gecersiz",
  "deger-gecersiz",
  "tutar-okunamadi",
  "tutar-sinir-disi",
  "sayi-gecersiz",
  "zaman-gecersiz",
  "sure-ters",
  "kapsam-bos",
  "kapsam-sinir",
  "kayit-yok",
  "kullanildi",
  "kupon-degisti",
  // Fiyat girişi ekran açıldıktan sonra değişti (kart 0326): tutarlar o biçimde yazılmıştı, kupon yazılmaz.
  "giris-degisti",
] as const;
export type KuponHatasi = (typeof kuponHatalari)[number];
