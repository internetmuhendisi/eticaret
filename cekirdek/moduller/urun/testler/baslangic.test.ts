// Başlangıç kataloğu gerçek veritabanıyla (kart 0084): boş veritabanında servislerle bir kez yazılması,
// ikinci çalıştırmanın ve kurulu kataloğun (silinmiş satır dahil) hiçbir şey değiştirmemesi, aynı anda
// iki sürecin tek yazımı, bir parça yazılamayınca hiçbir parçanın kalmaması, değişiklik kaydı ile fiyat
// ve stok geçmişi. Örnek katalog cekirdek/ayar-semasi/testler/ornek-siteler/katalog-dolu klasöründedir;
// sitelerin kendi kataloğunun durumları sitenin testindedir (siteler/<kod-adi>/testler/).
import { randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { count, eq, isNull, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyaBoyutlari, dosyalar } from "../../dosya/model.ts";
import { gorselHazirMi } from "../../dosya/servis.ts";
import { etiketler } from "../../etiket/model.ts";
import { birimFiyatlari, fiyatGecmisi } from "../../fiyat/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriEkle, kategorileriOku } from "../../kategori/servis.ts";
import { markalar } from "../../marka/model.ts";
import { ozellikler, urunOzellikDegerleri } from "../../ozellik/model.ts";
import { ozellikServisi } from "../../ozellik/servis.ts";
import { birimStoklari, stokGecmisi } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { baslangicKatalogYazari, katalogBaslangiciniKur } from "../baslangic.ts";
import { bosKatalog, type KatalogBaslangici } from "../baslangic-semasi.ts";
import { ilgiliUrunleriGetir, ilgiliUrunSiniri } from "../ilgili.ts";
import { urunListesi } from "../liste.ts";
import { urunBirimleri, urunGalerisi, urunler, urunSecenekleri } from "../model.ts";
import { siteninUrunServisi } from "../servis.ts";

// Görseller ve boyutları gerçekten yeniden kodlanır: yüklü kontrol hattında bir test birkaç saniye
// sürebilir.
vi.setConfig({ testTimeout: 60_000 });

const ornekSite = siteKlasorunuOku(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "ayar-semasi",
    "testler",
    "ornek-siteler",
    "katalog-dolu",
  ),
);
const katalogla = (degistir: (katalog: KatalogBaslangici) => void): Site => {
  const katalog = structuredClone(ornekSite.katalogBaslangici);
  degistir(katalog);
  return { ...ornekSite, katalogBaslangici: katalog };
};
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("katalog");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const tablolar = {
  urunler,
  urunBirimleri,
  kategoriler,
  markalar,
  etiketler,
  birimFiyatlari,
  fiyatGecmisi,
  birimStoklari,
  stokGecmisi,
  degisiklikKayitlari,
  ozellikler,
  urunOzellikDegerleri,
  urunSecenekleri,
};
const sayilar = async (vt: Veritabani) =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(tablolar).map(async ([ad, tablo]) => {
        const [satir] = await vt.select({ sayi: count() }).from(tablo);
        return [ad, satir?.sayi ?? 0] as const;
      }),
    ),
  );
const bos = Object.fromEntries(Object.keys(tablolar).map((ad) => [ad, 0]));

const urunKimligi = async (vt: Veritabani, adresAdi: string) => {
  const [satir] = await vt
    .select({ kimlik: urunler.kimlik })
    .from(urunler)
    .where(eq(urunler.adres_adi, adresAdi));
  if (satir === undefined) throw new Error(`${adresAdi} yok.`);
  return satir.kimlik;
};

