// Başlangıç menüleri gerçek veritabanıyla (kart 0107, karar 0082): site klasöründeki menülerin katalogdan
// sonra adres adlarıyla bağlanıp bir kez yazılması, değişiklik kaydında sistem işlemi olarak görünmesi,
// aynı anda gelen çağrılarda tek yazım, bulunamayan kaydın öğesinin yazılmayıp hatanın kaydedilmesi ve
// yazılamayan menüde hiçbir parçanın kalmaması.
import { join } from "node:path";
import { count, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { kategoriKilidiAl } from "../../kategori/servis.ts";
import { markalar } from "../../marka/model.ts";
import { markaServisi } from "../../marka/servis.ts";
import { katalogBaslangiciniKur } from "../../urun/baslangic.ts";
import { menuBaslangiciniKur } from "../baslangic.ts";
import { menuler, menuOgeleri } from "../model.ts";
import { type MenuDali, vitrinMenusu } from "../servis.ts";

const site = siteKlasorunuOku(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "ayar-semasi",
    "testler",
    "ornek-siteler",
    "menu-dolu",
  ),
);

const izlenenler: IzlenenHata[] = [];
hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));

const temizlenecekler: (() => Promise<void>)[] = [];
const kataloglaAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("menu-baslangic");
  temizlenecekler.push(acilan.sil);
  expect(await katalogBaslangiciniKur(acilan.vt, site)).toBe(true);
  return acilan.vt;
};
afterEach(async () => {
  izlenenler.length = 0;
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

type Ozet = [string, string, Ozet[]];
const ozet = (dallar: MenuDali[] | undefined): Ozet[] =>
  (dallar ?? []).map((dal) => [
    dal.metin,
    dal.hedef.tur === "adres"
      ? `adres ${dal.hedef.adres}${dal.hedef.yeniSekme ? " yeni" : ""}`
      : dal.hedef.tur === "baslik"
        ? "baslik"
        : `${dal.hedef.tur} ${dal.hedef.adresAdi}`,
    ozet(dal.altlar),
  ]);

const sayilar = async (vt: Veritabani) => ({
  menu: (await vt.select({ sayi: count() }).from(menuler))[0]?.sayi,
  oge: (await vt.select({ sayi: count() }).from(menuOgeleri))[0]?.sayi,
});

describe("başlangıç menüleri", () => {
  it("katalogdan sonra adres adlarıyla bağlanıp bir kez yazılır, kayda sistem olarak girer", async () => {
    const vt = await kataloglaAc();
    expect(await menuBaslangiciniKur(vt, site)).toBe(true);
    expect(ozet(await vitrinMenusu(vt, "ana-menu"))).toEqual([
      [
        "Birinci Bölüm",
        "kategori birinci",
        [
          ["Deneme Ürünü", "urun deneme-urunu", []],
          ["Kendi adı", "kategori ikinci", []],
        ],
      ],
      ["Deneme Markası", "marka deneme-markasi", []],
      ["Yardım", "adres https://yardim.example/sss yeni", []],
    ]);
    expect(ozet(await vitrinMenusu(vt, "kategori-menusu"))).toEqual([
      ["Birinci Bölüm", "kategori birinci", []],
      ["İkinci Bölüm", "kategori ikinci", []],
    ]);
    expect(ozet(await vitrinMenusu(vt, "alt-bilgi"))).toEqual([
      ["Sözleşmeler", "baslik", [["Üyelik sözleşmesi", "adres /yasal/uyelik-sozlesmesi", []]]],
    ]);
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kim_adi, "baslangic-menu"));
    expect(kayitlar.filter((k) => k.islem === "menu.eklendi")).toHaveLength(3);
    expect(kayitlar.filter((k) => k.islem === "menu-ogesi.eklendi")).toHaveLength(7);
    expect(kayitlar.every((k) => k.kim_turu === "sistem")).toBe(true);
    // İkinci çağrı bir şey değiştirmez; mağaza sahibi bütün menüleri silse de dosya yeniden yazılmaz.
    const once = await sayilar(vt);
    expect(await menuBaslangiciniKur(vt, site)).toBe(false);
    await vt.update(menuler).set({ silinme_zamani: new Date() });
    expect(await menuBaslangiciniKur(vt, site)).toBe(false);
    expect(await sayilar(vt)).toEqual(once);
    expect(izlenenler).toEqual([]);
  });

  it("aynı anda üç çağrıda menüler bir kez yazılır", async () => {
    const vt = await kataloglaAc();
    const sonuclar = await Promise.all([1, 2, 3].map(() => menuBaslangiciniKur(vt, site)));
    expect(sonuclar.filter(Boolean)).toHaveLength(1);
    expect(await sayilar(vt)).toEqual({ menu: 3, oge: 7 });
  });

  it("kurulumdan önce silinen kaydın öğesi altlarıyla yazılmaz, hata bir kez kaydedilir", async () => {
    const vt = await kataloglaAc();
    const [marka] = await vt.select({ kimlik: markalar.kimlik }).from(markalar);
    if (marka === undefined) throw new Error("Marka yok.");
    await markaServisi.sil(vt, { tur: "sistem", ad: "deneme" }, marka.kimlik);
    const birinci: Site = {
      ...site,
      menuBaslangici: [
        {
          kod: "ana-menu",
          ad: "Ana menü",
          tur: "elle",
          ogeler: [
            {
              hedef: { tur: "marka", adresAdi: "deneme-markasi" },
              altlar: [
                {
                  metin: "Alt",
                  hedef: { tur: "adres", adres: "/a", yeniSekme: false },
                  altlar: [],
                },
              ],
            },
            { hedef: { tur: "kategori", adresAdi: "birinci" }, altlar: [] },
          ],
        },
      ],
    };
    expect(await menuBaslangiciniKur(vt, birinci)).toBe(true);
    expect(ozet(await vitrinMenusu(vt, "ana-menu"))).toEqual([
      ["Birinci Bölüm", "kategori birinci", []],
    ]);
    expect(await sayilar(vt)).toEqual({ menu: 1, oge: 1 });
    expect(izlenenler).toHaveLength(1);
    expect(JSON.stringify(izlenenler[0])).toContain("ana-menu: marka deneme-markasi");
  });

  it("bir öğe yazılamazsa hiçbir menü kalmaz; dosyası boş sitede bir şey yazılmaz", async () => {
    const vt = await kataloglaAc();
    const bozuk: Site = {
      ...site,
      menuBaslangici: [
        { kod: "ana-menu", ad: "Ana menü", tur: "elle", ogeler: [] },
        {
          kod: "alt-bilgi",
          ad: "Alt bilgi",
          tur: "elle",
          // Şemayı atlayan bozuk değer: servis reddeder.
          ogeler: [
            {
              metin: "A",
              hedef: { tur: "adres", adres: "javascript:alert(1)", yeniSekme: false },
              altlar: [],
            },
          ],
        },
      ],
    };
    await expect(menuBaslangiciniKur(vt, bozuk)).rejects.toThrow();
    expect(await sayilar(vt)).toEqual({ menu: 0, oge: 0 });
    expect(await menuBaslangiciniKur(vt, { ...site, menuBaslangici: [] })).toBe(false);
    expect(await sayilar(vt)).toEqual({ menu: 0, oge: 0 });
    // Sonraki deneme dosyayla yazar.
    expect(await menuBaslangiciniKur(vt, site)).toBe(true);
  });
});

