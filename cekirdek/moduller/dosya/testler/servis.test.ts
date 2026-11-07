// Dosya kaydetme gerçek veritabanı ve gerçek klasörle (kart 0072, karar 0058): tür içerikten
// anlaşılır, adı ya da uzantısı değiştirilmiş zararlı dosya, sınırı aşan dosya, izinsiz tür ve çok
// büyük piksel sayısı reddedilir; görseldeki konum ve öteki gömülü bilgiler silinir; kayıt ve dosya
// birlikte yazılır ya da hiçbiri yazılmaz.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dosyaSinirlari, dosyaTurleri } from "../../../kayitlar/dosya.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { dosyalar } from "../model.ts";
import { dosyaKaydet, dosyaOku, dosyaSil, icerikTuru } from "../servis.ts";

let vt: Veritabani;
let sil: () => Promise<void>;
let klasor: string;

beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("dosya"));
}, 60_000);
afterAll(async () => {
  await sil();
});
beforeEach(() => {
  if (klasor) rmSync(klasor, { recursive: true, force: true });
  klasor = mkdtempSync(join(tmpdir(), "dosya-"));
});

const kirmizi = { r: 200, g: 30, b: 30 };
const gorsel = (bicim: "jpeg" | "png" | "webp" | "gif" | "tiff", genislik = 40, yukseklik = 30) =>
  sharp({ create: { width: genislik, height: yukseklik, channels: 3, background: kirmizi } })
    .toFormat(bicim)
    .toBuffer();

// Konum (GPS), cihaz ve yazar bilgisi gömülü JPEG. Değerler aranabilsin diye ayırt edicidir.
const konumluJpeg = () =>
  sharp({ create: { width: 40, height: 30, channels: 3, background: kirmizi } })
    .withExif({
      IFD0: { Artist: "yazar-izi-0072", Make: "cihaz-izi-0072" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "39/1 55/1 0/1", GPSLongitudeRef: "E" },
    })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();

const klasordekiler = () => readdirSync(klasor).sort();
const kayitSayisi = async () => (await vt.select().from(dosyalar)).length;

describe("tür içerikten", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "%s kaydedilir, adı kimlik ve türün uzantısıdır",
    async (bicim) => {
      const sonuc = await dosyaKaydet(vt, await gorsel(bicim), klasor);
      if (!sonuc.tamam) throw new Error(sonuc.hata);
      expect(sonuc.dosya).toMatchObject({ tur: bicim, genislik: 40, yukseklik: 30 });
      expect(klasordekiler()).toEqual([`${sonuc.dosya.kimlik}.${dosyaTurleri[bicim].uzanti}`]);
      const okunan = await dosyaOku(vt, sonuc.dosya.kimlik, klasor);
      expect(okunan?.mime).toBe(dosyaTurleri[bicim].mime);
      expect((await sharp(okunan?.icerik).metadata()).format).toBe(bicim);
    },
  );

  const zararlilar: [string, () => Promise<Buffer> | Buffer, string][] = [
    [
      "JPEG uzantılı HTML",
      () => Buffer.from("<html><script>alert(1)</script></html>"),
      "tur-izinsiz",
    ],
    [
      "SVG",
      () => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      "tur-izinsiz",
    ],
    ["GIF", () => gorsel("gif"), "tur-izinsiz"],
    ["TIFF", () => gorsel("tiff"), "tur-izinsiz"],
    ["boş", () => Buffer.alloc(0), "bos"],
    // İmzası JPEG, devamı değil: yeniden kodlanamaz.
    [
      "JPEG imzalı çöp",
      () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]),
      "bozuk",
    ],
    // PNG imzasının ardından WebP: imza ile içerik uyuşmaz.
    [
      "PNG imzalı WebP",
      async () => Buffer.concat([Buffer.from(dosyaTurleri.png.imzalar[0]), await gorsel("webp")]),
      "bozuk",
    ],
  ];
  it.each(zararlilar)("%s reddedilir, ne kayıt ne dosya kalır", async (_ad, icerik, hata) => {
    const once = await kayitSayisi();
    expect(await dosyaKaydet(vt, await icerik(), klasor)).toEqual({ tamam: false, hata });
    expect(klasordekiler()).toEqual([]);
    expect(await kayitSayisi()).toBe(once);
  });
});

