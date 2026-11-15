// Mağaza sahibinin tema ayarları (kart 0105): yalnız temanın açtığı renk ve seçenekler, okunmayan rengin
// reddi ve okunur en yakın tonun önerisi; okunur tonun bulunuşu.
import { describe, expect, it } from "vitest";
import { kontrastOrani, okunurTon } from "../../../bilesenler/tasarim-degerleri/kontrast.ts";
import { ornekRenk } from "../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import {
  parcaGorunumleriniKur,
  sorunluAyarlariAt,
  temaAyariSorunlari,
  temaAyarlariSemasi,
  yeniTemaninAyarlari,
} from "../ayarlar.ts";
import { okunmayanCiftler } from "../okunurluk.ts";
import { temaTanimiSemasi } from "../sema.ts";
import { denemeTemasi } from "./deneme-temasi.ts";

const tema = temaTanimiSemasi().parse(denemeTemasi());
const sorunlari = (girdi: Parameters<typeof temaAyarlariSemasi.parse>[0]) =>
  temaAyariSorunlari(tema, temaAyarlariSemasi.parse(girdi));

describe("ayarların şeması", () => {
  it("boş ayar: renk yok, koyu tema kapalı", () => {
    expect(temaAyarlariSemasi.parse({})).toEqual({ renkler: {}, koyuTema: false });
  });

  it("renk büyük harfe çevrilir; biçimi bozuk renk, bilinmeyen renk adı ve alan reddedilir", () => {
    expect(
      temaAyarlariSemasi.parse({ renkler: { birincil: ornekRenk.turuncuKucukHarfle } }).renkler,
    ).toEqual({
      birincil: ornekRenk.turuncu,
    });
    for (const bozuk of [
      { renkler: { birincil: ornekRenk.kisaBicim } },
      { renkler: { birincil: "red" } },
      { renkler: { birincil: ornekRenk.kacisli } },
      { renkler: { mor: ornekRenk.turuncu } },
      { yaziTipi: "Inter Variable" },
      { urunFiltresi: "sagda" },
      { urunFiltresi: "" },
      { fazla: true },
    ]) {
      expect(temaAyarlariSemasi.safeParse(bozuk).success, JSON.stringify(bozuk)).toBe(false);
    }
  });
});