describe("boş veritabanında", () => {
  it("katalog servislerle yazılır: bağlantılar, fiyat, stok, vergi sınıfı", async () => {
    const vt = await siteAc();
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(true);

    const kategoriListesi = await kategorileriOku(vt);
    expect(kategoriListesi.map((k) => [k.ad, k.adresAdi])).toEqual([
      ["Birinci Bölüm", "birinci"],
      ["İkinci Bölüm", "ikinci"],
    ]);
    const urunServisi = siteninUrunServisi(ornekSite);
    const ana = await urunServisi.urunuOku(vt, await urunKimligi(vt, "deneme-urunu"));
    const vergisiz = await urunServisi.urunuOku(vt, await urunKimligi(vt, "vergisiz-urun"));
    if (ana === undefined || vergisiz === undefined) throw new Error("Ürün okunamadı.");
    const genel = (await siteninVergiServisi(ornekSite).tabloyuOku(vt)).find(
      (s) => s.ad === "Genel",
    );
    expect(ana).toMatchObject({
      ad: "Deneme Ürünü",
      durum: "yayinda",
      vergiSinifi: genel?.kimlik,
      kategoriler: kategoriListesi.map((k) => k.kimlik).toSorted(),
      ilgiliUrunler: [vergisiz.kimlik],
    });
    expect(ana.marka).not.toBeNull();
    expect(ana.etiketler).toHaveLength(1);
    expect(vergisiz).toMatchObject({ durum: "taslak", vergiSinifi: null, stokTakibi: false });

    const birim = ana.birimler[0]?.kimlik ?? "";
    expect(await siteninFiyatServisi(ornekSite).fiyatOku(vt, birim)).toMatchObject({
      satisFiyati: 1000,
      indirimliFiyat: 800,
      paraBirimi: "XTS",
    });
    expect((await stokServisi().stoklariOku(vt, [birim])).get(birim)).toEqual({
      miktar: 3,
      takip: true,
    });
    const [gecmis] = await vt.select().from(stokGecmisi);
    expect(gecmis).toMatchObject({ onceki_miktar: 0, sonraki_miktar: 3, sebep: "yeni-mal" });

    // Fiyatsız ve stoksuz ürünün fiyatı ve stok satırı yoktur.
    const vergisizBirim = vergisiz.birimler[0]?.kimlik ?? "";
    expect(await siteninFiyatServisi(ornekSite).fiyatOku(vt, vergisizBirim)).toBeUndefined();
    expect(await sayilar(vt)).toMatchObject({ birimFiyatlari: 1, fiyatGecmisi: 1, stokGecmisi: 1 });
  });

  it("her yazım değişiklik kaydına başlangıç kataloğu adıyla girer", async () => {
    const vt = await siteAc();
    await katalogBaslangiciniKur(vt, ornekSite);
    const kayitlar = await vt.select().from(degisiklikKayitlari);
    const katalogKayitlari = kayitlar.filter((k) => k.kim_adi === "baslangic-katalog");
    expect(baslangicKatalogYazari).toEqual({ tur: "sistem", ad: "baslangic-katalog" });
    expect(katalogKayitlari.map((k) => k.islem).toSorted()).toEqual(
      [
        "etiket.eklendi",
        "fiyat.degisti",
        "kategori.eklendi",
        "kategori.eklendi",
        "marka.eklendi",
        "stok.duzeltildi",
        "urun.degisti",
        "urun.eklendi",
        "urun.eklendi",
      ].toSorted(),
    );
    // Geri kalan kayıtlar vergi tablosunun başlangıcıdır (karar 0060).
    expect(
      kayitlar
        .filter((k) => k.kim_adi !== "baslangic-katalog")
        .every((k) => k.islem === "vergi.baslangic"),
    ).toBe(true);
  });

  it("boş katalog hiçbir şey yazmaz", async () => {
    const vt = await siteAc();
    expect(
      await katalogBaslangiciniKur(vt, { ...ornekSite, katalogBaslangici: bosKatalog() }),
    ).toBe(false);
    expect(await sayilar(vt)).toEqual(bos);
  });
});

describe("bir kez", () => {
  it("ikinci çalıştırma hiçbir şey değiştirmez", async () => {
    const vt = await siteAc();
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(true);
    const once = await sayilar(vt);
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(false);
    expect(await sayilar(vt)).toEqual(once);
  });

  it("kurulu katalog yazılmaz: yalnız bir kategori, ya da silinmiş tek ürün", async () => {
    const kategorili = await siteAc();
    await kategoriEkle(kategorili, yonetici(), { ad: "Elle açılan" });
    expect(await katalogBaslangiciniKur(kategorili, ornekSite)).toBe(false);
    expect(await sayilar(kategorili)).toMatchObject({ urunler: 0, kategoriler: 1 });

    const silinmis = await siteAc();
    const servis = siteninUrunServisi(ornekSite);
    const kimlik = await servis.urunEkle(silinmis, yonetici(), {
      ad: "Silinecek",
      vergiSinifi: null,
    });
    await servis.urunSil(silinmis, yonetici(), kimlik);
    expect(await katalogBaslangiciniKur(silinmis, ornekSite)).toBe(false);
    expect(await sayilar(silinmis)).toMatchObject({ urunler: 1, kategoriler: 0, markalar: 0 });
  });

  it("panelden açılmakta olan kategori kataloğa karışmaz: kurulu mu sorusu kilitlerden sonra", async () => {
    const vt = await siteAc();
    let hazir: () => void = () => {};
    let birak: () => void = () => {};
    const kategoriYazildi = new Promise<void>((coz) => {
      hazir = coz;
    });
    const bitir = new Promise<void>((coz) => {
      birak = coz;
    });
    // Panelin işlemi kategoriyi yazmış, henüz kaydetmemiş.
    const panel = vt.transaction(async (islem) => {
      await kategoriEkle(islem, yonetici(), { ad: "Panelden" });
      hazir();
      await bitir;
    });
    await kategoriYazildi;
    const katalog = katalogBaslangiciniKur(vt, ornekSite);
    // Katalog kilitte bekler; panel o arada kaydeder.
    await new Promise((coz) => setTimeout(coz, 500));
    birak();
    await panel;
    expect(await katalog).toBe(false);
    expect(await sayilar(vt)).toMatchObject({ kategoriler: 1, urunler: 0, markalar: 0 });
  });

  it("aynı anda açılan iki süreçten yalnız biri yazar", async () => {
    const vt = await siteAc();
    const sonuclar = await Promise.all([
      katalogBaslangiciniKur(vt, ornekSite),
      katalogBaslangiciniKur(vt, ornekSite),
      katalogBaslangiciniKur(vt, ornekSite),
    ]);
    expect(sonuclar.filter(Boolean)).toHaveLength(1);
    expect(await sayilar(vt)).toMatchObject({
      urunler: 2,
      kategoriler: 2,
      markalar: 1,
      etiketler: 1,
    });
  });
});

