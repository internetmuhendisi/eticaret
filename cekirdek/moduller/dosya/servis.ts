// Dosya kaydetmenin, okumanın ve silmenin tek yolu (kart 0072, karar 0058).
//
// - Tür içerikten anlaşılır (cekirdek/kayitlar/dosya.ts); ad ve uzantı hiç alınmaz.
// - Görsel her zaman yeniden kodlanır. Konum, cihaz, tarih gibi gömülü bilgiler bu sırada düşer;
//   yönü bilgisi önce görsele işlenir. İçerikte görsel olmayan bir şey taşıyan dosya (çok dilli
//   dosya) yeniden kodlamada dışarıda kalır ya da reddedilir. Animasyonlu WebP ve PNG'den yalnız
//   ilk kare kalır.
// - Yeniden kodlama süreç başına tek tek yapılır: büyük bir görsel yüzlerce MB bellek ister, aynı
//   anda gelen kaydetmeler sunucuyu paylaşan öteki siteleri düşürmesin.
// - Dosya adı kaydın kimliğidir. Dosya önce geçici adla yazılır, kayıtla aynı işlemde yerine
//   konur; işlem geri alınırsa ya da yazılamazsa dosya ve geçici dosya silinir. Bu yüzden kaydetme
//   dışarıdaki bir veritabanı işleminin içinde çağrılmaz: iç işlem yalnız ara kayıt noktasıdır,
//   dış işlem sonra geri alınırsa dosya kayıtsız kalırdı. Süreç yerine koyma ile işlemin bitişi
//   arasında ölürse kayıtsız bir dosya kalabilir; kayıtsız dosyaları bulan temizlik kart 0093'tedir.
// - Dosya klasörü sitenin kendi klasörüdür, yalnız sitenin kutu kullanıcısı okuyup yazabilir.
//   Uygulama yerini DOSYA_KLASORU ortam değişkeninden öğrenir.
import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import sharp, { type OutputInfo, type Sharp } from "sharp";
import {
  type DosyaHatasi,
  type DosyaTuru,
  dosyaKlasoruDegiskeni,
  dosyaSinirlari,
  dosyaTurleri,
} from "../../kayitlar/dosya.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { dosyalar } from "./model.ts";

// Sitenin dosya klasörü. Okunduğu anda sorulur (karar 0026): dosya yüklenirken değil.
export const dosyaKlasoru = (): string => {
  const klasor = process.env[dosyaKlasoruDegiskeni];
  if (!klasor) {
    throw new Error(
      `${dosyaKlasoruDegiskeni} ortam değişkeni yok: sitenin dosya klasörü verilmedi.`,
    );
  }
  return klasor;
};

// İçeriğin başındaki baytlardan tür. Hiçbir imzaya uymuyorsa undefined.
export const icerikTuru = (icerik: Uint8Array): DosyaTuru | undefined =>
  (Object.keys(dosyaTurleri) as DosyaTuru[]).find((tur) =>
    dosyaTurleri[tur].imzalar.some(
      (imza) =>
        icerik.length >= imza.length &&
        imza.every((bayt, sira) => bayt === null || icerik[sira] === bayt),
    ),
  );

// sharp'ın biçim adı kendi tür adımızla eşleşir; başka bir biçim gelirse dosya reddedilir.
const sharpBicimi: Record<DosyaTuru, string> = { jpeg: "jpeg", png: "png", webp: "webp" };

const yenidenKodla = (girdi: Sharp, tur: DosyaTuru): Sharp => {
  // Yön bilgisi görsele işlenir; metadata yazılmaz (sharp varsayılanı), gömülü bilgiler düşer.
  const donmus = girdi.rotate();
  if (tur === "jpeg") return donmus.jpeg({ quality: 90, mozjpeg: true });
  if (tur === "png") return donmus.png({ compressionLevel: 9 });
  return donmus.webp({ quality: 90 });
};

export type KaydedilenDosya = {
  kimlik: string;
  tur: DosyaTuru;
  boyut: number;
  genislik: number;
  yukseklik: number;
};

export type KaydetmeSonucu =
  | { tamam: true; dosya: KaydedilenDosya }
  | { tamam: false; hata: DosyaHatasi };

const reddet = (hata: DosyaHatasi): KaydetmeSonucu => ({ tamam: false, hata });

const dosyaAdi = (kimlik: string, tur: DosyaTuru): string =>
  `${kimlik}.${dosyaTurleri[tur].uzanti}`;

// Kimlik veritabanının ürettiği tahmin edilemez koddur; yine de yol olarak kullanılmadan önce
// biçimi denetlenir.
const kimlikBicimi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Süreç başına tek yeniden kodlama: sıradaki bekler.
let kuyruk: Promise<unknown> = Promise.resolve();
const sirayla = <T>(is: () => Promise<T>): Promise<T> => {
  const sonuc = kuyruk.then(is, is);
  kuyruk = sonuc.catch(() => undefined);
  return sonuc;
};

// failOn "error": sharp'ın varsayılanı ("warning") kameraların küçük kusurlu JPEG'lerini de
// reddeder; görsel zaten yeniden kodlandığı için uyarılı ama açılabilen dosya zarar vermez.
// Kesilmiş ya da bozuk dosya yine reddedilir.
const kodla = async (
  icerik: Uint8Array,
  tur: DosyaTuru,
): Promise<
  { tamam: true; data: Buffer; info: OutputInfo } | { tamam: false; hata: DosyaHatasi }
