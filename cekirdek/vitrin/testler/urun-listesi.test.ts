// Vitrinin filtreli ürün listesi gerçek veritabanıyla (kart 0136, karar 0102):
// - Kapsam: kategori alt kategorileriyle, marka, etiket; görünmeyen ürün (taslak, gizli, arşiv, silinmiş, zamanı
//   gelmemiş) hiçbir filtrede ve hiçbir sayıda yoktur; tükenen ürün ayarı uygulanır.
// - Filtreler: fiyat (kartta görünen fiyat, vergi gösterimi ve indirim dahil), marka, seçenekler (aynı birimde),
//   filtrede kullanılan özellikler (filtrede olmayan, silinmiş özellik ve seçenek yok), stoktakiler; sayılar.
// - Sıralama: önerilen (vitrin sırası, sonra en yeni), en yeni, fiyat artan ve azalan (fiyatsız sonda).
// - Sayfa, son sayfaya çekme, "daha fazla göster"; vitrin sırasının yazılması ve kaydı; sorgu sayısı.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { ListeSiralamasi } from "../../kayitlar/liste.ts";
import { degisiklikKayitlari } from "../../moduller/degisiklik-kaydi/model.ts";
import { etiketServisi } from "../../moduller/etiket/servis.ts";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { kategoriEkle, kategoriUrunKosulu } from "../../moduller/kategori/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { markaServisi } from "../../moduller/marka/servis.ts";
import {
  ozellikSecenekleri as ozellikSecenekTablosu,
  ozellikler as ozellikTablosu,
} from "../../moduller/ozellik/model.ts";
import { ozellikServisi } from "../../moduller/ozellik/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { bosFiltre, type UrunFiltresi } from "../../moduller/urun/filtre.ts";
import { urunKilidiAl } from "../../moduller/urun/kilit.ts";
import { urunler as urunTablosu } from "../../moduller/urun/model.ts";
import type { UrunGirdisi } from "../../moduller/urun/semalar.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { secenekleriOku } from "../../moduller/urun/varyant.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { filtreliUrunListesi } from "../urun-listesi/veri.ts";

