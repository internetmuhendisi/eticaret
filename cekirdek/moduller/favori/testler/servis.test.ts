// Müşterinin favorileri gerçek veritabanıyla (kart 0140, karar 0110):
// - Müşteri yalnız kendi favorilerini görür ve değiştirir; iki müşterinin listesi birbirine karışmaz.
// - Listede yalnız sayfası açılan ürün görünür: gizli ve tükenmiş ürün görünür; taslak, arşiv, silinmiş ve zamanı
//   gelmemiş ürün görünmez, satırı kalır ve ürün açılınca döner. Eklenen ürünün sayfası açılmalıdır.
// - Aynı ürün iki kez eklenmez; en yeni önce sıralanır.
// - Sınır sitenin ayarıdır; yalnız görünen favorileri sayar. Aynı anda gelen eklemeler sınırı aşamaz.
// - Birleşme hesaptakini ikinci kez eklemez, tarayıcıdaki sırayı korur, hepsini hesaptakilerden yeni sayar,
//   sayfası açılmayanı atlar, sınıra sığmayanları (en eskiler) ekleyip sayısını döner.
// - İki site birbirinin favorisini görmez.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { favoriSiniriEnCok } from "../../../kayitlar/favori.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { musteriler } from "../../musteri/model.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { urunler } from "../../urun/model.ts";
import { urunServisi } from "../../urun/servis.ts";
import { favoriler } from "../model.ts";
import { favoriBirlestirSemasi } from "../semalar.ts";
import { favoriServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
const sinirli = (favoriSiniri: number): Site => ({
  ...site,
  ayarlar: { ...site.ayarlar, favoriSiniri },
});
const servis = favoriServisi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

let vt: Veritabani;
let sil: () => Promise<void>;
let vtB: Veritabani;
let silB: () => Promise<void>;
beforeAll(async () => {
  [{ vt, sil }, { vt: vtB, sil: silB }] = await Promise.all([
    denemeSitesiAc("favori"),
    denemeSitesiAc("favori-b"),
  ]);
});
afterAll(async () => {
  await Promise.all([sil(), silB()]);
});

const urunAc = (
  durum: "yayinda" | "taslak" | "gizli" | "arsiv" = "yayinda",
  veritabani: Veritabani = vt,
) =>
  urunSrv.urunEkle(veritabani, yonetici(), {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: null,
    durum,
  });
const musteriAc = async (veritabani: Veritabani = vt) =>
  (
    await hesapAc(veritabani, "musteri", {
      eposta: `m-${randomUUID().slice(0, 8)}@ornek.test`,
      sifre: "uzun-bir-deneme-sifresi",
    })
  ).hesapKimligi;
const ekle = (musteri: string, urun: string, s = servis) =>
  s.favoriDegistir(vt, musteri, urun, true);
const cikar = (musteri: string, urun: string) => servis.favoriDegistir(vt, musteri, urun, false);
const hatasi = (vaat: Promise<unknown>) =>
  vaat.then(
    () => undefined,
    (hata: { kod?: string; ayrinti?: unknown }) => ({ kod: hata.kod, ayrinti: hata.ayrinti }),
  );
const satirlar = async (musteri: string) =>
  (
    await vt
      .select({ urun: favoriler.urun_kimligi })
      .from(favoriler)
      .where(eq(favoriler.musteri_kimligi, musteri))
  )
    .map((satir) => satir.urun)
    .toSorted();

describe("ekleme ve çıkarma", () => {
  it("en yeni önce sıralanır; aynı ürün ikinci kez eklenmez; çıkarılan listeden kalkar", async () => {
    const musteri = await musteriAc();
    const [a, b, c] = [await urunAc(), await urunAc(), await urunAc()];
    expect(await ekle(musteri, a)).toEqual([a]);
    expect(await ekle(musteri, b)).toEqual([b, a]);
    expect(await ekle(musteri, a)).toEqual([b, a]);
    expect(await ekle(musteri, c)).toEqual([c, b, a]);
    expect(await satirlar(musteri)).toEqual([a, b, c].toSorted());
    expect(await cikar(musteri, b)).toEqual([c, a]);
    // Favoride olmayanı çıkarmak bir şey değiştirmez.
    expect(await cikar(musteri, b)).toEqual([c, a]);
    expect(await servis.favoriListesi(vt, musteri)).toEqual([c, a]);
  });

  it("büyük harfli kimlik aynı ürün sayılır", async () => {
    const musteri = await musteriAc();
    const urun = await urunAc();
    await ekle(musteri, urun);
    expect(await ekle(musteri, urun.toUpperCase())).toEqual([urun]);
    expect(await cikar(musteri, urun.toUpperCase())).toEqual([]);
  });

  it("sayfası açılmayan, olmayan ve bozuk kimlikli ürün eklenmez; gizli ve tükenmiş ürün eklenir", async () => {
    const musteri = await musteriAc();
    const silinen = await urunAc();
    await urunSrv.urunSil(vt, yonetici(), silinen);
    for (const urun of [
      await urunAc("taslak"),
      await urunAc("arsiv"),
      silinen,
      randomUUID(),
      "bozuk",
    ]) {
      expect(await hatasi(ekle(musteri, urun))).toEqual({
        kod: "bulunamadi",
        ayrinti: [{ alan: "urun", kod: "urun-yok" }],
      });
    }
    expect(await satirlar(musteri)).toEqual([]);
    const gizli = await urunAc("gizli");
    const tukenmis = await urunAc();
    await vt.update(urunler).set({ stok_takibi: true }).where(eq(urunler.kimlik, tukenmis));
    expect(await ekle(musteri, gizli)).toEqual([gizli]);
    expect(await ekle(musteri, tukenmis)).toEqual([tukenmis, gizli]);
  });

  it("favori değişiklik kaydına girmez", async () => {
    const musteri = await musteriAc();
    const urun = await urunAc();
    await ekle(musteri, urun);
    await cikar(musteri, urun);
    expect(
      await vt
        .select()
        .from(degisiklikKayitlari)
        .where(eq(degisiklikKayitlari.kim_kimligi, musteri)),
    ).toEqual([]);
  });
});

describe("görünürlük", () => {
  it("taslağa, arşive alınan, silinen ve zamanlanan ürün listeden kalkar, satırı kalır; açılınca döner", async () => {
    const musteri = await musteriAc();
    const [taslak, arsiv, silinen, zamanli, kalan] = [
      await urunAc(),
      await urunAc(),
      await urunAc(),
      await urunAc(),
      await urunAc(),
    ];
    for (const urun of [kalan, zamanli, silinen, arsiv, taslak]) await ekle(musteri, urun);
    const yayinZamani = new Date(Date.now() + 60 * 60 * 1000);
    await vt.update(urunler).set({ durum: "taslak" }).where(eq(urunler.kimlik, taslak));
    await vt.update(urunler).set({ durum: "arsiv" }).where(eq(urunler.kimlik, arsiv));
    await urunSrv.urunSil(vt, yonetici(), silinen);
    await vt
      .update(urunler)
      .set({ durum: "zamanlanmis", yayin_zamani: yayinZamani })
      .where(eq(urunler.kimlik, zamanli));
    expect(await servis.favoriListesi(vt, musteri)).toEqual([kalan]);
    expect(await satirlar(musteri)).toEqual([taslak, arsiv, silinen, zamanli, kalan].toSorted());
    // Zamanlanmış ürün yayın zamanından bir milisaniye önce yok, zamanında var.
    expect(await servis.favoriListesi(vt, musteri, new Date(yayinZamani.getTime() - 1))).toEqual([
      kalan,
    ]);
    expect(await servis.favoriListesi(vt, musteri, yayinZamani)).toEqual([zamanli, kalan]);
    await vt.update(urunler).set({ durum: "yayinda" }).where(eq(urunler.kimlik, taslak));
    expect(await servis.favoriListesi(vt, musteri)).toEqual([taslak, kalan]);
  });
});

describe("sınır", () => {
  it("sınırdaki müşteri yeni ürün ekleyemez, var olanı yeniden ekleyebilir; çıkarınca yer açılır", async () => {
    const uc = favoriServisi(sinirli(3));
    const musteri = await musteriAc();
    const [a, b, c, d] = [await urunAc(), await urunAc(), await urunAc(), await urunAc()];
    for (const urun of [a, b, c]) await ekle(musteri, urun, uc);
    expect(await hatasi(ekle(musteri, d, uc))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "urun", kod: "favori-siniri" }],
    });
    expect(await ekle(musteri, a, uc)).toEqual([c, b, a]);
    await cikar(musteri, b);
    expect(await ekle(musteri, d, uc)).toEqual([d, c, a]);
  });

  it("görünmeyen ürünün satırı (silinmiş, taslak, arşiv) sınıra sayılmaz; ürün açılınca liste sınırı aşabilir", async () => {
    const iki = favoriServisi(sinirli(2));
    const musteri = await musteriAc();
    const [silinen, taslak, yeni, son] = [
      await urunAc(),
      await urunAc(),
      await urunAc(),
      await urunAc(),
    ];
    await ekle(musteri, silinen, iki);
    await ekle(musteri, taslak, iki);
    await urunSrv.urunSil(vt, yonetici(), silinen);
    await vt.update(urunler).set({ durum: "taslak" }).where(eq(urunler.kimlik, taslak));
    expect(await ekle(musteri, yeni, iki)).toEqual([yeni]);
    expect(await ekle(musteri, son, iki)).toEqual([son, yeni]);
    await vt.update(urunler).set({ durum: "yayinda" }).where(eq(urunler.kimlik, taslak));
    expect(await iki.favoriListesi(vt, musteri)).toEqual([son, yeni, taslak]);
  });

  it("açık duran eklemenin arkasındaki ikinci ekleme müşterinin kilidinde bekler ve sınırı aşamaz", async () => {
    const bir = favoriServisi(sinirli(1));
    const musteri = await musteriAc();
    const [ilk, ikinciUrun] = [await urunAc(), await urunAc()];
    let ikinci: Promise<unknown> | undefined;
    await vt.transaction(async (islem) => {
      // Birinci ekleme kaydedilmeden durur: ikincinin sayımı onu kilitten sonra görmelidir.
      await islem
        .select({ kimlik: musteriler.kimlik })
        .from(musteriler)
        .where(eq(musteriler.kimlik, musteri))
        .for("update");
      await islem.insert(favoriler).values({ musteri_kimligi: musteri, urun_kimligi: ilk });
      ikinci = hatasi(ekle(musteri, ikinciUrun, bir));
      await kilitBekleyeniGor(vt);
    });
    expect(await ikinci).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "urun", kod: "favori-siniri" }],
    });
    expect(await satirlar(musteri)).toEqual([ilk]);
  });

  it("aynı anda gelen sekiz ekleme sınırı aşamaz", async () => {
    const uc = favoriServisi(sinirli(3));
    const musteri = await musteriAc();
    const liste = await Promise.all(Array.from({ length: 8 }, () => urunAc()));
    const sonuclar = await Promise.all(liste.map((urun) => hatasi(ekle(musteri, urun, uc))));
    expect(sonuclar.filter((sonuc) => sonuc === undefined)).toHaveLength(3);
    expect(await satirlar(musteri)).toHaveLength(3);
  });
});

