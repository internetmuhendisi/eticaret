// Kapının girişleri, sabit hata kodları ve istek sınırları (.claude/rules/sunucu-arayuzu.md,
// karar 0024). Her adres /kapi/<giriş>/ ile başlar.
export const kapilar = ["herkese-acik", "musteri", "yonetici", "sahip"] as const;
export type Kapi = (typeof kapilar)[number];

// Hatalı yanıtın kodu ve HTTP durumu. Kod bir kez yayınlandıktan sonra adı değişmez.
export const hataKodlari = {
  dogrulama: 400,
  "oturum-yok": 401,
  "giris-hatasi": 401,
  yetki: 403,
  "robot-dogrulamasi": 403,
  bulunamadi: 404,
  cakisma: 409,
  "is-kurali": 422,
  "istek-siniri": 429,
  "sunucu-hatasi": 500,
  "hizmet-kullanilamiyor": 503,
} as const satisfies Record<string, number>;
export type HataKodu = keyof typeof hataKodlari;

// Bir istemcinin bir uca belirli bir sürede gönderebileceği istek sayısı.
// Giriş ve şifre sıfırlama gibi hassas uçlar sıkı sınırı kullanır. Ürün görseli (kart 0109) bir sayfada
// onlarca kez aynı uca gider (sayaç uç başınadır, adresin sorgu kısmı sayılmaz): görsel sınırını kullanır.
export const istekSinirlari = {
  genel: { istek: 120, saniye: 60 },
  siki: { istek: 5, saniye: 60 },
  gorsel: { istek: 600, saniye: 60 },
  // Vitrinin arama sayfası (kart 0137): insan için bol, toplu taramayı durdurur. Ara katmanda sayılır.
  arama: { istek: 30, saniye: 60 },
  // Ödeme kuruluşunun bildirimi ve tarayıcıyla dönüşü (kart 0215, .claude/rules/sunucu-arayuzu.md): sıradan istek
  // sınırından muaftır, doğruluğu imzadan ve kuruluşa yapılan sorgudan gelir. Bol sınır yalnız taşkını durdurur.
  bildirim: { istek: 600, saniye: 60 },
  // Dosya yükleme (kart 0094, karar 0165): her yükleme görseli yeniden kodlar (büyük görselde yüzlerce MB bellek ve
  // saniyeler). Galeriye birkaç görsel art arda yüklenebilsin, sunucuyu dolduran seri yükleme dursun.
  yukleme: { istek: 30, saniye: 60 },
} as const satisfies Record<string, { istek: number; saniye: number }>;
export type IstekSiniri = keyof typeof istekSinirlari;
