// Örnek Mağaza'nın başlangıç kataloğu (kart 0084): KURALLAR.md'deki tablonun her durumu, katalog boş bir
// veritabanına kurulduktan sonra çekirdeğin kendi işlevleriyle gerçekten o durumda görünür. Zaman sabit
// verilir: tarihli indirim ve zamanlanmış ürün takvimden bağımsız denenir.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { gorselBoyutAdlari, gorselBoyutlari } from "../../../cekirdek/kayitlar/gorsel.ts";
import { dosyaOku } from "../../../cekirdek/moduller/dosya/servis.ts";
import { etiketServisi } from "../../../cekirdek/moduller/etiket/servis.ts";
import { fiyatGosterimServisi } from "../../../cekirdek/moduller/fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../../../cekirdek/moduller/fiyat/servis.ts";
import {
  kategorileriOku,
  kategorininUrunleri,
} from "../../../cekirdek/moduller/kategori/servis.ts";
import { markaServisi } from "../../../cekirdek/moduller/marka/servis.ts";
import { ozellikServisi } from "../../../cekirdek/moduller/ozellik/servis.ts";
import { siteninStokDurumlari, urunStokDurumu } from "../../../cekirdek/moduller/stok/durum.ts";
import { katalogBaslangiciniKur } from "../../../cekirdek/moduller/urun/baslangic.ts";
import { anaGorseller, birimGorseli } from "../../../cekirdek/moduller/urun/galeri.ts";
import { ilgiliUrunleriGetir } from "../../../cekirdek/moduller/urun/ilgili.ts";
import { urunler } from "../../../cekirdek/moduller/urun/model.ts";
import { siteninUrunServisi, type Urun } from "../../../cekirdek/moduller/urun/servis.ts";
import type { VitrinSecenekleri } from "../../../cekirdek/moduller/urun/vitrin.ts";
import { siteninVergiServisi } from "../../../cekirdek/moduller/vergi/servis.ts";
import type { Veritabani } from "../../../cekirdek/veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../cekirdek/veritabani/testler/deneme-sitesi.ts";

const site = siteKlasorunuOku(join(import.meta.dirname, ".."));
const urunServisi = siteninUrunServisi(site);

// İstanbul saatiyle 15 Kasım öğlen: indirim sürüyor, Yılbaşı Kupa Seti henüz yayında değil.
const kasim = new Date("2026-11-15T09:00:00Z");
// 1 Aralık 00:00 İstanbul: indirim bittiği ve Kupa Seti yayına girdiği an.
const aralik = new Date("2026-11-30T21:00:00Z");
const birOnce = new Date(aralik.getTime() - 1);

let vt: Veritabani;
let sil: () => Promise<void>;
// Galeri görselleri geçici bir dosya klasörüne kaydedilir (kart 0087).
const klasor = mkdtempSync(join(tmpdir(), "ornek-katalog-"));
const urunlerim = new Map<string, Urun>();

beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ornek-katalog"));
  expect(await katalogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
  for (const satir of await vt.select({ kimlik: urunler.kimlik }).from(urunler)) {
    const urun = await urunServisi.urunuOku(vt, satir.kimlik);
    if (urun !== undefined) urunlerim.set(urun.adresAdi, urun);
  }
  // Galeri görselleri ve boyutları yeniden kodlanır: yüklü hatta birkaç saniye sürer.
}, 120_000);
afterAll(async () => {
  await sil();
  rmSync(klasor, { recursive: true, force: true });
});

const urun = (adresAdi: string): Urun => {
  const bulunan = urunlerim.get(adresAdi);
  if (bulunan === undefined) throw new Error(`${adresAdi} katalogda yok.`);
  return bulunan;
};
const birim = (adresAdi: string) => urun(adresAdi).birimler[0]?.kimlik ?? "";
const gorunur = (adresAdi: string, yer: "sayfa" | "liste", secenekler: VitrinSecenekleri) =>
  urunServisi.vitrindeGorunurMu(vt, urun(adresAdi).kimlik, yer, secenekler);