describe("ayarların temaya göre sorunları", () => {
  it("açtığı renk ve seçeneklerle sorun yok", () => {
    expect(
      sorunlari({
        renkler: { birincil: ornekRenk.turuncu },
        yaziTipi: "yalniz-inter",
        kose: "yumusak",
        dugmeBicimi: "hap",
        koyuTema: true,
      }),
    ).toEqual([]);
  });

  it("temanın açmadığı renk değiştirilemez", () => {
    expect(sorunlari({ renkler: { zemin: ornekRenk.beyaz } })).toEqual([
      { alan: "renkler.zemin", kod: "renk-degistirilemez" },
    ]);
  });

  it("temanın seçeneklerinde olmayan yazı tipi, köşe ve düğme biçimi", () => {
    expect(sorunlari({ yaziTipi: "roboto", kose: "egik", dugmeBicimi: "yildiz" })).toEqual([
      { alan: "yaziTipi", kod: "secenek-tanimsiz" },
      { alan: "kose", kod: "secenek-tanimsiz" },
      { alan: "dugmeBicimi", kod: "secenek-tanimsiz" },
    ]);
  });

  it("okunmayan renk kaydedilmez, okunur en yakın ton önerilir", () => {
    // Ana rengin üstündeki yazı koyudur: koyu lacivert ana renk onunla okunmaz.
    const [sorun, ...diger] = sorunlari({ renkler: { birincil: ornekRenk.koyuLacivert } });
    expect(diger).toEqual([]);
    expect(sorun).toMatchObject({ alan: "renkler.birincil", kod: "kontrast-yetersiz" });
    const oneri = sorun?.oneri ?? "";
    expect(oneri).toMatch(/^#[0-9A-F]{6}$/);
    expect(
      okunmayanCiftler(
        {
          renkler: { ...tema.degerler.renkler.acik, birincil: oneri },
          baglar: tema.degerler.renkBaglari,
          mod: "acik",
        },
        "birincil",
      ),
    ).toEqual([]);
    // Öneri asıl renkten açıktır ve okunur olan tonların en yakınıdır: bir adım koyusu okunmaz.
    expect(kontrastOrani(tema.degerler.renkler.acik["birincil-ustu"], oneri)).toBeLessThan(4.6);
    // Önerinin kendisi kaydedilebilir.
    expect(sorunlari({ renkler: { birincil: oneri } })).toEqual([]);
  });

  // Kart 0124 (kullanıcı kararı): vurgu yazısı ana renge bağlıysa (Yumuşak Mevsim, Keskin Çizgi) mağaza
  // sahibinin ana rengi zeminde yazı olarak da okunur olmalıdır; bağ yokken aynı renk kaydedilir.
  it("ana renge bağlı vurgu yazısı varsa ana renk zeminde de okunur olmalı", () => {
    const bagli = structuredClone(tema);
    bagli.degerler.renkBaglari["vurgu-yazi"] = "birincil";
    const sorunlariBagli = (birincil: string) =>
      temaAyariSorunlari(bagli, temaAyarlariSemasi.parse({ renkler: { birincil } }));
    const olcu = (birincil: string) => ({
      renkler: { ...bagli.degerler.renkler.acik, birincil },
      baglar: bagli.degerler.renkBaglari,
      mod: "acik" as const,
    });
    // Bağ yokken turuncu kaydedilir (ana rengin üstündeki yazı koyudur); bağ varken turuncu beyaz zeminde
    // bağlantı olarak okunmaz. Koyu yazı açık, bağlantı koyu ton ister: ikisini birden sağlayan ton yoktur.
    expect(sorunlari({ renkler: { birincil: ornekRenk.turuncu } })).toEqual([]);
    expect(sorunlariBagli(ornekRenk.turuncu)).toEqual([
      { alan: "renkler.birincil", kod: "kontrast-yetersiz" },
    ]);
    // Ana rengin çiftleri ona bağlı vurgunun çiftlerini de kapsar.
    expect(okunmayanCiftler(olcu(ornekRenk.turuncu), "birincil")).toContainEqual(
      expect.objectContaining({ on: "vurgu-yazi", arka: "zemin" }),
    );
    // Ana rengin üstündeki yazı beyazken (Yumuşak Mevsim, Keskin Çizgi) iki çift de koyu ton ister: önerilen
    // ton ikisinde de geçer.
    bagli.degerler.renkler.acik["birincil-ustu"] = ornekRenk.beyaz;
    const [sorun] = sorunlariBagli(ornekRenk.turuncu);
    expect(sorun?.oneri).toMatch(/^#[0-9A-F]{6}$/);
    expect(okunmayanCiftler(olcu(sorun?.oneri ?? ""), "birincil")).toEqual([]);
  });

  it("hiçbir tonu okunur olmayan renkte öneri yoktur", () => {
    // Soluk yazı hem beyaz zeminde hem çok koyu yüzeyde okunmalı: hiçbir açıklık ikisini birden tutmaz.
    const ikiZeminli = structuredClone(tema);
    ikiZeminli.magazaSecenekleri.renkler = ["soluk-yazi"];
    ikiZeminli.degerler.renkler.acik.zemin = ornekRenk.beyaz;
    ikiZeminli.degerler.renkler.acik.yuzey = ornekRenk.cokKoyuGri;
    const [sorun] = temaAyariSorunlari(
      ikiZeminli,
      temaAyarlariSemasi.parse({ renkler: { "soluk-yazi": ornekRenk.ortaGri } }),
    );
    expect(sorun).toEqual({ alan: "renkler.soluk-yazi", kod: "kontrast-yetersiz" });
  });
});

describe("okunur ton", () => {
  it("geçen renk kendisi, büyük harfle", () => {
    expect(okunurTon(ornekRenk.turuncuKucukHarfle, () => true)).toBe(ornekRenk.turuncu);
  });

  it("aynı tonda, açıklığı en az değişen geçen renk", () => {
    const beyazdaOkunur = (aday: string) => kontrastOrani(aday, ornekRenk.beyaz) >= 4.5;
    const ton = okunurTon(ornekRenk.turuncu, beyazdaOkunur);
    expect(ton).toBeDefined();
    expect(beyazdaOkunur(ton ?? "")).toBe(true);
    expect(kontrastOrani(ton ?? "", ornekRenk.beyaz)).toBeLessThan(4.6);
  });

  it("hiç geçen yoksa undefined, bozuk renkte hata", () => {
    expect(okunurTon(ornekRenk.turuncu, () => false)).toBeUndefined();
    expect(() => okunurTon("FFB020", () => true)).toThrow();
  });
});

// Kart 0148: filtrenin yeri mağaza sahibinin tema ayarıdır; yeni temaya geçerken uymayan ayar atılır.
describe("filtrenin yeri (kart 0148)", () => {
  it("iki yer de her temada kaydedilebilir, seçilmemişse ayarda yoktur", () => {
    expect(temaAyarlariSemasi.parse({}).urunFiltresi).toBeUndefined();
    for (const yer of ["solda", "ustte"] as const) {
      expect(sorunlari({ urunFiltresi: yer })).toEqual([]);
      expect(temaAyarlariSemasi.parse({ urunFiltresi: yer }).urunFiltresi).toBe(yer);
    }
  });

  it("vitrinin görünümü: seçilmemişse temanınki, seçilmişse mağaza sahibininki; öteki parçalar temanın", () => {
    expect(parcaGorunumleriniKur(tema, temaAyarlariSemasi.parse({}))).toEqual(tema.gorunumler);
    expect(
      parcaGorunumleriniKur(tema, temaAyarlariSemasi.parse({ urunFiltresi: "ustte" })),
    ).toEqual({ ...tema.gorunumler, "urun-filtresi": "ustte" });
    expect(tema.gorunumler["urun-filtresi"]).toBe("solda");
  });
});

describe("yeni temaya geçerken kalan ayarlar (kart 0148)", () => {
  const ayarlar = temaAyarlariSemasi.parse({
    renkler: { birincil: ornekRenk.turuncu, zemin: ornekRenk.beyaz },
    yaziTipi: "roboto",
    kose: "yumusak",
    dugmeBicimi: "yildiz",
    koyuTema: true,
    urunFiltresi: "ustte",
  });

  it("yeni temanın açmadığı renk ve tanımsız seçenek atılır; geçerli seçim, koyu tema ve filtrenin yeri kalır", () => {
    const kalan = yeniTemaninAyarlari(tema, ayarlar);
    expect(kalan).toEqual({
      renkler: { birincil: ornekRenk.turuncu },
      kose: "yumusak",
      koyuTema: true,
      urunFiltresi: "ustte",
    });
    expect(temaAyariSorunlari(tema, kalan)).toEqual([]);
    // Girdi değişmez.
    expect(ayarlar.renkler.zemin).toBe(ornekRenk.beyaz);
  });

  it("okunmayan renk de atılır: yayın kurallardan geçer", () => {
    const okunmayan = temaAyarlariSemasi.parse({ renkler: { birincil: ornekRenk.koyuLacivert } });
    expect(temaAyariSorunlari(tema, okunmayan).map((sorun) => sorun.kod)).toEqual([
      "kontrast-yetersiz",
    ]);
    expect(yeniTemaninAyarlari(tema, okunmayan).renkler).toEqual({});
  });

  it("verilen sorunlar dışındaki ayara dokunulmaz", () => {
    expect(sorunluAyarlariAt(ayarlar, [{ alan: "yaziTipi" }])).toEqual({
      ...ayarlar,
      yaziTipi: undefined,
    });
    expect(sorunluAyarlariAt(ayarlar, [])).toEqual(ayarlar);
  });
});
