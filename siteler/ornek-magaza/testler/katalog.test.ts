// Örnek Mağaza'nın başlangıç kataloğu (kart 0084): KURALLAR.md'deki tablonun her durumu, katalog boş bir
// veritabanına kurulduktan sonra çekirdeğin kendi işlevleriyle gerçekten o durumda görünür. Zaman sabit
// verilir: tarihli indirim ve zamanlanmış ürün takvimden bağımsız denenir.
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { etiketServisi } from "../../../cekirdek/moduller/etiket/servis.ts";
import { fiyatGosterimServisi } from "../../../cekirdek/moduller/fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../../../cekirdek/moduller/fiyat/servis.ts";
import {
  kategorileriOku,
  kategorininUrunleri,
} from "../../../cekirdek/moduller/kategori/servis.ts";
import { markaServisi } from "../../../cekirdek/moduller/marka/servis.ts";
import { siteninStokDurumlari } from "../../../cekirdek/moduller/stok/durum.ts";
import { katalogBaslangiciniKur } from "../../../cekirdek/moduller/urun/baslangic.ts";
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
const urunlerim = new Map<string, Urun>();

beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ornek-katalog"));
  expect(await katalogBaslangiciniKur(vt, site)).toBe(true);
  for (const satir of await vt.select({ kimlik: urunler.kimlik }).from(urunler)) {
    const urun = await urunServisi.urunuOku(vt, satir.kimlik);
    if (urun !== undefined) urunlerim.set(urun.adresAdi, urun);
  }
});
afterAll(async () => {
  await sil();
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
  it("sekiz ürün, üç kategori; bütün ürünler %20 sınıfında", async () => {
    expect(urunlerim.size).toBe(8);
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
    expect(satirlar).toHaveLength(8);
    const [kupa] = await vt
      .select({ durum: urunler.durum })
      .from(urunler)
      .where(eq(urunler.adres_adi, "porselen-kupa"));
    expect(kupa?.durum).toBe("yayinda");
  });
});
