// İki aşamalı girişin hesapları (kart 0028, karar 0044): zamanlı kod (RFC 6238), gizlinin
// şifrelenmesi ve yedek kodlar. Yalnız Node'un yerleşik şifreleme işlevleri kullanılır (karar 0039).
// Veritabanına dokunmaz; akış iki-asamali-giris.ts dosyasındadır.
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { gizliBilgi } from "../../ayar-semasi/gizli-bilgi.ts";
import { ikiAsamaAyari } from "../../kayitlar/oturum.ts";

const base32Harfleri = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const base32Yaz = (veri: Uint8Array): string => {
  let bitler = 0;
  let deger = 0;
  let sonuc = "";
  for (const bayt of veri) {
    deger = (deger << 8) | bayt;
    bitler += 8;
    while (bitler >= 5) {
      sonuc += base32Harfleri[(deger >>> (bitler - 5)) & 31];
      bitler -= 5;
    }
    deger &= (1 << bitler) - 1;
  }
  return bitler > 0 ? sonuc + base32Harfleri[(deger << (5 - bitler)) & 31] : sonuc;
};

export const base32Oku = (metin: string): Buffer => {
  let bitler = 0;
  let deger = 0;
  const baytlar: number[] = [];
  for (const harf of metin) {
    const sira = base32Harfleri.indexOf(harf);
    if (sira === -1) throw new Error("Gizli base32 değil.");
    deger = (deger << 5) | sira;
    bitler += 5;
    if (bitler >= 8) {
      baytlar.push((deger >>> (bitler - 8)) & 255);
      bitler -= 8;
    }
    deger &= (1 << bitler) - 1;
  }
  return Buffer.from(baytlar);
};

export const ikiAsamaGizlisiUret = (): string => base32Yaz(randomBytes(ikiAsamaAyari.gizliBayt));

export const kodAdimi = (simdi: number = Date.now()): number =>
  Math.floor(simdi / 1000 / ikiAsamaAyari.adimSaniye);

// RFC 4226: adımın HMAC-SHA1'inden kod. SHA-1 burada standarttır, uygulamalar bunu bekler.
export const zamanliKod = (gizli: string, adim: number): string => {
  const sayac = Buffer.alloc(8);
  sayac.writeBigUInt64BE(BigInt(adim));
  const ozet = createHmac("sha1", base32Oku(gizli)).update(sayac).digest();
  const konum = (ozet.at(-1) ?? 0) & 15;
  const sayi = ozet.readUInt32BE(konum) & 0x7fffffff;
  return String(sayi % 10 ** ikiAsamaAyari.hane).padStart(ikiAsamaAyari.hane, "0");
};

const esit = (a: string, b: string): boolean => {
  const ilk = Buffer.from(a);
  const ikinci = Buffer.from(b);
  return ilk.length === ikinci.length && timingSafeEqual(ilk, ikinci);
};

// Kod geçerliyse adımını döner. Daha önce geçmiş adımın kodu geçmez: aynı kod ikinci kez kullanılamaz.
export const kodunAdimi = (
  gizli: string,
  kod: string,
  sonAdim: number | null,
  simdi: number = Date.now(),
): number | null => {
  const merkez = kodAdimi(simdi);
  let bulunan: number | null = null;
  // Eşleşse de döngü sürer: süre hangi adımın tuttuğunu belli etmesin.
  for (let fark = -ikiAsamaAyari.tolerans; fark <= ikiAsamaAyari.tolerans; fark += 1) {
    const adim = merkez + fark;
    if (esit(zamanliKod(gizli, adim), kod) && (sonAdim === null || adim > sonAdim)) bulunan = adim;
  }
  return bulunan;
};

export const altiHaneliMi = (kod: string): boolean =>
  new RegExp(`^\\d{${ikiAsamaAyari.hane}}$`).test(kod);

