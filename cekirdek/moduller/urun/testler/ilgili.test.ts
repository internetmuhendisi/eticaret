// İlgili ürünler gerçek veritabanıyla (kart 0079, karar 0065): elle seçim sırası ve sınırı, seçim yoksa
// ya da seçilenlerin hiçbiri görünmüyorsa kategoriden en yeni önce, vitrinde görünmeyen ürünün (taslak,
// gizli, arşiv, zamanı gelmemiş, silinmiş) girmemesi, tek sorgu, seçimin doğrulanması ve kaydı, iki site.
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriEkle } from "../../kategori/servis.ts";
import { ilgiliUrunleriGetir, ilgiliUrunSiniri } from "../ilgili.ts";
import { urunIlgilileri } from "../model.ts";
import type { UrunGirdisi } from "../semalar.ts";
import { urunServisi } from "../servis.ts";

const servis = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("ilgili");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

let sayac = 0;
const urun = (vt: Veritabani, ek: Partial<UrunGirdisi> = {}) => {
  sayac += 1;
  return servis.urunEkle(vt, yonetici(), {
    ad: `Ürün ${sayac}`,
    vergiSinifi: null,
    durum: "yayinda",
    ...ek,
  });
};
const kategori = (vt: Veritabani, ad: string) => kategoriEkle(vt, yonetici(), { ad });
const gecersiz = (kod: string) => ({ kod: "dogrulama", ayrinti: [{ alan: "ilgiliUrunler", kod }] });

describe("elle seçim", () => {
  it("seçim sırasıyla gelir, en çok sınır kadar; görünmeyen atlanır, sonraki yerini alır", async () => {
    const vt = await siteAc();
    const secilenler = [];
    for (let sira = 0; sira < 6; sira += 1) secilenler.push(await urun(vt));
    const ana = await urun(vt, { ilgiliUrunler: secilenler.toReversed() });
    expect(ilgiliUrunSiniri).toBe(4);
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual(secilenler.toReversed().slice(0, 4));
    const [ilk, ikinci] = secilenler.toReversed();
    if (ilk === undefined || ikinci === undefined) throw new Error("Ürün eksik.");
    await servis.urunDegistir(vt, yonetici(), ilk, { durum: "arsiv" });
    await servis.urunSil(vt, yonetici(), ikinci);
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual(secilenler.toReversed().slice(2, 6));
  });

  it("vitrin listesinde görünmeyen ürün girmez: taslak, gizli, arşiv, zamanı gelmemiş, silinmiş", async () => {
    const vt = await siteAc();
    const gorunen = await urun(vt);
    const gorunmeyenler = [
      await urun(vt, { durum: "taslak" }),
      await urun(vt, { durum: "gizli" }),
      await urun(vt, { durum: "arsiv" }),
      await urun(vt, { durum: "zamanlanmis", yayinZamani: "2099-01-01T00:00" }),
    ];
    const silinecek = await urun(vt);
    const ana = await urun(vt, { ilgiliUrunler: [...gorunmeyenler, silinecek, gorunen] });
    await servis.urunSil(vt, yonetici(), silinecek);
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual([gorunen]);
    // Zamanı gelince görünür.
    expect(await ilgiliUrunleriGetir(vt, ana, { an: new Date("2099-01-02T00:00:00Z") })).toEqual([
      gorunmeyenler[3],
      gorunen,
    ]);
  });

  it("seçilenlerin bir kısmı görünüyorsa liste kategoriden tamamlanmaz", async () => {
    const vt = await siteAc();
    const k = await kategori(vt, "Ortak");
    await urun(vt, { kategoriler: [k] });
    const secilen = await urun(vt);
    const ana = await urun(vt, { kategoriler: [k], ilgiliUrunler: [secilen] });
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual([secilen]);
  });
});