describe("sınırlar", () => {
  it("boyut sınırını bir bayt aşan dosya reddedilir", async () => {
    const icerik = Buffer.alloc(dosyaSinirlari.enCokBayt + 1);
    Buffer.from(dosyaTurleri.jpeg.imzalar[0]).copy(icerik);
    expect(await dosyaKaydet(vt, icerik, klasor)).toEqual({ tamam: false, hata: "cok-buyuk" });
    expect(klasordekiler()).toEqual([]);
  });

  it("piksel sınırını aşan görsel reddedilir, açılmadan", async () => {
    // Tek renkli, sıkıştırılınca küçük ama sınırın üstünde piksel taşıyan PNG.
    const kenar = Math.ceil(Math.sqrt(dosyaSinirlari.enCokPiksel)) + 1;
    const icerik = await sharp({
      create: { width: kenar, height: kenar, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(icerik.length).toBeLessThan(dosyaSinirlari.enCokBayt);
    expect(await dosyaKaydet(vt, icerik, klasor)).toEqual({
      tamam: false,
      hata: "cok-fazla-piksel",
    });
    expect(klasordekiler()).toEqual([]);
  }, 60_000);
});

describe("gömülü bilgiler", () => {
  it("konum, cihaz ve yazar bilgisi silinir, yön görsele işlenir", async () => {
    const girdi = await konumluJpeg();
    const once = await sharp(girdi).metadata();
    expect(once.exif).toBeDefined();
    expect(girdi.includes("yazar-izi-0072")).toBe(true);

    const sonuc = await dosyaKaydet(vt, girdi, klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    const saklanan = readFileSync(join(klasor, klasordekiler()[0] ?? ""));
    const sonra = await sharp(saklanan).metadata();
    expect(sonra.exif).toBeUndefined();
    expect(sonra.orientation).toBeUndefined();
    expect(saklanan.includes("yazar-izi-0072")).toBe(false);
    expect(saklanan.includes("cihaz-izi-0072")).toBe(false);
    expect(saklanan.includes("GPS")).toBe(false);
    // Yön 6 (90 derece) görsele işlendi: en ve boy yer değiştirdi.
    expect([sonra.width, sonra.height]).toEqual([30, 40]);
    expect(sonuc.dosya).toMatchObject({ genislik: 30, yukseklik: 40 });
  });
});

describe("kayıt ve dosya birlikte", () => {
  it("kayıt yazılamazsa dosya da kalmaz", async () => {
    const once = await kayitSayisi();
    const bozukVt = {
      transaction: (is: (islem: unknown) => Promise<unknown>) =>
        vt.transaction(async (islem) => {
          await is(islem);
          throw new Error("kayıt düştü");
        }),
    } as unknown as Veritabani;
    await expect(dosyaKaydet(bozukVt, await gorsel("png"), klasor)).rejects.toThrow("kayıt düştü");
    expect(klasordekiler()).toEqual([]);
    expect(await kayitSayisi()).toBe(once);
  });

  it("klasöre yazılamazsa kayıt da kalmaz", async () => {
    const once = await kayitSayisi();
    await expect(
      dosyaKaydet(vt, await gorsel("png"), join(klasor, "olmayan-klasor")),
    ).rejects.toThrow();
    expect(await kayitSayisi()).toBe(once);
  });

  it("diskte sonradan değişen dosya okunmaz", async () => {
    const sonuc = await dosyaKaydet(vt, await gorsel("png"), klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    writeFileSync(join(klasor, klasordekiler()[0] ?? ""), await gorsel("png", 41, 30));
    await expect(dosyaOku(vt, sonuc.dosya.kimlik, klasor)).rejects.toThrow("aynı değil");
  });

  it("silinen dosya işaretlenir, okunmaz, dosyanın kendisi yerinde kalır", async () => {
    const sonuc = await dosyaKaydet(vt, await gorsel("webp"), klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    expect(await dosyaSil(vt, sonuc.dosya.kimlik)).toBe(true);
    expect(await dosyaSil(vt, sonuc.dosya.kimlik)).toBe(false);
    expect(await dosyaOku(vt, sonuc.dosya.kimlik, klasor)).toBeUndefined();
    expect(klasordekiler()).toHaveLength(1);
    const [satir] = await vt.select().from(dosyalar).where(eq(dosyalar.kimlik, sonuc.dosya.kimlik));
    expect(satir?.silinme_zamani).not.toBeNull();
  });

  it("kimlik biçiminde olmayan değer yol olarak kullanılmaz", async () => {
    expect(await dosyaOku(vt, "../../etc/passwd", klasor)).toBeUndefined();
    expect(await dosyaSil(vt, "../x")).toBe(false);
  });
});

describe("imza", () => {
  it("türü yalnız içeriğin başından okur", async () => {
    expect(icerikTuru(await gorsel("png"))).toBe("png");
    expect(icerikTuru(Buffer.from("RIFF\0\0\0\0WEBP"))).toBe("webp");
    expect(icerikTuru(Buffer.from("RIFF\0\0\0\0WAVE"))).toBeUndefined();
    expect(icerikTuru(Buffer.from([0xff, 0xd8]))).toBeUndefined();
  });
});
