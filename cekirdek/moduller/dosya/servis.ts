// Dosya kaydetmenin, okumanın ve silmenin tek yolu (kart 0072, karar 0058).
// Görsel boyutlarıyla birlikte gorselKaydet ile kaydedilir (kart 0087, karar 0073): boyutlar
// cekirdek/kayitlar/gorsel.ts kaydındadır, görselle aynı işlemde yazılır.
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
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { OutputInfo, Sharp } from "sharp";
import {
  type BelgeTuru,
  belgeSinirlari,
  belgeTurleri,
  type DosyaHatasi,
  type DosyaTuru,
  dosyaKlasoruDegiskeni,
  dosyaSinirlari,
  dosyaTurleri,
  type KayitliDosyaTuru,
  kayitliDosyaTurleri,
} from "../../kayitlar/dosya.ts";
import {
  type GorselBoyutu,
  gorselBoyutAdlari,
  gorselBoyutBicimi,
  gorselBoyutlari,
} from "../../kayitlar/gorsel.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { dosyaBoyutlari, dosyalar } from "./model.ts";
import { belgeTuru, icerikTuru } from "./tur.ts";

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

export { icerikTuru } from "./tur.ts";

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
  tur: KayitliDosyaTuru;
  boyut: number;
  genislik: number;
  yukseklik: number;
};

export type KaydetmeSonucu =
  | { tamam: true; dosya: KaydedilenDosya }
  | { tamam: false; hata: DosyaHatasi };

const reddet = (hata: DosyaHatasi): KaydetmeSonucu => ({ tamam: false, hata });

const dosyaAdi = (kimlik: string, tur: KayitliDosyaTuru): string =>
  `${kimlik}.${kayitliDosyaTurleri[tur].uzanti}`;

// Görsel türlerinin adları: görsel okuma yolları yalnız bunları okur, belge kaydını görmez (kart 0268).
const gorselTurAdlari = Object.keys(dosyaTurleri) as DosyaTuru[];

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
  // Görsel kütüphanesi yalnız kaydederken yüklenir: dosyayı okumak ve vermek ona bağlı kalmaz.
  // Yüklenemezse hata olduğu gibi çıkar (hata katmanına gider); "bozuk dosya" sayılmaz.
  const { default: sharp } = await import("sharp");
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

// Yazılacak bir dosya: yeniden kodlanmış içerik ve ölçüleri.
type Parca = { data: Buffer; tur: KayitliDosyaTuru; genislik: number; yukseklik: number };

// Parçaları tek işlemde kaydeder: her biri bir kayıt ve bir dosya. Dosyalar önce geçici adla yazılır,
// kayıtla aynı işlemde yerine konur. sonra, kayıtlarla aynı işlemde çalışır (boyut satırları). İşlem
// geri alınırsa ya da yazılamazsa bütün dosyalar ve geçici dosyalar silinir.
const parcalariYaz = async (
  vt: Veritabani,
  parcalar: Parca[],
  klasor: string,
  sonra: (islem: VeritabaniIslemi, dosyalar: KaydedilenDosya[]) => Promise<void> = async () => {},
): Promise<KaydedilenDosya[]> => {
  // İşlemin içindeki veritabanı nesnesinin bağlantı havuzu yoktur (yukarıdaki açıklama).
  if (!("$client" in vt) || vt.$client === undefined) {
    throw new Error("Dosya kaydetme bir veritabanı işleminin içinde çağrılmaz.");
  }
  const yazilanlar: string[] = [];
  try {
    return await vt.transaction(async (islem) => {
      const kaydedilenler: KaydedilenDosya[] = [];
      for (const parca of parcalar) {
        const [satir] = await islem
          .insert(dosyalar)
          .values({
            tur: parca.tur,
            boyut: parca.data.length,
            genislik: parca.genislik,
            yukseklik: parca.yukseklik,
            icerik_ozeti: createHash("sha256").update(parca.data).digest("hex"),
          })
          .returning({ kimlik: dosyalar.kimlik });
        if (satir === undefined || !kimlikBicimi.test(satir.kimlik)) {
          throw new Error("Dosya kaydının kimliği beklenen biçimde değil.");
        }
        const hedef = join(klasor, dosyaAdi(satir.kimlik, parca.tur));
        const gecici = `${hedef}.yaziliyor`;
        yazilanlar.push(gecici, hedef);
        await writeFile(gecici, parca.data, { mode: 0o600, flag: "wx" });
        await rename(gecici, hedef);
        kaydedilenler.push({
          kimlik: satir.kimlik,
          tur: parca.tur,
          boyut: parca.data.length,
          genislik: parca.genislik,
          yukseklik: parca.yukseklik,
        });
      }
      await sonra(islem, kaydedilenler);
      return kaydedilenler;
    });
  } catch (hata) {
    // İşlem geri alındı: yazılmış ya da yarım kalmış dosya kayıtsız kalmasın.
    await Promise.all(yazilanlar.map((yol) => rm(yol, { force: true })));
    throw hata;
  }
};

