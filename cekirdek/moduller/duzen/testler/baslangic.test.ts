// Sitenin başlangıç düzeninin kayıtlara adres adıyla bağlanması, gerçek veritabanıyla (kart 0114, karar 0092):
// adres adlarının silinmemiş kayıtların kimliğine çevrilmesi, katalog kurulmadan düzenin yazılmaması (vitrin
// boş görür), bulunamayan kaydın kendi öğesiyle düşmesi ve hatanın bir kez kaydedilmesi, kurulumun bir kez
// yapılması, açık duran silmeyle yarış.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import type { BaslangicDuzeni } from "../../../vitrin/bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import { etiketServisi } from "../../etiket/servis.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriEkle, kategoriKilidiAl, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { KatalogBekleniyor } from "../baslangic.ts";
import { duzenSurumleri } from "../model.ts";
import { duzenServisi } from "../servis.ts";

const ornekSite = siteKlasorunuOku(
  join(import.meta.dirname, "..", "..", "..", "ayar-semasi", "testler", "ornek-siteler", "gecerli"),
);

// Adres adıyla başvuran başlangıç düzeni: liste öğesinde (kategori kutuları, marka logoları), elle seçimde,
// bölümün kendi alanında (ürün kaynağı) ve listedeki ürün kaynağında (sekmeli vitrin).
const baslangicDuzeni: BaslangicDuzeni = {
  "ust-kisim": [],
  "ana-sayfa": [
    {
      tur: "kategori-kutulari",
      gizli: false,
      degerler: { kategoriler: [{ kategori: "giyim" }, { kategori: "ev" }] },
    },
    {
      tur: "urun-vitrini",
      gizli: false,
      degerler: { urunler: { tur: "elle", urunler: ["kupa", "atki"] } },
    },
    {
      tur: "urun-vitrini",
      gizli: false,
      degerler: { urunler: { tur: "kategori", kategori: "ev", adet: 4 } },
    },
    {
      tur: "sekmeli-vitrin",
      gizli: false,
      degerler: {
        sekmeler: [
          { baslik: "Yeni", urunler: { tur: "etiket", etiket: "yeni", adet: 4 } },
          { baslik: "Marka", urunler: { tur: "marka", marka: "deneme-ses", adet: 4 } },
        ],
      },
    },
    {
      tur: "marka-logolari",
      gizli: true,
      degerler: { markalar: [{ marka: "deneme-ses" }] },
    },
    { tur: "musteri-yorumlari", gizli: false, degerler: {} },
  ],
  "alt-kisim": [],
};
const site: Site = { ...ornekSite, duzenBaslangici: baslangicDuzeni };
const servis = duzenServisi(
  () => site,
  () => bolumKutuphanesi,
);
const urunler = urunServisi(() => "Europe/Istanbul");

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const izlenenler: IzlenenHata[] = [];
hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));
const duzenHatalari = () =>
  izlenenler.filter((olay) => JSON.stringify(olay.baglam).includes("duzen-baslangici"));

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("duzen-baslangic");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  izlenenler.length = 0;
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

// Kataloğun yerine: düzenin başvurduğu kayıtlar servislerle açılır.
const kayitlariAc = async (vt: Veritabani) => {
  const giyim = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
  const ev = await kategoriEkle(vt, yonetici(), { ad: "Ev" });
  const marka = await markaServisi.ekle(vt, yonetici(), { ad: "Deneme Ses" });
  const etiket = await etiketServisi.ekle(vt, yonetici(), { ad: "Yeni" });
  const kupa = await urunler.urunEkle(vt, yonetici(), { ad: "Kupa", vergiSinifi: null });
  const atki = await urunler.urunEkle(vt, yonetici(), { ad: "Atkı", vergiSinifi: null });
  return { giyim, ev, marka, etiket, kupa, atki };
};

const surumSayisi = async (vt: Veritabani) =>
  (await vt.select({ sira: duzenSurumleri.sira }).from(duzenSurumleri)).length;

