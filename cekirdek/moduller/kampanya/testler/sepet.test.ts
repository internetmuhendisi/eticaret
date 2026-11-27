// Kuponlu sepet hesabı gerçek veritabanıyla, elle hesaplanmış tutarlarla (kart 0312, karar 0187). Site vergi dahil
// girişlidir (Genel yüzde 18; testin açtığı İndirimli yüzde 8). Kargonun vergi sınıfı yoktur: kargo vergisiz eklenir.
// - Yüzde kuponu vergi dahil ve hariç gösterimde; vergi indirimden sonraki tutardan.
// - İki oranlı sepette tutar kuponunun dağıtımı, yuvarlaması ve oran oran döküm.
// - Ücretsiz kargo kuponu; ücretsiz kargo sınırının kupondan sonraki tutarla hesaplanması.
// - En az tutar sınırında; indirimdeki ürün; kapsam dışı ürün; kategori kapsamı alt kategorileriyle.
// - Kodun harf büyüklüğü ve Türkçe harfi; harf duyarlı site.
// - Ara toplam − kupon + kargo (+ vergi, hariç gösterimde) her zaman toplamdır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { type SepetHesabi, sepetiHesapla } from "../../sepet/hesap.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { kuponServisi } from "../servis.ts";

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
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

const hazirla = async (hedef: Site = site) => {
  const deneme = await denemeSitesiAc("kuponsepet");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const vergi = siteninVergiServisi(hedef);
  const tablo = await vergi.tabloyuOku(vt);
  const genel = tablo.find((sinif) => sinif.ad === "Genel")?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async (
    ek: { satis?: number; indirimli?: number; sinif?: string; kategoriler?: string[] } = {},
  ) => {
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: ek.sinif ?? genel,
      durum: "yayinda",
      ...(ek.kategoriler === undefined ? {} : { kategoriler: ek.kategoriler }),
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, {
      satisFiyati: ek.satis ?? 11_800,
      ...(ek.indirimli === undefined ? {} : { indirimliFiyat: ek.indirimli }),
    });
    await stok.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return { urun, birim };
  };
  const kuponAc = (girdi: Parameters<ReturnType<typeof kuponServisi>["ekle"]>[2]) =>
    vt.transaction((islem) => kuponServisi(hedef).ekle(islem, yonetici(), girdi));
  const ayarla = (ayarlar: Parameters<ReturnType<typeof siteninServisi>["degistir"]>[2]) =>
    siteninServisi(hedef).degistir(vt, yonetici(), ayarlar, {
      kendiIslevi: "fiyatGirisi" in ayarlar,
    });
  const hesapla = (kalemler: { birim: string; adet: number }[], kod?: string) =>
    sepetiHesapla(vt, hedef, kalemler, kod === undefined ? {} : { kupon: { kod } });
  const ikinciSinif = async () => {
    const sinif = await vergi.sinifEkle(vt, yonetici(), { ad: "İndirimli" });
    await vergi.oranEkle(vt, yonetici(), sinif, { ulke: "TR", oran: "8" });
    return sinif;
  };
  return { vt, urunAc, kuponAc, ayarla, hesapla, ikinciSinif };
};

// Ara toplam − kupon + kargo (+ vergi, hariç gösterimde) toplamdır.
const toplamTutar = (h: SepetHesabi) =>
  h.araToplam -
  (h.kupon?.durum === "uygulandi" ? h.kupon.indirim : 0) +
  (h.kargo.tur === "ucretli" ? h.kargo.tutar : 0) +
  (h.gosterim === "vergi-haric" ? h.vergi.toplam : 0);