describe("yarım katalog kalmaz", () => {
  it("bir ürün yazılamazsa (aynı stok kodu) hiçbir parça yazılmaz, sonra yeniden denenebilir", async () => {
    const vt = await siteAc();
    const bozuk = katalogla((katalog) => {
      for (const urun of katalog.urunler) urun.stokKodu = "AYNI-KOD";
    });
    await expect(katalogBaslangiciniKur(vt, bozuk)).rejects.toMatchObject({ kod: "cakisma" });
    expect(await sayilar(vt)).toEqual(bos);
    expect(await katalogBaslangiciniKur(vt, ornekSite)).toBe(true);
  });

  it("son adım (ilgili ürünler) yazılamazsa da hiçbir parça kalmaz", async () => {
    const vt = await siteAc();
    const bozuk = katalogla((katalog) => {
      const [ilk] = katalog.urunler;
      // Şemayı atlayan bir girdi: servis de reddeder (site doğrulaması bunu dosyada yakalar).
      if (ilk !== undefined) ilk.ilgiliUrunler = [ilk.adresAdi];
    });
    await expect(katalogBaslangiciniKur(vt, bozuk)).rejects.toMatchObject({ kod: "dogrulama" });
    expect(await sayilar(vt)).toEqual(bos);
  });

  it("vergi sınıfı veritabanında yoksa (silinmiş) hiçbir parça yazılmaz", async () => {
    const vt = await siteAc();
    const vergi = siteninVergiServisi(ornekSite);
    const [genel] = await vergi.tabloyuOku(vt);
    if (genel === undefined) throw new Error("Vergi sınıfı yok.");
    await vergi.sinifSil(vt, yonetici(), genel.kimlik);
    const once = await sayilar(vt);
    await expect(katalogBaslangiciniKur(vt, ornekSite)).rejects.toThrow(/vergi sınıfı yok: Genel/);
    expect(await sayilar(vt)).toEqual(once);
    expect(once).toMatchObject({ urunler: 0, kategoriler: 0 });
  });
});