describe("birleşme", () => {
  it("hesaptakini ikinci kez eklemez, tarayıcıdaki sırayı korur ve hepsini hesaptakilerden yeni sayar", async () => {
    const musteri = await musteriAc();
    const [hesapta, ortak, yeniEski, yeniYeni] = [
      await urunAc(),
      await urunAc(),
      await urunAc(),
      await urunAc(),
    ];
    await ekle(musteri, ortak);
    await ekle(musteri, hesapta);
    // Tarayıcıdaki liste en yeni önce; aynı ürün iki kez ve büyük harfle de gelebilir.
    const sonuc = await servis.favorileriBirlestir(vt, musteri, [
      yeniYeni,
      ortak,
      yeniEski,
      yeniYeni.toUpperCase(),
    ]);
    expect(sonuc).toEqual({ favoriler: [yeniYeni, yeniEski, hesapta, ortak], sigmayan: 0 });
    expect(await satirlar(musteri)).toEqual([hesapta, ortak, yeniEski, yeniYeni].toSorted());
    // İkinci birleşme bir şey değiştirmez.
    expect(await servis.favorileriBirlestir(vt, musteri, [yeniYeni, ortak])).toEqual(sonuc);
  });

  it("sayfası açılmayan, olmayan ve bozuk kimlikli ürünü atlar", async () => {
    const musteri = await musteriAc();
    const acik = await urunAc();
    const silinen = await urunAc();
    await urunSrv.urunSil(vt, yonetici(), silinen);
    const sonuc = await servis.favorileriBirlestir(vt, musteri, [
      await urunAc("taslak"),
      silinen,
      randomUUID(),
      "bozuk",
      acik,
    ]);
    expect(sonuc).toEqual({ favoriler: [acik], sigmayan: 0 });
    expect(await satirlar(musteri)).toEqual([acik]);
  });

  it("sınıra sığmayanları, tarayıcıdaki en eskileri, eklemez ve sayısını döner", async () => {
    const uc = favoriServisi(sinirli(3));
    const musteri = await musteriAc();
    const hesapta = await urunAc();
    await ekle(musteri, hesapta, uc);
    const tarayicida = await Promise.all(Array.from({ length: 4 }, () => urunAc()));
    // Hesaptaki ürün tarayıcıda da var: yer kaplamaz, sığmayan sayılmaz.
    const sonuc = await uc.favorileriBirlestir(vt, musteri, [hesapta, ...tarayicida]);
    expect(sonuc).toEqual({
      favoriler: [tarayicida[0], tarayicida[1], hesapta],
      sigmayan: 2,
    });
  });

  it("boş liste hesaptakini döner", async () => {
    const musteri = await musteriAc();
    const urun = await urunAc();
    await ekle(musteri, urun);
    expect(await servis.favorileriBirlestir(vt, musteri, [])).toEqual({
      favoriler: [urun],
      sigmayan: 0,
    });
  });

  it("şema sınırın en büyük değerinden uzun listeyi reddeder", () => {
    const uzun = Array.from({ length: favoriSiniriEnCok + 1 }, () => randomUUID());
    expect(favoriBirlestirSemasi.safeParse({ urunler: uzun }).success).toBe(false);
    expect(favoriBirlestirSemasi.safeParse({ urunler: uzun.slice(1) }).success).toBe(true);
  });
});