> => {
  try {
    const girdi = sharp(icerik, { limitInputPixels: dosyaSinirlari.enCokPiksel, failOn: "error" });
    const bilgi = await girdi.metadata();
    if (bilgi.format !== sharpBicimi[tur]) return { tamam: false, hata: "tur-izinsiz" };
    if ((bilgi.width ?? 0) * (bilgi.height ?? 0) > dosyaSinirlari.enCokPiksel) {
      return { tamam: false, hata: "cok-fazla-piksel" };
    }
    const { data, info } = await yenidenKodla(girdi, tur).toBuffer({ resolveWithObject: true });
    return { tamam: true, data, info };
  } catch (hata) {
    if (hata instanceof Error && /pixel limit/i.test(hata.message)) {
      return { tamam: false, hata: "cok-fazla-piksel" };
    }
    return { tamam: false, hata: "bozuk" };
  }
};

export const dosyaKaydet = async (
  vt: Veritabani,
  icerik: Uint8Array,
  klasor: string = dosyaKlasoru(),
): Promise<KaydetmeSonucu> => {
  // İşlemin içindeki veritabanı nesnesinin bağlantı havuzu yoktur (yukarıdaki açıklama).
  if (!("$client" in vt) || vt.$client === undefined) {
    throw new Error("dosyaKaydet bir veritabanı işleminin içinde çağrılmaz.");
  }
  if (icerik.length === 0) return reddet("bos");
  if (icerik.length > dosyaSinirlari.enCokBayt) return reddet("cok-buyuk");
  const tur = icerikTuru(icerik);
  if (tur === undefined) return reddet("tur-izinsiz");

  const cikti = await sirayla(() => kodla(icerik, tur));
  if (!cikti.tamam) return reddet(cikti.hata);

  const ozet = createHash("sha256").update(cikti.data).digest("hex");
  const yazilanlar: string[] = [];
  try {
    const dosya = await vt.transaction(async (islem) => {
      const [satir] = await islem
        .insert(dosyalar)
        .values({
          tur,
          boyut: cikti.data.length,
          genislik: cikti.info.width,
          yukseklik: cikti.info.height,
          icerik_ozeti: ozet,
        })
        .returning({ kimlik: dosyalar.kimlik });
      if (satir === undefined || !kimlikBicimi.test(satir.kimlik)) {
        throw new Error("Dosya kaydının kimliği beklenen biçimde değil.");
      }
      const hedef = join(klasor, dosyaAdi(satir.kimlik, tur));
      const gecici = `${hedef}.yaziliyor`;
      yazilanlar.push(gecici, hedef);
      await writeFile(gecici, cikti.data, { mode: 0o600, flag: "wx" });
      await rename(gecici, hedef);
      return {
        kimlik: satir.kimlik,
        tur,
        boyut: cikti.data.length,
        genislik: cikti.info.width,
        yukseklik: cikti.info.height,
      };
    });
    return { tamam: true, dosya };
  } catch (hata) {
    // İşlem geri alındı: yazılmış ya da yarım kalmış dosya kayıtsız kalmasın.
    await Promise.all(yazilanlar.map((yol) => rm(yol, { force: true })));
    throw hata;
  }
};

// Silinmemiş dosyanın içeriği ve türü; yoksa undefined. İçerik özeti tutmuyorsa hata verir:
// diskteki dosya kayıttan sonra değişmiş demektir.
export const dosyaOku = async (
  vt: Veritabani,
  kimlik: string,
  klasor: string = dosyaKlasoru(),
): Promise<{ icerik: Buffer; tur: DosyaTuru; mime: string } | undefined> => {
  if (!kimlikBicimi.test(kimlik)) return undefined;
  const [satir] = await vt
    .select()
    .from(dosyalar)
    .where(and(eq(dosyalar.kimlik, kimlik), isNull(dosyalar.silinme_zamani)));
  if (satir === undefined) return undefined;
  const tur = satir.tur as DosyaTuru;
  const icerik = await readFile(join(klasor, dosyaAdi(satir.kimlik, tur)));
  if (createHash("sha256").update(icerik).digest("hex") !== satir.icerik_ozeti) {
    throw new Error(`Dosyanın içeriği kayıttakiyle aynı değil: ${satir.kimlik}.`);
  }
  return { icerik, tur, mime: dosyaTurleri[tur].mime };
};

// Dosyayı silinmiş olarak işaretler; dosyanın kendisi yerinde kalır (kalıcı silme yedekle gelir,
// kart 0093). Zaten silinmişse ya da yoksa false.
export const dosyaSil = async (vt: Veritabani, kimlik: string): Promise<boolean> => {
  if (!kimlikBicimi.test(kimlik)) return false;
  const silinen = await vt
    .update(dosyalar)
    .set({ silinme_zamani: new Date() })
    .where(and(eq(dosyalar.kimlik, kimlik), isNull(dosyalar.silinme_zamani)))
    .returning({ kimlik: dosyalar.kimlik });
  return silinen.length > 0;
};
