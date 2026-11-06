// Şifre özetleme (kart 0025, karar 0039): Node'un yerleşik Argon2id'si. Özet, ayarlarını ve tuzunu
// içinde taşıyan standart biçimdedir: $argon2id$v=19$m=...,t=...,p=...$tuz$ozet.
import { argon2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { sifreOzetiAyari, sifreSiniri } from "../../kayitlar/oturum.ts";

const argon2Calistir = promisify(argon2);

type Ayar = { bellekKb: number; tekrar: number; paralellik: number; uzunluk: number };

const hesapla = (sifre: string, tuz: Buffer, ayar: Ayar): Promise<Buffer> =>
  argon2Calistir("argon2id", {
    // Aynı şifre farklı klavyelerde farklı baytlara dönüşmesin.
    message: sifre.normalize("NFKC"),
    nonce: tuz,
    memory: ayar.bellekKb,
    passes: ayar.tekrar,
    parallelism: ayar.paralellik,
    tagLength: ayar.uzunluk,
  });

const yaziya = (deger: Buffer): string => deger.toString("base64").replace(/=+$/, "");

export const sifreOzetle = async (sifre: string): Promise<string> => {
  const tuz = randomBytes(sifreOzetiAyari.tuzUzunlugu);
  const ozet = await hesapla(sifre, tuz, sifreOzetiAyari);
  const { bellekKb, tekrar, paralellik } = sifreOzetiAyari;
  return `$argon2id$v=19$m=${bellekKb},t=${tekrar},p=${paralellik}$${yaziya(tuz)}$${yaziya(ozet)}`;
};

const ozetBicimi =
  /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

const ozetiOku = (ozet: string) => {
  const parcalar = ozetBicimi.exec(ozet);
  if (parcalar === null) return undefined;
  const [, bellek, tekrar, paralellik, tuz, deger] = parcalar;
  const beklenen = Buffer.from(deger as string, "base64");
  return {
    bellekKb: Number(bellek),
    tekrar: Number(tekrar),
    paralellik: Number(paralellik),
    uzunluk: beklenen.length,
    tuz: Buffer.from(tuz as string, "base64"),
    beklenen,
  };
};

export const sifreDogrula = async (sifre: string, ozet: string): Promise<boolean> => {
  const okunan = ozetiOku(ozet);
  if (okunan === undefined) return false;
  // Sınırı aşan metin hesaba girmez (sunucuyu yoramaz), sonuç yine yanlıştır, süre aynı kalır.
  const metin = sifre.length > sifreSiniri.enUzun ? "" : sifre;
  try {
    const hesaplanan = await hesapla(metin, okunan.tuz, okunan);
    return timingSafeEqual(hesaplanan, okunan.beklenen) && metin === sifre;
  } catch (hata) {
    // Biçimi uyan ama ayarları geçersiz özet: giriş başarısızdır, bozuk kayıt görülsün.
    hatayiKaydet(hata, { kaynak: "sifre-ozeti" });
    return false;
  }
};

// Özet güncel ayardan farklıysa sonraki başarılı girişte yeniden özetlenir.
export const yenidenOzetlenmeli = (ozet: string): boolean => {
  const okunan = ozetiOku(ozet);
  return (
    okunan === undefined ||
    okunan.bellekKb !== sifreOzetiAyari.bellekKb ||
    okunan.tekrar !== sifreOzetiAyari.tekrar ||
    okunan.paralellik !== sifreOzetiAyari.paralellik ||
    okunan.uzunluk !== sifreOzetiAyari.uzunluk
  );
};

// Kayıtlı olmayan e-postada da aynı hesap yapılır: cevabın süresi e-postanın kayıtlı olup
// olmadığını ele vermez. Değerler rastgeledir, hiçbir şifrenin özeti değildir.
export const sahteDogrulama = async (sifre: string): Promise<void> => {
  const { bellekKb, tekrar, paralellik, tuzUzunlugu, uzunluk } = sifreOzetiAyari;
  const tuz = yaziya(randomBytes(tuzUzunlugu));
  const deger = yaziya(randomBytes(uzunluk));
  await sifreDogrula(
    sifre,
    `$argon2id$v=19$m=${bellekKb},t=${tekrar},p=${paralellik}$${tuz}$${deger}`,
  );
};
