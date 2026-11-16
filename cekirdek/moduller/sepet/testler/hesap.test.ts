// Sepet hesabı gerçek veritabanıyla (kart 0212, karar 0135). Vergi dahil girişte %18'lik sınıfta 118,00'lik ürünün
// vergisiz tutarı 100,00, vergisi 18,00'dır: beklentiler elle hesaplanır.
// - Fiyat, indirim, vergi dahil ve hariç gösterim, oran oran döküm; ara toplam, kargo ve verginin toplamı vermesi.
// - Kargo: varsayılan 0 (ücretsiz), ücret ve sınır, sınırın indirimden önce ve sonra hesaplanması, kargo
//   gerektirmeyen sepet.
// - Adet: ürünün en çok ve en az alım adedi, takibi açık üründe stok; aynı birimin iki kez verilmesi.
// - Satılamayan satır: tükenmiş, fiyatsız (karar 0133), taslak, silinmiş birim, olmayan ve bozuk kimlik, başka
//   sitenin birimi; tutara girmez, ödemeye geçmeyi durdurur.
// - Müşterinin son gördüğü fiyat değiştiyse uyarı.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { sepetiHesapla } from "../hesap.ts";

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

// Vergi tablosu dolu deneme sitesi (Genel %18), mağaza Ankara'da: vergi bölgesi mağaza adresidir.
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
const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

type UrunSecenekleri = {
  satis?: number;
  indirimli?: number;
  stok?: number;
  takip?: boolean;
  enAz?: number;
  enCok?: number;
  kargoGerekmez?: boolean;
  fiyatsiz?: boolean;
  durum?: "yayinda" | "taslak";
};

