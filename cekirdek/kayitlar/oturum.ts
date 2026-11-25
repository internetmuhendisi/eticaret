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

// Yöneticinin iki aşamalı girişi (kart 0028, karar 0044). Kod denemesi şifreden çok daha kolay
// tahmin edilir (6 hane), hesap sınırı bu yüzden daha sıkıdır. Değerler bütün sitelerde aynıdır.
export const ikiAsamaDenemeSiniri = {
  hesap: { deneme: 5, saniye: 15 * 60 },
  baglanti: { deneme: 20, saniye: 15 * 60 },
} as const satisfies Record<string, { deneme: number; saniye: number }>;

// Zamanlı kod standardı (RFC 6238). Doğrulama uygulamaları bu değerleri bekler. Tolerans: saati biraz
// kaymış telefon için öncesindeki ve sonrasındaki kod da geçer.
export const ikiAsamaAyari = {
  adimSaniye: 30,
  hane: 6,
  tolerans: 1,
  gizliBayt: 20,
  yedekKodSayisi: 10,
  yedekKodUzunlugu: 10,
} as const;

// Şifreden sonra koda ya da kuruluma kadar geçen ara adım. Oturum değildir, panele girmez.
export const girisAdimiSuresiSaniye = 10 * 60;
export const girisAdimiCerezi = "__Host-yonetici-giris-adimi";

// Şifre sıfırlama (kart 0034, karar 0052). Değerler bütün sitelerde aynıdır. hesap ve hesapGunluk: bir hesaba
// gidebilecek e-posta sınırı, dolunca cevap yine aynıdır. enAzCevapMs: kayıtlı ve kayıtsız e-postanın cevabı süreden de
// anlaşılmasın diye her cevap en az bu kadar sürer, e-posta kuyruğa yazılırken geçen süreden uzun olmalıdır.
export const sifreSifirlamaAyari = {
  gecerlilikSaniye: 60 * 60,
  hesap: { deneme: 3, saniye: 15 * 60 },
  hesapGunluk: { deneme: 10, saniye: 24 * 60 * 60 },
  enAzCevapMs: 500,
} as const;

// Ekibe davet (kart 0275, karar 0179): bağlantı 3 gün geçerli ve tek kullanımlıktır (karar 0157). Davetin satırı
// (e-posta kişisel veridir) süresi dolduktan saklamaGun sonra silinir. Bir sitede aynı anda en çok bekleyenSiniri
// davet bekler: ele geçmiş bir mağaza sahibi hesabı sınırsız bağlantı ve e-posta üretemesin.
export const davetAyari = {
  gecerlilikGun: 3,
  saklamaGun: 30,
  bekleyenSiniri: 20,
  adEnUzun: 100,
} as const;

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
