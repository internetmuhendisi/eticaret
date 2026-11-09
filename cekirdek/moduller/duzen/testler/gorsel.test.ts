// Vitrin görseli gerçek veritabanı ve klasörle (kart 0110, karar 0087): yalnız geçerli düzende çizilen bir
// bölümün görseli ve silinmemiş bir kategorinin görseli verilir. Gizlenen ya da silinen bölümün, silinen
// kategorinin, kullanılmayan görselin, ürün galerisindeki görselin ve görselin boyutunun kendisinin dosyası
// verilmez; büyük harfli kimlik geçer. Uç dosyayı bayt bayt aynı, görsel sınırıyla verir; görsel yoksa 404,
// bozuk girdi 400.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { vitrinGorseliUcu } from "../../../kapi/herkese-acik/vitrin-gorseli.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { dosyaOku, gorselKaydet } from "../../dosya/servis.ts";
import { kategoriDegistir, kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { logoyuDegistir } from "../../magaza-ayarlari/logo.ts";
import { urunServisi } from "../../urun/servis.ts";
import { vitrindeKullaniliyorMu, vitrinGorseliAdresi, vitrinGorseliOku } from "../gorsel.ts";
import { duzenServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const ornekSite = siteKlasorunuOku(
  join(import.meta.dirname, "..", "..", "..", "ayar-semasi", "testler", "ornek-siteler", "gecerli"),
);
// Başlangıç düzeni boş: görsel yalnız testin eklediği bölümden gelir.
const site: Site = {
  ...ornekSite,
  duzenBaslangici: { "ust-kisim": [], "ana-sayfa": [], "alt-kisim": [] },
};

const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
beforeAll(() => {
  ortak[siteAnahtari] = site;
});
afterAll(() => {
  delete ortak[siteAnahtari];
});

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const duzen = duzenServisi(() => site);

const temizlenecekler: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async () => {
  const deneme = await denemeSitesiAc("vitrin-gorseli");
  const klasor = mkdtempSync(join(tmpdir(), "vitrin-gorseli-"));
  temizlenecekler.push(deneme.sil, () => rmSync(klasor, { recursive: true, force: true }));
  const vt = deneme.vt;
  const gorsel = async () => {
    const icerik = await sharp({
      create: { width: 800, height: 400, channels: 3, background: { r: 200, g: 120, b: 30 } },
    })
      .png()
      .toBuffer();
    const sonuc = await gorselKaydet(vt, icerik, klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    return sonuc;
  };
  const geniseAfis = (dosya: string) =>
    duzen.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "genis-afis",
      degerler: { baslik: "Afiş", gorsel: dosya },
    });
  const oku = (dosya: string, boyut: "kucuk" | "orta" | "buyuk" | "tam" = "orta") =>
    vitrinGorseliOku(vt, site, dosya, boyut, { klasor });
  return { vt, klasor, adres: deneme.baglantiAdresi, gorsel, geniseAfis, oku };
};

describe("vitrin görseli", () => {
  it("çizilen bölümün görseli verilir; bölüm gizlenince ve silinince verilmez", async () => {
    const h = await hazirla();
    const { dosya, boyutlar } = await h.gorsel();
    expect(await h.oku(dosya.kimlik)).toBeUndefined();
    const bolum = await h.geniseAfis(dosya.kimlik);
    const okunan = await h.oku(dosya.kimlik);
    const beklenen = await dosyaOku(h.vt, boyutlar.orta.kimlik, h.klasor);
    expect(okunan?.icerik.equals(beklenen?.icerik ?? Buffer.alloc(0))).toBe(true);
    expect((await h.oku(dosya.kimlik.toUpperCase()))?.mime).toBe("image/webp");
    await duzen.bolumGorunurlugu(h.vt, yonetici(), bolum, true);
    expect(await h.oku(dosya.kimlik)).toBeUndefined();
    await duzen.bolumGorunurlugu(h.vt, yonetici(), bolum, false);
    expect(await h.oku(dosya.kimlik, "tam")).toBeDefined();
    await duzen.bolumSil(h.vt, yonetici(), bolum);
    expect(await h.oku(dosya.kimlik)).toBeUndefined();
  });

  it("silinmemiş kategorinin görseli verilir; görsel kaldırılınca ve kategori silinince verilmez", async () => {
    const h = await hazirla();
    const ilk = await h.gorsel();
    const kategori = await kategoriEkle(h.vt, yonetici(), {
      ad: "Giyim",
      gorsel: ilk.dosya.kimlik,
    });
    expect(await vitrindeKullaniliyorMu(h.vt, site, ilk.dosya.kimlik)).toBe(true);
    await kategoriDegistir(h.vt, yonetici(), kategori, { gorsel: null });
    expect(await vitrindeKullaniliyorMu(h.vt, site, ilk.dosya.kimlik)).toBe(false);
    await kategoriDegistir(h.vt, yonetici(), kategori, { gorsel: ilk.dosya.kimlik });
    await kategoriSil(h.vt, yonetici(), kategori);
    expect(await h.oku(ilk.dosya.kimlik)).toBeUndefined();
  });

  it("listedeki her slaytın görseli ve telefon görseli verilir", async () => {
    const h = await hazirla();
    const [ilk, ikinci, telefon] = [await h.gorsel(), await h.gorsel(), await h.gorsel()];
    await duzen.bolumEkle(h.vt, yonetici(), "ana-sayfa", {
      tur: "kayan-afis",
      degerler: {
        slaytlar: [
          { baslik: "Bir", gorsel: ilk.dosya.kimlik },
          { baslik: "İki", gorsel: ikinci.dosya.kimlik, darEkranGorseli: telefon.dosya.kimlik },
        ],
      },
    });
    for (const gorsel of [ilk, ikinci, telefon]) {
      expect(await h.oku(gorsel.dosya.kimlik), gorsel.dosya.kimlik).toBeDefined();
    }
  });

  it("mağazanın logosu bu adresle verilmez", async () => {
    const h = await hazirla();
    const icerik = await sharp({
      create: { width: 200, height: 80, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const logo = await logoyuDegistir(h.vt, yonetici(), icerik, { site, klasor: h.klasor });
    if (!logo.tamam) throw new Error(logo.hata);
    expect(await h.oku(logo.dosya.kimlik)).toBeUndefined();
  });

  it("kullanılmayan görsel, boyutun kendisi ve ürün galerisindeki görsel bu adresle verilmez", async () => {
    const h = await hazirla();
    const kullanilan = await h.gorsel();
    await h.geniseAfis(kullanilan.dosya.kimlik);
    // Görselin boyutu kendi başına bir dosyadır, kaynak gibi istenemez.
    expect(await h.oku(kullanilan.boyutlar.orta.kimlik)).toBeUndefined();
    const urunGorseli = await h.gorsel();
    const urunler = urunServisi(() => site.ayarlar.saatDilimi);
    const urun = await urunler.urunEkle(h.vt, yonetici(), {
      ad: "Ürün",
      vergiSinifi: null,
      durum: "yayinda",
    });
    await urunler.galeriyeGorselEkle(h.vt, yonetici(), urun, {
      dosya: urunGorseli.dosya.kimlik,
      alternatifMetin: "Ürün",
    });
    expect(await h.oku(urunGorseli.dosya.kimlik)).toBeUndefined();
    expect(await h.oku(randomUUID())).toBeUndefined();
    expect(await h.oku("bozuk")).toBeUndefined();
  });

  it("uç: dosyanın kendisi görsel sınırıyla; görsel yoksa 404, bozuk girdi 400", async () => {
    const h = await hazirla();
    vi.stubEnv("VERITABANI_ADRESI", h.adres);
    vi.stubEnv("DOSYA_KLASORU", h.klasor);
    await baglantiyiKapat();
    const { dosya } = await h.gorsel();
    await h.geniseAfis(dosya.kimlik);
    const istek = (yol: string) => vitrinGorseliUcu(new Request(`http://magaza.ornek.test${yol}`));
    const yanit = await istek(vitrinGorseliAdresi(dosya.kimlik, "buyuk"));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("content-type")).toBe("image/webp");
    expect(yanit.headers.get("x-content-type-options")).toBe("nosniff");
    expect(vitrinGorseliUcu.tanim.sinir).toBe("gorsel");
    expect((await istek(vitrinGorseliAdresi(randomUUID(), "buyuk"))).status).toBe(404);
    expect((await istek(`${vitrinGorseliAdresi(dosya.kimlik, "buyuk")}&x=1`)).status).toBe(400);
    expect(
      (await istek(`/kapi/herkese-acik/vitrin-gorseli?d=${dosya.kimlik}&b=ozgun`)).status,
    ).toBe(400);
  });
});
