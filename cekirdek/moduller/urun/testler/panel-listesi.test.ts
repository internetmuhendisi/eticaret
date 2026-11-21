// Panelin ürün listesi gerçek veritabanıyla (kart 0262, karar 0161):
// - Kapsam: taslak, zamanlanmış, gizli ve arşiv dahil bütün silinmemiş ürünler; silinmiş ürün yok.
// - Arama: ad ve silinmemiş birimin stok kodu, Türkçe harfsiz ve büyük harfle, adın ortasından; % ve _ joker değil.
// - Süzgeçler: durum (birden çok), kategori alt kategorileriyle, marka; silinmiş kategori ve marka eşleşmez; stok
//   durumunun SQL koşulu her üründe satırın stok durumuyla (urunPanelStokDurumu) aynı: fiyatsız, takipsiz, tükenmiş,
//   eşikte, ürünün kendi eşiği ve eşik 0, silinmiş birim, varyantlı.
// - Sıralama: ad, stok (takipsiz sonda), fiyat (indirim sürüyorsa indirimli, fiyatsız sonda), son değişen.
// - Sayfa: sayfa boyu, sınır dışı sayfanın son sayfaya çekilmesi; durum sayıları öteki süzgeçlere uyar.
// - Toplu işlem: yayınla, taslağa al, arşive al, sil her üründe tekil işlemle; silinmiş ürün nedeniyle döner, ötekiler
//   işlenir.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { type UrunPanelStokDurumu, urunPanelStokDurumlari } from "../../../kayitlar/urun.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { stokDurumlari } from "../../stok/durum.ts";
import { stokServisi } from "../../stok/servis.ts";
import {
  type UrunPanelAyarlari,
  type UrunPanelListesiGirdisi,
  urunlerinPanelBirimleri,
  urunPanelListesi,
  urunPanelStokDurumu,
  urunTopluIslem,
} from "../panel-listesi.ts";
import type { UrunGirdisi } from "../semalar.ts";
import { urunServisi } from "../servis.ts";
import { secenekleriOku } from "../varyant.ts";

vi.setConfig({ testTimeout: 60_000 });

const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
const kim = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const silinecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});
const siteAc = async (): Promise<Veritabani> => {
  const deneme = await denemeSitesiAc("urun-panel");
  silinecekler.push(deneme.sil);
  return deneme.vt;
};

const ayarlar = (ek: Partial<UrunPanelAyarlari> = {}): UrunPanelAyarlari => ({
  paraBirimi: site.ayarlar.paraBirimi,
  dusukStokEsigi: 3,
  an: new Date(),
  dil: site.ayarlar.dil,
  ...ek,
});
const girdi = (ek: Partial<UrunPanelListesiGirdisi> = {}): UrunPanelListesiGirdisi => ({
  siralama: "ad-artan",
  sayfa: 1,
  sayfaBoyu: 25,
  ...ek,
});

