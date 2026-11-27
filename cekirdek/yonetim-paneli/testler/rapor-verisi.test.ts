// Raporlar ekranının verisi (kart 0317, karar 0195): sayı kutularının farkı (iadede artış kötüdür, önceki dönem
// sıfırken yüzde yok, yüzde birin altındaki değişim "yüzde birden az", bir dönemde değer yoksa yalnız önceki değer), boş hâl ve
// sonraki adımı, dönem düğmesinin yazısı, özet tablosu ve ekranla CSV'nin aynı sayıları vermesi.
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { satisRaporuCsv } from "../../moduller/rapor/csv";
import type { SatisOzeti, SatisRaporu } from "../../moduller/rapor/satis";
import {
  kuponKutulari,
  kuponSatiri,
  musteriKutulari,
  musteriSatiri,
  secimYazisi,
} from "../raporlar/diger-veri";
import type { CozulenRaporIstegi } from "../raporlar/veri";
import { raporBicimi, satisRaporuVerisi } from "../raporlar/veri";

const site: Site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
beforeAll(() => {
  ortak[siteAnahtari] = site;
});
afterAll(() => {
  delete ortak[siteAnahtari];
});
const b = siteninBicimleyicisi(site.ayarlar);

const bos: SatisOzeti = {
  siparisSayisi: 0,
  satis: 0,
  kuponIndirimi: 0,
  iade: 0,
  iadeSayisi: 0,
  netSatis: 0,
  ortalamaSepet: null,
  vergiler: [],
};
const ozet = (ek: Partial<SatisOzeti>): SatisOzeti => ({ ...bos, ...ek });
const rapor = (bu: SatisOzeti, onceki: SatisOzeti | null): SatisRaporu => ({
  donem: { baslangic: "2026-11-01", bitis: "2026-11-30" },
  ozet: bu,
  onceki:
    onceki === null
      ? null
      : { donem: { baslangic: "2026-10-02", bitis: "2026-10-31" }, ozet: onceki },
  seri: { tur: "gunluk", noktalar: [] },
});
const istek = (ek: Partial<CozulenRaporIstegi> = {}): CozulenRaporIstegi => ({
  rapor: "satis",
  sirala: "tutar",
  sayfa: 1,
  deger: { tur: "hazir", kod: "son-30-gun" },
  varsayilan: "son-30-gun",
  karsilastir: true,
  ...ek,
});
const kutusu = (veri: ReturnType<typeof satisRaporuVerisi>, kod: string) => {
  const kutu = veri.kutular.find((k) => k.kod === kod);
  if (kutu === undefined) throw new Error(`Kutu yok: ${kod}`);
  return kutu;
};