// Doğrulama uygulamasının karekoddan okuduğu adres. Etikette site adı ve e-posta görünür.
export const kurulumAdresiUret = (gizli: string, siteAdi: string, eposta: string): string => {
  const sorgu = new URLSearchParams({
    secret: gizli,
    issuer: siteAdi,
    algorithm: "SHA1",
    digits: String(ikiAsamaAyari.hane),
    period: String(ikiAsamaAyari.adimSaniye),
  });
  const etiket = `${encodeURIComponent(siteAdi)}:${encodeURIComponent(eposta)}`;
  return `otpauth://totp/${etiket}?${sorgu.toString().replaceAll("+", "%20")}`;
};

// --- Gizlinin şifrelenmesi (AES-256-GCM) ---

const surumOneki = "v1";
const etiketUzunlugu = 16;

const sifrelemeAnahtari = (): Buffer => {
  const deger = gizliBilgi("IKI_ASAMA_ANAHTARI");
  if (!/^[0-9a-f]{64}$/.test(deger)) {
    throw new Error("IKI_ASAMA_ANAHTARI 64 onaltılık hane olmalı.");
  }
  return Buffer.from(deger, "hex");
};

// Hesabın kimliği doğrulanan ek veridir: şifreli değer başka bir hesabın satırına taşınırsa açılmaz.
export const gizliyiSifrele = (gizli: string, hesapKimligi: string): string => {
  const iv = randomBytes(12);
  const sifre = createCipheriv("aes-256-gcm", sifrelemeAnahtari(), iv);
  sifre.setAAD(Buffer.from(hesapKimligi));
  const icerik = Buffer.concat([sifre.update(gizli, "utf8"), sifre.final()]);
  return [surumOneki, iv, icerik, sifre.getAuthTag()]
    .map((parca) => (typeof parca === "string" ? parca : parca.toString("base64url")))
    .join(".");
};

export const gizliyiCoz = (sifreli: string, hesapKimligi: string): string => {
  const [surum, iv, icerik, etiket] = sifreli.split(".");
  if (surum !== surumOneki || !iv || !icerik || !etiket) {
    throw new Error("Şifreli gizlinin biçimi bozuk.");
  }
  // Etiket tam boyda olmalı: kısaltılmış etiket sahteciliği kolaylaştırır, Node kendiliğinden reddetmez.
  const etiketBaytlari = Buffer.from(etiket, "base64url");
  if (etiketBaytlari.length !== etiketUzunlugu) throw new Error("Şifreli gizlinin etiketi bozuk.");
  const cozucu = createDecipheriv(
    "aes-256-gcm",
    sifrelemeAnahtari(),
    Buffer.from(iv, "base64url"),
    {
      authTagLength: etiketUzunlugu,
    },
  );
  cozucu.setAAD(Buffer.from(hesapKimligi));
  cozucu.setAuthTag(etiketBaytlari);
  return Buffer.concat([cozucu.update(Buffer.from(icerik, "base64url")), cozucu.final()]).toString(
    "utf8",
  );
};

// --- Yedek kodlar ---

// Karışan harfler ve rakamlar yoktur (0/o, 1/l/i): kağıttan okunup yazılır.
const yedekKodHarfleri = "abcdefghjkmnpqrstuvwxyz23456789";

export const yedekKodlariUret = (): string[] =>
  Array.from({ length: ikiAsamaAyari.yedekKodSayisi }, () => {
    const harfler = Array.from(
      { length: ikiAsamaAyari.yedekKodUzunlugu },
      () => yedekKodHarfleri[randomInt(yedekKodHarfleri.length)],
    ).join("");
    const orta = ikiAsamaAyari.yedekKodUzunlugu / 2;
    return `${harfler.slice(0, orta)}-${harfler.slice(orta)}`;
  });

// Yazılış farkları (büyük harf, tire, boşluk) aynı özete düşer. Özet şifreleme anahtarıyla alınır: kod
// yalnız 50 bittir, anahtarsız özet veritabanı sızınca çevrim dışı kırılabilirdi (karar 0044).
export const yedekKodOzeti = (kod: string): string =>
  createHmac("sha256", sifrelemeAnahtari())
    .update(kod.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .digest("hex");