// Ürün: verilen fiyat (null: fiyatsız) ve stok (0: stok yok); tek birimli.
const urunAc = async (
  vt: Veritabani,
  ad: string,
  ek: Partial<UrunGirdisi> = {},
  { satis = 10_000, miktar = 10 }: { satis?: number | null; miktar?: number } = {},
) => {
  const urun = await urunSrv.urunEkle(vt, kim(), {
    ad,
    vergiSinifi: null,
    durum: "yayinda",
    ...ek,
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  if (satis !== null) await fiyat.fiyatYaz(vt, kim(), birim, { satisFiyati: satis });
  if (miktar > 0) {
    await stok.stokDuzelt(vt, kim(), birim, {
      yeniMiktar: miktar,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
  }
  return { urun, birim };
};

const adlari = async (vt: Veritabani, ek: Partial<UrunPanelListesiGirdisi>, ayar = ayarlar()) =>
  (await urunPanelListesi(vt, girdi(ek), ayar)).satirlar.map((satir) => satir.ad);

describe("kapsam ve arama", () => {
  it("bütün durumlar gelir, silinmiş ürün gelmez; ad ve stok kodu harf kuralıyla aranır, joker yok", async () => {
    const vt = await siteAc();
    await urunAc(vt, "Çiçekli Şal", { durum: "yayinda", stokKodu: "SAL-001" });
    await urunAc(vt, "Gömlek", { durum: "taslak", stokKodu: "GMK_9" });
    await urunAc(vt, "Kupa", { durum: "gizli" });
    await urunAc(vt, "Termos", { durum: "arsiv" });
    await urunAc(vt, "Takvim", {
      durum: "zamanlanmis",
      yayinZamani: "2099-01-01T10:00",
    });
    const { urun: silinen } = await urunAc(vt, "Silinen");
    await urunSrv.urunSil(vt, kim(), silinen);
    expect(await adlari(vt, {})).toEqual(["Çiçekli Şal", "Gömlek", "Kupa", "Takvim", "Termos"]);
    expect(await adlari(vt, { ara: "CICEKLI" })).toEqual(["Çiçekli Şal"]);
    expect(await adlari(vt, { ara: "ekli s" })).toEqual(["Çiçekli Şal"]);
    expect(await adlari(vt, { ara: "sal-0" })).toEqual(["Çiçekli Şal"]);
    expect(await adlari(vt, { ara: "gmk_" })).toEqual(["Gömlek"]);
    expect(await adlari(vt, { ara: "%" })).toEqual([]);
    expect(await adlari(vt, { ara: "g_k" })).toEqual([]);
    expect(await adlari(vt, { ara: "silinen" })).toEqual([]);
  });
});

describe("süzgeçler", () => {
  it("durum birden çok; kategori alt kategorileriyle; marka; silinmiş kategori ve marka eşleşmez", async () => {
    const vt = await siteAc();
    const giyim = await kategoriEkle(vt, kim(), { ad: "Giyim" });
    const gomlek = await kategoriEkle(vt, kim(), { ad: "Gömlek", ust: giyim });
    const ev = await kategoriEkle(vt, kim(), { ad: "Ev" });
    const marka = await markaServisi.ekle(vt, kim(), { ad: "Marka" });
    const baska = await markaServisi.ekle(vt, kim(), { ad: "Başka" });
    await urunAc(vt, "A", { durum: "yayinda", kategoriler: [giyim], marka });
    await urunAc(vt, "B", { durum: "taslak", kategoriler: [gomlek] });
    await urunAc(vt, "C", { durum: "arsiv", kategoriler: [ev], marka: baska });
    expect(await adlari(vt, { durum: ["yayinda", "taslak"] })).toEqual(["A", "B"]);
    expect(await adlari(vt, { kategori: [giyim] })).toEqual(["A", "B"]);
    expect(await adlari(vt, { kategori: [gomlek.toUpperCase(), ev] })).toEqual(["B", "C"]);
    expect(await adlari(vt, { marka: [marka, baska] })).toEqual(["A", "C"]);
    expect(await adlari(vt, { marka: [marka], kategori: [giyim] })).toEqual(["A"]);
    expect(await adlari(vt, { kategori: ["bozuk"] })).toEqual(["A", "B", "C"]);
    await kategoriSil(vt, kim(), ev);
    await markaServisi.sil(vt, kim(), baska);
    expect(await adlari(vt, { kategori: [ev] })).toEqual([]);
    expect(await adlari(vt, { marka: [baska] })).toEqual([]);
  });

  it("stok süzgeci her üründe satırın stok durumuyla aynı sonucu verir", async () => {
    const vt = await siteAc();
    await urunAc(vt, "Bol", {}, { miktar: 10 });
    await urunAc(vt, "Eşikte", {}, { miktar: 3 });
    await urunAc(vt, "Tükenmiş", {}, { miktar: 0 });
    await urunAc(vt, "Fiyatsız", {}, { satis: null, miktar: 10 });
    await urunAc(vt, "Takipsiz", { stokTakibi: false }, { miktar: 0 });
    // Takibi sonradan kapatılan ürünün stoğu eşiğin altında kalır: yine düşük sayılmaz.
    const { urun: takipsizAz } = await urunAc(vt, "Takipsiz az", {}, { miktar: 2 });
    await urunSrv.urunDegistir(vt, kim(), takipsizAz, { stokTakibi: false });
    await urunAc(vt, "Kendi eşiği", { dusukStokEsigi: 20 }, { miktar: 10 });
    await urunAc(vt, "Eşik sıfır", { dusukStokEsigi: 0 }, { miktar: 1 });
    // Varyantlı: bir birleşim tükendi, öteki eşikte.
    const { urun: varyantli } = await urunAc(vt, "Varyantlı", {}, { satis: null, miktar: 0 });
    await urunSrv.secenekEkle(vt, kim(), varyantli, { ad: "Beden", degerler: ["S", "M"] });
    const [beden] =
      (await secenekleriOku(vt, [varyantli], { silinmisler: false })).get(varyantli) ?? [];
    for (const [sira, deger] of (beden?.degerler ?? []).entries()) {
      const birim = await urunSrv.birlesimEkle(vt, kim(), varyantli, { degerler: [deger.kimlik] });
      await fiyat.fiyatYaz(vt, kim(), birim, { satisFiyati: 5000 });
      if (sira === 0) {
        await stok.stokDuzelt(vt, kim(), birim, {
          yeniMiktar: 2,
          gorulenMiktar: 0,
          sebep: "sayim",
        });
      }
    }
    const ayar = ayarlar();
    const tumu = (await urunPanelListesi(vt, girdi({ sayfaBoyu: 100 }), ayar)).satirlar;
    const birimleri = await urunlerinPanelBirimleri(
      vt,
      tumu.map((satir) => satir.kimlik),
    );
    const durumlar = await stokDurumlari(
      vt,
      [...birimleri.values()].flat().map((birim) => birim.kimlik),
      { ...ayar, sonAdetEsigi: 0 },
    );
    const beklenen = new Map<string, UrunPanelStokDurumu>(
      tumu.map((satir) => [
        satir.ad,
        urunPanelStokDurumu(
          (birimleri.get(satir.kimlik) ?? []).flatMap((birim) => {
            const durum = durumlar.get(birim.kimlik);
            return durum === undefined ? [] : [durum];
          }),
        ),
      ]),
    );
    expect(Object.fromEntries(beklenen)).toEqual({
      Bol: "stokta",
      Eşikte: "dusuk",
      Tükenmiş: "tukendi",
      Fiyatsız: "tukendi",
      Takipsiz: "stokta",
      "Takipsiz az": "stokta",
      "Kendi eşiği": "dusuk",
      "Eşik sıfır": "stokta",
      Varyantlı: "dusuk",
    });
    for (const durum of urunPanelStokDurumlari) {
      expect(await adlari(vt, { stok: [durum] }, ayar), durum).toEqual(
        [...beklenen]
          .filter(([, deger]) => deger === durum)
          .map(([ad]) => ad)
          .toSorted(),
      );
    }
    expect(await adlari(vt, { stok: ["dusuk", "tukendi"] }, ayar)).toHaveLength(5);
  });
});

describe("sıralama ve sayfa", () => {
  it("stok (takipsiz sonda), fiyat (indirimli, fiyatsız sonda), son değişen; sayfa sınırı ve sayılar", async () => {
    const vt = await siteAc();
    await urunAc(vt, "Az", {}, { satis: 30_000, miktar: 2 });
    const { birim: indirimli } = await urunAc(vt, "Çok", {}, { satis: 50_000, miktar: 20 });
    await fiyat.fiyatYaz(vt, kim(), indirimli, { satisFiyati: 50_000, indirimliFiyat: 10_000 });
    await urunAc(vt, "Takipsiz", { stokTakibi: false }, { satis: 20_000, miktar: 0 });
    await urunAc(vt, "Fiyatsız", { durum: "taslak" }, { satis: null, miktar: 5 });
    expect(await adlari(vt, { siralama: "stok-artan" })).toEqual([
      "Az",
      "Fiyatsız",
      "Çok",
      "Takipsiz",
    ]);
    expect(await adlari(vt, { siralama: "stok-azalan" })).toEqual([
      "Çok",
      "Fiyatsız",
      "Az",
      "Takipsiz",
    ]);
    expect(await adlari(vt, { siralama: "fiyat-artan" })).toEqual([
      "Çok",
      "Takipsiz",
      "Az",
      "Fiyatsız",
    ]);
    expect(await adlari(vt, { siralama: "fiyat-azalan" })).toEqual([
      "Az",
      "Takipsiz",
      "Çok",
      "Fiyatsız",
    ]);
    expect(await adlari(vt, { siralama: "ad-azalan" })).toEqual([
      "Takipsiz",
      "Fiyatsız",
      "Çok",
      "Az",
    ]);
    // Son değişen: "Az" yeniden değişince en üste çıkar.
    const az =
      (await urunPanelListesi(vt, girdi({ ara: "az" }), ayarlar())).satirlar[0]?.kimlik ?? "";
    await urunSrv.urunDegistir(vt, kim(), az, { ad: "Az 2" });
    expect((await adlari(vt, { siralama: "son-degisen" }))[0]).toBe("Az 2");

    const sayfa = await urunPanelListesi(vt, girdi({ sayfaBoyu: 25, sayfa: 9 }), ayarlar());
    expect(sayfa).toMatchObject({ toplam: 4, sayfa: 1, sayfaSayisi: 1 });
    const suzgecli = await urunPanelListesi(
      vt,
      girdi({ durum: ["taslak"], stok: ["stokta"] }),
      ayarlar(),
    );
    expect(suzgecli.toplam).toBe(0);
    // Sayılar durum süzgecine bakmaz, öteki süzgeçlere uyar: stokta olanlar yayında ("Çok", "Takipsiz").
    expect(suzgecli.durumSayilari).toMatchObject({ yayinda: 2, taslak: 0 });
  });
});

describe("toplu işlem", () => {
  it("dört işlem tekil işlemle yapılır; silinmiş ürün nedeniyle döner, ötekiler işlenir", async () => {
    const vt = await siteAc();
    const { urun: a } = await urunAc(vt, "A", { durum: "taslak" });
    const { urun: b } = await urunAc(vt, "B", {
      durum: "zamanlanmis",
      yayinZamani: "2099-01-01T10:00",
    });
    const { urun: c } = await urunAc(vt, "C");
    await urunSrv.urunSil(vt, kim(), c);
    const sonuc = await urunTopluIslem(vt, kim(), urunSrv, {
      islem: "yayinla",
      urunler: [a, b.toUpperCase(), c],
    });
    expect(sonuc).toEqual({ islenen: [a, b], islenemeyen: [{ anahtar: c, kod: "bulunamadi" }] });
    // Zamanlanmış ürün yayınlanınca yayın zamanı kalkar.
    expect(await urunSrv.urunuOku(vt, b)).toMatchObject({ durum: "yayinda" });
    expect((await urunSrv.urunuOku(vt, b))?.yayinZamani).toBeUndefined();
    await urunTopluIslem(vt, kim(), urunSrv, { islem: "arsive-al", urunler: [a] });
    expect(await urunSrv.urunuOku(vt, a)).toMatchObject({ durum: "arsiv" });
    await urunTopluIslem(vt, kim(), urunSrv, { islem: "taslaga-al", urunler: [a] });
    expect(await urunSrv.urunuOku(vt, a)).toMatchObject({ durum: "taslak" });
    await urunTopluIslem(vt, kim(), urunSrv, { islem: "sil", urunler: [a] });
    expect(await urunSrv.urunuOku(vt, a)).toMatchObject({ silindi: true });
  });
});
