// Ürün kartının verisi ve ürün görseli ucu gerçek veritabanı ve klasörle (kart 0109, karar 0085):
// - Kartın fiyatı çekirdeğin fiyat aralığıyla birebir aynıdır, çizilen kartta yazılı tutarlar ve vergi metni
//   görünür; stok durumu urunStokDurumu'ndandır; marka silinmemiş markanın adıdır.
// - Görünmeyen ürünün kartı yoktur (taslak, arşiv, silinmiş; gizli yalnız sayfa yerinde); zamanlanmış ürün
//   yayın zamanından bir milisaniye önce yok, zamanında var. Sıra verilen sıradır; olmayan ve bozuk kimlik yok
//   sayılır; sorgu sayısı ürün sayısıyla artmaz.
// - Görsel ana görseldir: kart boyutlarının adresleri genişlikleriyle, alternatif metniyle.
// - Uç yalnız sayfası açılan ürünün canlı görselinin boyutunu verir; öteki her durumda 404, bozuk girdide 400.
import { randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { gunluk } from "../../../izleme/gunluk.ts";
import { urunGorseliUcu } from "../../../kapi/herkese-acik/urun-gorseli.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { gorselBoyutlari } from "../../../kayitlar/gorsel.ts";
import { yazilanIslevler } from "../../../kayitlar/islevler.ts";
import { dosyaOku, dosyaSil, gorselKaydet } from "../../../moduller/dosya/servis.ts";
import { fiyatGosterimServisi } from "../../../moduller/fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../../moduller/magaza-ayarlari/servis.ts";
import { markaServisi } from "../../../moduller/marka/servis.ts";
import { stokServisi } from "../../../moduller/stok/servis.ts";
import { urunServisi } from "../../../moduller/urun/servis.ts";
import { urunGorseliAdresi, vitrinGorseli } from "../../../moduller/urun/vitrin-gorseli.ts";
import { siteninVergiServisi } from "../../../moduller/vergi/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kayitAdresleri } from "../../adresler.ts";
import { UrunKarti } from "../urun-karti.tsx";
import { urunKartlari } from "../veri.ts";

// Görseller gerçekten yeniden kodlanır.
vi.setConfig({ testTimeout: 60_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

// Vergi tablosu dolu deneme sitesi, mağaza Ankara'da: kartın fiyatı vergi metniyle gelir.
const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak No: 1",
      postaKodu: "06000",
    },
  },
};

const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
// Kartın metinleri ve uç çalışan siteden okunur.
beforeAll(() => {
  ortak[siteAnahtari] = site;
});
afterAll(() => {
  delete ortak[siteAnahtari];
});