describe("kuponlu sepet", () => {
  it("yüzde kuponu vergi dahil gösterimde: indirim satırlara dağılır, vergi indirimden sonradır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc({ satis: 23_600 });
    await h.kuponAc({ kod: "YUZDE10", tur: "yuzde", deger: 10, kapsam: "hepsi" });
    const kalemler = [
      { birim: a.birim, adet: 2 },
      { birim: b.birim, adet: 1 },
    ];
    const kuponsuz = await h.hesapla(kalemler);
    expect(kuponsuz.kupon).toBeUndefined();
    const sonuc = await h.hesapla(kalemler, "YUZDE10");
    // 472,00 × yüzde 10 = 47,20; 23,60 + 23,60. Kalan 212,40'ın vergisi 212,40 × 18 / 118 = 32,40.
    expect(
      sonuc.satirlar.map((s) => [s.tutar, s.indirim, s.vergi?.vergisiz, s.vergi?.vergi]),
    ).toEqual([
      [23_600, 2_360, 18_000, 3_240],
      [23_600, 2_360, 18_000, 3_240],
    ]);
    expect(sonuc).toMatchObject({
      araToplam: 47_200,
      kupon: { durum: "uygulandi", kod: "YUZDE10", tur: "yuzde", indirim: 4_720, kargoIndirimi: 0 },
      vergi: { toplam: 6_480 },
      toplam: 42_480,
    });
    expect(toplamTutar(sonuc)).toBe(sonuc.toplam);
  });

  it("vergi hariç gösterimde indirim vergisiz tutarda görünür, vergi kupondan sonradır", async () => {
    const h = await hazirla();
    await h.ayarla({ fiyatGosterimi: "vergi-haric" });
    const a = await h.urunAc();
    await h.kuponAc({ kod: "YUZDE10", tur: "yuzde", deger: 10, kapsam: "hepsi" });
    const sonuc = await h.hesapla([{ birim: a.birim, adet: 3 }], "YUZDE10");
    // 354,00 dahil, yüzde 10 = 35,40 → 318,60 dahil = 270,00 + 48,60 vergi. Kupondan önce vergisiz 300,00.
    expect(sonuc.satirlar[0]).toMatchObject({ tutar: 30_000, indirim: 3_000 });
    expect(sonuc).toMatchObject({
      gosterim: "vergi-haric",
      araToplam: 30_000,
      kupon: { indirim: 3_000 },
      vergi: { toplam: 4_860 },
      toplam: 31_860,
    });
    expect(toplamTutar(sonuc)).toBe(sonuc.toplam);
  });

  it("iki oranlı sepette tutar kuponu orantılı dağılır, artan kuruş küsuratı büyük olana, döküm oran oran", async () => {
    const h = await hazirla();
    const indirimliSinif = await h.ikinciSinif();
    const a = await h.urunAc();
    const c = await h.urunAc({ satis: 10_800, sinif: indirimliSinif });
    await h.kuponAc({ kod: "ELLI", tur: "tutar", deger: 5_000, kapsam: "hepsi" });
    const sonuc = await h.hesapla(
      [
        { birim: a.birim, adet: 1 },
        { birim: c.birim, adet: 1 },
      ],
      "ELLI",
    );
    // 50,00 → 26,106 ve 23,894 → 26,10 + 23,89, artan 1 kuruş küsuratı büyük olan ilk satıra: 26,11 ve 23,89.
    // 91,89 × 18 / 118 = 14,017 → 14,02; 84,11 × 8 / 108 = 6,230 → 6,23.
    expect(sonuc.satirlar.map((s) => [s.indirim, s.vergi?.vergisiz, s.vergi?.vergi])).toEqual([
      [2_611, 7_787, 1_402],
      [2_389, 7_788, 623],
    ]);
    expect(sonuc.vergi.dokum.map((s) => [s.oran, s.matrah, s.vergi])).toEqual([
      [180_000, 7_787, 1_402],
      [80_000, 7_788, 623],
    ]);
    expect(sonuc).toMatchObject({ araToplam: 22_600, kupon: { indirim: 5_000 }, toplam: 17_600 });
  });

  it("tutar kuponu ürünleri sıfıra indirmez (1 kuruş kalır), kargoya uygulanmaz", async () => {
    const h = await hazirla();
    await h.ayarla({ kargoUcreti: 5_900 });
    const a = await h.urunAc({ satis: 3_000 });
    await h.kuponAc({ kod: "BUYUK", tur: "tutar", deger: 10_000, kapsam: "hepsi" });
    const sonuc = await h.hesapla([{ birim: a.birim, adet: 1 }], "BUYUK");
    expect(sonuc).toMatchObject({
      kupon: { indirim: 2_999 },
      kargo: { tur: "ucretli", tutar: 5_900 },
      toplam: 5_901,
    });
  });

  it("ücretsiz kargo kuponu kargosu zaten ücretsiz ya da kargosuz sepette geçmez (hak harcanmaz)", async () => {
    const h = await hazirla();
    await h.kuponAc({ kod: "KARGO", tur: "ucretsiz-kargo", deger: 0, kapsam: "hepsi" });
    const a = await h.urunAc();
    // Kargo ücreti verilmemiş: kargo ücretsiz.
    expect((await h.hesapla([{ birim: a.birim, adet: 1 }], "KARGO")).kupon).toEqual({
      durum: "gecmedi",
      kod: "KARGO",
      neden: "kargo-ucretsiz",
    });
    // Ücretsiz kargo sınırı aşılmış.
    await h.ayarla({ kargoUcreti: 5_900, ucretsizKargoSiniri: 10_000 });
    expect((await h.hesapla([{ birim: a.birim, adet: 1 }], "KARGO")).kupon).toMatchObject({
      neden: "kargo-ucretsiz",
    });
  });

  it("giriş ile gösterim farklıyken ve ara toplam yuvarlamasında özet her zaman toplamı verir, pay eksi olmaz", async () => {
    const h = await hazirla();
    const fiyatlar = [101, 100, 1_001, 999, 3_333, 7, 12_345];
    const urunler = [];
    for (const satis of fiyatlar) urunler.push(await h.urunAc({ satis }));
    await h.kuponAc({
      kod: "SECILI",
      tur: "tutar",
      deger: 1,
      kapsam: "urunler",
      kapsamKayitlari: [urunler[0]?.urun ?? ""],
    });
    await h.kuponAc({ kod: "YARIM", tur: "yuzde", deger: 7, kapsam: "hepsi" });
    for (const ayar of [
      { fiyatGirisi: "vergi-dahil", fiyatGosterimi: "vergi-haric" },
      { fiyatGirisi: "vergi-haric", fiyatGosterimi: "vergi-dahil" },
      { fiyatGirisi: "vergi-haric", fiyatGosterimi: "vergi-haric" },
    ] as const) {
      await h.ayarla({ ...ayar, vergiYuvarlama: "ara-toplam" });
      for (const [a, b] of [
        [0, 1],
        [2, 3],
        [4, 5],
        [0, 6],
      ] as const) {
        // Seçili ürün kuponu yalnız ilk ürünü içeren çiftte geçer.
        for (const kod of a === 0 ? ["SECILI", "YARIM"] : ["YARIM"]) {
          const sonuc = await h.hesapla(
            [
              { birim: urunler[a]?.birim ?? "", adet: 1 },
              { birim: urunler[b]?.birim ?? "", adet: 2 },
            ],
            kod,
          );
          const ne = `${JSON.stringify(ayar)} ${a}-${b} ${kod}`;
          expect(sonuc.kupon?.durum, ne).toBe("uygulandi");
          expect(toplamTutar(sonuc), ne).toBe(sonuc.toplam);
          expect(
            sonuc.satirlar.every((satir) => (satir.indirim ?? 0) >= 0),
            ne,
          ).toBe(true);
          if (kod === "SECILI") expect(sonuc.satirlar[1]?.indirim, ne).toBeUndefined();
        }
      }
    }
  });

  it("ara toplam yuvarlamasında kapsam dışı satırın gösterimi kayınca da paylar toplam indirime eşittir, dışarıdakine pay düşmez", async () => {
    const h = await hazirla();
    await h.ayarla({
      fiyatGirisi: "vergi-dahil",
      fiyatGosterimi: "vergi-haric",
      vergiYuvarlama: "ara-toplam",
    });
    // 1,00 ve 1,07 dahil: vergisizler 0,85 ve 0,90. Kuponla 0,99 ve 1,07: vergi yeniden dağılınca 0,84 ve 0,91;
    // kapsam dışı satırın gösterimi 1 kuruş artar, kapsamdakininki 1 kuruş azalır: gösterimdeki indirim 0'dır.
    const a = await h.urunAc({ satis: 100 });
    const b = await h.urunAc({ satis: 107 });
    await h.kuponAc({
      kod: "KURUS",
      tur: "tutar",
      deger: 1,
      kapsam: "urunler",
      kapsamKayitlari: [a.urun],
    });
    const sonuc = await h.hesapla(
      [
        { birim: a.birim, adet: 1 },
        { birim: b.birim, adet: 1 },
      ],
      "KURUS",
    );
    expect(sonuc.kupon).toMatchObject({ durum: "uygulandi" });
    const paylar = sonuc.satirlar.reduce((toplam, satir) => toplam + (satir.indirim ?? 0), 0);
    expect(paylar).toBe(sonuc.kupon?.durum === "uygulandi" ? sonuc.kupon.indirim : -1);
    expect(sonuc.satirlar[1]?.indirim).toBeUndefined();
    expect(toplamTutar(sonuc)).toBe(sonuc.toplam);
    expect(sonuc.toplam).toBe(206);
  });

  it("vergi hariç girişte yüzde kuponu: vergi indirimden sonraki tutara eklenir", async () => {
    const h = await hazirla();
    await h.ayarla({ fiyatGirisi: "vergi-haric", fiyatGosterimi: "vergi-dahil" });
    const a = await h.urunAc({ satis: 10_000 });
    await h.kuponAc({ kod: "YUZDE10", tur: "yuzde", deger: 10, kapsam: "hepsi" });
    // 100,00 hariç × yüzde 10 = 10,00 → 90,00 + 16,20 vergi = 106,20. Kupondan önce 118,00 dahil gösterilir.
    const sonuc = await h.hesapla([{ birim: a.birim, adet: 1 }], "YUZDE10");
    expect(sonuc.satirlar[0]).toMatchObject({
      tutar: 11_800,
      indirim: 1_180,
      vergi: { vergisiz: 9_000, vergi: 1_620 },
    });
    expect(sonuc).toMatchObject({ araToplam: 11_800, kupon: { indirim: 1_180 }, toplam: 10_620 });
    expect(toplamTutar(sonuc)).toBe(sonuc.toplam);
  });

  it("ücretsiz kargo kuponu kargoyu ücretsiz yapar, verilmeyen ücret kargo indirimidir", async () => {
    const h = await hazirla();
    await h.ayarla({ kargoUcreti: 5_900 });
    const a = await h.urunAc();
    await h.kuponAc({ kod: "KARGO", tur: "ucretsiz-kargo", deger: 0, kapsam: "hepsi" });
    const sonuc = await h.hesapla([{ birim: a.birim, adet: 1 }], "KARGO");
    expect(sonuc).toMatchObject({
      araToplam: 11_800,
      kargo: { tur: "ucretsiz" },
      kupon: { durum: "uygulandi", tur: "ucretsiz-kargo", indirim: 0, kargoIndirimi: 5_900 },
      toplam: 11_800,
    });
    expect(sonuc.satirlar[0]?.indirim).toBeUndefined();
  });

  it("ücretsiz kargo sınırı kupondan sonraki tutara bakar; ayar 'indirimden önce' ise kupondan önceye", async () => {
    const h = await hazirla();
    await h.ayarla({ kargoUcreti: 5_900, ucretsizKargoSiniri: 10_000 });
    const a = await h.urunAc();
    await h.kuponAc({ kod: "YIRMI", tur: "yuzde", deger: 20, kapsam: "hepsi" });
    // 118,00 − 23,60 = 94,40 < 100,00: kargo eklenir.
    const sonra = await h.hesapla([{ birim: a.birim, adet: 1 }], "YIRMI");
    expect(sonra).toMatchObject({ kargo: { tur: "ucretli", tutar: 5_900 }, toplam: 15_340 });
    expect(toplamTutar(sonra)).toBe(sonra.toplam);
    await h.ayarla({ ucretsizKargoTutari: "indirimden-once" });
    const once = await h.hesapla([{ birim: a.birim, adet: 1 }], "YIRMI");
    expect(once).toMatchObject({ kargo: { tur: "ucretsiz" }, toplam: 9_440 });
  });

  it("en az tutar: ara toplam eşitse geçer, bir kuruş eksikse kalanla geçmez ve toplam değişmez", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ kod: "ENAZ", tur: "yuzde", deger: 10, kapsam: "hepsi", enAzTutar: 23_600 });
    await h.kuponAc({
      kod: "ENAZFAZLA",
      tur: "yuzde",
      deger: 10,
      kapsam: "hepsi",
      enAzTutar: 23_601,
    });
    const kalemler = [{ birim: a.birim, adet: 2 }];
    expect((await h.hesapla(kalemler, "ENAZ")).kupon).toMatchObject({ durum: "uygulandi" });
    const gecmedi = await h.hesapla(kalemler, "ENAZFAZLA");
    expect(gecmedi.kupon).toEqual({ durum: "gecmedi", kod: "ENAZFAZLA", neden: "en-az", kalan: 1 });
    expect(gecmedi.toplam).toBe(23_600);
    expect(gecmedi.satirlar[0]?.indirim).toBeUndefined();
  });

  it("indirimdeki ürüne 'indirimde geçmez' kuponu geçmez, satırı işaretlenir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc({ satis: 29_500, indirimli: 23_600 });
    await h.kuponAc({
      kod: "TAMFIYAT",
      tur: "yuzde",
      deger: 10,
      kapsam: "hepsi",
      indirimdeGecmez: true,
    });
    const sonuc = await h.hesapla(
      [
        { birim: a.birim, adet: 1 },
        { birim: b.birim, adet: 1 },
      ],
      "TAMFIYAT",
    );
    expect(sonuc.satirlar.map((s) => [s.indirim, s.kuponDisi])).toEqual([
      [1_180, undefined],
      [undefined, "indirimli"],
    ]);
    expect(sonuc).toMatchObject({ kupon: { indirim: 1_180 }, toplam: 34_220 });
    const yalnizIndirimli = await h.hesapla([{ birim: b.birim, adet: 1 }], "TAMFIYAT");
    expect(yalnizIndirimli.kupon).toMatchObject({ durum: "gecmedi", neden: "urun-yok" });
  });

  it("seçili ürün kuponu yalnız o üründe geçer", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc();
    await h.kuponAc({
      kod: "SECILI",
      tur: "yuzde",
      deger: 10,
      kapsam: "urunler",
      kapsamKayitlari: [a.urun],
    });
    const sonuc = await h.hesapla(
      [
        { birim: a.birim, adet: 1 },
        { birim: b.birim, adet: 1 },
      ],
      "SECILI",
    );
    expect(sonuc.satirlar.map((s) => s.indirim)).toEqual([1_180, undefined]);
    expect((await h.hesapla([{ birim: b.birim, adet: 1 }], "SECILI")).kupon).toMatchObject({
      neden: "urun-yok",
    });
  });

  it("kategori kuponu alt kategorinin ürününde geçer; alt kategori silinince geçmez", async () => {
    const h = await hazirla();
    const ust = await kategoriEkle(h.vt, yonetici(), { ad: "Giyim" });
    const alt = await kategoriEkle(h.vt, yonetici(), { ad: "Kazak", ust });
    const ic = await kategoriEkle(h.vt, yonetici(), { ad: "Yün", ust: alt });
    const icteki = await h.urunAc({ kategoriler: [ic] });
    const disaridaki = await h.urunAc();
    await h.kuponAc({
      kod: "GIYIM",
      tur: "yuzde",
      deger: 10,
      kapsam: "kategoriler",
      kapsamKayitlari: [ust],
    });
    const kalemler = [
      { birim: icteki.birim, adet: 1 },
      { birim: disaridaki.birim, adet: 1 },
    ];
    expect((await h.hesapla(kalemler, "GIYIM")).satirlar.map((s) => s.indirim)).toEqual([
      1_180,
      undefined,
    ]);
    // Ara kategori silinince altı üste çıkar (kart 0077): ürün yine kapsamdadır. Ürünün kendi kategorisi silinince değil.
    await kategoriSil(h.vt, yonetici(), alt);
    expect((await h.hesapla(kalemler, "GIYIM")).satirlar[0]?.indirim).toBe(1_180);
    await kategoriSil(h.vt, yonetici(), ic);
    expect((await h.hesapla(kalemler, "GIYIM")).kupon).toMatchObject({ neden: "urun-yok" });
  });

  it("kod büyük küçük harf ve noktalı noktasız i ayrımsız aranır; harf duyarlı sitede aynen", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ kod: "KASIM50", tur: "tutar", deger: 5_000, kapsam: "hepsi" });
    const kalemler = [{ birim: a.birim, adet: 1 }];
    for (const kod of ["kasim50", " Kasım50 ", "KASIM50"]) {
      expect((await h.hesapla(kalemler, kod)).kupon).toMatchObject({
        durum: "uygulandi",
        kod: "KASIM50",
      });
    }
    expect((await h.hesapla(kalemler, "YOK123")).kupon).toEqual({
      durum: "gecmedi",
      kod: "YOK123",
      neden: "bulunamadi",
    });
    const duyarli: Site = { ...site, ayarlar: { ...site.ayarlar, kuponKoduHarfDuyarli: true } };
    expect(
      (await sepetiHesapla(h.vt, duyarli, kalemler, { kupon: { kod: "kasim50" } })).kupon,
    ).toMatchObject({ neden: "bulunamadi" });
    expect(
      (await sepetiHesapla(h.vt, duyarli, kalemler, { kupon: { kod: "KASIM50" } })).kupon,
    ).toMatchObject({ durum: "uygulandi" });
  });
});