describe("raporlar ekranının verisi", () => {
  it("fark: ciroda artış iyi, iadede artış kötü; eşitte renk yok", () => {
    const veri = satisRaporuVerisi(
      site,
      istek(),
      rapor(
        ozet({
          siparisSayisi: 2,
          satis: 20_000,
          iade: 3_000,
          iadeSayisi: 1,
          ortalamaSepet: 10_000,
        }),
        ozet({ siparisSayisi: 2, satis: 10_000, iade: 1_000, iadeSayisi: 1, ortalamaSepet: 5_000 }),
      ),
    );
    expect(kutusu(veri, "satis")).toMatchObject({ yon: "arti", iyi: true });
    expect(kutusu(veri, "satis").fark).toBe(
      doldur(metin("yonetim.rapor.fark.arti"), {
        yuzde: b.yuzde(100),
        onceki: doldur(metin("yonetim.rapor.onceki"), { deger: b.para(10_000) }),
      }),
    );
    expect(kutusu(veri, "iade")).toMatchObject({ yon: "arti", iyi: false });
    expect(kutusu(veri, "siparisSayisi")).toMatchObject({ yon: "esit", iyi: null });
    const azalan = satisRaporuVerisi(
      site,
      istek(),
      rapor(ozet({ iade: 1_000, iadeSayisi: 1 }), ozet({ iade: 3_000, iadeSayisi: 1 })),
    );
    expect(kutusu(azalan, "iade")).toMatchObject({ yon: "eksi", iyi: true });
  });

  it("önceki sıfırken yüzde yok; yüzde birin altı 'yüzde birden az'; değer yoksa yalnız önceki; karşılaştırma yoksa fark yok", () => {
    const veri = satisRaporuVerisi(
      site,
      istek(),
      rapor(
        ozet({ siparisSayisi: 1, satis: 100_400, ortalamaSepet: 100_400 }),
        ozet({ siparisSayisi: 0, satis: 100_000 }),
      ),
    );
    expect(kutusu(veri, "siparisSayisi").fark).toBe(
      doldur(metin("yonetim.rapor.onceki"), { deger: b.sayi(0) }),
    );
    expect(kutusu(veri, "satis").fark).toContain(
      doldur(metin("yonetim.rapor.birdenAz"), { yuzde: b.yuzde(1) }),
    );
    expect(kutusu(veri, "ortalamaSepet")).toMatchObject({
      fark: metin("yonetim.rapor.oncekiYok"),
      yon: null,
      iyi: null,
    });
    const kiyassiz = satisRaporuVerisi(
      site,
      istek({ karsilastir: false }),
      rapor(ozet({ siparisSayisi: 1, satis: 1_000 }), null),
    );
    expect(kiyassiz.kutular.every((kutu) => kutu.fark === null && kutu.yon === null)).toBe(true);
    expect(kiyassiz.oncekiYazisi).toBeNull();
  });

  it("boş hâl: satış ve iade yoksa; varsayılan dönemde öteki dönem, değilse varsayılana dönüş", () => {
    const varsayilanda = satisRaporuVerisi(site, istek(), rapor(bos, bos));
    expect(varsayilanda.bos).toBe(true);
    expect(varsayilanda.bosDonemBaglantisi.adres).toContain("donem=gecen-ay");
    const ozel = satisRaporuVerisi(
      site,
      istek({ deger: { tur: "aralik", baslangic: "2026-11-01", bitis: "2026-11-30" } }),
      rapor(bos, bos),
    );
    expect(ozel.bosDonemBaglantisi.adres).toContain("donem=son-30-gun");
    expect(ozel.bosDonemBaglantisi.yazi).toBe(
      doldur(metin("yonetim.rapor.bos.donus"), { donem: metin("yonetim.rapor.hazir.son-30-gun") }),
    );
    const gecenAy = satisRaporuVerisi(
      site,
      istek({ varsayilan: "gecen-ay", deger: { tur: "hazir", kod: "gecen-ay" } }),
      rapor(bos, bos),
    );
    expect(gecenAy.bosDonemBaglantisi.adres).toContain("donem=son-30-gun");
    // Yalnız iadesi olan dönem boş değildir.
    expect(
      satisRaporuVerisi(site, istek(), rapor(ozet({ iade: 100, iadeSayisi: 1 }), bos)).bos,
    ).toBe(false);
  });

  it("dönem düğmesi: hazır dönemin adı ve günleri; özel aralıkta yalnız günler", () => {
    const hazir = satisRaporuVerisi(site, istek(), rapor(bos, null));
    expect(hazir.dugmeYazisi.startsWith(`${metin("yonetim.rapor.hazir.son-30-gun")}: `)).toBe(true);
    const ozel = satisRaporuVerisi(
      site,
      istek({ deger: { tur: "aralik", baslangic: "2026-11-01", bitis: "2026-11-30" } }),
      rapor(bos, null),
    );
    expect(ozel.dugmeYazisi).toBe(ozel.donemYazisi);
    expect(ozel.hazirKod).toBeNull();
  });

  it("özet tablosu: iade eksiyle, sıfır iade işaretsiz; ekran ve CSV aynı sayılardan", () => {
    const veriler = ozet({
      siparisSayisi: 3,
      satis: 123_456,
      kuponIndirimi: 2_500,
      iade: 10_000,
      iadeSayisi: 1,
      netSatis: 113_456,
      ortalamaSepet: 41_152,
      vergiler: [{ ad: "Deneme vergisi", oran: 180_000, matrah: 96_149, vergi: 17_307 }],
    });
    const r = rapor(veriler, null);
    const veri = satisRaporuVerisi(site, istek({ karsilastir: false }), r);
    const degerler = veri.ozetSatirlari.map((satir) => satir.deger);
    expect(degerler).toEqual([
      b.para(123_456),
      b.para(2_500),
      doldur(metin("yonetim.rapor.eksi"), { tutar: b.para(10_000) }),
      b.para(113_456),
      b.para(17_307),
    ]);
    expect(veri.ozetSatirlari.at(-1)?.ad).toContain(b.para(96_149));
    const csv = satisRaporuCsv(site, r).toString("utf8");
    for (const tutar of [123_456, 2_500, 10_000, 113_456, 41_152, 96_149, 17_307]) {
      const hucre = `${b.csvAyraci()}${b.csvTutari(tutar)}`;
      expect(
        csv.includes(`${hucre}\r\n`) || csv.includes(`${hucre}${b.csvAyraci()}`),
        String(tutar),
      ).toBe(true);
    }
    const sifir = satisRaporuVerisi(
      site,
      istek(),
      rapor(ozet({ satis: 100, siparisSayisi: 1 }), null),
    );
    expect(sifir.ozetSatirlari[2]?.deger).toBe(b.para(0));
  });

  it("sekmeler dönemi ve karşılaştırmayı korur; CSV adresi açık sekmenin", () => {
    const veri = satisRaporuVerisi(
      site,
      istek({ karsilastir: false, deger: { tur: "hazir", kod: "bu-ay" } }),
      rapor(bos, null),
    );
    expect(veri.sekmeler.map((sekme) => sekme.adres)).toEqual([
      "/yonetim/raporlar?donem=bu-ay&karsilastir=0",
      "/yonetim/raporlar?rapor=urunler&donem=bu-ay&karsilastir=0",
      "/yonetim/raporlar?rapor=musteriler&donem=bu-ay&karsilastir=0",
      "/yonetim/raporlar?rapor=kuponlar&donem=bu-ay&karsilastir=0",
    ]);
    expect(veri.csvAdresi).toBe("/kapi/yonetici/rapor-csv?rapor=satis&donem=bu-ay&karsilastir=0");
  });
});