const goster = (an = kasim): VitrinSecenekleri => ({ an, tukenenUrun: "goster" });
const stokDurumu = async (adresAdi: string) =>
  (await siteninStokDurumlari(vt, site, [birim(adresAdi)])).get(birim(adresAdi));
const kategorisi = async (adresAdi: string) => {
  const kategori = (await kategorileriOku(vt)).find((k) => k.adresAdi === adresAdi);
  if (kategori === undefined) throw new Error(`${adresAdi} kategorisi yok.`);
  return kategori.kimlik;
};

describe("katalog", () => {
  it("on ürün, üç kategori; bütün ürünler %20 sınıfında", async () => {
    expect(urunlerim.size).toBe(10);
    expect((await kategorileriOku(vt)).map((k) => k.ad)).toEqual([
      "Giyim",
      "Ev ve Yaşam",
      "Elektronik Aksesuar",
    ]);
    const yirmi = (await siteninVergiServisi(site).tabloyuOku(vt)).find((s) => s.ad === "%20");
    expect(yirmi).toBeDefined();
    for (const u of urunlerim.values()) expect(u.vergiSinifi, u.adresAdi).toBe(yirmi?.kimlik);
  });

  it("fiyatlar vergi dahil girilen tutarla", async () => {
    const fiyatlar = await siteninFiyatServisi(site).gecerliFiyatlar(
      vt,
      [...urunlerim.keys()].map(birim),
      kasim,
    );
    const tutar = (adresAdi: string) => fiyatlar.get(birim(adresAdi))?.tutar;
    expect(tutar("pamuklu-bez-canta")).toBe(12990);
    expect(tutar("keten-masa-ortusu")).toBe(44990);
    expect(tutar("hediye-paketleme")).toBe(4990);
  });
});

