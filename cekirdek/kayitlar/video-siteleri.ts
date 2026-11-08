// Galeride kabul edilebilen video sitelerinin tek kaydı (kart 0087, karar 0073). Bir sitede hangilerinin
// kabul edildiği site ayarıdır (videoSiteleri, cekirdek/ayar-semasi/ayarlar.ts).
//
// Site adı veritabanına yazılır (urun_galerisi.video_sitesi): yayınlandıktan sonra ancak eski kayıtları
// dönüştüren bir veri değişikliğiyle değişir. Veritabanındaki denetim (urun_galerisi_video) bu listeyle
// aynıdır, bunu cekirdek/moduller/urun/testler/galeri.test.ts denetler.
//
// Mağaza sahibinin yapıştırdığı bağlantı hiçbir yere olduğu gibi yazılmaz. Bağlantıdan yalnız videonun
// kimliği çıkarılır (cekirdek/moduller/urun/video.ts), kimlik kalıba uymalıdır; sayfaya konan oynatıcı
// adresi bu kayıttaki kalıpla kimlikten kurulur.
// - adresler: bağlantının olabileceği alan adları (küçük harf, tam eşleşme).
// - kimlik: videonun kimliğinin kalıbı.
// - oynatici: sayfaya gömülen adres. YouTube çerez bırakmayan adresinden açılır, Vimeo izlemesiz
//   (dnt=1): müşteri videoyu oynatmadan ziyaretçiye çerez düşmesin.
export const videoSiteleri = {
  youtube: {
    adresler: [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
    ],
    kimlik: /^[A-Za-z0-9_-]{11}$/,
    oynatici: (kimlik: string) => `https://www.youtube-nocookie.com/embed/${kimlik}`,
  },
  vimeo: {
    adresler: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
    kimlik: /^[0-9]{1,15}$/,
    oynatici: (kimlik: string) => `https://player.vimeo.com/video/${kimlik}?dnt=1`,
  },
} as const satisfies Record<
  string,
  { adresler: readonly string[]; kimlik: RegExp; oynatici: (kimlik: string) => string }
>;
export type VideoSitesi = keyof typeof videoSiteleri;
export const videoSiteAdlari = Object.keys(videoSiteleri) as [VideoSitesi, ...VideoSitesi[]];