describe("ürün, müşteri ve kupon raporlarının verisi", () => {
  it("müşteri kutuları: yeni ve dönen artışı iyi; üye olmadan ve müşteri başına renksiz; üye yoksa müşteri başına yok", () => {
    const kutular = musteriKutulari(
      raporBicimi(site),
      { yeni: 3, donen: 1, uyeSiparisi: 6, misafirSiparisi: 2 },
      { yeni: 1, donen: 2, uyeSiparisi: 3, misafirSiparisi: 1 },
    );
    expect(kutular.map(({ kod, yon, iyi }) => ({ kod, yon, iyi }))).toEqual([
      { kod: "yeni", yon: "arti", iyi: true },
      { kod: "donen", yon: "eksi", iyi: false },
      { kod: "misafir", yon: "arti", iyi: null },
      { kod: "musteriBasina", yon: "arti", iyi: null },
    ]);
    expect(kutular[3]?.deger).toBe(
      doldur(metin("yonetim.rapor.musteri.siparis"), { sayi: b.sayi(1.5, 1) }),
    );
    const uyesiz = musteriKutulari(
      raporBicimi(site),
      { yeni: 0, donen: 0, uyeSiparisi: 0, misafirSiparisi: 4 },
      null,
    );
    expect(uyesiz[3]?.deger).toBe(metin("yonetim.rapor.yok"));
  });

  it("müşteri satırı: adı silinmişse 'adı silinmiş', kapalı hesapta bağlantı yok", () => {
    const bicim = raporBicimi(site);
    expect(
      musteriSatiri(bicim, {
        musteri: "m1",
        ad: null,
        hesapKapali: false,
        siparisSayisi: 2,
        tutar: 1_000,
      }),
    ).toMatchObject({
      ad: metin("yonetim.rapor.musteri.adYok"),
      adYok: true,
      adres: "/yonetim/musteriler/ayrinti?kimlik=m1",
    });
    expect(
      musteriSatiri(bicim, {
        musteri: "m2",
        ad: "Ada",
        hesapKapali: true,
        siparisSayisi: 1,
        tutar: 500,
      }),
    ).toMatchObject({ ad: "Ada", adres: null, hesapKapali: true, tutar: b.para(500) });
  });

  it("kupon kutuları: kuponlu siparişin payı; indirim renksiz, satış artışı iyi; kuponsuz kodda bağlantı yok", () => {
    const bicim = raporBicimi(site);
    const kutular = kuponKutulari(
      bicim,
      { kuponluSiparis: 3, butunSiparis: 10, indirim: 900, satis: 30_000, iadeSonrasi: 25_000 },
      { kuponluSiparis: 3, butunSiparis: 8, indirim: 1_000, satis: 20_000, iadeSonrasi: 20_000 },
    );
    expect(kutular[0]?.alt).toBe(
      doldur(metin("yonetim.rapor.kupon.pay"), { butun: b.sayi(10), yuzde: b.yuzde(30) }),
    );
    expect(kutular.map(({ kod, iyi }) => ({ kod, iyi }))).toEqual([
      { kod: "kuponluSiparis", iyi: null },
      { kod: "indirim", iyi: null },
      { kod: "satis", iyi: true },
      { kod: "iadeSonrasi", iyi: true },
    ]);
    expect(
      kuponSatiri(bicim, {
        kupon: null,
        kod: "ESKI",
        kullanim: 1,
        indirim: 100,
        satis: 1_000,
        iadeSonrasi: 1_000,
      }).adres,
    ).toBeNull();
    expect(
      kuponSatiri(bicim, {
        kupon: "k1",
        kod: "YENI",
        kullanim: 1,
        indirim: 100,
        satis: 1_000,
        iadeSonrasi: 900,
      }).adres,
    ).toBe("/yonetim/kuponlar/kupon?kimlik=k1");
  });

  it("birleşimin seçimi okunur yazılır", () => {
    expect(
      secimYazisi([
        { secenek: "Renk", deger: "Lacivert" },
        { secenek: "Beden", deger: "M" },
      ]),
    ).toBe("Renk: Lacivert · Beden: M");
  });
});