// Galeri görselleri (kart 0087): örnek katalog görselsizdir; bu testler kataloğa geçici klasörde
// üretilmiş görseller ve bir video ekler.
describe("galeri görselleri", () => {
  const temizlenecekler: string[] = [];
  afterEach(() => {
    for (const klasor of temizlenecekler.splice(0))
      rmSync(klasor, { recursive: true, force: true });
  });
  const klasorAc = () => {
    const klasor = mkdtempSync(join(tmpdir(), "katalog-galeri-"));
    temizlenecekler.push(klasor);
    return klasor;
  };
  // İki görsel ve bir video; ilk ürüne iki görsel, ikincisine aynı ilk görsel ve video.
  const galerili = async (degistir: (katalog: KatalogBaslangici) => void = () => {}) => {
    const kaynak = klasorAc();
    const katalogGorselleri: Record<string, string> = {};
    for (const [ad, renk] of [
      ["bir.png", { r: 200, g: 0, b: 0 }],
      ["iki.png", { r: 0, g: 200, b: 0 }],
    ] as const) {
      const yol = join(kaynak, ad);
      writeFileSync(
        yol,
        await sharp({ create: { width: 600, height: 400, channels: 3, background: renk } })
          .png()
          .toBuffer(),
      );
      katalogGorselleri[ad] = yol;
    }
    const site = katalogla((katalog) => {
      const [ilk, ikinci] = katalog.urunler;
      if (ilk === undefined || ikinci === undefined) throw new Error("İki ürün beklenirdi.");
      ilk.galeri = [
        { gorsel: "bir.png", alternatifMetin: "Bir" },
        { gorsel: "iki.png", alternatifMetin: "İki" },
      ];
      ikinci.galeri = [
        { video: "https://youtu.be/aqz-KE-bpKQ", alternatifMetin: "Video" },
        { gorsel: "bir.png", alternatifMetin: "Aynı görsel" },
      ];
      degistir(katalog);
    });
    return { ...site, katalogGorselleri };
  };
  const silinmemisDosyalar = async (vt: Veritabani) =>
    (await vt.select({ sayi: count() }).from(dosyalar).where(isNull(dosyalar.silinme_zamani)))[0]
      ?.sayi;
  // İki görsel, her biri kayıttaki dört boyutuyla.
  const dosyaSayisi = 2 * 5;

  it("görseller boyutlarıyla kaydedilir, galeriler sırasıyla bağlanır; aynı görsel bir kez kaydedilir", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const site = await galerili();
    expect(await katalogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
    expect(await silinmemisDosyalar(vt)).toBe(dosyaSayisi);
    expect(readdirSync(klasor)).toHaveLength(dosyaSayisi);
    expect((await vt.select({ sayi: count() }).from(dosyaBoyutlari))[0]?.sayi).toBe(8);
    const servis = siteninUrunServisi(site);
    const galeriler = [];
    for (const urun of site.katalogBaslangici.urunler) {
      const [satir] = await vt
        .select({ kimlik: urunler.kimlik })
        .from(urunler)
        .where(eq(urunler.adres_adi, urun.adresAdi));
      galeriler.push((await servis.urunuOku(vt, satir?.kimlik ?? ""))?.galeri ?? []);
    }
    expect(galeriler.map((g) => g.map((o) => [o.tur, o.alternatifMetin]))).toEqual([
      [
        ["gorsel", "Bir"],
        ["gorsel", "İki"],
      ],
      [
        ["video", "Video"],
        ["gorsel", "Aynı görsel"],
      ],
    ]);
    const [ilk] = galeriler[0] ?? [];
    const ayni = galeriler[1]?.[1];
    expect(ilk?.tur === "gorsel" && ayni?.tur === "gorsel" && ilk.dosya === ayni.dosya).toBe(true);
    const kayit = await vt
      .select({ kim: degisiklikKayitlari.kim_adi })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.islem, "urun-galerisi.eklendi"));
    expect(kayit).toHaveLength(4);
    for (const satir of kayit) expect(satir.kim).toBe("baslangic-katalog");
  });

  it("birleşim kendi görselini galeriden seçer; seçmeyen birleşimin görseli yoktur (kart 0100)", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const site = await galerili((katalog) => {
      const ilk = katalog.urunler[0];
      if (ilk === undefined) throw new Error("Ürün yok.");
      ilk.fiyat = undefined;
      ilk.stok = undefined;
      ilk.secenekler = [{ ad: "Renk", degerler: ["Kırmızı", "Yeşil", "Sarı"] }];
      ilk.birlesimler = [
        { degerler: ["Kırmızı"], gorsel: "bir.png" },
        { degerler: ["Yeşil"], gorsel: "iki.png" },
        { degerler: ["Sarı"] },
      ];
    });
    expect(await katalogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
    const urun = await siteninUrunServisi(site).urunuOku(vt, await urunKimligi(vt, "deneme-urunu"));
    if (urun === undefined) throw new Error("Ürün okunamadı.");
    const metni = new Map(urun.galeri.map((oge) => [oge.kimlik, oge.alternatifMetin]));
    expect(
      urun.birimler.filter((b) => !b.silindi).map((b) => b.gorsel && metni.get(b.gorsel)),
    ).toEqual(["Bir", "İki", undefined]);
  });

  it("kategorinin görseli boyutlarıyla kaydedilir ve kategoriye bağlanır; görselsiz kategori boş kalır (kart 0115)", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const site = await galerili((katalog) => {
      const [ilk] = katalog.kategoriler;
      if (ilk === undefined) throw new Error("Kategori beklenirdi.");
      ilk.gorsel = "iki.png";
      katalog.kategoriler.push({ ad: "Görselsiz", adresAdi: "gorselsiz" });
    });
    expect(await katalogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
    const okunan = await kategorileriOku(vt);
    const ilkAdi = site.katalogBaslangici.kategoriler[0]?.adresAdi;
    const gorselli = okunan.find((k) => k.adresAdi === ilkAdi);
    expect(await vt.transaction((i) => gorselHazirMi(i, gorselli?.gorsel ?? ""))).toBe("hazir");
    expect(okunan.find((k) => k.adresAdi === "gorselsiz")?.gorsel).toBeUndefined();
    // Galerideki ve kategorideki aynı dosya bir kez kaydedilir.
    expect(await silinmemisDosyalar(vt)).toBe(dosyaSayisi);
  });

  it("yalnız kategoride kullanılan görsel de kaydedilir; katalog yazılamazsa silinmiş işaretlenir (kart 0115)", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const bozuk = await galerili((katalog) => {
      for (const urun of katalog.urunler) {
        urun.galeri = [];
        urun.stokKodu = "AYNI-KOD";
      }
      const [ilk] = katalog.kategoriler;
      if (ilk === undefined) throw new Error("Kategori beklenirdi.");
      ilk.gorsel = "iki.png";
    });
    await expect(katalogBaslangiciniKur(vt, bozuk, () => klasor)).rejects.toMatchObject({
      kod: "cakisma",
    });
    expect((await vt.select({ sayi: count() }).from(dosyalar))[0]?.sayi).toBe(5);
    expect(await silinmemisDosyalar(vt)).toBe(0);
  });

  it("kurulu katalogda görsel kaydedilmez", async () => {
    const vt = await siteAc();
    await kategoriEkle(vt, yonetici(), { ad: "Elle açılan" });
    const klasor = klasorAc();
    expect(await katalogBaslangiciniKur(vt, await galerili(), () => klasor)).toBe(false);
    expect((await vt.select({ sayi: count() }).from(dosyalar))[0]?.sayi).toBe(0);
    expect(readdirSync(klasor)).toEqual([]);
  });

  it("katalog yazılamazsa galeri kalmaz, kaydedilen görseller ve boyutları silinmiş işaretlenir", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const bozuk = await galerili((katalog) => {
      for (const urun of katalog.urunler) urun.stokKodu = "AYNI-KOD";
    });
    await expect(katalogBaslangiciniKur(vt, bozuk, () => klasor)).rejects.toMatchObject({
      kod: "cakisma",
    });
    expect(await sayilar(vt)).toEqual(bos);
    expect(await vt.select().from(urunGalerisi)).toEqual([]);
    expect((await vt.select({ sayi: count() }).from(dosyalar))[0]?.sayi).toBe(dosyaSayisi);
    expect(await silinmemisDosyalar(vt)).toBe(0);
    // Düzeltilen katalog yeniden kurulur, görselleri yeniden kaydeder.
    expect(await katalogBaslangiciniKur(vt, await galerili(), () => klasor)).toBe(true);
    expect(await silinmemisDosyalar(vt)).toBe(dosyaSayisi);
  });

  it("görselli birleşim yazılamazsa (aynı stok kodu) ne birleşim, ne seçenek, ne galeri kalır (kart 0100)", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const bozuk = await galerili((katalog) => {
      const ilk = katalog.urunler[0];
      if (ilk === undefined) throw new Error("Ürün yok.");
      ilk.fiyat = undefined;
      ilk.stok = undefined;
      ilk.secenekler = [{ ad: "Renk", degerler: ["Kırmızı", "Yeşil"] }];
      ilk.birlesimler = [
        { degerler: ["Kırmızı"], gorsel: "bir.png", stokKodu: "AYNI-KOD" },
        { degerler: ["Yeşil"], gorsel: "iki.png", stokKodu: "AYNI-KOD" },
      ];
    });
    await expect(katalogBaslangiciniKur(vt, bozuk, () => klasor)).rejects.toMatchObject({
      kod: "cakisma",
    });
    expect(await sayilar(vt)).toEqual(bos);
    expect(await vt.select().from(urunGalerisi)).toEqual([]);
    expect(await silinmemisDosyalar(vt)).toBe(0);
  });

  it("görsel kaydedilemezse (içi bozuk) katalog yazılmaz, önceki görsel silinmiş işaretlenir", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const site = await galerili();
    // İmzası PNG, devamı değil: dosya deposu yeniden kodlayamaz.
    writeFileSync(
      site.katalogGorselleri["iki.png"] ?? "",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]),
    );
    await expect(katalogBaslangiciniKur(vt, site, () => klasor)).rejects.toThrow(
      /iki\.png \(bozuk\)/,
    );
    expect(await sayilar(vt)).toEqual(bos);
    expect(await silinmemisDosyalar(vt)).toBe(0);
  });

  it("aynı anda üç çağrıdan biri yazar; ötekilerin kaydettiği görseller silinmiş işaretlenir", async () => {
    const vt = await siteAc();
    const klasor = klasorAc();
    const site = await galerili();
    const sonuclar = await Promise.all([
      katalogBaslangiciniKur(vt, site, () => klasor),
      katalogBaslangiciniKur(vt, site, () => klasor),
      katalogBaslangiciniKur(vt, site, () => klasor),
    ]);
    expect(sonuclar.filter(Boolean)).toHaveLength(1);
    expect(await silinmemisDosyalar(vt)).toBe(dosyaSayisi);
    const bagli = await vt
      .select({ dosya: urunGalerisi.dosya_kimligi })
      .from(urunGalerisi)
      .innerJoin(dosyalar, eq(dosyalar.kimlik, urunGalerisi.dosya_kimligi))
      .where(isNull(dosyalar.silinme_zamani));
    expect(bagli).toHaveLength(3);
  });
});

