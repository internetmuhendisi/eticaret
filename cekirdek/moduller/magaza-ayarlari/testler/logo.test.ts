// Mağazanın logosu gerçek veritabanı ve gerçek dosya klasörüyle (kart 0073, karar 0059): logo yokken
// yoktur, ilk logo marka/ klasöründen, yüklenen logo dosya deposundan gelir; değişiklik kayda girer,
// eski logo işaretlenir, kaldırınca ilk logoya dönülür, okunamayan yüklenen logo ilk logoya düşer.
import { randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyalar } from "../../dosya/model.ts";
import { dosyaSil } from "../../dosya/servis.ts";
import { logonunAdresi, logoyuDegistir, logoyuKaldir, magazaLogosu } from "../logo.ts";
import { siteninServisi } from "../servis.ts";

const ornekler = resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler");
const logolu = siteKlasorunuOku(join(ornekler, "marka-logolu"));
const logosuz = siteKlasorunuOku(join(ornekler, "gecerli"));
const yonetici: DegisikligiYapan = { tur: "yonetici", kimlik: randomUUID() };

let vt: Veritabani;
let sil: () => Promise<void>;
let klasor: string;
let izlenenler: IzlenenHata[];

const yeniSite = async () => {
  ({ vt, sil } = await denemeSitesiAc("logo"));
};
beforeEach(async () => {
  await yeniSite();
  klasor = mkdtempSync(join(tmpdir(), "logo-"));
  izlenenler = [];
  hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));
}, 60_000);
afterEach(async () => {
  hataIzlemeAraciniBagla(undefined);
  vi.unstubAllEnvs();
  rmSync(klasor, { recursive: true, force: true });
  await sil();
});

const png = (genislik: number) =>
  sharp({ create: { width: genislik, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } } })
    .png()
    .toBuffer();
const genislik = async (icerik: Buffer) => (await sharp(icerik).metadata()).width;

describe("hangi logo", () => {
  it("logo yükleme ve ilk logo yoksa logo yoktur", async () => {
    expect(await magazaLogosu(vt, { site: logosuz, klasor })).toBeUndefined();
  });

  it("yüklenen yoksa ilk logo marka/ klasöründen gelir", async () => {
    const logo = await magazaLogosu(vt, { site: logolu, klasor });
    expect(logo?.kaynak).toBe("ilk");
    expect(logo?.mime).toBe("image/webp");
    expect(logo?.icerik.equals(readFileSync(logolu.markaLogosu?.yol ?? ""))).toBe(true);
  });

  it("yüklenen logo depodan gelir, değişiklik kayda girer; kaldırınca ilk logoya dönülür", async () => {
    const sonuc = await logoyuDegistir(vt, yonetici, await png(30), { site: logolu, klasor });
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    const logo = await magazaLogosu(vt, { site: logolu, klasor });
    expect(logo?.kaynak).toBe("yuklenen");
    expect(logo?.mime).toBe("image/png");
    expect(await genislik(logo?.icerik ?? Buffer.alloc(0))).toBe(30);
    const kayitlar = await vt.select().from(degisiklikKayitlari);
    expect(kayitlar.map((k) => k.yeni_deger)).toContainEqual({
      ayar: "logo",
      deger: sonuc.dosya.kimlik,
    });

    await logoyuKaldir(vt, yonetici, { site: logolu });
    expect((await magazaLogosu(vt, { site: logolu, klasor }))?.kaynak).toBe("ilk");
    const [dosya] = await vt.select().from(dosyalar).where(eq(dosyalar.kimlik, sonuc.dosya.kimlik));
    expect(dosya?.silinme_zamani).not.toBeNull();
  });

  it("logo ikinci kez değişince eskisi silinmiş olarak işaretlenir", async () => {
    const ilk = await logoyuDegistir(vt, yonetici, await png(30), { site: logosuz, klasor });
    const ikinci = await logoyuDegistir(vt, yonetici, await png(40), { site: logosuz, klasor });
    if (!ilk.tamam || !ikinci.tamam) throw new Error("kaydedilmedi");
    expect(
      await genislik(
        (await magazaLogosu(vt, { site: logosuz, klasor }))?.icerik ?? Buffer.alloc(0),
      ),
    ).toBe(40);
    const satirlar = await vt.select().from(dosyalar);
    const silinmis = (kimlik: string) =>
      satirlar.find((s) => s.kimlik === kimlik)?.silinme_zamani !== null;
    expect([silinmis(ilk.dosya.kimlik), silinmis(ikinci.dosya.kimlik)]).toEqual([true, false]);
  });

  it("geçersiz dosya logo olmaz, ayar değişmez", async () => {
    const sonuc = await logoyuDegistir(vt, yonetici, Buffer.from("<svg/>"), {
      site: logolu,
      klasor,
    });
    expect(sonuc).toEqual({ tamam: false, hata: "tur-izinsiz" });
    expect((await magazaLogosu(vt, { site: logolu, klasor }))?.kaynak).toBe("ilk");
    expect(readdirSync(klasor)).toEqual([]);
  });

  it("yüklenen logonun dosyası okunamazsa ilk logo görünür ve hata kaydedilir", async () => {
    const sonuc = await logoyuDegistir(vt, yonetici, await png(30), { site: logolu, klasor });
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    for (const ad of readdirSync(klasor)) unlinkSync(join(klasor, ad));
    expect((await magazaLogosu(vt, { site: logolu, klasor }))?.kaynak).toBe("ilk");
    expect(izlenenler).toHaveLength(1);
  });
});

describe("bağ", () => {
  it("logo ayarı genel değiştirmeyle değişmez: herhangi bir dosya logo yapılamaz", async () => {
    const servis = siteninServisi(logolu);
    await expect(servis.degistir(vt, yonetici, { logo: randomUUID() })).rejects.toThrow(
      "yalnız kendi işleviyle",
    );
    expect((await magazaLogosu(vt, { site: logolu, klasor }))?.kaynak).toBe("ilk");
  });

  it("logo ayarındaki dosya silinmiş olarak işaretlenirse ilk logo görünür, hata kaydedilir", async () => {
    const sonuc = await logoyuDegistir(vt, yonetici, await png(30), { site: logolu, klasor });
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    await dosyaSil(vt, sonuc.dosya.kimlik);
    expect((await magazaLogosu(vt, { site: logolu, klasor }))?.kaynak).toBe("ilk");
    expect(izlenenler).toHaveLength(1);
  });

  it("ilk logo okunamazsa logo yok sayılır, hata kaydedilir, düşmez", async () => {
    const kayip = {
      ...logolu,
      markaLogosu: { yol: join(klasor, "olmayan-logo.webp"), tur: "webp" as const },
    };
    expect(await magazaLogosu(vt, { site: kayip, klasor })).toBeUndefined();
    expect(izlenenler).toHaveLength(1);
  });
});

describe("logonun adresi", () => {
  it("sitenin adresi ve logonun özetiyle kurulur; adres ya da logo yoksa yoktur", async () => {
    const logo = await magazaLogosu(vt, { site: logolu, klasor });
    vi.stubEnv("SITE_ADRESI", "https://magaza.ornek.test/");
    expect(logonunAdresi(logolu, logo)).toBe(
      `https://magaza.ornek.test/kapi/herkese-acik/logo?s=${logo?.etiket.slice(0, 16)}`,
    );
    expect(logonunAdresi(logolu, undefined)).toBeUndefined();
    vi.stubEnv("SITE_ADRESI", "");
    expect(
      logonunAdresi({ ...logolu, kimlik: { ...logolu.kimlik, adresler: {} } } as Site, logo),
    ).toBeUndefined();
  });
});