describe("KURALLAR.md'deki durumlar", () => {
  it("tükenmiş ürün (Pamuklu Bez Çanta) satılamaz, listede görünür; gizle ayarında yalnız sayfası açılır", async () => {
    expect(await stokDurumu("pamuklu-bez-canta")).toMatchObject({
      satilabilir: false,
      tukendi: true,
      gosterim: { tur: "tukendi" },
    });
    expect(await gorunur("pamuklu-bez-canta", "liste", goster())).toBe(true);
    const gizle: VitrinSecenekleri = { an: kasim, tukenenUrun: "gizle" };
    expect(await gorunur("pamuklu-bez-canta", "liste", gizle)).toBe(false);
    expect(await gorunur("pamuklu-bez-canta", "sayfa", gizle)).toBe(true);
  });

  it("birden çok kategoride ürün (Pamuklu Bez Çanta): Giyim ve Ev ve Yaşam listelerinde", async () => {
    const vitrin = { yer: "liste" as const, ...goster() };
    for (const kategori of ["giyim", "ev-ve-yasam"]) {
      const liste = await kategorininUrunleri(vt, await kategorisi(kategori), { vitrin });
      expect(liste.urunler, kategori).toContain(urun("pamuklu-bez-canta").kimlik);
    }
  });

  it("taslak ürün (Yün Atkı) vitrinde hiçbir yerde görünmez", async () => {
    expect(await gorunur("yun-atki", "sayfa", goster())).toBe(false);
    expect(await gorunur("yun-atki", "liste", goster())).toBe(false);
    expect(urun("yun-atki").durum).toBe("taslak");
  });

  it("zamanlanmış ürün (Yılbaşı Kupa Seti) 1 Aralık 00:00'dan bir milisaniye önce görünmez, o anda görünür", async () => {
    expect(await gorunur("yilbasi-kupa-seti", "liste", goster(birOnce))).toBe(false);
    expect(await gorunur("yilbasi-kupa-seti", "sayfa", goster(birOnce))).toBe(false);
    expect(await gorunur("yilbasi-kupa-seti", "liste", goster(aralik))).toBe(true);
  });

  it("gizli ürün (Hediye Paketleme) listede yok, sayfası bağlantıyla açılır", async () => {
    expect(await gorunur("hediye-paketleme", "liste", goster())).toBe(false);
    expect(await gorunur("hediye-paketleme", "sayfa", goster())).toBe(true);
  });

  it("stok takibi kapalı ürün (Hediye Paketleme) her zaman satılabilir", async () => {
    expect(urun("hediye-paketleme").stokTakibi).toBe(false);
    expect(await stokDurumu("hediye-paketleme")).toMatchObject({
      takip: false,
      satilabilir: true,
      tukendi: false,
      dusukStok: false,
      gosterim: { tur: "stokta" },
    });
  });

  it("kargo gerektirmeyen ürün yalnız Hediye Paketleme", () => {
    const kargosuz = [...urunlerim.values()].filter((u) => u.kargoGerekmez).map((u) => u.adresAdi);
    expect(kargosuz).toEqual(["hediye-paketleme"]);
  });

  it("düşük stoklu ürün (USB-C Şarj Kablosu 1 m): satılabilir, düşük stokta, müşteriye 'Son 2 ürün'", async () => {
    expect(await stokDurumu("usb-c-sarj-kablosu-1-m")).toMatchObject({
      miktar: 2,
      satilabilir: true,
      dusukStok: true,
      gosterim: { tur: "son-adet", adet: 2 },
    });
    // Eşiğin üstündeki ürün düşük stokta değildir.
    expect(await stokDurumu("kablosuz-kulaklik")).toMatchObject({ miktar: 8, dusukStok: false });
  });

  it("tarihli indirimli ürün (Kablosuz Kulaklık): 1 Aralık 00:00'a kadar 999,00, o andan sonra 1.299,00; eski fiyat yok", async () => {
    const gosterim = fiyatGosterimServisi(site);
    const kulaklik = birim("kablosuz-kulaklik");
    const once = (await gosterim.gosterilecekFiyatlar(vt, [kulaklik], { an: birOnce })).get(
      kulaklik,
    );
    expect(once).toMatchObject({ tutar: 99900, indirimde: true, paraBirimi: "TRY" });
    // İndirimden önceki 30 günde fiyat yok: eski fiyat gösterilmez (karar 0067).
    expect(once?.eskiTutar).toBeUndefined();
    const sonra = (await gosterim.gosterilecekFiyatlar(vt, [kulaklik], { an: aralik })).get(
      kulaklik,
    );
    expect(sonra).toMatchObject({ tutar: 129900, indirimde: false });
  });

  it("en az ve en çok alım adedi olan ürün (Porselen Kupa): 2 ve 6", () => {
    expect(urun("porselen-kupa")).toMatchObject({ enAzAdet: 2, enCokAdet: 6 });
    const sinirli = [...urunlerim.values()].filter(
      (u) => u.enAzAdet !== 1 || u.enCokAdet !== undefined,
    );
    expect(sinirli.map((u) => u.adresAdi)).toEqual(["porselen-kupa"]);
  });

  it("markası ve etiketleri olan ürün (Kablosuz Kulaklık): Örnek Ses; kablosuz, yeni", async () => {
    const kulaklik = urun("kablosuz-kulaklik");
    const marka = (await markaServisi.hepsiniOku(vt)).find((m) => m.kimlik === kulaklik.marka);
    expect(marka?.ad).toBe("Örnek Ses");
    const etiketler = (await etiketServisi.hepsiniOku(vt))
      .filter((e) => kulaklik.etiketler.includes(e.kimlik))
      .map((e) => e.ad);
    expect(etiketler.toSorted()).toEqual(["kablosuz", "yeni"]);
  });

  it("elle seçilmiş ilgili ürünü olan ürün (Porselen Kupa): Kupa Seti yayına girene kadar atlanır", async () => {
    const kupa = urun("porselen-kupa").kimlik;
    expect(await ilgiliUrunleriGetir(vt, kupa, goster())).toEqual([
      urun("keten-masa-ortusu").kimlik,
    ]);
    expect(await ilgiliUrunleriGetir(vt, kupa, goster(aralik))).toEqual([
      urun("keten-masa-ortusu").kimlik,
      urun("yilbasi-kupa-seti").kimlik,
    ]);
  });

  it("ikinci kurulum hiçbir şey değiştirmez", async () => {
    expect(await katalogBaslangiciniKur(vt, site)).toBe(false);
    const satirlar = await vt.select({ kimlik: urunler.kimlik }).from(urunler);
    expect(satirlar).toHaveLength(10);
    const [kupa] = await vt
      .select({ durum: urunler.durum })
      .from(urunler)
      .where(eq(urunler.adres_adi, "porselen-kupa"));
    expect(kupa?.durum).toBe("yayinda");
  });
});

