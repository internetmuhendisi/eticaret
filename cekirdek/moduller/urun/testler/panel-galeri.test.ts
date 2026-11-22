// Ürün ekranının galerisi gerçek veritabanı ve klasörle (kart 0266, karar 0073): ekranın son hâli yeni görsel, video ve
// kayıtlı öğelerle sırasıyla yazılır (ilk görsel ana görsel); alternatif metin değişir, görülüp listede olmayan öğe
// silinir, her adım değişiklik kaydına girer, aynı girdi ikinci kez hiçbir şey yazmaz. Ekranın gördüğü galeri bugünkü
// değilse ya da listede görülmemiş öğe varsa çakışma; hata öğenin yoluyla döner ve hiçbir şey yazılmaz.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, like } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { galeriSinirlari } from "../../../kayitlar/gorsel.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { gorselKaydet } from "../../dosya/servis.ts";
import { anaGorseller, urunGalerileri } from "../galeri.ts";
import { type PanelGaleri, panelGaleriYaz } from "../panel-galeri.ts";
import { urunServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const servis = urunServisi(() => "Europe/Istanbul");
const kim: DegisikligiYapan = { tur: "yonetici", kimlik: randomUUID() };
const video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const temizlenecekler: (() => Promise<void> | void)[] = [];
const siteAc = async () => {
  const site = await denemeSitesiAc("panel-galeri");
  const klasor = mkdtempSync(join(tmpdir(), "panel-galeri-"));
  temizlenecekler.push(site.sil, () => rmSync(klasor, { recursive: true, force: true }));
  return { vt: site.vt, klasor };
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const urunEkle = (vt: Veritabani) =>
  servis.urunEkle(vt, kim, {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: null,
    durum: "yayinda",
  });

const gorsel = async (vt: Veritabani, klasor: string) => {
  const icerik = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 40, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
  const sonuc = await gorselKaydet(vt, icerik, klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};

const yaz = (vt: Veritabani, urun: string, girdi: PanelGaleri) =>
  vt.transaction((islem) => panelGaleriYaz(islem, kim, urun, girdi, servis));

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const galeri = async (vt: Veritabani, urun: string) =>
  ((await urunGalerileri(vt, [urun])).get(urun) ?? []).map((oge) => ({
    kimlik: oge.kimlik,
    tur: oge.tur,
    alternatifMetin: oge.alternatifMetin,
    ...(oge.tur === "gorsel" ? { dosya: oge.dosya } : { video: oge.videoKimligi }),
  }));

const kayitSayisi = async (vt: Veritabani) =>
  (
    await vt
      .select({ kimlik: degisiklikKayitlari.kimlik })
      .from(degisiklikKayitlari)
      .where(like(degisiklikKayitlari.islem, "urun-galerisi.%"))
  ).length;

describe("ürün ekranının galerisi", () => {
  it("yeni görseller ve video sırasıyla yazılır; ilk görsel ana görseldir; kayda girer", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const [a, b] = [await gorsel(vt, klasor), await gorsel(vt, klasor)];
    await yaz(vt, urun, {
      gorulen: [],
      ogeler: [
        { video, alternatifMetin: "Tanıtım" },
        { dosya: b, alternatifMetin: "Arka" },
        { dosya: a, alternatifMetin: "Ön" },
      ],
    });
    expect(await galeri(vt, urun)).toMatchObject([
      { tur: "video", alternatifMetin: "Tanıtım", video: "dQw4w9WgXcQ" },
      { tur: "gorsel", dosya: b, alternatifMetin: "Arka" },
      { tur: "gorsel", dosya: a, alternatifMetin: "Ön" },
    ]);
    // Video ana görsel olmaz: ilk görsel.
    expect((await anaGorseller(vt, [urun])).get(urun)?.dosya).toBe(b);
    const eklenenler = await vt
      .select({ kimlik: degisiklikKayitlari.kimlik })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.islem, "urun-galerisi.eklendi"));
    expect(eklenenler).toHaveLength(3);
  });

  it("değişiklik: sıra, alternatif metin, silme ve yeni öğe; aynı girdi ikinci kez hiçbir şey yazmaz", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    await yaz(vt, urun, {
      gorulen: [],
      ogeler: [
        { dosya: await gorsel(vt, klasor), alternatifMetin: "Bir" },
        { dosya: await gorsel(vt, klasor), alternatifMetin: "İki" },
        { dosya: await gorsel(vt, klasor), alternatifMetin: "Üç" },
      ],
    });
    const [bir, iki, uc] = await galeri(vt, urun);
    const yeni = await gorsel(vt, klasor);
    const girdi: PanelGaleri = {
      gorulen: [bir?.kimlik ?? "", iki?.kimlik ?? "", uc?.kimlik ?? ""],
      ogeler: [
        { kimlik: uc?.kimlik.toUpperCase() ?? "", alternatifMetin: "Üç, önden" },
        { dosya: yeni, alternatifMetin: "Dört" },
        { kimlik: bir?.kimlik ?? "", alternatifMetin: "Bir" },
      ],
    };
    await yaz(vt, urun, girdi);
    const sonra = await galeri(vt, urun);
    expect(sonra.map((oge) => oge.alternatifMetin)).toEqual(["Üç, önden", "Dört", "Bir"]);
    expect(sonra[0]?.kimlik).toBe(uc?.kimlik);
    expect(sonra.some((oge) => oge.kimlik === iki?.kimlik)).toBe(false);
    for (const islem of ["silindi", "degisti", "siralandi"]) {
      const satirlar = await vt
        .select({ kimlik: degisiklikKayitlari.kimlik })
        .from(degisiklikKayitlari)
        .where(eq(degisiklikKayitlari.islem, `urun-galerisi.${islem}`));
      expect(satirlar.length, islem).toBeGreaterThan(0);
    }
    // Aynı son hâl yeniden gönderilir: hiçbir kayıt yazılmaz.
    const once = await kayitSayisi(vt);
    await yaz(vt, urun, {
      gorulen: sonra.map((oge) => oge.kimlik),
      ogeler: sonra.map((oge) => ({ kimlik: oge.kimlik, alternatifMetin: oge.alternatifMetin })),
    });
    expect(await kayitSayisi(vt)).toBe(once);
  });

  it("ekranın gördüğü galeri bugünkü değilse ya da listede görülmemiş öğe varsa çakışma, hiçbir şey yazılmaz", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    await yaz(vt, urun, {
      gorulen: [],
      ogeler: [{ dosya: await gorsel(vt, klasor), alternatifMetin: "Bir" }],
    });
    const [bir] = await galeri(vt, urun);
    const once = await galeri(vt, urun);
    const cakisma = { kod: "cakisma", ayrinti: [{ alan: "galeri", kod: "galeri-degisti" }] };
    // Başka sekme bu arada bir görsel ekledi: ekran yalnız ilkini gördü.
    await servis.galeriyeGorselEkle(vt, kim, urun, {
      dosya: await gorsel(vt, klasor),
      alternatifMetin: "Başka sekme",
    });
    const sonra = await galeri(vt, urun);
    expect(
      await hatasi(
        yaz(vt, urun, {
          gorulen: [bir?.kimlik ?? ""],
          ogeler: [{ kimlik: bir?.kimlik ?? "", alternatifMetin: "Değişti" }],
        }),
      ),
    ).toEqual(cakisma);
    expect(await galeri(vt, urun)).toEqual(sonra);
    // Görülmemiş kimlik listede.
    expect(
      await hatasi(
        yaz(vt, urun, {
          gorulen: sonra.map((oge) => oge.kimlik),
          ogeler: [{ kimlik: randomUUID(), alternatifMetin: "Uydurma" }],
        }),
      ),
    ).toEqual(cakisma);
    expect(await galeri(vt, urun)).toEqual(sonra);
    expect(once).toHaveLength(1);
  });

  it("hata öğenin yoluyla döner ve hiçbir şey yazılmaz", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const iyi = await gorsel(vt, klasor);
    const durumlar: [PanelGaleri["ogeler"], string, string][] = [
      [
        [
          { dosya: iyi, alternatifMetin: "İyi" },
          { dosya: await gorsel(vt, klasor), alternatifMetin: "  " },
        ],
        "galeri.ogeler.1.alternatifMetin",
        "dogrulama",
      ],
      [
        [
          { dosya: iyi, alternatifMetin: "İyi" },
          { video: "https://ornek.test/video", alternatifMetin: "Video" },
        ],
        "galeri.ogeler.1.adres",
        "dogrulama",
      ],
      [[{ dosya: randomUUID(), alternatifMetin: "Olmayan" }], "galeri.ogeler.0.dosya", "dogrulama"],
      [
        [
          { dosya: iyi, alternatifMetin: "Bir" },
          { dosya: iyi, alternatifMetin: "Aynısı" },
        ],
        "galeri.ogeler.1.dosya",
        // Aynı görsel servisin çakışmasıdır (galeri-gorsel-tekrar).
        "cakisma",
      ],
    ];
    for (const [ogeler, alan, kod] of durumlar) {
      const hata = await hatasi(yaz(vt, urun, { gorulen: [], ogeler }));
      expect(hata.kod, alan).toBe(kod);
      expect((hata.ayrinti as { alan: string }[])[0]?.alan, alan).toBe(alan);
      expect(await galeri(vt, urun), alan).toEqual([]);
    }
  });

  it("sınırı aşan galeri galerinin kendi alanında sınır hatası alır, hiçbir şey yazılmaz", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    await yaz(vt, urun, {
      gorulen: [],
      ogeler: Array.from({ length: galeriSinirlari.oge }, (_, i) => ({
        video,
        alternatifMetin: `Video ${i}`,
      })),
    });
    const kayitli = await galeri(vt, urun);
    expect(kayitli).toHaveLength(galeriSinirlari.oge);
    const once = await kayitSayisi(vt);
    expect(
      await hatasi(
        yaz(vt, urun, {
          gorulen: kayitli.map((oge) => oge.kimlik),
          ogeler: [
            ...kayitli.map((oge) => ({ kimlik: oge.kimlik, alternatifMetin: oge.alternatifMetin })),
            { dosya: await gorsel(vt, klasor), alternatifMetin: "Fazla" },
          ],
        }),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "galeri", kod: "galeri-siniri" }] });
    // Bozuk girdi (bilinmeyen alan) doğrulama hatasıdır.
    expect(
      await hatasi(
        yaz(vt, urun, { gorulen: [], ogeler: [{ uydurma: 1 }] } as unknown as PanelGaleri),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "galeri", kod: "galeri-sira-gecersiz" }] });
    expect(await kayitSayisi(vt)).toBe(once);
    expect(await galeri(vt, urun)).toEqual(kayitli);
  });
});
