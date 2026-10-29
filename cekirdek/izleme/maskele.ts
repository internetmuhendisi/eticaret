// Günlüğe ve hata izleme aracına giden her değer buradan geçer (karar 0025,
// .claude/rules/guvenlik.md). Şifre, anahtar ve kart bilgisi yazılmaz; e-posta ve telefon
// kısaltılır. Kurallar alan adına ve metnin içeriğine birlikte bakar: gizli bilgi adı belli
// olmayan bir alanda ya da bir hata mesajının içinde de yakalanır. Kararsız kalınan yerde
// fazla gizlenir.

export const gizliIsareti = "[gizli]";
export const kartIsareti = "[kart]";

// Adı bunlardan birini içeren alanın değeri hiç yazılmaz. Türkçe büyük harf (İ, I) ve noktasız
// ı da i sayılır: "ŞİFRE" ve "ŞIFRE" de yakalanır.
const gizliAdlar = [
  "şifre",
  "sifre",
  "parola",
  "pass",
  "pwd",
  "anahtar",
  "key",
  "token",
  "jwt",
  "otp",
  "secret",
  "gizli",
  "kart",
  "card",
  "cvv",
  "cvc",
  "authorization",
  "bearer",
  "cookie",
  "cerez",
  "session",
  "oturum",
]
  .join("|")
  .replace(/i/g, "[iİı]");
const gizliAlanAdlari = new RegExp(gizliAdlar, "iu");

// Metnin içindeki kurallar sırayla uygulanır.
const metinKurallari: [RegExp, (eslesen: string, on?: string) => string][] = [
  // Çerez satırının geri kalanı bütünüyle gizlenir; içinde birden çok çerez olabilir.
  [/((?:set-)?cookie"?\s*[=:]\s*)[^\r\n]*/giu, (_, on = "") => `${on}${gizliIsareti}`],
  // "şifre=...", "token: ...", JSON'daki "password":"..." biçimleri. Tırnak içindeki değer
  // bütünüyle, "Bearer" ve "Basic" ön ekinden sonraki anahtar da gizlenir.
  [
    new RegExp(
      `((?:${gizliAdlar})[\\p{L}\\w-]*["']?\\s*[=:]\\s*)(?:"[^"]*"|'[^']*'|(?:(?:bearer|basic)\\s+)?[^\\s"'&,;}]+)`,
      "giu",
    ),
    (_, on = "") => `${on}${gizliIsareti}`,
  ],
  // Ön ekiyle yazılmış oturum anahtarı ve adı geçmeyen JWT.
  [/\b(bearer|basic)\s+[\w.~+/=-]+/giu, (_, on = "") => `${on} ${gizliIsareti}`],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]*/gu, () => gizliIsareti],
  // Bağlantı adresindeki şifre: <şema>://kullanici:sifre@sunucu.
  [/(\b[a-z][\w+.-]*:\/\/[^\s:/@]*:)[^\s@/]+@/giu, (_, on = "") => `${on}${gizliIsareti}@`],
];