describe("bağımsız kontrolün bulguları", () => {
  it("kurulum kategori kilidini bekler: açık duran kategori yazmasıyla kilitlenmez", async () => {
    const vt = await kataloglaAc();
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let aldi: () => void = () => undefined;
    const alindi = new Promise<void>((coz) => {
      aldi = coz;
    });
    const kategoriYazmasi = vt.transaction(async (islem) => {
      await kategoriKilidiAl(islem);
      aldi();
      await tut;
    });
    await alindi;
    const kurulum = menuBaslangiciniKur(vt, site);
    await kilitBekleyeniGor(vt);
    birak();
    await kategoriYazmasi;
    expect(await kurulum).toBe(true);
  });

  it("okumayla bağlama arasında silinen kayıt bütün kurulumu düşürmez: öğesi atlanır", async () => {
    const vt = await kataloglaAc();
    const [marka] = await vt.select({ kimlik: markalar.kimlik }).from(markalar);
    if (marka === undefined) throw new Error("Marka yok.");
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
        .update(markalar)
        .set({ silinme_zamani: new Date() })
        .where(eq(markalar.kimlik, marka.kimlik));
      yazdi();
      await tut;
    });
    await yazildi;
    const kurulum = menuBaslangiciniKur(vt, site);
    await kilitBekleyeniGor(vt);
    birak();
    await silme;
    expect(await kurulum).toBe(true);
    expect(ozet(await vitrinMenusu(vt, "ana-menu")).map(([metin]) => metin)).toEqual([
      "Birinci Bölüm",
      "Yardım",
    ]);
    expect(izlenenler).toHaveLength(1);
  });
});