// Kaydetmeden önceki ortak denetimler: boş, sınırı aşan ve izinsiz tür.
const onDenetim = (icerik: Uint8Array): DosyaHatasi | DosyaTuru => {
  if (icerik.length === 0) return "bos";
  if (icerik.length > dosyaSinirlari.enCokBayt) return "cok-buyuk";
  return icerikTuru(icerik) ?? "tur-izinsiz";
};
const turMu = (deger: DosyaHatasi | DosyaTuru): deger is DosyaTuru =>
  Object.hasOwn(dosyaTurleri, deger);

export const dosyaKaydet = async (
  vt: Veritabani,
  icerik: Uint8Array,
  klasor: string = dosyaKlasoru(),
): Promise<KaydetmeSonucu> => {
  const tur = onDenetim(icerik);
  if (!turMu(tur)) return reddet(tur);
  const cikti = await sirayla(() => kodla(icerik, tur));
  if (!cikti.tamam) return reddet(cikti.hata);
  const [dosya] = await parcalariYaz(
    vt,
    [{ data: cikti.data, tur, genislik: cikti.info.width, yukseklik: cikti.info.height }],
    klasor,
  );
  if (dosya === undefined) throw new Error("Dosya kaydedilemedi.");
  return { tamam: true, dosya };
};

export type GorselKaydetmeSonucu =
  | { tamam: true; dosya: KaydedilenDosya; boyutlar: Record<GorselBoyutu, KaydedilenDosya> }
  | { tamam: false; hata: DosyaHatasi };

// Görseli ve kayıttaki bütün boyutlarını (cekirdek/kayitlar/gorsel.ts) kaydeder (kart 0087, karar
// 0073). Görsel önce dosyaKaydet'teki gibi yeniden kodlanır; boyutlar bu temizlenmiş görselden, en
// uzun kenarı boyutun sayısını aşmayacak biçimde küçültülerek üretilir, küçük görsel büyütülmez.
// Görsel, boyutları ve boyut satırları tek işlemdedir: boyutu eksik görsel kaydedilmez. Bütün iş süreç
// başına tek tek yapılır (yeniden kodlama gibi).
export const gorselKaydet = async (
  vt: Veritabani,
  icerik: Uint8Array,
  klasor: string = dosyaKlasoru(),
): Promise<GorselKaydetmeSonucu> => {
  const tur = onDenetim(icerik);
  if (!turMu(tur)) return { tamam: false, hata: tur };
  const uretilen = await sirayla(async () => {
    const cikti = await kodla(icerik, tur);
    if (!cikti.tamam) return cikti;
    const { default: sharp } = await import("sharp");
    const boyutlar: Parca[] = [];
    for (const ad of gorselBoyutAdlari) {
      const kenar = gorselBoyutlari[ad];
      const { data, info } = await sharp(cikti.data, {
        limitInputPixels: dosyaSinirlari.enCokPiksel,
      })
        .resize({ width: kenar, height: kenar, fit: "inside", withoutEnlargement: true })
        .webp({ quality: gorselBoyutBicimi.kalite })
        .toBuffer({ resolveWithObject: true });
      boyutlar.push({
        data,
        tur: gorselBoyutBicimi.tur,
        genislik: info.width,
        yukseklik: info.height,
      });
    }
    return { tamam: true as const, cikti, boyutlar };
  });
  if (!uretilen.tamam) return { tamam: false, hata: uretilen.hata };
  const { cikti, boyutlar } = uretilen;
  const [dosya, ...boyutDosyalari] = await parcalariYaz(
    vt,
    [
      { data: cikti.data, tur, genislik: cikti.info.width, yukseklik: cikti.info.height },
      ...boyutlar,
    ],
    klasor,
    async (islem, [kaynak, ...uretilenler]) => {
      if (kaynak === undefined) throw new Error("Görselin kaydı yok.");
      await islem.insert(dosyaBoyutlari).values(
        uretilenler.map((boyutDosyasi, i) => ({
          kaynak_kimligi: kaynak.kimlik,
          boyut: gorselBoyutAdlari[i] as GorselBoyutu,
          dosya_kimligi: boyutDosyasi.kimlik,
        })),
      );
    },
  );
  if (dosya === undefined || boyutDosyalari.length !== gorselBoyutAdlari.length) {
    throw new Error("Görsel ve boyutları kaydedilemedi.");
  }
  return {
    tamam: true,
    dosya,
    boyutlar: Object.fromEntries(
      gorselBoyutAdlari.map((ad, i) => [ad, boyutDosyalari[i]]),
    ) as Record<GorselBoyutu, KaydedilenDosya>,
  };
};

