// Ürün galerisinin ve görsel boyutlarının tek kaydı (kart 0087, karar 0073,
// .claude/rules/kayit-dosyalari.md).
//
// Galeri öğesinin türü veritabanına yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir
// veri değişikliğiyle değişir. Veritabanındaki denetim (urun_galerisi_tur) bu listeyle aynıdır, bunu
// cekirdek/moduller/urun/testler/galeri.test.ts denetler.
// - gorsel: dosya deposundaki bir görsel (cekirdek/moduller/dosya/), boyutlarıyla.
// - video: bir video sitesinin videosu, bağlantıdan çıkarılan kimliğiyle (video-siteleri.ts). Video
//   dosyası yüklenmez (kullanıcı kararı).
export const galeriOgeTurleri = ["gorsel", "video"] as const;
export type GaleriOgeTuru = (typeof galeriOgeTurleri)[number];

// Yüklenen her görselden üretilen boyutlar. Ad veritabanına yazılır (dosya_boyutlari.boyut); sayı,
// görselin en uzun kenarının en çok kaç piksel olacağıdır. Küçük görsel büyütülmez: bu durumda boyut
// görselin kendi ölçüsündedir. Vitrin hangi yerde hangi boyutu kullanacağını bu addan seçer.
// - kucuk: liste ve sepet küçük resmi, galerinin alt şeridi.
// - orta: ürün kartı.
// - buyuk: ürün sayfasındaki ana görsel.
// - tam: büyütülmüş görünüm.
// Yeni boyut eklenirse eski görsellerin o boyutu yoktur: boyutları tamamlayan bir iş aynı değişiklikte
// yazılır, yoksa eski görseller galeriye yeni eklenemez (galeri.ts boyutu eksik görseli reddeder).
export const gorselBoyutlari = {
  kucuk: 160,
  orta: 480,
  buyuk: 960,
  tam: 1600,
} as const satisfies Record<string, number>;
export type GorselBoyutu = keyof typeof gorselBoyutlari;
export const gorselBoyutAdlari = Object.keys(gorselBoyutlari) as GorselBoyutu[];

// Boyutların biçimi: WebP, bugünkü yaygın tarayıcıların hepsinde açılır ve aynı görünüşte JPEG'den
// belirgin biçimde hafiftir. Özgün görsel kendi biçiminde (yeniden kodlanmış) ayrıca saklanır.
export const gorselBoyutBicimi = { tur: "webp", kalite: 80 } as const;

// Galeri sınırları: ürün başına en çok bu kadar silinmemiş öğe; alternatif metin en çok bu uzunlukta.
// Alternatif metin her öğede zorunludur: görselde ekran okuyucunun okuduğu metin, videoda oynatıcının
// başlığıdır.
export const galeriSinirlari = { oge: 30, alternatifMetin: 250 } as const;

// Panelin "küçük görsel" uyarısı (kart 0266, kullanıcı kararı): en uzun kenarı bundan kısa görsel reddedilmez, galeride
// vitrinde bulanık görünebileceği söylenir (ürün sayfasının büyük boyutu 960 piksel).
export const galeriOnerilenEnAz = 800;

// Sitenin başlangıç dosyalarındaki görsel adı (kart 0115): baslangic/gorseller/ klasöründeki dosya; küçük
// harfli, tireli ad ve bilinen uzantı. Yol kaçışı olmasın diye alt klasör yazılamaz.
export const baslangicGorselAdiKalibi = /^[a-z0-9][a-z0-9-]{0,99}\.(png|jpg|webp)$/;