describe("galeri (kart 0087)", () => {
  it("görselli ürünlerin ana görseli kataloğun ilk görselidir; Hediye Paketleme görselsizdir", async () => {
    const analar = await anaGorseller(
      vt,
      [...urunlerim.values()].map((u) => u.kimlik),
    );
    for (const katalogUrunu of site.katalogBaslangici.urunler) {
      const ilk = katalogUrunu.galeri.find((oge) => "gorsel" in oge);
      const ana = analar.get(urun(katalogUrunu.adresAdi).kimlik);
      expect(ana?.alternatifMetin, katalogUrunu.adresAdi).toBe(ilk?.alternatifMetin);
    }
    expect(analar.has(urun("hediye-paketleme").kimlik)).toBe(false);
  });

  it("videolu galeri (Kablosuz Kulaklık): üç görsel ve ikinci sırada YouTube videosu, çerezsiz oynatıcıyla", () => {
    const galeri = urun("kablosuz-kulaklik").galeri;
    expect(galeri.map((oge) => oge.tur)).toEqual(["gorsel", "video", "gorsel", "gorsel"]);
    expect(galeri[1]).toMatchObject({
      tur: "video",
      site: "youtube",
      videoKimligi: "aqz-KE-bpKQ",
      oynatici: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
    });
  });

  it("birden çok görselli ürün (Pamuklu Bez Çanta): iki görsel sırasıyla", () => {
    expect(urun("pamuklu-bez-canta").galeri.map((oge) => oge.alternatifMetin)).toEqual([
      "Bej pamuklu bez çanta, saplarıyla önden",
      "Yeşil pamuklu bez çanta, saplarıyla önden",
    ]);
  });

  it("her görselin bütün boyutları var; 1600 piksellik görsel her boyuta küçülmüş, okunabilir WebP", async () => {
    for (const u of urunlerim.values()) {
      for (const oge of u.galeri) {
        if (oge.tur !== "gorsel") continue;
        for (const ad of gorselBoyutAdlari) {
          const boyut = oge.boyutlar[ad];
          expect(boyut, `${u.adresAdi} ${ad}`).toMatchObject({
            genislik: gorselBoyutlari[ad],
            yukseklik: gorselBoyutlari[ad],
          });
          expect((await dosyaOku(vt, boyut?.kimlik ?? "", klasor))?.tur).toBe("webp");
        }
      }
    }
  });
});