// Özellikler ve varyantlar (kart 0100): örnek katalog ikisini de taşımaz; bu testler ekler. İlk ürün
// iki seçenekli (Beden: S, M; Renk: Kırmızı, Mavi) dört birleşimli olur, ikinci ürün basit kalır.
const ozellikliVaryantli = (degistir: (katalog: KatalogBaslangici) => void = () => {}) =>
  katalogla((katalog) => {
    const [ilk, ikinci] = katalog.urunler;
    if (ilk === undefined || ikinci === undefined) throw new Error("İki ürün beklenirdi.");
    katalog.ozellikler = [
      { ad: "Kumaş", tur: "liste", filtrede: false, secenekler: ["Pamuk", "Keten"] },
      { ad: "Gramaj", tur: "sayi", birim: "g/m²", filtrede: false },
      { ad: "Yıkanır", tur: "evet-hayir", filtrede: false },
      { ad: "Not", tur: "metin", filtrede: false },
    ];
    ilk.fiyat = undefined;
    ilk.stok = undefined;
    ilk.ozellikler = [
      { ozellik: "Kumaş", deger: "Pamuk" },
      { ozellik: "Gramaj", deger: 180.5 },
      { ozellik: "Yıkanır", deger: true },
      { ozellik: "Not", deger: "Ters yıkayın" },
    ];
    ilk.secenekler = [
      { ad: "Beden", degerler: ["S", "M"] },
      { ad: "Renk", degerler: ["Kırmızı", "Mavi"] },
    ];
    ilk.birlesimler = [
      ["S", "Kırmızı"],
      ["M", "Kırmızı"],
      ["S", "Mavi"],
      ["M", "Mavi"],
    ].map((degerler, i) => ({
      degerler,
      stokKodu: `VRY-${i}`,
      fiyat: {
        satisFiyati: 1000 + i,
        indirimliFiyat: null,
        indirimBaslangici: null,
        indirimBitisi: null,
      },
      ...(i === 1 ? {} : { stok: i + 1 }),
    }));
    ikinci.ozellikler = [{ ozellik: "Kumaş", deger: "Keten" }];
    degistir(katalog);
  });