describe("ayrım", () => {
  it("bir müşterinin değişikliği ötekinin listesine dokunmaz", async () => {
    const [a, b] = [await musteriAc(), await musteriAc()];
    const [x, y] = [await urunAc(), await urunAc()];
    await ekle(a, x);
    await ekle(b, y);
    await ekle(b, x);
    expect(await cikar(a, y)).toEqual([x]);
    expect(await servis.favoriListesi(vt, b)).toEqual([x, y]);
    await servis.favorileriBirlestir(vt, a, [y]);
    expect(await servis.favoriListesi(vt, b)).toEqual([x, y]);
    expect(await cikar(a, x)).toEqual([y]);
    expect(await servis.favoriListesi(vt, b)).toEqual([x, y]);
  });

  it("iki site birbirinin favorisini görmez", async () => {
    const musteri = await musteriAc();
    const urun = await urunAc();
    await ekle(musteri, urun);
    const musteriB = await musteriAc(vtB);
    const urunB = await urunAc("yayinda", vtB);
    expect(await servis.favoriListesi(vtB, musteri)).toEqual([]);
    // A sitesinin ürünü B sitesinde yoktur.
    expect(await hatasi(servis.favoriDegistir(vtB, musteriB, urun, true))).toEqual({
      kod: "bulunamadi",
      ayrinti: [{ alan: "urun", kod: "urun-yok" }],
    });
    expect(await servis.favoriDegistir(vtB, musteriB, urunB, true)).toEqual([urunB]);
    expect(await servis.favoriListesi(vt, musteri)).toEqual([urun]);
  });
});
