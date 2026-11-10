// İşleve bağlı bölümlerin verisi (kart 0112, karar 0090): müşteri yorumları, blog yazıları ve bülten kaydı.
// Yorum ve blog temel pakette henüz yazılmadı, bülten eklentidir. Bölümler bu türlerle çizilir; veriyi vitrin
// bağlamı taşır (baglam.ts). Bağlamı okuyan (baglam-oku.ts) bugün bunları boş bırakır; işlev yazılınca aynı
// türlerle doldurur, bölüm değişmez. Katalog örnek veriyle çizer.
//
// Bu dosya yalnız tür ve düz işlevdir, sunucu kodu almaz: bölümlerin görünüşleri tarayıcıda da çalışır.

// Yorumların kaynağı: mağaza sahibinin yorum listesinde "ana sayfada göster" diye işaretledikleri ya da en
// yeniler (kullanıcı kararı). Yalnız onaylanmış yorumlar gelir; bu yorum işlevinin kuralıdır.
export const yorumKaynakTurleri = ["isaretlenenler", "en-yeni"] as const;
export type YorumKaynagi = { tur: (typeof yorumKaynakTurleri)[number]; adet: number };

// Blog yazılarının kaynağı: son yazılar ya da bir blog kategorisinin yazıları (adres adıyla).
export type BlogKaynagi =
  | { tur: "son"; adet: number }
  | { tur: "kategori"; kategori: string; adet: number };

export const yorumKaynagiAnahtari = (kaynak: YorumKaynagi): string =>
  `${kaynak.tur}:${kaynak.adet}`;
export const blogKaynagiAnahtari = (kaynak: BlogKaynagi): string =>
  kaynak.tur === "son" ? `son:${kaynak.adet}` : `kategori:${kaynak.kategori}:${kaynak.adet}`;

// Bir müşteri yorumu: puan 1–5, metin, vitrinde görünen ad (adın nasıl yazılacağı yorum işlevinin kararıdır).
export type BaglamYorumu = { kimlik: string; puan: number; metin: string; ad: string };

// Bir blog yazısı: başlık, özet, sayfasının adresi, yayın tarihi (sitenin biçimiyle yazılmış ve makine için
// ISO tarih) ve görselinin dosya kimliği (bağlamın görsellerindedir).
export type BaglamBlogYazisi = {
  kimlik: string;
  baslik: string;
  ozet?: string;
  adres: string;
  tarih: { yazili: string; makine: string };
  gorsel?: string;
};

// Bülten kaydı: eklenti kurulunca gönderildiği uç ("uc"). Katalog örnek kipte çizer ("ornek"): form yalnız doğrular.
// Bağlamda yoksa bülten bölümü çizilmez; işlev açık olsa da eklentisi kurulmamış sitede form görünmez.
export type BultenKaydi = { tur: "uc"; adres: string } | { tur: "ornek" };