describe("özellikler ve varyantlar (kart 0100)", () => {
  it("özellikler tanımlarıyla, ürünün değerleri türleriyle yazılır; liste değeri seçeneğe bağlanır", async () => {
    const vt = await siteAc();
    const site = ozellikliVaryantli();
    expect(await katalogBaslangiciniKur(vt, site)).toBe(true);
    const tanimlar = await ozellikServisi.hepsiniOku(vt);
    expect(tanimlar.map((t) => [t.ad, t.tur, t.birim, t.secenekler.map((s) => s.ad)])).toEqual([
      ["Kumaş", "liste", undefined, ["Pamuk", "Keten"]],
      ["Gramaj", "sayi", "g/m²", []],
      ["Yıkanır", "evet-hayir", undefined, []],
      ["Not", "metin", undefined, []],
    ]);
    const [kumas, gramaj, yikanir, not] = tanimlar;
    const secenek = (ad: string) => kumas?.secenekler.find((s) => s.ad === ad)?.kimlik;
    const servis = siteninUrunServisi(site);
    const ilk = await servis.urunuOku(vt, await urunKimligi(vt, "deneme-urunu"));
    const ikinci = await servis.urunuOku(vt, await urunKimligi(vt, "vergisiz-urun"));
    expect(ilk?.ozellikler).toEqual([
      { ozellik: kumas?.kimlik, deger: secenek("Pamuk") },
      { ozellik: gramaj?.kimlik, deger: 180.5 },
      { ozellik: yikanir?.kimlik, deger: true },
      { ozellik: not?.kimlik, deger: "Ters yıkayın" },
    ]);
    expect(ikinci?.ozellikler).toEqual([{ ozellik: kumas?.kimlik, deger: secenek("Keten") }]);
    // Bir değere sahip ürünler tek sorguyla (filtrenin temeli).
    const ketenli = await ozellikServisi.urunleri(vt, kumas?.kimlik ?? "", secenek("Keten") ?? "");
    expect(ketenli.urunler).toEqual([ikinci?.kimlik]);
  });

  it("seçenekli ürünün her birleşimi kendi stok kodu, fiyatı ve stoğuyla; basit birimi kalmaz", async () => {
    const vt = await siteAc();
    const site = ozellikliVaryantli();
    expect(await katalogBaslangiciniKur(vt, site)).toBe(true);
    const servis = siteninUrunServisi(site);
    const urun = await servis.urunuOku(vt, await urunKimligi(vt, "deneme-urunu"));
    if (urun === undefined) throw new Error("Ürün okunamadı.");
    expect(urun.tur).toBe("varyantli");
    expect(urun.secenekler.map((s) => [s.ad, s.degerler.map((d) => d.ad)])).toEqual([
      ["Beden", ["S", "M"]],
      ["Renk", ["Kırmızı", "Mavi"]],
    ]);
    const ad = new Map(urun.secenekler.flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad])));
    const canli = urun.birimler.filter((b) => !b.silindi);
    expect(canli.map((b) => [b.stokKodu, b.degerler.map((d) => ad.get(d))])).toEqual([
      ["VRY-0", ["S", "Kırmızı"]],
      ["VRY-1", ["M", "Kırmızı"]],
      ["VRY-2", ["S", "Mavi"]],
      ["VRY-3", ["M", "Mavi"]],
    ]);
    // Ürün eklenirken açılan basit birim ilk seçenekle silinmiştir (panelde de öyle).
    expect(urun.birimler.filter((b) => b.silindi && b.degerler.length === 0)).toHaveLength(1);
    const kimlikler = canli.map((b) => b.kimlik);
    const fiyatlar = await siteninFiyatServisi(site).gecerliFiyatlar(vt, kimlikler, new Date());
    expect(kimlikler.map((k) => fiyatlar.get(k)?.tutar)).toEqual([1000, 1001, 1002, 1003]);
    const stoklar = await stokServisi().stoklariOku(vt, kimlikler);
    expect(kimlikler.map((k) => stoklar.get(k)?.miktar ?? 0)).toEqual([1, 0, 3, 4]);
    const kayitlar = await vt
      .select({ islem: degisiklikKayitlari.islem, kim: degisiklikKayitlari.kim_adi })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kim_adi, "baslangic-katalog"));
    const sayisi = (islem: string) => kayitlar.filter((k) => k.islem === islem).length;
    expect(sayisi("urun-birimi.eklendi")).toBe(4);
    expect(sayisi("urun-secenegi.eklendi")).toBe(2);
    expect(sayisi("ozellik.eklendi")).toBe(4);
  });

  it("yalnız özellikleri olan katalog da yazılır", async () => {
    const vt = await siteAc();
    const site = ozellikliVaryantli();
    const yalniz = {
      ...site,
      katalogBaslangici: { ...bosKatalog(), ozellikler: site.katalogBaslangici.ozellikler },
    };
    expect(await katalogBaslangiciniKur(vt, yalniz)).toBe(true);
    expect(await sayilar(vt)).toMatchObject({ ozellikler: 4, urunler: 0 });
  });

  it("kurulu katalog yazılmaz: yalnız bir özelliği olan site", async () => {
    const vt = await siteAc();
    await ozellikServisi.ekle(vt, yonetici(), { ad: "Elle açılan", tur: "metin" });
    expect(await katalogBaslangiciniKur(vt, ozellikliVaryantli())).toBe(false);
    expect(await sayilar(vt)).toMatchObject({ ozellikler: 1, urunler: 0, kategoriler: 0 });
  });

  it("panelden açılmakta olan özellik kataloğa karışmaz: kurulu mu sorusu kilitlerden sonra", async () => {
    const vt = await siteAc();
    let hazir: () => void = () => {};
    let birak: () => void = () => {};
    const yazildi = new Promise<void>((coz) => {
      hazir = coz;
    });
    const bitir = new Promise<void>((coz) => {
      birak = coz;
    });
    const panel = vt.transaction(async (islem) => {
      await ozellikServisi.ekle(islem, yonetici(), { ad: "Panelden", tur: "metin" });
      hazir();
      await bitir;
    });
    await yazildi;
    const katalog = katalogBaslangiciniKur(vt, ozellikliVaryantli());
    await new Promise((coz) => setTimeout(coz, 500));
    birak();
    await panel;
    expect(await katalog).toBe(false);
    expect(await sayilar(vt)).toMatchObject({ ozellikler: 1, urunler: 0, kategoriler: 0 });
  });

  it("bir birleşim yazılamazsa (aynı stok kodu) hiçbir parça kalmaz: özellik, seçenek, birim", async () => {
    const vt = await siteAc();
    const bozuk = ozellikliVaryantli((katalog) => {
      for (const b of katalog.urunler[0]?.birlesimler ?? []) b.stokKodu = "AYNI-KOD";
    });
    await expect(katalogBaslangiciniKur(vt, bozuk)).rejects.toMatchObject({ kod: "cakisma" });
    expect(await sayilar(vt)).toEqual(bos);
    expect(await katalogBaslangiciniKur(vt, ozellikliVaryantli())).toBe(true);
  });

  it("bir özellik yazılamazsa (harf ayrımsız aynı ad) hiçbir parça kalmaz", async () => {
    const vt = await siteAc();
    const bozuk = ozellikliVaryantli((katalog) => {
      katalog.ozellikler.push({ ad: "KUMAŞ", tur: "metin", filtrede: false });
    });
    await expect(katalogBaslangiciniKur(vt, bozuk)).rejects.toMatchObject({ kod: "cakisma" });
    expect(await sayilar(vt)).toEqual(bos);
  });
});