describe("adres adıyla başvuran başlangıç düzeni", () => {
  it("adres adları silinmemiş kayıtların kimliğine çevrilir, düzen bir kez yazılır", async () => {
    const vt = await siteAc();
    const k = await kayitlariAc(vt);
    expect(await servis.baslangiciKur(vt)).toBe(true);
    const { duzen, sira } = await servis.duzenOku(vt);
    expect(sira).toBe(1);
    expect(duzen["ana-sayfa"].map((bolum) => [bolum.tur, bolum.degerler])).toEqual([
      ["kategori-kutulari", { kategoriler: [{ kategori: k.giyim }, { kategori: k.ev }] }],
      [
        "urun-vitrini",
        expect.objectContaining({ urunler: { tur: "elle", urunler: [k.kupa, k.atki] } }),
      ],
      [
        "urun-vitrini",
        expect.objectContaining({ urunler: { tur: "kategori", kategori: k.ev, adet: 4 } }),
      ],
      [
        "sekmeli-vitrin",
        expect.objectContaining({
          sekmeler: [
            { baslik: "Yeni", urunler: { tur: "etiket", etiket: k.etiket, adet: 4 } },
            { baslik: "Marka", urunler: { tur: "marka", marka: k.marka, adet: 4 } },
          ],
        }),
      ],
      ["marka-logolari", { markalar: [{ marka: k.marka }] }],
      ["musteri-yorumlari", expect.any(Object)],
    ]);
    // Gizli bölüm gizli kalır.
    expect(duzen["ana-sayfa"][4]?.gizli).toBe(true);
    // İkinci kurulum ve okuma hiçbir şey yazmaz.
    expect(await servis.baslangiciKur(vt)).toBe(false);
    await servis.duzenOku(vt);
    expect(await surumSayisi(vt)).toBe(1);
    expect(duzenHatalari()).toEqual([]);
  });

  it("katalog kurulmadan yazılmaz: okuma KatalogBekleniyor verir, vitrin düzeni boş görür; katalogdan sonra yazılır", async () => {
    const vt = await siteAc();
    await expect(servis.duzenOku(vt)).rejects.toBeInstanceOf(KatalogBekleniyor);
    await expect(servis.baslangiciKur(vt)).rejects.toBeInstanceOf(KatalogBekleniyor);
    expect(await servis.cizilecekBolumler(vt, "ana-sayfa")).toEqual([]);
    expect(await servis.vitrindekiGorseller(vt)).toEqual(new Set());
    expect(await surumSayisi(vt)).toBe(0);
    expect(izlenenler).toEqual([]);
    await kayitlariAc(vt);
    const cizilen = await servis.cizilecekBolumler(vt, "ana-sayfa");
    expect(cizilen.map((bolum) => bolum.tur)).toEqual([
      "kategori-kutulari",
      "urun-vitrini",
      "urun-vitrini",
      "sekmeli-vitrin",
    ]);
    expect(await surumSayisi(vt)).toBe(1);
  });

  it("katalog beklenirken düzene dokunan işlem bilinen hatayla (503, katalog-bekleniyor) döner", async () => {
    const vt = await siteAc();
    const hata = await servis
      .bolumEkle(vt, yonetici(), "ana-sayfa", { tur: "musteri-yorumlari", degerler: {} })
      .then(
        () => undefined,
        (yakalanan: unknown) => yakalanan,
      );
    expect(hata).toBeInstanceOf(BilinenHata);
    expect(hata).toMatchObject({
      kod: "hizmet-kullanilamiyor",
      ayrinti: [{ alan: "duzen", kod: "katalog-bekleniyor" }],
    });
    expect(await surumSayisi(vt)).toBe(0);
  });

  it("kayda başvurmayan düzen katalogu beklemez", async () => {
    const vt = await siteAc();
    const temasiz = duzenServisi(
      () => ({
        ...site,
        duzenBaslangici: {
          "ust-kisim": [],
          "ana-sayfa": [{ tur: "musteri-yorumlari", gizli: false, degerler: {} }],
          "alt-kisim": [],
        },
      }),
      () => bolumKutuphanesi,
    );
    expect(await temasiz.baslangiciKur(vt)).toBe(true);
    expect(await surumSayisi(vt)).toBe(1);
  });

  it("bulunamayan kayıt kendi öğesiyle düşer, öteki bölümler yazılır; hata bir kez kaydedilir", async () => {
    const vt = await siteAc();
    const k = await kayitlariAc(vt);
    // Kurulumdan önce mağaza sahibi "ev" kategorisini ve atkıyı siler.
    await kategoriSil(vt, yonetici(), k.ev);
    await urunler.urunSil(vt, yonetici(), k.atki);
    expect(await servis.baslangiciKur(vt)).toBe(true);
    const { duzen } = await servis.duzenOku(vt);
    expect(duzen["ana-sayfa"].map((bolum) => [bolum.tur, bolum.degerler])).toEqual([
      // Listede yalnız o öğe düşer.
      ["kategori-kutulari", { kategoriler: [{ kategori: k.giyim }] }],
      // Elle seçimde yalnız o ürün düşer.
      ["urun-vitrini", expect.objectContaining({ urunler: { tur: "elle", urunler: [k.kupa] } })],
      // Bölümün kendi alanındaki kaynak bulunamayınca bölüm düşer (ikinci ürün vitrini yok).
      ["sekmeli-vitrin", expect.any(Object)],
      ["marka-logolari", expect.any(Object)],
      ["musteri-yorumlari", expect.any(Object)],
    ]);
    expect(duzenHatalari()).toHaveLength(1);
    expect(JSON.stringify(duzenHatalari()[0])).toContain("kategori ev");
    expect(JSON.stringify(duzenHatalari()[0])).toContain("urun atki");
    await servis.duzenOku(vt);
    expect(duzenHatalari()).toHaveLength(1);
  });

  it("listenin en az sınırının altına inen ya da boş kalan elle seçimli bölüm düşer", async () => {
    const vt = await siteAc();
    const k = await kayitlariAc(vt);
    await kategoriSil(vt, yonetici(), k.giyim);
    await kategoriSil(vt, yonetici(), k.ev);
    await urunler.urunSil(vt, yonetici(), k.kupa);
    await urunler.urunSil(vt, yonetici(), k.atki);
    await servis.baslangiciKur(vt);
    const { duzen } = await servis.duzenOku(vt);
    expect(duzen["ana-sayfa"].map((bolum) => bolum.tur)).toEqual([
      "sekmeli-vitrin",
      "marka-logolari",
      "musteri-yorumlari",
    ]);
  });

  it("kurulum açık duran kategori yazmasının kategori kilidini bekler (ters sırayla kilitlenmez)", async () => {
    const vt = await siteAc();
    await kayitlariAc(vt);
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let aldi: () => void = () => undefined;
    const alindi = new Promise<void>((coz) => {
      aldi = coz;
    });
    const yazma = vt.transaction(async (islem) => {
      await kategoriKilidiAl(islem);
      aldi();
      await tut;
    });
    await alindi;
    const kurulum = servis.baslangiciKur(vt);
    await kilitBekleyeniGor(vt);
    expect(await surumSayisi(vt)).toBe(0);
    birak();
    await yazma;
    expect(await kurulum).toBe(true);
  });

  it("açık duran kategori silmesi kurulumu bekletir; silme kaydedilince o öğe yazılmaz", async () => {
    const vt = await siteAc();
    const k = await kayitlariAc(vt);
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let yazdi: () => void = () => undefined;
    const yazildi = new Promise<void>((coz) => {
      yazdi = coz;
    });
    const silme = vt.transaction(async (islem) => {
      await islem
        .update(kategoriler)
        .set({ silinme_zamani: sql`now()` })
        .where(eq(kategoriler.kimlik, k.giyim));
      yazdi();
      await tut;
    });
    await yazildi;
    const kurulum = servis.baslangiciKur(vt);
    await kilitBekleyeniGor(vt);
    birak();
    await silme;
    expect(await kurulum).toBe(true);
    const { duzen } = await servis.duzenOku(vt);
    expect(duzen["ana-sayfa"][0]?.degerler).toEqual({ kategoriler: [{ kategori: k.ev }] });
  });
});
