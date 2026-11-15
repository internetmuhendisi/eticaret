// Siteyle ilgili türlerin ve durumların tek kaydı (.claude/rules/kayit-dosyalari.md).

// Gerçek site satış yapar; demo site gerçek satış yapmaz ve arama motorlarına kapalıdır (karar 0007).
export const siteTurleri = ["gercek", "demo"] as const;
export type SiteTuru = (typeof siteTurleri)[number];

// Teslimin her adımı (mağaza sahibi hesabı, yurt dışı aktarım belgeleri) bu durumlardan birindedir.
export const teslimAdimiDurumlari = ["gerekmez", "bekliyor", "tamam"] as const;
export type TeslimAdimiDurumu = (typeof teslimAdimiDurumlari)[number];

// Bir site ayarını kimin değiştirdiği (karar 0010).
export const ayarSahipleri = ["altyapi-sahibi", "magaza-sahibi"] as const;
export type AyarSahibi = (typeof ayarSahipleri)[number];
// Kodda sahip adı buradan okunur. "magaza-sahibi" aynı zamanda bir rolün kodudur; rol denetimi bu
// dosyayı bu yüzden muaf tutar (cekirdek/testler/rol-adi-yok.test.ts).
export const ayarSahibi = {
  altyapi: "altyapi-sahibi",
  magaza: "magaza-sahibi",
} as const satisfies Record<string, AyarSahibi>;

// Sunucudaki ortamlar (kart 0104, karar 0078). Kutu kullanıcı numaralarının tabanı bu adlarla
// komutlar/gizli-bilgi.mts'tedir.
export const siteOrtamlari = ["deneme", "canli"] as const;
export type SiteOrtami = (typeof siteOrtamlari)[number];

// Kutunun hangi sunucu ortamında çalıştığını söyleyen değişken. Değerini yayın komutu ortamın adıyla verir.
// Değişkeni okuyan davranış, değer yoksa canlı ortamdaki gibi davranır (cekirdek/katalog/acik-mi.ts).
export const siteOrtamiDegiskeni = "SITE_ORTAMI";

// Tema demosunun adresi (kart 0148, karar 0127). Panelin tema ekranının "Demoyu gez" bağlantısı bu adrese
// "?tema=<kod>" ekler. Değeri demo sitesinin kimliğinden komutlar verir (komutlar/tema-demosu-adresi.mts): çekirdek
// demo sitesinin adını bilmez. Değer yoksa ya da geçerli bir adres değilse bağlantı çizilmez.
export const temaDemosuAdresiDegiskeni = "TEMA_DEMOSU_ADRESI";
