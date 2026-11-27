// Ürün kopyalama gerçek veritabanıyla (kart 0320, karar 0190): basit ürünün kopyası alanlarıyla, bağlantılarıyla,
// özellikleriyle, fiyatı (indirim ve zamanıyla) ve galerisiyle (aynı dosya, video); varyantlı ürünün seçenekleri,
// birleşimleri (silinmiş değer ve birleşim yok), birleşimin ölçüsü, görseli ve fiyatı. Kopyalanmayan: stok kodu,
// barkod, stok, fiyat geçmişi (kopyanın geçmişi yalnız kendi yazımı), başka para birimindeki fiyat. Kopya taslaktır,
// adres adı kaynağınkinden sayıyla üretilir. Değişiklik kaydına kaynağıyla girer. Tek işlem: galeri yazılamayınca
// hiçbir şey kalmaz. Silinmiş, olmayan ve başka sitenin ürünü bulunamadı.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { gorselKaydet } from "../../dosya/servis.ts";
import { etiketServisi } from "../../etiket/servis.ts";
import { fiyatServisi } from "../../fiyat/servis.ts";
import { kategoriEkle } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { ozellikServisi } from "../../ozellik/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { vergiServisi } from "../../vergi/servis.ts";
import { urunKopyala } from "../kopyalama.ts";
import { urunler } from "../model.ts";
import { urunServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const saatDilimi = "Europe/Istanbul";
const servis = urunServisi(() => saatDilimi);
const fiyat = fiyatServisi(() => ({ saatDilimi, paraBirimi: "XTS" }));
const stok = stokServisi();
const kim: DegisikligiYapan = { tur: "yonetici", kimlik: randomUUID() };
const servisler = { fiyatIzni: true, urun: servis, fiyat, saatDilimi, paraBirimi: "XTS" };

let vt: Veritabani;
let sil: () => Promise<void>;
let klasor: string;
beforeAll(async () => {
  const site = await denemeSitesiAc("kopyalama");
  vt = site.vt;
  sil = site.sil;
  klasor = mkdtempSync(join(tmpdir(), "kopyalama-"));
  vi.stubEnv("DOSYA_KLASORU", klasor);
}, 60_000);
afterAll(async () => {
  vi.unstubAllEnvs();
  rmSync(klasor, { recursive: true, force: true });
  await sil();
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const gorsel = async () => {
  const icerik = await sharp({
    create: { width: 40, height: 40, channels: 3, background: { r: 40, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
  const sonuc = await gorselKaydet(vt, icerik, klasor);
  if (!sonuc.tamam) throw new Error(`Görsel kaydedilemedi: ${sonuc.hata}`);
  return sonuc.dosya.kimlik;
};

const ek = () => randomUUID().slice(0, 6);
const kopyala = (kimlik: string, ad: string, s = servisler) =>
  urunKopyala(vt, kim, { kimlik, ad }, s);

describe("basit ürün", () => {
  it("alanları, bağlantıları, özellikleri, fiyatı ve galerisi kopyalanır; stok kodu, barkod ve stok kopyalanmaz", async () => {
    const kategori = await kategoriEkle(vt, kim, { ad: `Mum ${ek()}` });
    const ilgili = await servis.urunEkle(vt, kim, { ad: `İlgili ${ek()}`, vergiSinifi: null });
    const marka = await markaServisi.ekle(vt, kim, { ad: `Marka ${ek()}` });
    const etiket = await etiketServisi.ekle(vt, kim, { ad: `Etiket ${ek()}` });
    const sinif = await vergiServisi(() => ({ siniflar: [] })).sinifEkle(vt, kim, {
      ad: `Sınıf ${ek()}`,
    });
    const koku = await ozellikServisi.ekle(vt, kim, { ad: `Koku ${ek()}`, tur: "metin" });
    const adresAdi = `mum-${ek()}`;
    const kaynak = await servis.urunEkle(vt, kim, {
      ad: "Mum",
      adresAdi,
      durum: "yayinda",
      kisaAciklama: "Kısa",
      uzunAciklama: "<p>Uzun</p>",
      kargoGerekmez: true,
      stokTakibi: true,
      dusukStokEsigi: 4,
      enAzAdet: 2,
      enCokAdet: 9,
      vergiSinifi: sinif,
      marka,
      etiketler: [etiket],
      stokKodu: `MUM-${ek()}`,
      barkod: "4006381333931",
      agirlikGram: 350,
      enMm: 80,
      boyMm: 80,
      yukseklikMm: 120,
      kategoriler: [kategori],
      ilgiliUrunler: [ilgili],
      ozellikler: [{ ozellik: koku, deger: "Lavanta" }],
    });
    const kaynakBirimi = (await servis.urunuOku(vt, kaynak))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, kim, kaynakBirimi, { satisFiyati: 30000 });
    await fiyat.fiyatYaz(vt, kim, kaynakBirimi, {
      satisFiyati: 24990,
      indirimliFiyat: 19990,
      indirimBaslangici: "2026-12-01T00:00",
      indirimBitisi: "2026-12-31T23:59",
    });
    await stok.stokDuzelt(vt, kim, kaynakBirimi, {
      yeniMiktar: 7,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    const dosya = await gorsel();
    await servis.galeriyeGorselEkle(vt, kim, kaynak, { dosya, alternatifMetin: "Mum önden" });
    await servis.galeriyeVideoEkle(vt, kim, kaynak, {
      adres: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      alternatifMetin: "Mum videosu",
    });

    const kopya = await kopyala(kaynak, "Mum (kopya)");
    const okunan = await servis.urunuOku(vt, kopya);
    expect(okunan).toMatchObject({
      ad: "Mum (kopya)",
      adresAdi: `${adresAdi}-2`,
      durum: "taslak",
      kisaAciklama: "Kısa",
      uzunAciklama: "<p>Uzun</p>",
      kargoGerekmez: true,
      stokTakibi: true,
      dusukStokEsigi: 4,
      enAzAdet: 2,
      enCokAdet: 9,
      kategoriler: [kategori],
      marka,
      etiketler: [etiket],
      vergiSinifi: sinif,
      ilgiliUrunler: [ilgili],
      ozellikler: [{ ozellik: koku, deger: "Lavanta" }],
      tur: "basit",
    });
    expect(okunan?.yayinZamani).toBeUndefined();
    const birim = okunan?.birimler[0];
    expect(birim).toMatchObject({ agirlikGram: 350, enMm: 80, boyMm: 80, yukseklikMm: 120 });
    expect(birim?.stokKodu).toBeUndefined();
    expect(birim?.barkod).toBeUndefined();
    expect(
      (await stok.stoklariOku(vt, [birim?.kimlik ?? ""])).get(birim?.kimlik ?? "")?.miktar,
    ).toBe(0);
    expect(await fiyat.fiyatOku(vt, birim?.kimlik ?? "")).toMatchObject({
      satisFiyati: 24990,
      indirimliFiyat: 19990,
      indirimBaslangici: new Date("2026-11-30T21:00:00Z"),
      indirimBitisi: new Date("2026-12-31T20:59:00Z"),
    });
    // Kopyanın fiyat geçmişi yalnız kendi yazımıdır: kaynağın iki satırı gelmez.
    expect(await fiyat.panelFiyatGecmisi(vt, [birim?.kimlik ?? ""])).toHaveLength(1);
    expect(
      okunan?.galeri.map((oge) =>
        oge.tur === "gorsel"
          ? [oge.tur, oge.dosya, oge.alternatifMetin]
          : [oge.tur, oge.videoKimligi],
      ),
    ).toEqual([
      ["gorsel", dosya, "Mum önden"],
      ["video", "dQw4w9WgXcQ"],
    ]);
    // Kaynak değişmez.
    expect(await servis.urunuOku(vt, kaynak)).toMatchObject({ durum: "yayinda", adresAdi });
    // Değişiklik kaydı kaynağıyla.
    const [kayit] = await vt
      .select({ yeni: degisiklikKayitlari.yeni_deger, kimKimligi: degisiklikKayitlari.kim_kimligi })
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.islem, "urun.kopyalandi"),
          eq(degisiklikKayitlari.kayit_kimligi, kopya),
        ),
      );
    expect(kayit).toEqual({ yeni: { kaynak }, kimKimligi: kim.kimlik });
  });

  it("fiyat izni olmayanın kopyası fiyatsızdır", async () => {
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Fiyatlı ${ek()}`, vergiSinifi: null });
    const birim = (await servis.urunuOku(vt, kaynak))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, kim, birim, { satisFiyati: 1000 });
    const kopya = await kopyala(kaynak, "Fiyatsız kopya", { ...servisler, fiyatIzni: false });
    const kopyaBirimi = (await servis.urunuOku(vt, kopya))?.birimler[0]?.kimlik ?? "";
    expect(await fiyat.fiyatOku(vt, kopyaBirimi)).toBeUndefined();
  });

  it("başka ürünün eski adresi kullanılmış sayılır (eski bağlantıları yönlenmeye devam eder)", async () => {
    const kok = `atki-${ek()}`;
    const kaynak = await servis.urunEkle(vt, kim, { ad: "Atkı", adresAdi: kok, vergiSinifi: null });
    const baska = await servis.urunEkle(vt, kim, {
      ad: "Başka atkı",
      adresAdi: `${kok}-2`,
      vergiSinifi: null,
    });
    // "<kök>-2" artık başka ürünün eski adresi.
    await servis.urunDegistir(vt, kim, baska, { adresAdi: `${kok}-yeni` });
    const kopya = await kopyala(kaynak, "Atkı (kopya)");
    expect((await servis.urunuOku(vt, kopya))?.adresAdi).toBe(`${kok}-3`);
  });

  it("başka para birimindeki fiyat kopyalanmaz", async () => {
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Dolar ${ek()}`, vergiSinifi: null });
    const birim = (await servis.urunuOku(vt, kaynak))?.birimler[0]?.kimlik ?? "";
    const baska = fiyatServisi(() => ({ saatDilimi, paraBirimi: "XXX" }));
    await baska.fiyatYaz(vt, kim, birim, { satisFiyati: 1000 });
    const kopya = await kopyala(kaynak, "Dolar kopya");
    const kopyaBirimi = (await servis.urunuOku(vt, kopya))?.birimler[0]?.kimlik ?? "";
    expect(await fiyat.fiyatOku(vt, kopyaBirimi)).toBeUndefined();
  });
});

describe("varyantlı ürün", () => {
  it("seçenekler, birleşimler, ölçü, görsel ve fiyat kopyalanır; silinmiş değer ve stok kodu kopyalanmaz", async () => {
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Tişört ${ek()}`, vergiSinifi: null });
    await servis.varyantlariKaydet(
      vt,
      kim,
      kaynak,
      {
        secenekler: [
          { ad: "Renk", degerler: [{ ad: "Kırmızı" }, { ad: "Mavi" }, { ad: "Yeşil" }] },
          { ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] },
        ],
        birlesimler: [],
      },
      { silebilir: true },
    );
    const dosya = await gorsel();
    const oge = await servis.galeriyeGorselEkle(vt, kim, kaynak, {
      dosya,
      alternatifMetin: "Mavi",
    });
    let okunan = await servis.urunuOku(vt, kaynak);
    const renk = okunan?.secenekler[0];
    const yesil = renk?.degerler.find((d) => d.ad === "Yeşil");
    // Yeşil değeri silinir: birleşimleri de silinir, kopyalanmaz.
    await servis.degerSil(vt, kim, yesil?.kimlik ?? "");
    okunan = await servis.urunuOku(vt, kaynak);
    const canli = (okunan?.birimler ?? []).filter((b) => !b.silindi);
    expect(canli).toHaveLength(4);
    const adlar = new Map(
      (okunan?.secenekler ?? []).flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad] as const)),
    );
    const ad = (b: (typeof canli)[number]) => b.degerler.map((d) => adlar.get(d)).join("/");
    for (const [i, birim] of canli.entries()) {
      await servis.birlesimDegistir(vt, kim, birim.kimlik, {
        stokKodu: `TS-${ek()}`,
        agirlikGram: 100 + i,
        ...(ad(birim).startsWith("Mavi") ? { gorsel: oge } : {}),
      });
      await fiyat.fiyatYaz(vt, kim, birim.kimlik, { satisFiyati: 10000 + i * 100 });
    }
    // Değişiklikten sonraki hâli.
    const sonHali = ((await servis.urunuOku(vt, kaynak))?.birimler ?? []).filter((b) => !b.silindi);
    const kaynakFiyat = new Map(
      await Promise.all(
        canli.map(async (b) => [ad(b), (await fiyat.fiyatOku(vt, b.kimlik))?.satisFiyati] as const),
      ),
    );

    const kopya = await kopyala(kaynak, "Tişört kopya");
    const yeni = await servis.urunuOku(vt, kopya);
    expect(yeni?.tur).toBe("varyantli");
    expect(
      yeni?.secenekler
        .filter((s) => !s.silindi)
        .map((s) => [s.ad, s.degerler.filter((d) => !d.silindi).map((d) => d.ad)]),
    ).toEqual([
      ["Renk", ["Kırmızı", "Mavi"]],
      ["Beden", ["S", "M"]],
    ]);
    const yeniAdlar = new Map(
      (yeni?.secenekler ?? []).flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad] as const)),
    );
    const yeniCanli = (yeni?.birimler ?? []).filter((b) => !b.silindi);
    expect(yeniCanli).toHaveLength(4);
    const galeriOgesi = yeni?.galeri[0]?.kimlik;
    for (const birim of yeniCanli) {
      const birimAdi = birim.degerler.map((d) => yeniAdlar.get(d)).join("/");
      const kaynakBirimi = sonHali.find((b) => ad(b) === birimAdi);
      expect(birim.stokKodu).toBeUndefined();
      expect(birim.agirlikGram).toBe(kaynakBirimi?.agirlikGram);
      expect(birim.gorsel).toBe(birimAdi.startsWith("Mavi") ? galeriOgesi : undefined);
      expect((await fiyat.fiyatOku(vt, birim.kimlik))?.satisFiyati).toBe(kaynakFiyat.get(birimAdi));
    }
  });
});

describe("ilk birleşimi olmayan kaynak", () => {
  it("var olan birim eklemelerden önce silinir; kopyada yalnız kaynağın birleşimleri vardır", async () => {
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Eksik ${ek()}`, vergiSinifi: null });
    await servis.varyantlariKaydet(
      vt,
      kim,
      kaynak,
      {
        secenekler: [
          { ad: "Renk", degerler: [{ ad: "Kırmızı" }, { ad: "Mavi" }] },
          { ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] },
        ],
        birlesimler: [],
      },
      { silebilir: true },
    );
    const okunan = await servis.urunuOku(vt, kaynak);
    const ilkDegerler = (okunan?.secenekler ?? []).map((s) => s.degerler[0]?.kimlik);
    const ilk = okunan?.birimler.find(
      (b) => !b.silindi && b.degerler.every((d, i) => d === ilkDegerler[i]),
    );
    await servis.birlesimSil(vt, kim, ilk?.kimlik ?? "");
    const kopya = await kopyala(kaynak, "Eksik kopya");
    const yeni = await servis.urunuOku(vt, kopya);
    const adlar = new Map(
      (yeni?.secenekler ?? []).flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad] as const)),
    );
    expect(
      (yeni?.birimler ?? [])
        .filter((b) => !b.silindi)
        .map((b) => b.degerler.map((d) => adlar.get(d)).join("/"))
        .toSorted(),
    ).toEqual(["Kırmızı/M", "Mavi/M", "Mavi/S"]);
  });
});