export type GorselBoyutDosyasi = { kimlik: string; genislik: number; yukseklik: number };

// Görsellerin silinmemiş boyutları tek sorguyla: kaynak kimliğinden boyut adına. Boyutu olmayan ya da
// kendisi silinmiş görsel haritada yoktur; kayıtta olmayan boyut adı okunmaz.
export const gorselBoyutlariniOku = async (
  vt: Veritabani | VeritabaniIslemi,
  kaynaklar: string[],
): Promise<Map<string, Partial<Record<GorselBoyutu, GorselBoyutDosyasi>>>> => {
  const sonuc = new Map<string, Partial<Record<GorselBoyutu, GorselBoyutDosyasi>>>();
  const gecerli = [...new Set(kaynaklar.filter((kimlik) => kimlikBicimi.test(kimlik)))];
  if (gecerli.length === 0) return sonuc;
  const satirlar = await vt
    .select({
      kaynak: dosyaBoyutlari.kaynak_kimligi,
      boyut: dosyaBoyutlari.boyut,
      kimlik: dosyalar.kimlik,
      genislik: dosyalar.genislik,
      yukseklik: dosyalar.yukseklik,
    })
    .from(dosyaBoyutlari)
    .innerJoin(dosyalar, eq(dosyalar.kimlik, dosyaBoyutlari.dosya_kimligi))
    .where(
      and(
        inArray(dosyaBoyutlari.kaynak_kimligi, gecerli),
        isNull(dosyalar.silinme_zamani),
        // Kaynağı silinmiş görselin boyutları da okunmaz.
        sql`exists (select 1 from ${dosyalar} as kaynak where kaynak.kimlik = ${dosyaBoyutlari.kaynak_kimligi} and kaynak.silinme_zamani is null)`,
      ),
    );
  for (const { kaynak, boyut, ...dosya } of satirlar) {
    if (!Object.hasOwn(gorselBoyutlari, boyut)) continue;
    sonuc.set(kaynak, { ...sonuc.get(kaynak), [boyut as GorselBoyutu]: dosya });
  }
  return sonuc;
};

// Galeriye bağlanabilecek görsel mi (kart 0087)? Dosya var ve silinmemiş, kendisi bir boyut değil,
// kayıttaki bütün boyutları var ve silinmemiş. Kaynak dosyanın satırı paylaşımlı kilitlenir: aynı anda
// silen işlem bitene kadar beklenir. Bir işlemin içinde çağrılır.
export const gorselHazirMi = async (
  islem: VeritabaniIslemi,
  kimlik: string,
): Promise<"yok" | "boyut-eksik" | "hazir"> => {
  if (!kimlikBicimi.test(kimlik)) return "yok";
  const [kaynak] = await islem
    .select({ kimlik: dosyalar.kimlik })
    .from(dosyalar)
    .where(
      and(
        eq(dosyalar.kimlik, kimlik),
        isNull(dosyalar.silinme_zamani),
        inArray(dosyalar.tur, gorselTurAdlari),
      ),
    )
    .for("share");
  if (kaynak === undefined) return "yok";
  const [boyutu] = await islem
    .select({ kaynak: dosyaBoyutlari.kaynak_kimligi })
    .from(dosyaBoyutlari)
    .where(eq(dosyaBoyutlari.dosya_kimligi, kimlik));
  if (boyutu !== undefined) return "yok";
  const boyutlar = (await gorselBoyutlariniOku(islem, [kimlik])).get(kimlik) ?? {};
  return gorselBoyutAdlari.every((ad) => boyutlar[ad] !== undefined) ? "hazir" : "boyut-eksik";
};