// Varyantlı ürünler ve özellikler (kart 0100).
describe("varyantlı ürünler ve özellikler (kart 0100)", () => {
  // İndirim 15 Kasım 00:00'da başlar, 1 Aralık 00:00'da biter (İstanbul).
  const indirimBasi = new Date("2026-11-14T21:00:00Z");
  const indirimde = new Date("2026-11-20T09:00:00Z");

  // Birleşimin birimi, değer adlarıyla (seçeneklerin sırasıyla).
  const birlesim = (adresAdi: string, ...adlar: string[]) => {
    const u = urun(adresAdi);
    const kimlikler = adlar.map((ad, sira) => {
      const deger = u.secenekler[sira]?.degerler.find((d) => d.ad === ad);
      if (deger === undefined) throw new Error(`${adresAdi}: ${ad} değeri yok.`);
      return deger.kimlik;
    });
    const bulunan = u.birimler.find((b) => !b.silindi && b.degerler.join() === kimlikler.join());
    if (bulunan === undefined) throw new Error(`${adresAdi}: ${adlar.join(" ")} birleşimi yok.`);
    return bulunan;
  };
  const canliBirimler = (adresAdi: string) => urun(adresAdi).birimler.filter((b) => !b.silindi);
  const tisortBedenleri = ["S", "M", "L", "XL"];
  const sweatBedenleri = ["S", "M", "L"];

  it("Basic Tişört: Beden × Renk, 8 birleşim, her biri kendi stok koduyla; Giyim'de", async () => {
    const tisort = urun("basic-tisort");
    expect(tisort.tur).toBe("varyantli");
    expect(tisort.secenekler.map((s) => [s.ad, s.degerler.map((d) => d.ad)])).toEqual([
      ["Beden", tisortBedenleri],
      ["Renk", ["Siyah", "Beyaz"]],
    ]);
    expect(canliBirimler("basic-tisort")).toHaveLength(8);
    expect(birlesim("basic-tisort", "XL", "Beyaz").stokKodu).toBe("ORN-GYM-003-XL-BYZ");
    const stokKodlari = new Set(canliBirimler("basic-tisort").map((b) => b.stokKodu));
    expect(stokKodlari.size).toBe(8);
    const liste = await kategorininUrunleri(vt, await kategorisi("giyim"), {
      vitrin: { yer: "liste", ...goster() },
    });
    expect(liste.urunler).toEqual(
      expect.arrayContaining([urun("basic-tisort").kimlik, urun("kapusonlu-sweatshirt").kimlik]),
    );
  });

  it("Basic Tişört: M Beyaz tükenmiş, öteki birleşimler 10 adet; ürünün geneli satılabilir", async () => {
    const birimler = canliBirimler("basic-tisort").map((b) => b.kimlik);
    const durumlar = await siteninStokDurumlari(vt, site, birimler);
    const mBeyaz = birlesim("basic-tisort", "M", "Beyaz").kimlik;
    expect(durumlar.get(mBeyaz)).toMatchObject({ miktar: 0, satilabilir: false, tukendi: true });
    for (const kimlik of birimler.filter((k) => k !== mBeyaz)) {
      expect(durumlar.get(kimlik)).toMatchObject({ miktar: 10, satilabilir: true });
    }
    const genel = urunStokDurumu(birimler.flatMap((k) => durumlar.get(k) ?? []));
    expect(genel).toMatchObject({ satilabilir: true, tukendi: false });
  });

  it("Basic Tişört: 299,90, XL bedenler 329,90; fiyat aralığı 299,90–329,90", async () => {
    const gosterim = fiyatGosterimServisi(site);
    const fiyatlar = await gosterim.gosterilecekFiyatlar(
      vt,
      canliBirimler("basic-tisort").map((b) => b.kimlik),
      { an: kasim },
    );
    for (const renk of ["Siyah", "Beyaz"]) {
      for (const beden of tisortBedenleri) {
        const fiyat = fiyatlar.get(birlesim("basic-tisort", beden, renk).kimlik);
        expect(fiyat?.tutar, `${beden} ${renk}`).toBe(beden === "XL" ? 32990 : 29990);
      }
    }
    const aralik = (
      await gosterim.fiyatAraliklari(vt, [urun("basic-tisort").kimlik], { an: kasim })
    ).get(urun("basic-tisort").kimlik);
    expect(aralik).toMatchObject({
      enDusuk: { tutar: 29990 },
      enYuksek: { tutar: 32990 },
      tek: false,
    });
  });

  it("Kapüşonlu Sweatshirt: 6 birleşim, 6'şar adet; Lacivert 15 Kasım–1 Aralık 549,90, Gri indirimsiz", async () => {
    expect(urun("kapusonlu-sweatshirt").secenekler.map((s) => s.degerler.map((d) => d.ad))).toEqual(
      [sweatBedenleri, ["Gri", "Lacivert"]],
    );
    const birimler = canliBirimler("kapusonlu-sweatshirt").map((b) => b.kimlik);
    expect(birimler).toHaveLength(6);
    const durumlar = await siteninStokDurumlari(vt, site, birimler);
    for (const kimlik of birimler) expect(durumlar.get(kimlik)).toMatchObject({ miktar: 6 });

    const gosterim = fiyatGosterimServisi(site);
    const fiyati = async (renk: string, beden: string, an: Date) => {
      const kimlik = birlesim("kapusonlu-sweatshirt", beden, renk).kimlik;
      return (await gosterim.gosterilecekFiyatlar(vt, [kimlik], { an })).get(kimlik);
    };
    for (const beden of sweatBedenleri) {
      const once = new Date(indirimBasi.getTime() - 1);
      expect(await fiyati("Lacivert", beden, once)).toMatchObject({
        tutar: 64990,
        indirimde: false,
      });
      expect(await fiyati("Lacivert", beden, indirimBasi)).toMatchObject({
        tutar: 54990,
        indirimde: true,
      });
      expect(await fiyati("Lacivert", beden, birOnce)).toMatchObject({ tutar: 54990 });
      expect(await fiyati("Lacivert", beden, aralik)).toMatchObject({
        tutar: 64990,
        indirimde: false,
      });
      expect(await fiyati("Gri", beden, indirimde)).toMatchObject({
        tutar: 64990,
        indirimde: false,
      });
    }
  });

  it("her birleşim kendi renginin görselini gösterir", () => {
    const renkler = [
      ["basic-tisort", tisortBedenleri, { Siyah: "Siyah tişört", Beyaz: "Beyaz tişört" }],
      [
        "kapusonlu-sweatshirt",
        sweatBedenleri,
        { Gri: "Gri kapüşonlu", Lacivert: "Lacivert kapüşonlu" },
      ],
    ] as const;
    for (const [adresAdi, bedenler, metinler] of renkler) {
      for (const [renk, metin] of Object.entries(metinler)) {
        for (const beden of bedenler) {
          const b = birlesim(adresAdi, beden, renk);
          expect(b.gorsel, `${adresAdi} ${beden} ${renk}`).toBeDefined();
          expect(birimGorseli(urun(adresAdi), b.kimlik)?.alternatifMetin).toMatch(
            new RegExp(`^${metin}`),
          );
        }
      }
    }
  });

  it("özellikler: dört tür, ürünlerin değerleri; Kumaş: Keten yalnız Keten Masa Örtüsü", async () => {
    const tanimlar = await ozellikServisi.hepsiniOku(vt);
    expect(tanimlar.map((t) => [t.ad, t.tur, t.birim])).toEqual([
      ["Kumaş", "liste", undefined],
      ["Gramaj", "sayi", "g/m²"],
      ["Makinede yıkanabilir", "evet-hayir", undefined],
      ["Bakım notu", "metin", undefined],
    ]);
    const tanim = (ad: string) => tanimlar.find((t) => t.ad === ad);
    const kumas = tanim("Kumaş");
    const secenek = (ad: string) => kumas?.secenekler.find((s) => s.ad === ad)?.kimlik ?? "";
    expect(kumas?.secenekler.map((s) => s.ad)).toEqual(["Pamuk", "Polyester", "Keten"]);
    const degerleri = (adresAdi: string) =>
      Object.fromEntries(
        urun(adresAdi).ozellikler.map((d) => {
          const t = tanimlar.find((x) => x.kimlik === d.ozellik);
          const deger =
            t?.tur === "liste" ? t.secenekler.find((s) => s.kimlik === d.deger)?.ad : d.deger;
          return [t?.ad, deger];
        }),
      );
    expect(degerleri("basic-tisort")).toEqual({
      Kumaş: "Pamuk",
      Gramaj: 180,
      "Makinede yıkanabilir": true,
      "Bakım notu": "30 derecede ters yıkayın",
    });
    expect(degerleri("kapusonlu-sweatshirt")).toEqual({
      Kumaş: "Pamuk",
      Gramaj: 320,
      "Makinede yıkanabilir": true,
      "Bakım notu": "Pamuk ve polyester karışımıdır. Kurutma makinesine atmayın.",
    });
    expect(degerleri("keten-masa-ortusu")).toEqual({
      Kumaş: "Keten",
      "Makinede yıkanabilir": true,
    });
    const ketenli = await ozellikServisi.urunleri(vt, kumas?.kimlik ?? "", secenek("Keten"));
    expect(ketenli.urunler).toEqual([urun("keten-masa-ortusu").kimlik]);
    const pamuklu = await ozellikServisi.urunleri(vt, kumas?.kimlik ?? "", secenek("Pamuk"));
    expect(pamuklu.urunler.toSorted()).toEqual(
      [urun("basic-tisort").kimlik, urun("kapusonlu-sweatshirt").kimlik].toSorted(),
    );
  });
});