const temizlenecekler: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const hazirla = async () => {
  const deneme = await denemeSitesiAc("urun-karti");
  const dosyaKlasoru = mkdtempSync(join(tmpdir(), "urun-karti-"));
  temizlenecekler.push(deneme.sil, () => rmSync(dosyaKlasoru, { recursive: true, force: true }));
  const vt = deneme.vt;
  const siniflar = await siteninVergiServisi(site).tabloyuOku(vt);
  const genel = siniflar.find((sinif) => sinif.ad === "Genel")?.kimlik ?? null;
  // Basit ürün: verilen durumda, fiyatı ve stoğuyla.
  const urunAc = async (
    girdi: { ad?: string; durum?: "yayinda" | "taslak" | "gizli" | "arsiv" } = {},
    // null: fiyatsız ürün.
    satisFiyati: number | null = 10_000,
    miktar = 5,
  ) => {
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: girdi.ad ?? `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: girdi.durum ?? "yayinda",
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    if (satisFiyati !== null) await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati });
    if (miktar > 0) {
      await stok.stokDuzelt(vt, yonetici(), birim, {
        yeniMiktar: miktar,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return { urun, birim };
  };
  const gorselEkle = async (urun: string, metin: string) => {
    const icerik = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 40, g: 90, b: 160 } },
    })
      .png()
      .toBuffer();
    const kayit = await gorselKaydet(vt, icerik, dosyaKlasoru);
    if (!kayit.tamam) throw new Error(kayit.hata);
    const oge = await urunler.galeriyeGorselEkle(vt, yonetici(), urun, {
      dosya: kayit.dosya.kimlik,
      alternatifMetin: metin,
    });
    return { oge, kayit };
  };
  const kartlar = (kimlikler: string[], yer: "liste" | "sayfa" = "liste", an?: Date) =>
    urunKartlari(vt, site, kimlikler, an === undefined ? { yer } : { yer, an });
  return { vt, dosyaKlasoru, urunAc, gorselEkle, kartlar };
};

const ciz = (kart: Parameters<typeof UrunKarti>[0]["urun"]) =>
  renderToStaticMarkup(<UrunKarti urun={kart} gorunum="dikey" islevler={yazilanIslevler} />);

describe("kartın verisi", () => {
  it("fiyat çekirdeğin fiyat aralığıyla birebir aynı; çizilen kartta yazılı tutar, eski fiyat ve vergi metni", async () => {
    const h = await hazirla();
    await siteninServisi(site).degistir(h.vt, yonetici(), { indirimdeEnDusukFiyat: false });
    const indirimli = await h.urunAc();
    await fiyat.fiyatYaz(h.vt, yonetici(), indirimli.birim, {
      satisFiyati: 29_990,
      indirimliFiyat: 22_500,
    });
    const duz = await h.urunAc({}, 123_456_789);
    const kimlikler = [indirimli.urun, duz.urun];
    const [kartlar, araliklar] = await Promise.all([
      h.kartlar(kimlikler),
      fiyatGosterimServisi(site).fiyatAraliklari(h.vt, kimlikler),
    ]);
    expect(kartlar.map((kart) => kart.fiyat)).toEqual(
      kimlikler.map((kimlik) => araliklar.get(kimlik)),
    );
    const [ilk, ikinci] = kartlar;
    if (ilk?.fiyat === undefined || ikinci?.fiyat === undefined) throw new Error("Fiyat yok.");
    const html = ciz(ilk);
    expect(html).toContain(`>${ilk.fiyat.enDusuk.yazili.tutar}</strong>`);
    expect(html).toContain(`>${ilk.fiyat.enDusuk.yazili.eskiTutar}</s>`);
    expect(html).toContain(ilk.fiyat.enDusuk.ekMetin);
    expect(ilk.fiyat.enDusuk.ekMetin).toBe("Deneme vergisi dahil");
    // 299,90'dan 225,00'a: yüzde 24,97 aşağı yuvarlanır.
    expect(html).toContain(">%24 indirim<");
    expect(ciz(ikinci)).toContain(`>${ikinci.fiyat.enDusuk.yazili.tutar}</strong>`);
  });

  it("varyantlı ürünün aralığı ve varan indirimi çekirdekten", async () => {
    const h = await hazirla();
    await siteninServisi(site).degistir(h.vt, yonetici(), { indirimdeEnDusukFiyat: false });
    const urun = await urunler.urunEkle(h.vt, yonetici(), {
      ad: "Varyantlı",
      vergiSinifi: null,
      durum: "yayinda",
    });
    await urunler.secenekEkle(h.vt, yonetici(), urun, { ad: "Beden", degerler: ["S", "M"] });
    const degerler = (await urunler.urunuOku(h.vt, urun))?.secenekler[0]?.degerler ?? [];
    const birimler = [];
    for (const deger of degerler) {
      const birim = await urunler.birlesimEkle(h.vt, yonetici(), urun, {
        degerler: [deger.kimlik],
      });
      await stok.stokDuzelt(h.vt, yonetici(), birim, {
        yeniMiktar: 3,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
      birimler.push(birim);
    }
    // 20000 → 14000 yüzde 30; ikinci birleşim indirimsiz 25000.
    await fiyat.fiyatYaz(h.vt, yonetici(), birimler[0] ?? "", {
      satisFiyati: 20_000,
      indirimliFiyat: 14_000,
    });
    await fiyat.fiyatYaz(h.vt, yonetici(), birimler[1] ?? "", { satisFiyati: 25_000 });
    const [kart] = await h.kartlar([urun]);
    expect(kart?.fiyat).toEqual(
      (await fiyatGosterimServisi(site).fiyatAraliklari(h.vt, [urun])).get(urun),
    );
    expect(kart?.fiyat?.tek).toBe(false);
    if (kart?.fiyat === undefined) throw new Error("Fiyat yok.");
    const html = ciz(kart);
    expect(html).toContain(
      `>${kart.fiyat.enDusuk.yazili.tutar} – ${kart.fiyat.enYuksek.yazili.tutar}</strong>`,
    );
    expect(html).toContain(">%30&#x27;a varan indirim<");
    expect(html).not.toContain("</s>");
  });

  it("stok durumu, marka, adres ve fiyatsız ürün", async () => {
    const h = await hazirla();
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Deneme Markası" });
    const markali = await h.urunAc({ ad: "Markalı" });
    await urunler.urunDegistir(h.vt, yonetici(), markali.urun, { marka });
    const tukenmis = await h.urunAc({}, 10_000, 0);
    const fiyatsiz = await h.urunAc({}, null);
    const [ilk, ikinci, ucuncu] = await h.kartlar([markali.urun, tukenmis.urun, fiyatsiz.urun]);
    const okunan = await urunler.urunuOku(h.vt, markali.urun);
    expect(ilk).toMatchObject({
      ad: "Markalı",
      marka: "Deneme Markası",
      adres: kayitAdresleri.urun(okunan?.adresAdi ?? ""),
      tukendi: false,
    });
    if (ikinci === undefined || ucuncu === undefined) throw new Error("Kart yok.");
    expect(ikinci.tukendi).toBe(true);
    expect(ciz(ikinci)).toContain(">Tükendi<");
    expect(ucuncu.fiyat).toBeUndefined();
    expect(ciz(ucuncu)).not.toContain('data-slot="fiyat"');
    // Silinen markanın adı kartta görünmez.
    await markaServisi.sil(h.vt, yonetici(), marka);
    expect((await h.kartlar([markali.urun]))[0]?.marka).toBeUndefined();
  });

  it("görünmeyen ürünün kartı yok; gizli yalnız sayfa yerinde; sıra verilen sıra; olmayan ve bozuk kimlik yok", async () => {
    const h = await hazirla();
    const yayinda = await h.urunAc();
    const taslak = await h.urunAc({ durum: "taslak" });
    const gizli = await h.urunAc({ durum: "gizli" });
    const arsiv = await h.urunAc({ durum: "arsiv" });
    const silinen = await h.urunAc();
    await urunler.urunSil(h.vt, yonetici(), silinen.urun);
    const ikinci = await h.urunAc();
    const istek = [
      ikinci.urun,
      taslak.urun,
      gizli.urun,
      randomUUID(),
      "bozuk",
      arsiv.urun,
      silinen.urun,
      yayinda.urun.toUpperCase(),
      ikinci.urun,
    ];
    expect((await h.kartlar(istek, "liste")).map((kart) => kart.kimlik)).toEqual([
      ikinci.urun,
      yayinda.urun,
    ]);
    expect((await h.kartlar(istek, "sayfa")).map((kart) => kart.kimlik)).toEqual([
      ikinci.urun,
      gizli.urun,
      yayinda.urun,
    ]);
  });

  it("zamanlanmış ürün yayın zamanından bir milisaniye önce yok, zamanında var", async () => {
    const h = await hazirla();
    const urun = await urunler.urunEkle(h.vt, yonetici(), {
      ad: "Zamanlanmış",
      vergiSinifi: null,
      durum: "zamanlanmis",
      yayinZamani: "2030-01-01T09:00",
    });
    // İstanbul saatiyle 09:00 = 06:00 UTC.
    const zaman = new Date("2030-01-01T06:00:00Z");
    expect(await h.kartlar([urun], "liste", new Date(zaman.getTime() - 1))).toEqual([]);
    expect((await h.kartlar([urun], "liste", zaman)).map((kart) => kart.kimlik)).toEqual([urun]);
  });

  it("görsel ana görseldir: kart boyutlarının adresleri genişlikleriyle ve alternatif metniyle; görselsiz üründe yok", async () => {
    const h = await hazirla();
    const gorselli = await h.urunAc();
    const { oge } = await h.gorselEkle(gorselli.urun, "Mavi kare");
    await h.gorselEkle(gorselli.urun, "İkinci görsel");
    const gorselsiz = await h.urunAc();
    const [ilk, ikinci] = await h.kartlar([gorselli.urun, gorselsiz.urun]);
    expect(ilk?.gorsel).toEqual({
      alternatifMetin: "Mavi kare",
      kaynaklar: [
        { adres: urunGorseliAdresi(oge, "kucuk"), genislik: gorselBoyutlari.kucuk },
        { adres: urunGorseliAdresi(oge, "orta"), genislik: gorselBoyutlari.orta },
        { adres: urunGorseliAdresi(oge, "buyuk"), genislik: gorselBoyutlari.buyuk },
      ],
      genislik: gorselBoyutlari.orta,
      yukseklik: (gorselBoyutlari.orta * 900) / 1200,
    });
    expect(ikinci?.gorsel).toBeUndefined();
    if (ilk === undefined) throw new Error("Kart yok.");
    const html = ciz(ilk);
    expect(html).toContain('alt="Mavi kare"');
    expect(html).toContain(`${urunGorseliAdresi(oge, "buyuk").replaceAll("&", "&amp;")} 960w`);
  });

  it("sorgu sayısı ürün sayısıyla artmaz", async () => {
    const h = await hazirla();
    const liste = [];
    for (let i = 0; i < 4; i += 1) {
      const { urun } = await h.urunAc();
      await h.gorselEkle(urun, `Görsel ${i}`);
      liste.push(urun);
    }
    // İlk okuma mağaza ayarlarının başlangıç değerini yazar; sayım ondan sonradır.
    await h.kartlar(liste);
    const say = async (kimlikler: string[]) => {
      const sorgu = vi.spyOn(h.vt.$client, "query");
      await h.kartlar(kimlikler);
      const sayi = sorgu.mock.calls.length;
      sorgu.mockRestore();
      return sayi;
    };
    expect(await say(liste)).toBe(await say(liste.slice(0, 1)));
  });
});

describe("ürün görseli ucu", () => {
  const adres = (oge: string, boyut: string) =>
    `http://magaza.ornek.test/kapi/herkese-acik/urun-gorseli?o=${oge}&b=${boyut}`;

  // Uç çalışan sitenin veritabanını ve dosya klasörünü ortam değişkeninden okur.
  const ucuBagla = async (h: { dosyaKlasoru: string }, vtAdresi: string) => {
    vi.stubEnv("VERITABANI_ADRESI", vtAdresi);
    vi.stubEnv("DOSYA_KLASORU", h.dosyaKlasoru);
    await baglantiyiKapat();
  };

  it("sayfası açılan ürünün görselinin boyutunu dosyanın kendisi olarak verir; özgün görsel verilmez", async () => {
    const deneme = await denemeSitesiAc("urun-gorseli");
    temizlenecekler.push(deneme.sil);
    const h = await hazirlaVt(deneme.vt);
    await ucuBagla(h, deneme.baglantiAdresi);
    const { urun } = await h.urunAc({ durum: "gizli" });
    const { oge, kayit } = await h.gorselEkle(urun, "Görsel");
    const yanit = await urunGorseliUcu(new Request(adres(oge, "orta")));
    expect(yanit.status).toBe(200);
    // Bir sayfa onlarca görsel ister: genel sınır değil görsel sınırı.
    expect(urunGorseliUcu.tanim.sinir).toBe("gorsel");
    expect(yanit.headers.get("content-type")).toBe("image/webp");
    expect(yanit.headers.get("x-content-type-options")).toBe("nosniff");
    const govde = Buffer.from(await yanit.arrayBuffer());
    const beklenen = await dosyaOku(h.vt, kayit.boyutlar.orta.kimlik, h.dosyaKlasoru);
    expect(govde.equals(beklenen?.icerik ?? Buffer.alloc(0))).toBe(true);
    const etiket = yanit.headers.get("etag") ?? "";
    const ayni = await urunGorseliUcu(
      new Request(adres(oge, "orta"), { headers: { "if-none-match": etiket } }),
    );
    expect(ayni.status).toBe(304);
    // Galeri öğesinin yerine dosyanın kimliği verilirse görsel yoktur.
    expect((await urunGorseliUcu(new Request(adres(kayit.dosya.kimlik, "orta")))).status).toBe(404);
  });

  it("taslak, arşiv, silinmiş ürün, silinmiş öğe, video ve olmayan öğe 404; bozuk girdi 400", async () => {
    const deneme = await denemeSitesiAc("urun-gorseli");
    temizlenecekler.push(deneme.sil);
    const h = await hazirlaVt(deneme.vt);
    await ucuBagla(h, deneme.baglantiAdresi);
    const durum = async (oge: string, boyut = "kucuk") =>
      (await urunGorseliUcu(new Request(adres(oge, boyut)))).status;

    const taslak = await h.urunAc({ durum: "taslak" });
    expect(await durum((await h.gorselEkle(taslak.urun, "G")).oge)).toBe(404);
    const arsiv = await h.urunAc({ durum: "arsiv" });
    expect(await durum((await h.gorselEkle(arsiv.urun, "G")).oge)).toBe(404);

    const silinecek = await h.urunAc();
    const silinecekOge = (await h.gorselEkle(silinecek.urun, "G")).oge;
    expect(await durum(silinecekOge)).toBe(200);
    await urunler.urunSil(h.vt, yonetici(), silinecek.urun);
    expect(await durum(silinecekOge)).toBe(404);

    const yayinda = await h.urunAc();
    const silinenOge = (await h.gorselEkle(yayinda.urun, "G")).oge;
    const kalanOge = (await h.gorselEkle(yayinda.urun, "G2")).oge;
    await urunler.galeriOgesiSil(h.vt, yonetici(), silinenOge);
    expect(await durum(silinenOge)).toBe(404);
    expect(await durum(kalanOge, "tam")).toBe(200);
    const video = await urunler.galeriyeVideoEkle(h.vt, yonetici(), yayinda.urun, {
      adres: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      alternatifMetin: "Video",
    });
    expect(await durum(video)).toBe(404);
    expect(await durum(randomUUID())).toBe(404);

    expect(await durum("bozuk")).toBe(400);
    expect(await durum(kalanOge, "ozgun")).toBe(400);
    const fazla = await urunGorseliUcu(new Request(`${adres(kalanOge, "orta")}&yol=../x`));
    expect(fazla.status).toBe(400);
  });

  // Bağımsız kontrolün bulguları: büyük harfli kimlik, tek boyutun ya da kaynağın silinmesi, diskte olmayan
  // dosya.
  it("büyük harfli kimlik geçer; silinen boyut ve kaynak 404; diskte olmayan dosya 404 ve hata bir kez", async () => {
    const h = await hazirla();
    const { urun } = await h.urunAc();
    const { oge, kayit } = await h.gorselEkle(urun, "G");
    const oku = (kimlik: string, boyut: "kucuk" | "orta" | "buyuk") =>
      vitrinGorseli(h.vt, site, kimlik, boyut, { klasor: h.dosyaKlasoru });
    expect((await oku(oge.toUpperCase(), "orta"))?.mime).toBe("image/webp");
    await dosyaSil(h.vt, kayit.boyutlar.orta.kimlik);
    expect(await oku(oge, "orta")).toBeUndefined();
    expect((await oku(oge, "kucuk"))?.mime).toBe("image/webp");
    // Diskten silinen boyut: görsel yok, hata yalnız ilk istekte kaydedilir.
    const ad = readdirSync(h.dosyaKlasoru).find((dosya) =>
      dosya.startsWith(kayit.boyutlar.buyuk.kimlik),
    );
    rmSync(join(h.dosyaKlasoru, ad ?? ""));
    const kayitlar = vi.spyOn(gunluk, "hata");
    expect(await oku(oge, "buyuk")).toBeUndefined();
    expect(await oku(oge, "buyuk")).toBeUndefined();
    expect(kayitlar).toHaveBeenCalledTimes(1);
    kayitlar.mockRestore();
    await dosyaSil(h.vt, kayit.dosya.kimlik);
    expect(await oku(oge, "kucuk")).toBeUndefined();
  });

  it("servis görünmeyen ürünün görselini zamanından önce vermez", async () => {
    const h = await hazirla();
    const urun = await urunler.urunEkle(h.vt, yonetici(), {
      ad: "Zamanlanmış",
      vergiSinifi: null,
      durum: "zamanlanmis",
      yayinZamani: "2030-01-01T09:00",
    });
    const { oge } = await h.gorselEkle(urun, "G");
    const zaman = new Date("2030-01-01T06:00:00Z");
    const oku = (an: Date) =>
      vitrinGorseli(h.vt, site, oge, "orta", { an, klasor: h.dosyaKlasoru });
    expect(await oku(new Date(zaman.getTime() - 1))).toBeUndefined();
    expect((await oku(zaman))?.mime).toBe("image/webp");
  });
});

// Uç testleri sitenin kendi veritabanını açar: yardımcılar aynı veritabanını kullanır.
async function hazirlaVt(vt: Veritabani) {
  const dosyaKlasoru = mkdtempSync(join(tmpdir(), "urun-gorseli-"));
  temizlenecekler.push(() => rmSync(dosyaKlasoru, { recursive: true, force: true }));
  const urunAc = async (girdi: { durum?: "yayinda" | "taslak" | "gizli" | "arsiv" } = {}) => {
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: null,
      durum: girdi.durum ?? "yayinda",
    });
    return { urun };
  };
  const gorselEkle = async (urun: string, metin: string) => {
    const icerik = await sharp({
      create: { width: 600, height: 600, channels: 3, background: { r: 200, g: 60, b: 40 } },
    })
      .png()
      .toBuffer();
    const kayit = await gorselKaydet(vt, icerik, dosyaKlasoru);
    if (!kayit.tamam) throw new Error(kayit.hata);
    const oge = await urunler.galeriyeGorselEkle(vt, yonetici(), urun, {
      dosya: kayit.dosya.kimlik,
      alternatifMetin: metin,
    });
    return { oge, kayit };
  };
  return { vt, dosyaKlasoru, urunAc, gorselEkle };
}
