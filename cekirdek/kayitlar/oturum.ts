// Hesap türleri, oturum süreleri, şifre sınırları ve çerez adlarının tek kaydı (kart 0025, karar 0039).
// Oturumun hareketsizlik süresi site ayarıdır (cekirdek/ayar-semasi/ayarlar.ts), burada değildir.
export const hesapTurleri = ["yonetici", "musteri"] as const;
export type HesapTuru = (typeof hesapTurleri)[number];

// Kısa ömürlü anahtarın süresi.
export const kisaAnahtarSuresiSaniye = 15 * 60;

// Yenileme anahtarı değiştikten sonra eskisinin bu süre içinde gelmesi yeniden kullanım sayılmaz:
// aynı anda giden iki istek kullanıcıyı çıkarmamalı.
export const yenilemeToleransiSaniye = 30;

// Yanlış giriş sınırı (karar 0042): süre içinde bu kadar yanlış denemeden sonra giriş, son denemeden
// itibaren bu süre bekletilir. Bir ofis aynı bağlantıyı paylaşabildiği için bağlantı sınırı yüksektir.
export const girisDenemeSiniri = {
  hesap: { deneme: 10, saniye: 15 * 60 },
  baglanti: { deneme: 20, saniye: 15 * 60 },
} as const satisfies Record<string, { deneme: number; saniye: number }>;

export const sifreSiniri = { enKisa: 10, enUzun: 128 } as const;

// Argon2id ayarı. Değişirse eski özetler sonraki başarılı girişte yeni ayarla yeniden özetlenir.
export const sifreOzetiAyari = {
  bellekKb: 19_456,
  tekrar: 2,
  paralellik: 1,
  uzunluk: 32,
  tuzUzunlugu: 16,
} as const;

// __Host- öneki: çerez yalnız şifreli bağlantıda, yalnız bu adreste ve bütün yollarda geçer.
// Kardeş adresteki bir site bu çerezi ne görebilir ne de üzerine yazabilir.
export const oturumCerezAdlari = {
  yonetici: { kisa: "__Host-yonetici-oturum", yenileme: "__Host-yonetici-yenileme" },
  musteri: { kisa: "__Host-musteri-oturum", yenileme: "__Host-musteri-yenileme" },
} as const satisfies Record<HesapTuru, { kisa: string; yenileme: string }>;