// Kart 0127: aynı işlemde (başlangıç kataloğu) eklenen ürünlerin "en yeni" sırası. Oluşturma zamanı işlemin başı
// olsaydı hepsi eşit olur, sırayı rastgele kimlik belirlerdi: iki kurulumda "yeni gelenler" farklı ürünleri
// gösterirdi (ölçüldü). Sonra eklenen sonra gelir; en yeni önce sırası dosyanın tersidir. Aynı sırayı ürün
// listesi (yeni gelenler, kategori, marka, etiket, özellik listeleri) ve ilgili ürünlerin kategoriden gelen
// kısmı kullanır.
describe("en yeni sırası (kart 0127)", () => {
  const adlar = ["bir", "iki", "uc", "dort", "bes", "alti"].map((ad) => `sira-${ad}`);
  // Ürünler şemadan geçmiş basit ürünün kopyasıdır (varsayılan alanlarıyla).
  const sirali = katalogla((katalog) => {
    const [, basit] = katalog.urunler;
    if (basit === undefined) throw new Error("Basit ürün beklenirdi.");
    katalog.urunler.push(
      ...adlar.map((adresAdi) => ({
        ...structuredClone(basit),
        ad: adresAdi,
        adresAdi,
        durum: "yayinda" as const,
        kategoriler: ["birinci"],
      })),
    );
  });
  const dosyaSirasi = sirali.katalogBaslangici.urunler.map((urun) => urun.adresAdi);
  const vitrin = { tukenenUrun: "goster" } as const;

  const kur = async () => {
    const vt = await siteAc();
    expect(await katalogBaslangiciniKur(vt, sirali)).toBe(true);
    const satirlar = await vt
      .select({ kimlik: urunler.kimlik, adresAdi: urunler.adres_adi })
      .from(urunler);
    const adresAdi = new Map(satirlar.map((satir) => [satir.kimlik, satir.adresAdi]));
    const kimlik = new Map(satirlar.map((satir) => [satir.adresAdi, satir.kimlik]));
    const yeniler = (await urunListesi(vt, sql`true`)).urunler.map((k) => adresAdi.get(k));
    const ilgili = (await ilgiliUrunleriGetir(vt, kimlik.get("sira-bir") ?? "", vitrin)).map((k) =>
      adresAdi.get(k),
    );
    return { yeniler, ilgili };
  };

  it("iki ayrı kurulumda aynı sıra: dosyanın tersi; ilgili ürünler de aynı sırayla", async () => {
    const birinci = await kur();
    const ikinci = await kur();
    expect(birinci.yeniler).toEqual(dosyaSirasi.toReversed());
    expect(ikinci).toEqual(birinci);
    // sira-bir'in kategorisindeki öteki ürünler, en yeni önce, sınır kadar (sınırdan fazla ürün var).
    expect(adlar.length - 1).toBeGreaterThan(ilgiliUrunSiniri);
    expect(birinci.ilgili).toEqual(adlar.slice(1).toReversed().slice(0, ilgiliUrunSiniri));
  });
});