describe("kategoriden", () => {
  it("seçim yoksa ürünün kategorilerindeki öteki görünen ürünler en yeni önce gelir", async () => {
    const vt = await siteAc();
    const a = await kategori(vt, "A");
    const b = await kategori(vt, "B");
    const baska = await kategori(vt, "Başka");
    const ana = await urun(vt, { kategoriler: [a, b] });
    const eski = await urun(vt, { kategoriler: [a] });
    const ikisinde = await urun(vt, { kategoriler: [a, b] });
    await urun(vt, { kategoriler: [baska] });
    await urun(vt, { kategoriler: [a], durum: "taslak" });
    await urun(vt, { kategoriler: [b], durum: "gizli" });
    const yeni = await urun(vt, { kategoriler: [b] });
    const sorgu = vi.spyOn(vt.$client, "query");
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual([yeni, ikisinde, eski]);
    expect(sorgu).toHaveBeenCalledTimes(1);
  });

  it("en çok sınır kadar gelir; ürünün kendisi hiç gelmez", async () => {
    const vt = await siteAc();
    const k = await kategori(vt, "Kalabalık");
    const ana = await urun(vt, { kategoriler: [k] });
    const digerleri = [];
    for (let sira = 0; sira < 6; sira += 1) digerleri.push(await urun(vt, { kategoriler: [k] }));
    const sonuc = await ilgiliUrunleriGetir(vt, ana);
    expect(sonuc).toEqual(digerleri.toReversed().slice(0, 4));
    expect(sonuc).not.toContain(ana);
  });

  it("elle seçilenlerin hiçbiri görünmüyorsa kategoriden gelir", async () => {
    const vt = await siteAc();
    const k = await kategori(vt, "Yedek");
    const kategoride = await urun(vt, { kategoriler: [k] });
    const secilen = await urun(vt);
    const ana = await urun(vt, { kategoriler: [k], ilgiliUrunler: [secilen] });
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual([secilen]);
    await servis.urunDegistir(vt, yonetici(), secilen, { durum: "arsiv" });
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual([kategoride]);
  });

  it("kategorisi ve seçimi olmayan üründe liste boş; silinen kategori kullanılmaz", async () => {
    const vt = await siteAc();
    expect(await ilgiliUrunleriGetir(vt, await urun(vt))).toEqual([]);
    const k = await kategori(vt, "Silinecek");
    const ana = await urun(vt, { kategoriler: [k] });
    await urun(vt, { kategoriler: [k] });
    // İkinci ağ: silinmiş işaretli kategorinin bağlantısı kalsa da kullanılmaz (silmeyi atlayan yazı).
    await vt
      .update(kategoriler)
      .set({ silinme_zamani: sql`now()` })
      .where(eq(kategoriler.kimlik, k));
    expect(await ilgiliUrunleriGetir(vt, ana)).toEqual([]);
    expect(await ilgiliUrunleriGetir(vt, "abc")).toEqual([]);
  });
});