// Silinmemiş dosyanın kaydı (tür ve içerik özeti); yoksa undefined. İçeriği okumaz: önbellekteki
// içeriğin hâlâ geçerli olduğunu anlamak için yeter.
export const dosyaKaydi = async (
  vt: Veritabani,
  kimlik: string,
): Promise<{ tur: DosyaTuru; icerikOzeti: string } | undefined> => {
  if (!kimlikBicimi.test(kimlik)) return undefined;
  const [satir] = await vt
    .select({ tur: dosyalar.tur, icerikOzeti: dosyalar.icerik_ozeti })
    .from(dosyalar)
    .where(
      and(
        eq(dosyalar.kimlik, kimlik),
        isNull(dosyalar.silinme_zamani),
        inArray(dosyalar.tur, gorselTurAdlari),
      ),
    );
  return satir === undefined
    ? undefined
    : { tur: satir.tur as DosyaTuru, icerikOzeti: satir.icerikOzeti };
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
    .where(
      and(
        eq(dosyalar.kimlik, kimlik),
        isNull(dosyalar.silinme_zamani),
        inArray(dosyalar.tur, gorselTurAdlari),
      ),
    );
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
export const dosyaSil = async (
  vt: Veritabani | VeritabaniIslemi,
  kimlik: string,
): Promise<boolean> => {
  if (!kimlikBicimi.test(kimlik)) return false;
  const silinen = await vt
    .update(dosyalar)
    .set({ silinme_zamani: new Date() })
    .where(and(eq(dosyalar.kimlik, kimlik), isNull(dosyalar.silinme_zamani)))
    .returning({ kimlik: dosyalar.kimlik });
  return silinen.length > 0;
};

// Belgeyi (PDF, kart 0268, karar 0170) olduğu gibi kaydeder: yeniden kodlanmaz, içeriği değiştirilmez. Boş, sınırı
// (belgeSinirlari) aşan ve belge imzası taşımayan dosya reddedilir. Görselle aynı yazım yolu (geçici ad, kayıtla
// aynı işlemde yerine koyma); bir veritabanı işleminin içinde çağrılmaz.
export const belgeKaydet = async (
  vt: Veritabani,
  icerik: Uint8Array,
  klasor: string = dosyaKlasoru(),
): Promise<KaydetmeSonucu> => {
  if (icerik.length === 0) return reddet("bos");
  if (icerik.length > belgeSinirlari.enCokBayt) return reddet("cok-buyuk");
  const tur = belgeTuru(icerik);
  if (tur === undefined) return reddet("tur-izinsiz");
  const [dosya] = await parcalariYaz(
    vt,
    [{ data: Buffer.from(icerik), tur, genislik: 0, yukseklik: 0 }],
    klasor,
  );
  if (dosya === undefined) throw new Error("Belge kaydedilemedi.");
  return { tamam: true, dosya };
};

// Silinmemiş belgenin içeriği, türü ve boyutu; yoksa ya da belge değilse undefined. İçerik özeti tutmuyorsa hata verir.
export const belgeOku = async (
  vt: Veritabani,
  kimlik: string,
  klasor: string = dosyaKlasoru(),
): Promise<{ icerik: Buffer; tur: BelgeTuru; mime: string; ozet: string } | undefined> => {
  if (!kimlikBicimi.test(kimlik)) return undefined;
  const [satir] = await vt
    .select()
    .from(dosyalar)
    .where(
      and(
        eq(dosyalar.kimlik, kimlik),
        isNull(dosyalar.silinme_zamani),
        inArray(dosyalar.tur, Object.keys(belgeTurleri)),
      ),
    );
  if (satir === undefined) return undefined;
  const tur = satir.tur as BelgeTuru;
  const icerik = await readFile(join(klasor, dosyaAdi(satir.kimlik, tur)));
  if (createHash("sha256").update(icerik).digest("hex") !== satir.icerik_ozeti) {
    throw new Error(`Dosyanın içeriği kayıttakiyle aynı değil: ${satir.kimlik}.`);
  }
  return { icerik, tur, mime: belgeTurleri[tur].mime, ozet: satir.icerik_ozeti };
};

// Belgenin boyutu (bayt); yoksa, silinmişse ya da belge değilse undefined. İçeriği okumaz.
export const belgeBoyutu = async (
  vt: Veritabani | VeritabaniIslemi,
  kimlik: string,
): Promise<number | undefined> => {
  if (!kimlikBicimi.test(kimlik)) return undefined;
  const [satir] = await vt
    .select({ boyut: dosyalar.boyut })
    .from(dosyalar)
    .where(
      and(
        eq(dosyalar.kimlik, kimlik),
        isNull(dosyalar.silinme_zamani),
        inArray(dosyalar.tur, Object.keys(belgeTurleri)),
      ),
    )
    // Paylaşımlı kilit (kart 0093): belgeyi bağlayan işlem bitene kadar dosya temizliği onu silinmiş işaretleyemez;
    // temizlik önce işaretlediyse bu okuma onu bekler ve belgeyi bulamaz.
    .for("share");
  return satir?.boyut;
};