const hazirla = async () => {
  const deneme = await denemeSitesiAc("sepet");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const tablo = await siteninVergiServisi(site).tabloyuOku(vt);
  const genel = tablo.find((sinif) => sinif.ad === "Genel")?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async (ek: UrunSecenekleri = {}) => {
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: ek.durum ?? "yayinda",
      ...(ek.takip === undefined ? {} : { stokTakibi: ek.takip }),
      ...(ek.enAz === undefined ? {} : { enAzAdet: ek.enAz }),
      ...(ek.enCok === undefined ? {} : { enCokAdet: ek.enCok }),
      ...(ek.kargoGerekmez === undefined ? {} : { kargoGerekmez: ek.kargoGerekmez }),
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    if (ek.fiyatsiz !== true) {
      await fiyat.fiyatYaz(vt, yonetici(), birim, {
        satisFiyati: ek.satis ?? 11_800,
        ...(ek.indirimli === undefined ? {} : { indirimliFiyat: ek.indirimli }),
      });
    }
    const miktar = ek.stok ?? 50;
    if (miktar > 0) {
      await stok.stokDuzelt(vt, yonetici(), birim, {
        yeniMiktar: miktar,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return { urun, birim };
  };
  const ayarla = (ayarlar: Parameters<ReturnType<typeof siteninServisi>["degistir"]>[2]) =>
    siteninServisi(site).degistir(vt, yonetici(), ayarlar);
  return { vt, urunAc, ayarla };
};

const hesapla = (
  vt: Veritabani,
  kalemler: { birim: string; adet: number; gorulenTutar?: number }[],
) => sepetiHesapla(vt, site, kalemler);

describe("sepet hesabı", () => {
  it("vergi dahil gösterimde satır, ara toplam, döküm ve toplam; kargo varsayılanı ücretsiz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc({ satis: 29_500, indirimli: 23_600 });
    const sonuc = await hesapla(h.vt, [
      { birim: a.birim, adet: 2 },
      { birim: b.birim, adet: 1 },
    ]);
    expect(sonuc.satirlar.map((s) => [s.birimTutari, s.tutar, s.adet])).toEqual([
      [11_800, 23_600, 2],
      [23_600, 23_600, 1],
    ]);
    expect(sonuc).toMatchObject({
      gosterim: "vergi-dahil",
      adet: 3,
      araToplam: 47_200,
      kargo: { tur: "ucretsiz" },
      vergi: { toplam: 7_200 },
      toplam: 47_200,
      odemeyeGecilebilir: true,
    });
    expect(sonuc.vergi.dokum).toEqual([expect.objectContaining({ matrah: 40_000, vergi: 7_200 })]);
  });

  it("vergi hariç gösterimde ara toplam vergisizdir, toplam ara toplam, kargo ve vergidir", async () => {
    const h = await hazirla();
    await h.ayarla({ fiyatGosterimi: "vergi-haric", kargoUcreti: 5_900 });
    const a = await h.urunAc();
    const sonuc = await hesapla(h.vt, [{ birim: a.birim, adet: 3 }]);
    expect(sonuc.satirlar[0]).toMatchObject({ birimTutari: 10_000, tutar: 30_000 });
    // Sitenin vergi tablosunda kargo sınıfı yok: kargo vergisizdir, 59,00 olduğu gibi eklenir.
    expect(sonuc).toMatchObject({
      gosterim: "vergi-haric",
      araToplam: 30_000,
      kargo: { tur: "ucretli", tutar: 5_900 },
      vergi: { toplam: 5_400 },
      toplam: 41_300,
    });
    expect(
      sonuc.araToplam +
        (sonuc.kargo.tur === "ucretli" ? sonuc.kargo.tutar : 0) +
        sonuc.vergi.toplam,
    ).toBe(sonuc.toplam);
  });

  it("kargo ücreti ve ücretsiz kargo sınırı; sınır indirimden önce ya da sonra", async () => {
    const h = await hazirla();
    await h.ayarla({ kargoUcreti: 5_900, ucretsizKargoSiniri: 25_000 });
    const indirimli = await h.urunAc({ satis: 30_000, indirimli: 20_000 });
    const sonra = await hesapla(h.vt, [{ birim: indirimli.birim, adet: 1 }]);
    expect(sonra.kargo).toEqual({ tur: "ucretli", tutar: 5_900, siniraKalan: 5_000 });
    expect(sonra.toplam).toBe(25_900);
    await h.ayarla({ ucretsizKargoTutari: "indirimden-once" });
    expect((await hesapla(h.vt, [{ birim: indirimli.birim, adet: 1 }])).kargo).toEqual({
      tur: "ucretsiz",
    });
    // Sınıra eşit sepet ücretsizdir.
    await h.ayarla({ ucretsizKargoTutari: "indirimden-sonra", ucretsizKargoSiniri: 40_000 });
    expect((await hesapla(h.vt, [{ birim: indirimli.birim, adet: 2 }])).kargo).toEqual({
      tur: "ucretsiz",
    });
  });

  it("yalnız kargo gerektirmeyen ürün varsa kargo yoktur", async () => {
    const h = await hazirla();
    await h.ayarla({ kargoUcreti: 5_900 });
    const paket = await h.urunAc({ kargoGerekmez: true, satis: 4_990 });
    const sonuc = await hesapla(h.vt, [{ birim: paket.birim, adet: 1 }]);
    expect(sonuc.kargo).toEqual({ tur: "yok" });
    expect(sonuc.toplam).toBe(4_990);
  });

  it("adet en çok alım adedine ve stoğa iner, en az alım adedinin altında ödeme durur", async () => {
    const h = await hazirla();
    const enCok = await h.urunAc({ enCok: 3 });
    const azStok = await h.urunAc({ stok: 2 });
    const enAz = await h.urunAc({ enAz: 2 });
    const takipsiz = await h.urunAc({ takip: false, stok: 0 });
    const sonuc = await hesapla(h.vt, [
      { birim: enCok.birim, adet: 5 },
      { birim: azStok.birim, adet: 4 },
      { birim: takipsiz.birim, adet: 9 },
    ]);
    expect(sonuc.satirlar.map((s) => [s.adet, s.enCok, s.uyarilar])).toEqual([
      [3, 3, [{ kod: "en-cok", sayi: 3 }]],
      [2, 2, [{ kod: "stok-azaldi", sayi: 2 }]],
      [9, 999, []],
    ]);
    expect(sonuc.odemeyeGecilebilir).toBe(true);
    const azAdet = await hesapla(h.vt, [{ birim: enAz.birim, adet: 1 }]);
    expect(azAdet.satirlar[0]).toMatchObject({
      adet: 1,
      enAz: 2,
      uyarilar: [{ kod: "en-az", sayi: 2 }],
    });
    expect(azAdet.odemeyeGecilebilir).toBe(false);
  });

  it("aynı birim iki kez verilirse adetler toplanır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const sonuc = await hesapla(h.vt, [
      { birim: a.birim, adet: 1 },
      { birim: a.birim.toUpperCase(), adet: 2 },
    ]);
    expect(sonuc.satirlar).toHaveLength(1);
    expect(sonuc.satirlar[0]).toMatchObject({ adet: 3, tutar: 35_400 });
  });

  it("satılamayan satırlar tutara girmez ve ödemeyi durdurur", async () => {
    const h = await hazirla();
    const satilir = await h.urunAc();
    const tukenmis = await h.urunAc({ stok: 0 });
    const fiyatsiz = await h.urunAc({ fiyatsiz: true });
    const taslak = await h.urunAc({ durum: "taslak" });
    const silinecek = await h.urunAc();
    await urunler.urunSil(h.vt, yonetici(), silinecek.urun);
    const sonuc = await hesapla(h.vt, [
      { birim: satilir.birim, adet: 1 },
      { birim: tukenmis.birim, adet: 1 },
      { birim: fiyatsiz.birim, adet: 1 },
      { birim: taslak.birim, adet: 1 },
      { birim: silinecek.birim, adet: 1 },
      { birim: randomUUID(), adet: 1 },
    ]);
    expect(
      sonuc.satirlar.map((s) => [s.satilabilir, s.uyarilar.map((u) => u.kod), s.tutar]),
    ).toEqual([
      [true, [], 11_800],
      [false, ["tukendi"], undefined],
      [false, ["tukendi"], undefined],
      [false, ["kaldirildi"], undefined],
      [false, ["kaldirildi"], undefined],
      [false, ["kaldirildi"], undefined],
    ]);
    expect(sonuc).toMatchObject({
      adet: 1,
      araToplam: 11_800,
      toplam: 11_800,
      odemeyeGecilebilir: false,
    });
    // Bozuk kimlik sessizce atılır.
    expect((await hesapla(h.vt, [{ birim: "bozuk", adet: 1 }])).satirlar).toEqual([]);
  });

  it("boş sepet: tutar sıfır, ödemeye geçilemez", async () => {
    const h = await hazirla();
    expect(await hesapla(h.vt, [])).toMatchObject({
      satirlar: [],
      adet: 0,
      araToplam: 0,
      toplam: 0,
      kargo: { tur: "yok" },
      odemeyeGecilebilir: false,
    });
  });

  it("müşterinin son gördüğü fiyat değiştiyse söylenir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const sonuc = await hesapla(h.vt, [{ birim: a.birim, adet: 1, gorulenTutar: 9_900 }]);
    expect(sonuc.satirlar[0]?.uyarilar).toEqual([{ kod: "fiyat-degisti", eskiTutar: 9_900 }]);
    expect(sonuc.odemeyeGecilebilir).toBe(true);
    const ayni = await hesapla(h.vt, [{ birim: a.birim, adet: 1, gorulenTutar: 11_800 }]);
    expect(ayni.satirlar[0]?.uyarilar).toEqual([]);
  });

  it("başka sitenin birimi bu sitede yoktur", async () => {
    const h = await hazirla();
    const baska = await hazirla();
    const a = await baska.urunAc();
    const sonuc = await hesapla(h.vt, [{ birim: a.birim, adet: 1 }]);
    expect(sonuc.satirlar[0]?.uyarilar).toEqual([{ kod: "kaldirildi" }]);
  });
});