describe("birleşim sınırı", () => {
  it("ilk birleşimi olmayan, sınır kadar birleşimli ürün kopyalanır (ara adımda sınır aşılmaz)", async () => {
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Sınırda ${ek()}`, vergiSinifi: null });
    await servis.secenekEkle(vt, kim, kaynak, {
      ad: "A",
      degerler: Array.from({ length: 11 }, (_, i) => `a${i}`),
    });
    await servis.secenekEkle(vt, kim, kaynak, {
      ad: "B",
      degerler: Array.from({ length: 10 }, (_, i) => `b${i}`),
    });
    const okunan = await servis.urunuOku(vt, kaynak);
    const [a, b] = okunan?.secenekler ?? [];
    // İlk birleşim (a0/b0) silinir, yerine 100 başka birleşim açılır: sınır (100) dolu.
    await servis.birlesimSil(vt, kim, okunan?.birimler.find((x) => !x.silindi)?.kimlik ?? "");
    let sayi = 0;
    for (const da of a?.degerler ?? []) {
      for (const db of b?.degerler ?? []) {
        if (sayi === 100) break;
        if (da.ad === "a0" && db.ad === "b0") continue;
        await servis.birlesimEkle(vt, kim, kaynak, { degerler: [da.kimlik, db.kimlik] });
        sayi += 1;
      }
    }
    const kopya = await kopyala(kaynak, "Sınırda kopya");
    const birimler = ((await servis.urunuOku(vt, kopya))?.birimler ?? []).filter((x) => !x.silindi);
    expect(birimler).toHaveLength(100);
  });
});

describe("tek işlem ve bulunamadı", () => {
  it("galeri yazılamayınca hiçbir şey kalmaz", async () => {
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Videolu ${ek()}`, vergiSinifi: null });
    await servis.galeriyeVideoEkle(vt, kim, kaynak, {
      adres: "https://vimeo.com/76979871",
      alternatifMetin: "Video",
    });
    // Vimeo'yu artık kabul etmeyen site: video kopyalanamaz, ürün de kalmaz.
    const yalnizYoutube = urunServisi(
      () => saatDilimi,
      () => ["youtube"],
    );
    const adi = `Yarım kopya ${ek()}`;
    expect(await hatasi(kopyala(kaynak, adi, { ...servisler, urun: yalnizYoutube }))).toMatchObject(
      {
        kod: "dogrulama",
        ayrinti: [{ alan: "adres", kod: "video-sitesi-izinsiz" }],
      },
    );
    expect(await vt.select().from(urunler).where(eq(urunler.ad, adi))).toEqual([]);
  });

  it("kaynağın vergi sınıfı silinmişse kopya açılmaz, nedeni alanın hatasıdır", async () => {
    const vergi = vergiServisi(() => ({ siniflar: [] }));
    const sinif = await vergi.sinifEkle(vt, kim, { ad: `Sınıf ${ek()}` });
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Vergili ${ek()}`, vergiSinifi: sinif });
    await vergi.sinifSil(vt, kim, sinif);
    const adi = `Vergili kopya ${ek()}`;
    expect(await hatasi(kopyala(kaynak, adi))).toMatchObject({
      kod: "dogrulama",
      ayrinti: [{ alan: "vergiSinifi", kod: "vergi-sinifi-gecersiz" }],
    });
    expect(await vt.select().from(urunler).where(eq(urunler.ad, adi))).toEqual([]);
  });

  it("silinmiş, olmayan ve başka sitenin ürünü bulunamadı; boş ad ürünün kuralıyla reddedilir", async () => {
    const silinen = await servis.urunEkle(vt, kim, { ad: `Silinen ${ek()}`, vergiSinifi: null });
    await servis.urunSil(vt, kim, silinen);
    expect(await hatasi(kopyala(silinen, "Kopya"))).toMatchObject({ kod: "bulunamadi" });
    expect(await hatasi(kopyala(randomUUID(), "Kopya"))).toMatchObject({ kod: "bulunamadi" });
    const oteki = await denemeSitesiAc("kopyalama-oteki");
    try {
      const baskasi = await servis.urunEkle(oteki.vt, kim, { ad: "Öteki", vergiSinifi: null });
      expect(await hatasi(kopyala(baskasi, "Kopya"))).toMatchObject({ kod: "bulunamadi" });
    } finally {
      await oteki.sil();
    }
    const kaynak = await servis.urunEkle(vt, kim, { ad: `Adlı ${ek()}`, vergiSinifi: null });
    expect(await hatasi(kopyala(kaynak, "  "))).toMatchObject({ kod: "dogrulama" });
  });
});
