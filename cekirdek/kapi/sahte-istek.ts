// Başka sitelerden gelen sahte isteklerin reddi (kart 0025, karar 0039). Çerezin SameSite ayarı tek
// başına yetmez: kardeş adresler (a.deneme... ve b.deneme...) tarayıcıya göre aynı sitedir. Bu yüzden
// veri değiştiren her istekte tarayıcının yazdığı kaynak bilgisi isteğin geldiği adresle karşılaştırılır.
// Tarayıcı bu başlıkları sayfadaki koda yazdırmaz. İkisi de yoksa istek tarayıcıdan gelmemiştir
// (ödeme bildirimi gibi); böyle bir istekte tarayıcının çerezi de yoktur.
const guvenliYontemler = new Set(["GET", "HEAD", "OPTIONS"]);
const kabulEdilenKaynaklar = new Set(["same-origin", "none"]);

export const sahteIstekMi = (istek: Request): boolean => {
  if (guvenliYontemler.has(istek.method)) return false;

  const kaynakTuru = istek.headers.get("sec-fetch-site");
  if (kaynakTuru !== null && !kabulEdilenKaynaklar.has(kaynakTuru)) return true;

  const kaynak = istek.headers.get("origin");
  if (kaynak === null) return false;
  const adres = istek.headers.get("host");
  if (adres === null || !URL.canParse(kaynak)) return true;
  const { host, protocol } = new URL(kaynak);
  if (host !== adres) return true;
  // Ön kapı bağlantının şifreli olup olmadığını yazar: şifresiz sayfa şifreli siteye istek atamaz.
  const sema = istek.headers.get("x-forwarded-proto");
  return sema !== null && protocol !== `${sema}:`;
};