vi.setConfig({ testTimeout: 60_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
// Vergi tablosu dolu deneme sitesi; vergi gösterimi çevrilsin diye mağaza adresi ve vergi adı verilir
// (fiyat/testler/gosterim.test.ts ile aynı).
const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
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
const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();
const an = new Date("2030-01-15T12:00:00Z");
const filtre = (ek: Partial<UrunFiltresi>): UrunFiltresi => ({ ...bosFiltre(), ...ek });

const hazirla = async () => {
  const deneme = await denemeSitesiAc("urun-listesi");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
  const alt = await kategoriEkle(vt, yonetici(), { ad: "Gömlek", ust: kategori });
  const baska = await kategoriEkle(vt, yonetici(), { ad: "Ev" });
  const birimFiyatStok = async (birim: string, satis: number | null, miktar: number) => {
    if (satis !== null) await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: satis });
    if (miktar > 0) {
      await stok.stokDuzelt(vt, yonetici(), birim, {
        yeniMiktar: miktar,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
  };
  const urunAc = async (
    ek: Partial<UrunGirdisi> = {},
    { satis = 10_000, miktar = 5 }: { satis?: number | null; miktar?: number } = {},
  ) => {
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: null,
      durum: "yayinda",
      kategoriler: [kategori],
      ...ek,
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await birimFiyatStok(birim, satis, miktar);
    return { urun, birim };
  };
  // Seçenekli ürün: her birleşim [beden, renk, fiyat, stok].
  const varyantliAc = async (
    birlesimler: readonly [string, string, number, number][],
    ek: Partial<UrunGirdisi> = {},
  ) => {
    const { urun } = await urunAc(ek, { satis: null, miktar: 0 });
    await urunler.secenekEkle(vt, yonetici(), urun, {
      ad: "Beden",
      degerler: [...new Set(birlesimler.map(([beden]) => beden))],
    });
    await urunler.secenekEkle(vt, yonetici(), urun, {
      ad: "Renk",
      degerler: [...new Set(birlesimler.map(([, renk]) => renk))],
    });
    const [beden, renk] =
      (await secenekleriOku(vt, [urun], { silinmisler: false })).get(urun) ?? [];
    const degeri = (secenek: typeof beden, ad: string) =>
      secenek?.degerler.find((deger) => deger.ad === ad)?.kimlik ?? "";
    for (const [b, r, satis, miktar] of birlesimler) {
      const birim = await urunler.birlesimEkle(vt, yonetici(), urun, {
        degerler: [degeri(beden, b), degeri(renk, r)],
      });
      await birimFiyatStok(birim, satis, miktar);
    }
    return urun;
  };
  const liste = async (
    ek: {
      filtre?: UrunFiltresi;
      siralama?: ListeSiralamasi;
      sayfa?: number;
      boyut?: number;
      birikimli?: boolean;
      kapsam?: string;
      okumaAni?: Date;
      tukenenUrun?: "goster" | "gizle";
    } = {},
  ) =>
    filtreliUrunListesi(vt, site, {
      kapsam: kategoriUrunKosulu(ek.kapsam ?? kategori, true),
      filtre: ek.filtre ?? bosFiltre(),
      siralama: ek.siralama ?? "en-yeni",
      sayfa: ek.sayfa ?? 1,
      boyut: ek.boyut ?? 24,
      birikimli: ek.birikimli ?? false,
      tukenenUrun: ek.tukenenUrun ?? "goster",
      an: ek.okumaAni ?? an,
    });
  return { vt, kategori, alt, baska, urunAc, varyantliAc, liste };
};

// Görünmeyen her durumda bir ürün, verilen ek alanlarla.
const gorunmeyenler = async (
  h: Awaited<ReturnType<typeof hazirla>>,
  vt: Veritabani,
  ek: Partial<UrunGirdisi>,
) => {
  const kimlikler = [
    (await h.urunAc({ ...ek, durum: "taslak" })).urun,
    (await h.urunAc({ ...ek, durum: "gizli" })).urun,
    (await h.urunAc({ ...ek, durum: "arsiv" })).urun,
    (await h.urunAc({ ...ek, durum: "zamanlanmis", yayinZamani: "2030-01-15T16:00" })).urun,
  ];
  const silinmis = await h.urunAc(ek);
  await urunler.urunSil(vt, yonetici(), silinmis.urun);
  return [...kimlikler, silinmis.urun];
};

describe("kapsam ve görünürlük", () => {
  it("kategori alt kategorileriyle; başka kategori yok; görünmeyen ürün hiçbir filtrede ve sayıda yok", async () => {
    const h = await hazirla();
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Örnek" });
    const kumas = await ozellikServisi.ekle(h.vt, yonetici(), {
      ad: "Kumaş",
      tur: "liste",
      filtrede: true,
      secenekler: ["Pamuk"],
    });
    const pamuk = (await ozellikServisi.oku(kumas, h.vt))?.secenekler[0]?.kimlik ?? "";
    const ek = { marka, ozellikler: [{ ozellik: kumas, deger: pamuk }] };
    const ust = await h.urunAc(ek);
    const altta = await h.urunAc({ ...ek, kategoriler: [h.alt] });
    await h.urunAc({ ...ek, kategoriler: [h.baska] });
    const gizliler = await gorunmeyenler(h, h.vt, ek);
    const hepsi = await h.liste();
    expect(hepsi.urunler.toSorted()).toEqual([ust.urun, altta.urun].toSorted());
    expect(hepsi.kapsamToplami).toBe(2);
    for (const f of [
      filtre({ markalar: ["ornek"] }),
      filtre({ ozellikler: { kumas: ["pamuk"] } }),
      filtre({ stoktakiler: true }),
      filtre({ fiyat: { enAz: 0 } }),
    ]) {
      const sonuc = await h.liste({ filtre: f });
      expect(sonuc.toplam).toBe(2);
      for (const gizli of gizliler) expect(sonuc.urunler).not.toContain(gizli);
    }
    expect(hepsi.secenekler.markalar).toEqual([
      { anahtar: "ornek", ad: "Örnek", adet: 2, secili: false },
    ]);
    expect(hepsi.secenekler.ozellikler[0]?.secenekler).toEqual([
      { anahtar: "pamuk", ad: "Pamuk", adet: 2, secili: false },
    ]);
    expect(hepsi.secenekler.stoktakiler.adet).toBe(2);
    // Zamanı gelince görünür.
    expect((await h.liste({ okumaAni: new Date("2030-01-15T13:00:00Z") })).toplam).toBe(3);
  });

  it("tükenen ürün ayarı: gizle'de tükenmiş ürün listede ve sayılarda yok", async () => {
    const h = await hazirla();
    const stokta = await h.urunAc();
    const tukenmis = await h.urunAc({}, { miktar: 0 });
    expect((await h.liste()).urunler.toSorted()).toEqual([stokta.urun, tukenmis.urun].toSorted());
    const gizli = await h.liste({ tukenenUrun: "gizle" });
    expect(gizli.urunler).toEqual([stokta.urun]);
    expect(gizli.secenekler.stoktakiler.adet).toBe(1);
  });
});

describe("filtreler", () => {
  it("marka ve etiket kapsamı: grubun ürünleri", async () => {
    const h = await hazirla();
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Marka" });
    const etiket = await etiketServisi.ekle(h.vt, yonetici(), { ad: "Etiket" });
    const markali = await h.urunAc({ marka, etiketler: [etiket] });
    await h.urunAc();
    for (const kapsam of [markaServisi.urunKosulu(marka), etiketServisi.urunKosulu(etiket)]) {
      const sonuc = await filtreliUrunListesi(h.vt, site, {
        kapsam,
        siralama: "en-yeni",
        sayfa: 1,
        boyut: 24,
        tukenenUrun: "goster",
        an,
      });
      expect(sonuc.urunler).toEqual([markali.urun]);
    }
  });

  it("marka: grup içinde veya; markasız ürün gelmez; sayılar öteki grupların seçimiyle", async () => {
    const h = await hazirla();
    const a = await markaServisi.ekle(h.vt, yonetici(), { ad: "A Marka" });
    const b = await markaServisi.ekle(h.vt, yonetici(), { ad: "B Marka" });
    const aUrunu = await h.urunAc({ marka: a });
    const bUrunu = await h.urunAc({ marka: b }, { miktar: 0 });
    await h.urunAc();
    expect((await h.liste({ filtre: filtre({ markalar: ["a-marka"] }) })).urunler).toEqual([
      aUrunu.urun,
    ]);
    const ikisi = await h.liste({ filtre: filtre({ markalar: ["a-marka", "b-marka"] }) });
    expect(ikisi.urunler.toSorted()).toEqual([aUrunu.urun, bUrunu.urun].toSorted());
    const stokta = await h.liste({ filtre: filtre({ stoktakiler: true }) });
    expect(stokta.secenekler.markalar.map(({ anahtar, adet }) => [anahtar, adet])).toEqual([
      ["a-marka", 1],
      ["b-marka", 0],
    ]);
  });

  it("seçenekler aynı birleşimde; stoktakilerle o birleşimin stoğunda; sayılar", async () => {
    const h = await hazirla();
    const tisort = await h.varyantliAc([
      ["M", "Siyah", 10_000, 3],
      ["M", "Beyaz", 10_000, 0],
      ["S", "Beyaz", 10_000, 2],
    ]);
    const gomlek = await h.varyantliAc([["L", "Beyaz", 20_000, 1]]);
    const basit = await h.urunAc();
    const kimlikleri = async (f: UrunFiltresi) => (await h.liste({ filtre: f })).urunler.toSorted();
    expect(await kimlikleri(filtre({ secenekler: { beden: ["m"] } }))).toEqual([tisort]);
    expect(await kimlikleri(filtre({ secenekler: { renk: ["beyaz"] } }))).toEqual(
      [tisort, gomlek].toSorted(),
    );
    expect(await kimlikleri(filtre({ secenekler: { beden: ["s"], renk: ["siyah"] } }))).toEqual([]);
    expect(
      await kimlikleri(
        filtre({ stoktakiler: true, secenekler: { beden: ["m"], renk: ["beyaz"] } }),
      ),
    ).toEqual([]);
    expect(await kimlikleri(filtre({ stoktakiler: true, secenekler: { beden: ["m"] } }))).toEqual([
      tisort,
    ]);
    expect(await kimlikleri(filtre({ stoktakiler: true }))).toEqual(
      [tisort, gomlek, basit.urun].toSorted(),
    );
    const bos = await h.liste();
    expect(bos.secenekler.secenekler.map((g) => [g.anahtar, g.ad])).toEqual([
      ["beden", "Beden"],
      ["renk", "Renk"],
    ]);
    expect(
      bos.secenekler.secenekler[0]?.secenekler.map(({ anahtar, adet }) => [anahtar, adet]),
    ).toEqual([
      // Değerler farklı ürünlerden gelir: önce sıraları (her üründe kendi sırası), sonra adları.
      ["l", 1],
      ["m", 1],
      ["s", 1],
    ]);
    const renkli = await h.liste({ filtre: filtre({ secenekler: { renk: ["siyah"] } }) });
    expect(
      renkli.secenekler.secenekler[0]?.secenekler.map(({ anahtar, adet }) => [anahtar, adet]),
    ).toEqual([
      ["l", 0],
      ["m", 1],
      ["s", 0],
    ]);
    expect(
      renkli.secenekler.secenekler[1]?.secenekler.find((s) => s.anahtar === "siyah"),
    ).toMatchObject({ secili: true, adet: 1 });
  });

  it("özellikler: yalnız filtrede kullanılanlar, dört türde; silinmiş seçenek ve özellik yok", async () => {
    const h = await hazirla();
    const kumas = await ozellikServisi.ekle(h.vt, yonetici(), {
      ad: "Kumaş",
      tur: "liste",
      filtrede: true,
      secenekler: ["Pamuk", "Keten"],
    });
    const gramaj = await ozellikServisi.ekle(h.vt, yonetici(), {
      ad: "Gramaj",
      tur: "sayi",
      birim: "g",
      filtrede: true,
    });
    const yikanir = await ozellikServisi.ekle(h.vt, yonetici(), {
      ad: "Yıkanır",
      tur: "evet-hayir",
      filtrede: true,
    });
    const notu = await ozellikServisi.ekle(h.vt, yonetici(), {
      ad: "Not",
      tur: "metin",
      filtrede: false,
    });
    const secenekleri = (await ozellikServisi.oku(kumas, h.vt))?.secenekler ?? [];
    const [pamuk, keten] = secenekleri.map((s) => s.kimlik);
    const bir = await h.urunAc({
      ozellikler: [
        { ozellik: kumas, deger: pamuk ?? "" },
        { ozellik: gramaj, deger: 180.5 },
        { ozellik: yikanir, deger: true },
        { ozellik: notu, deger: "Ters yıkayın" },
      ],
    });
    const iki = await h.urunAc({
      ozellikler: [
        { ozellik: kumas, deger: keten ?? "" },
        { ozellik: yikanir, deger: false },
      ],
    });
    const sonuc = await h.liste();
    expect(sonuc.secenekler.ozellikler.map((g) => g.anahtar)).toEqual([
      "kumas",
      "gramaj",
      "yikanir",
    ]);
    expect(sonuc.secenekler.ozellikler[1]?.secenekler).toEqual([
      { anahtar: "180.5", ad: "180,5 g", adet: 1, secili: false },
    ]);
    const kimlikleri = async (f: UrunFiltresi) => (await h.liste({ filtre: f })).urunler.toSorted();
    expect(await kimlikleri(filtre({ ozellikler: { kumas: ["keten"] } }))).toEqual([iki.urun]);
    expect(await kimlikleri(filtre({ ozellikler: { yikanir: ["evet"] } }))).toEqual([bir.urun]);
    expect(await kimlikleri(filtre({ ozellikler: { gramaj: ["180.5"] } }))).toEqual([bir.urun]);
    expect(
      await kimlikleri(filtre({ ozellikler: { kumas: ["keten"], yikanir: ["evet"] } })),
    ).toEqual([]);
    // Silinmiş seçenek ve silinmiş özellik filtrede yoktur.
    await ozellikServisi.secenekSil(h.vt, yonetici(), keten ?? "");
    await ozellikServisi.sil(h.vt, yonetici(), gramaj);
    const sonra = await h.liste();
    expect(sonra.secenekler.ozellikler.map((g) => g.anahtar)).toEqual(["kumas", "yikanir"]);
    expect(sonra.secenekler.ozellikler[0]?.secenekler.map((s) => s.anahtar)).toEqual(["pamuk"]);
    // İkinci katman: silme işareti servisi atlayıp doğrudan yazılmış olsa da (değerler ürünlerde kalır)
    // silinmiş özellik ve seçenek filtrede yoktur.
    await h.vt
      .update(ozellikTablosu)
      .set({ silinme_zamani: new Date() })
      .where(eq(ozellikTablosu.kimlik, yikanir));
    await h.vt
      .update(ozellikSecenekTablosu)
      .set({ silinme_zamani: new Date() })
      .where(eq(ozellikSecenekTablosu.kimlik, pamuk ?? ""));
    const dogrudan = await h.liste();
    expect(dogrudan.secenekler.ozellikler).toEqual([]);
  });

  it("fiyat: kartta görünen fiyat (indirim ve vergi gösterimi), sınırlar dahil, fiyatsız ürün yok", async () => {
    const h = await hazirla();
    const [genel] = (await siteninVergiServisi(site).tabloyuOku(h.vt)).filter(
      (sinif) => sinif.ad === "Genel",
    );
    const ucuz = await h.urunAc({ vergiSinifi: genel?.kimlik ?? null }, { satis: 11_800 });
    const pahali = await h.urunAc({}, { satis: 50_000 });
    await fiyat.fiyatYaz(h.vt, yonetici(), pahali.birim, {
      satisFiyati: 50_000,
      indirimliFiyat: 20_000,
      indirimBaslangici: null,
      indirimBitisi: null,
    });
    const fiyatsiz = await h.urunAc({}, { satis: null });
    const kimlikleri = async (f: UrunFiltresi) => (await h.liste({ filtre: f })).urunler.toSorted();
    expect(await kimlikleri(filtre({ fiyat: { enAz: 20_000, enCok: 20_000 } }))).toEqual([
      pahali.urun,
    ]);
    expect(await kimlikleri(filtre({ fiyat: { enCok: 19_999 } }))).toEqual([ucuz.urun]);
    expect(await kimlikleri(filtre({ fiyat: { enAz: 0 } }))).not.toContain(fiyatsiz.urun);
    // Vergi hariç gösterimde tutar kartın tutarıdır (11.800 dahil → 10.000 hariç).
    await siteninServisi(site).degistir(h.vt, yonetici(), { fiyatGosterimi: "vergi-haric" });
    const kart = await fiyatGosterimServisi(site).fiyatAraliklari(h.vt, [ucuz.urun], { an });
    const tutar = kart.get(ucuz.urun)?.enDusuk.tutar ?? -1;
    expect(tutar).toBeLessThan(11_800);
    expect(await kimlikleri(filtre({ fiyat: { enAz: tutar, enCok: tutar } }))).toEqual([ucuz.urun]);
    expect(await kimlikleri(filtre({ fiyat: { enAz: 11_800, enCok: 11_800 } }))).toEqual([]);
  });

  it("varyantlı üründe fiyat satılabilir birleşimlerin en düşüğü", async () => {
    const h = await hazirla();
    const urun = await h.varyantliAc([
      ["M", "Siyah", 30_000, 2],
      ["S", "Siyah", 10_000, 0],
      ["L", "Siyah", 20_000, 1],
    ]);
    expect((await h.liste({ filtre: filtre({ fiyat: { enCok: 15_000 } }) })).urunler).toEqual([]);
    expect((await h.liste({ filtre: filtre({ fiyat: { enCok: 20_000 } }) })).urunler).toEqual([
      urun,
    ]);
  });
});

describe("sıralama", () => {
  it("önerilen: vitrin sırası, sonra en yeni; en yeni; fiyat artan ve azalan, fiyatsız sonda", async () => {
    const h = await hazirla();
    const a = await h.urunAc({}, { satis: 30_000 });
    const b = await h.urunAc({}, { satis: 10_000 });
    const c = await h.urunAc({}, { satis: null });
    const d = await h.urunAc({}, { satis: 20_000 });
    const sira = async (siralama: ListeSiralamasi) => (await h.liste({ siralama })).urunler;
    expect(await sira("en-yeni")).toEqual([d.urun, c.urun, b.urun, a.urun]);
    expect(await sira("onerilen")).toEqual([d.urun, c.urun, b.urun, a.urun]);
    await urunler.vitrinSirasiniDegistir(h.vt, yonetici(), [b.urun, a.urun]);
    expect(await sira("onerilen")).toEqual([b.urun, a.urun, d.urun, c.urun]);
    expect(await sira("en-yeni")).toEqual([d.urun, c.urun, b.urun, a.urun]);
    expect(await sira("fiyat-artan")).toEqual([b.urun, d.urun, a.urun, c.urun]);
    expect(await sira("fiyat-azalan")).toEqual([a.urun, d.urun, b.urun, c.urun]);
  });
});

describe("sayfalar", () => {
  it("sayfa, son sayfaya çekme ve daha fazla göster", async () => {
    const h = await hazirla();
    const kimlikler: string[] = [];
    for (let i = 0; i < 5; i += 1) kimlikler.unshift((await h.urunAc()).urun);
    const ikinci = await h.liste({ sayfa: 2, boyut: 2 });
    expect(ikinci).toMatchObject({ toplam: 5, sayfa: 2, toplamSayfa: 3 });
    expect(ikinci.urunler).toEqual(kimlikler.slice(2, 4));
    expect((await h.liste({ sayfa: 9, boyut: 2 })).urunler).toEqual(kimlikler.slice(4));
    expect((await h.liste({ sayfa: 0, boyut: 2 })).urunler).toEqual(kimlikler.slice(0, 2));
    expect((await h.liste({ sayfa: 2, boyut: 2, birikimli: true })).urunler).toEqual(
      kimlikler.slice(0, 4),
    );
    const bos = await h.liste({ filtre: filtre({ markalar: ["olmayan"] }) });
    expect(bos).toMatchObject({ urunler: [], toplam: 0, sayfa: 1, toplamSayfa: 1 });
  });
});

describe("vitrin sırası", () => {
  it("listedekiler 1'den sıralanır, ötekilerin sırası kalkar; yalnız değişen kayda girer", async () => {
    const h = await hazirla();
    const [a, b, c] = [await h.urunAc(), await h.urunAc(), await h.urunAc()];
    const kim = yonetici();
    await urunler.vitrinSirasiniDegistir(h.vt, kim, [a.urun, b.urun]);
    await urunler.vitrinSirasiniDegistir(h.vt, kim, [b.urun.toUpperCase(), c.urun]);
    const siralar = Object.fromEntries(
      (
        await h.vt
          .select({ kimlik: urunTablosu.kimlik, sira: urunTablosu.vitrin_sirasi })
          .from(urunTablosu)
      ).map(({ kimlik, sira }) => [kimlik, sira]),
    );
    expect(siralar).toEqual({ [a.urun]: null, [b.urun]: 1, [c.urun]: 2 });
    const kayitlar = await h.vt
      .select({ kimlik: degisiklikKayitlari.kayit_kimligi })
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.islem, "urun.vitrin-sirasi"),
          eq(degisiklikKayitlari.kim_kimligi, kim.kimlik),
        ),
      );
    // İlk çağrı a ve b'yi, ikinci a, b ve c'yi değiştirir.
    expect(kayitlar.map((k) => k.kimlik).toSorted()).toEqual(
      [a.urun, b.urun, a.urun, b.urun, c.urun].toSorted(),
    );
  });

  it("silinmiş ürünün sırası bir sonraki yazımda kalkar", async () => {
    const h = await hazirla();
    const [a, b] = [await h.urunAc(), await h.urunAc()];
    await urunler.vitrinSirasiniDegistir(h.vt, yonetici(), [a.urun, b.urun]);
    await urunler.urunSil(h.vt, yonetici(), a.urun);
    await urunler.vitrinSirasiniDegistir(h.vt, yonetici(), [b.urun]);
    const [satir] = await h.vt
      .select({ sira: urunTablosu.vitrin_sirasi })
      .from(urunTablosu)
      .where(eq(urunTablosu.kimlik, a.urun));
    expect(satir?.sira).toBeNull();
  });

  // Sıra kurularak: açık duran bir ürün yazması kilidi tutarken başlayan sıralama bekler; açık işlem kendi
  // sırasını yazıp bitince sıralama güncel satırları okur ve bütünüyle geçerli olur. Kilit olmasaydı sıralama
  // önce biter, açık işlemin yazdıkları üstüne kalırdı.
  it("açık duran ürün yazması bitene kadar bekler, sonra güncel sırayı bütünüyle değiştirir", async () => {
    const h = await hazirla();
    const kimlikler: string[] = [];
    for (let i = 0; i < 4; i += 1) kimlikler.push((await h.urunAc()).urun);
    const sonraki = [kimlikler[3] ?? "", kimlikler[2] ?? ""];
    let siralama: Promise<void> | undefined;
    await h.vt.transaction(async (islem) => {
      await urunKilidiAl(islem);
      siralama = urunler.vitrinSirasiniDegistir(h.vt, yonetici(), sonraki);
      await new Promise((bitti) => setTimeout(bitti, 500));
      for (const [sira, kimlik] of kimlikler.slice(0, 2).entries()) {
        await islem
          .update(urunTablosu)
          .set({ vitrin_sirasi: sira + 1 })
          .where(eq(urunTablosu.kimlik, kimlik));
      }
    });
    await siralama;
    const siralar = Object.fromEntries(
      (
        await h.vt
          .select({ kimlik: urunTablosu.kimlik, sira: urunTablosu.vitrin_sirasi })
          .from(urunTablosu)
      ).map(({ kimlik, sira }) => [kimlik, sira]),
    );
    expect(siralar).toEqual({
      [kimlikler[0] ?? ""]: null,
      [kimlikler[1] ?? ""]: null,
      [kimlikler[3] ?? ""]: 1,
      [kimlikler[2] ?? ""]: 2,
    });
  });

  it("tekrar, olmayan, silinmiş ve bozuk kimlik reddedilir, hiçbir şey değişmez", async () => {
    const h = await hazirla();
    const [a, b] = [await h.urunAc(), await h.urunAc()];
    await urunler.vitrinSirasiniDegistir(h.vt, yonetici(), [a.urun]);
    await urunler.urunSil(h.vt, yonetici(), b.urun);
    for (const [liste, kod] of [
      [[a.urun, a.urun.toUpperCase()], "vitrin-sirasi-tekrar"],
      [[randomUUID()], "vitrin-sirasi-gecersiz"],
      [[b.urun], "vitrin-sirasi-gecersiz"],
      [["bozuk"], "vitrin-sirasi-gecersiz"],
    ] as const) {
      await expect(urunler.vitrinSirasiniDegistir(h.vt, yonetici(), liste)).rejects.toMatchObject({
        ayrinti: [expect.objectContaining({ kod })],
      });
    }
    const [satir] = await h.vt
      .select({ sira: urunTablosu.vitrin_sirasi })
      .from(urunTablosu)
      .where(eq(urunTablosu.kimlik, a.urun));
    expect(satir?.sira).toBe(1);
  });
});

describe("sorgular", () => {
  it("sorgu sayısı ürün sayısıyla artmaz (fiyat sıralamasıyla da)", async () => {
    const h = await hazirla();
    const say = async () => {
      const sorgu = vi.spyOn(h.vt.$client, "query");
      await h.liste({
        siralama: "fiyat-artan",
        filtre: filtre({ fiyat: { enAz: 0 }, stoktakiler: true, secenekler: { beden: ["m"] } }),
      });
      const sayi = sorgu.mock.calls.length;
      sorgu.mockRestore();
      return sayi;
    };
    await h.varyantliAc([["M", "Siyah", 10_000, 1]]);
    await h.urunAc();
    // İlk çağrı mağaza ayarlarının başlangıcını bir kez yazabilir; ölçüm ikinci çağrıdan.
    await say();
    const az = await say();
    for (let i = 0; i < 4; i += 1) {
      await h.varyantliAc([["M", "Mavi", 10_000, 1]]);
      await h.urunAc();
    }
    expect(await say()).toBe(az);
  });
});