describe("seçimin doğrulanması ve kaydı", () => {
  it("kendisi, olmayan, silinmiş ve iki kez seçilen ürün reddedilir", async () => {
    const vt = await siteAc();
    const ana = await urun(vt);
    const silinen = await urun(vt);
    await servis.urunSil(vt, yonetici(), silinen);
    expect(
      await hatasi(servis.urunDegistir(vt, yonetici(), ana, { ilgiliUrunler: [ana] })),
    ).toEqual(gecersiz("ilgili-kendisi"));
    expect(await hatasi(urun(vt, { ilgiliUrunler: [silinen] }))).toEqual(
      gecersiz("ilgili-gecersiz"),
    );
    expect(await hatasi(urun(vt, { ilgiliUrunler: [randomUUID()] }))).toEqual(
      gecersiz("ilgili-gecersiz"),
    );
    const bir = await urun(vt);
    expect(await hatasi(urun(vt, { ilgiliUrunler: [bir, bir] }))).toEqual(
      gecersiz("ilgili-tekrar"),
    );
    await expect(
      vt.insert(urunIlgilileri).values({ urun_kimligi: ana, ilgili_kimligi: ana, sira: 0 }),
    ).rejects.toThrow();
  });

  it("seçim sırası okunur ve kayda sırasıyla girer; değişiklik listeyi baştan yazar", async () => {
    const vt = await siteAc();
    const [a, b, c] = [await urun(vt), await urun(vt), await urun(vt)];
    const ana = await urun(vt, { ilgiliUrunler: [c, a] });
    expect((await servis.urunuOku(vt, ana))?.ilgiliUrunler).toEqual([c, a]);
    await servis.urunDegistir(vt, yonetici(), ana, { ilgiliUrunler: [a, c] });
    await servis.urunDegistir(vt, yonetici(), ana, { ilgiliUrunler: [b] });
    await servis.urunSil(vt, yonetici(), b);
    // Sonradan silinen seçim okunmaz.
    expect((await servis.urunuOku(vt, ana))?.ilgiliUrunler).toEqual([]);
    const satirlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, ana))
      .orderBy(degisiklikKayitlari.zaman);
    expect(satirlar.map((s) => [s.islem, s.eski_deger, s.yeni_deger])).toEqual([
      ["urun.eklendi", null, expect.objectContaining({ ilgiliUrunler: [c, a] })],
      ["urun.degisti", { ilgiliUrunler: [c, a] }, { ilgiliUrunler: [a, c] }],
      ["urun.degisti", { ilgiliUrunler: [a, c] }, { ilgiliUrunler: [b] }],
    ]);
  });
});

describe("kontrol bulguları", () => {
  it("silinen seçim satırı, liste aynen yeniden kaydedilince de kalkar", async () => {
    const vt = await siteAc();
    const [x, y] = [await urun(vt), await urun(vt)];
    const ana = await urun(vt, { ilgiliUrunler: [x, y] });
    await servis.urunSil(vt, yonetici(), x);
    expect((await servis.urunuOku(vt, ana))?.ilgiliUrunler).toEqual([y]);
    await servis.urunDegistir(vt, yonetici(), ana, { ilgiliUrunler: [y] });
    expect(
      (await vt.select().from(urunIlgilileri).where(eq(urunIlgilileri.urun_kimligi, ana))).map(
        (satir) => satir.ilgili_kimligi,
      ),
    ).toEqual([y]);
  });

  it("sayfası vitrinde açılmayan ürünün ilgili listesi boştur", async () => {
    const vt = await siteAc();
    const k = await kategori(vt, "Kaynak");
    const secilen = await urun(vt, { kategoriler: [k] });
    for (const durum of ["taslak", "arsiv"] as const) {
      const ana = await urun(vt, { durum, kategoriler: [k], ilgiliUrunler: [secilen] });
      expect(await ilgiliUrunleriGetir(vt, ana)).toEqual([]);
    }
    const gizli = await urun(vt, { durum: "gizli", ilgiliUrunler: [secilen] });
    expect(await ilgiliUrunleriGetir(vt, gizli)).toEqual([secilen]);
    const silinen = await urun(vt, { kategoriler: [k] });
    await servis.urunSil(vt, yonetici(), silinen);
    expect(await ilgiliUrunleriGetir(vt, silinen)).toEqual([]);
  });
});

describe("iki site", () => {
  it("bir sitenin ürünü ötekinin ilgili listesine giremez ve görünmez", async () => {
    const [a, b] = await Promise.all([siteAc(), siteAc()]);
    const ondaki = await urun(a);
    expect(await hatasi(urun(b, { ilgiliUrunler: [ondaki] }))).toEqual(gecersiz("ilgili-gecersiz"));
    const ana = await urun(a, { ilgiliUrunler: [ondaki] });
    expect(await ilgiliUrunleriGetir(b, ana)).toEqual([]);
  });
});