// E-postanın yalnız ilk harfi ve alan adı kalır: a***@ornek.com. Adreste kodlanmış @ (%40) da
// yakalanır. Alan adı harfle biten bir uzantıyla biter; böylece "paket@1.2.3" gibi sürüm
// yazıları e-posta sanılmaz.
const epostaDeseni = /([\p{L}\d._%+'-]{1,64})(@|%40)((?:[\p{L}\d-]+\.)+\p{L}{2,})/giu;

// Rakam dizisi: başta + olabilir, arada boşluk, tire, alt çizgi, nokta ve parantez olabilir.
const rakamDizisiDeseni = /\+?\d[\d\s().\-_]{8,}\d/g;
const ipAdresiDeseni = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const enCokDerinlik = 8;

// Kart numaraları Luhn denetiminden geçer; geçen 13–19 haneli dizi kart sayılır.
const luhnGecerliMi = (rakamlar: string): boolean => {
  let toplam = 0;
  for (let i = 0; i < rakamlar.length; i += 1) {
    let rakam = Number(rakamlar[rakamlar.length - 1 - i]);
    if (i % 2 === 1) {
      rakam *= 2;
      if (rakam > 9) rakam -= 9;
    }
    toplam += rakam;
  }
  return toplam % 10 === 0;
};

// 10 ve daha çok haneli dizi kartsa tümüyle gizlenir, değilse (telefon, yan yana yazılmış kart
// ve son kullanma tarihi, IBAN gibi) yalnız son iki hanesi kalır. IP adresi olduğu gibi kalır.
const rakamDizisiniMaskele = (dizi: string): string => {
  if (ipAdresiDeseni.test(dizi)) return dizi;
  const rakamlar = dizi.replace(/\D/g, "");
  if (rakamlar.length < 10) return dizi;
  if (rakamlar.length >= 13 && rakamlar.length <= 19 && luhnGecerliMi(rakamlar)) {
    return kartIsareti;
  }
  return `${"*".repeat(rakamlar.length - 2)}${rakamlar.slice(-2)}`;
};

export const metniMaskele = (metin: string): string =>
  metinKurallari
    .reduce((sonuc, [desen, yerine]) => sonuc.replace(desen, yerine), metin)
    .replace(
      epostaDeseni,
      (_, ad: string, ayirici: string, alan: string) => `${ad[0]}***${ayirici}${alan}`,
    )
    .replace(rakamDizisiDeseni, rakamDizisiniMaskele);

// Next.js'in hata özeti (digest) tarayıcıdaki hatayı sunucudaki kayıtla eşlemeye yarar; kısa ve
// yalnız harf, rakam ve tireden oluşuyorsa olduğu gibi kalır.
const acikAlanMi = (ad: string, deger: unknown): boolean =>
  ad === "digest" && typeof deger === "string" && /^[\w-]{1,64}$/.test(deger);

const hatayiAc = (hata: Error): Record<string, unknown> => ({
  ad: hata.name,
  mesaj: hata.message,
  ...(hata.stack === undefined ? {} : { yigin: hata.stack }),
  ...(hata.cause === undefined ? {} : { neden: hata.cause }),
  // Hataya eklenmiş alanlar (kod, ayrıntı) da kayda girer, onlar da maskelenir.
  ...Object.fromEntries(Object.entries(hata)),
});

const ic = (deger: unknown, derinlik: number, gorulenler: WeakSet<object>): unknown => {
  if (typeof deger === "string") return metniMaskele(deger);
  if (typeof deger === "number") {
    if (!Number.isInteger(deger)) return deger;
    const maskeli = metniMaskele(String(deger));
    return maskeli === String(deger) ? deger : maskeli;
  }
  if (typeof deger === "bigint") return metniMaskele(String(deger));
  if (typeof deger !== "object" || deger === null) {
    return typeof deger === "function" || typeof deger === "symbol" ? String(deger) : deger;
  }
  if (gorulenler.has(deger)) return "[döngü]";
  if (derinlik >= enCokDerinlik) return "[derin]";
  gorulenler.add(deger);

  if (deger instanceof Error) return ic(hatayiAc(deger), derinlik, gorulenler);
  if (deger instanceof Date) return deger.toISOString();
  // İkili veri (Buffer gibi) içeriği yazılmaz; içinde gizli bilgi olabilir.
  if (ArrayBuffer.isView(deger) || deger instanceof ArrayBuffer) {
    return `[ikili veri: ${deger.byteLength} bayt]`;
  }
  if (Array.isArray(deger)) return deger.map((oge) => ic(oge, derinlik + 1, gorulenler));
  if (deger instanceof Map) return ic(Object.fromEntries(deger), derinlik, gorulenler);
  if (deger instanceof Set) return ic([...deger], derinlik, gorulenler);

  // Alanın adı da kişisel veri taşıyabilir (adı e-posta olan bir anahtar gibi), o da maskelenir.
  return Object.fromEntries(
    Object.entries(deger).map(([ad, alt]) => [
      metniMaskele(ad),
      acikAlanMi(ad, alt)
        ? alt
        : gizliAlanAdlari.test(ad)
          ? gizliIsareti
          : ic(alt, derinlik + 1, gorulenler),
    ]),
  );
};

// Değerin gizli bilgisi temizlenmiş, JSON'a yazılabilir kopyası. Hata nesneleri ad, mesaj,
// yığın ve neden alanlarıyla açılır. Döngülü ya da çok derin yapılar kesilir.
export const maskele = (deger: unknown): unknown => ic(deger, 0, new WeakSet());
