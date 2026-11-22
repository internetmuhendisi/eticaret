// Sitenin tasarım değerlerinin birleşimi (kart 0102, karar 0076; kart 0105, karar 0080): temanın değerleri ile
// mağaza sahibinin ayarları, koyu temada okunur ton, panelin yalnız ana rengi alması, koyu temanın
// kapatılması ve şemaya uymayan ya da okunamayan değerde sayfanın düşmemesi.
import { afterEach, describe, expect, it, vi } from "vitest";
import { temaDegerleriCss } from "../../../bilesenler/tasarim-degerleri/css.ts";
import {
  type TemaDegerleri,
  varsayilanTemaDegerleri,
} from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import { degiskenAdi } from "../../../bilesenler/tasarim-degerleri/degisken-adlari.ts";
import { kontrastOrani } from "../../../bilesenler/tasarim-degerleri/kontrast.ts";
import { ornekRenk } from "../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../izleme/hata-katmani.ts";
import { temaAyarlariSemasi } from "../ayarlar.ts";
import {
  katalogTasarimCss,
  panelDegerleri,
  panelTasarimCss,
  sitenTasarimCss,
  tasarimCss,
  temaBirlesimi,
} from "../birlesim.ts";
import { okunmayanCiftler } from "../okunurluk.ts";
import { temaTanimiSemasi } from "../sema.ts";
import { denemeTemasi } from "./deneme-temasi.ts";

const izlenenler: IzlenenHata[] = [];
hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));
afterEach(() => {
  izlenenler.length = 0;
});

const tema = temaTanimiSemasi().parse(denemeTemasi());
const ayar = (girdi: Parameters<typeof temaAyarlariSemasi.parse>[0]) =>
  temaAyarlariSemasi.parse(girdi);

// Değerlerin bir temadaki okunurluk ölçüsü (bağlarıyla, kart 0124).
const olcu = (degerler: TemaDegerleri, mod: "acik" | "koyu") => ({
  renkler: degerler.renkler[mod],
  baglar: degerler.renkBaglari,
  mod,
});
describe("temanın değerleri ile mağaza sahibinin ayarları", () => {
  it("ayar yoksa temanın kendi değerleri", () => {
    expect(temaBirlesimi(tema, ayar({}))).toEqual(tema.degerler);
  });

  it("seçilen renk açık temada aynen, koyu temada okunursa aynen kullanılır", () => {
    const degerler = temaBirlesimi(
      tema,
      ayar({ renkler: { birincil: ornekRenk.turuncuKucukHarfle } }),
    );
    expect(degerler.renkler.acik.birincil).toBe(ornekRenk.turuncu);
    expect(degerler.renkler.koyu.birincil).toBe(ornekRenk.turuncu);
  });

  it("koyu temada okunmayan renk yerine okunur tonu kullanılır, açıkta aynen kalır", () => {
    // Koyu kırmızı: açık temadaki beyaz yazıyla okunur, koyu temadaki koyu yazıyla okunmaz.
    const koyuYaziliTema = structuredClone(tema);
    koyuYaziliTema.degerler.renkler.acik["birincil-ustu"] = ornekRenk.beyaz;
    const degerler = temaBirlesimi(
      koyuYaziliTema,
      ayar({ renkler: { birincil: ornekRenk.koyuKirmizi } }),
    );
    expect(degerler.renkler.acik.birincil).toBe(ornekRenk.koyuKirmizi);
    expect(degerler.renkler.koyu.birincil).not.toBe(ornekRenk.koyuKirmizi);
    expect(okunmayanCiftler(olcu(degerler, "koyu"), "birincil")).toEqual([]);
    expect(okunmayanCiftler(olcu(degerler, "acik"), "birincil")).toEqual([]);
  });

  it("birbirine bağlı iki renk birlikte seçilince açık temada aynen çizilir, kaydın sırası fark etmez", () => {
    // Tema ana rengi ve üstündeki yazıyı açar: koyu mavi üstüne beyaz yerine sarı üstüne siyah seçilir.
    // İkisi ayrı ayrı ölçülseydi (önce sarı, beyaz yazıyla) sarı okunmaz sayılıp koyulaşırdı.
    const ikiRenkli = structuredClone(tema);
    ikiRenkli.magazaSecenekleri.renkler = ["birincil", "birincil-ustu"];
    ikiRenkli.degerler.renkler.acik.birincil = ornekRenk.koyuMavi;
    ikiRenkli.degerler.renkler.acik["birincil-ustu"] = ornekRenk.beyaz;
    const secim = { birincil: ornekRenk.sari, "birincil-ustu": ornekRenk.siyah };
    const ters = { "birincil-ustu": ornekRenk.siyah, birincil: ornekRenk.sari };
    for (const renkler of [secim, ters]) {
      const degerler = temaBirlesimi(ikiRenkli, ayar({ renkler }));
      expect(degerler.renkler.acik.birincil).toBe(ornekRenk.sari);
      expect(degerler.renkler.acik["birincil-ustu"]).toBe(ornekRenk.siyah);
      expect(okunmayanCiftler(olcu(degerler, "koyu"), "birincil")).toEqual([]);
    }
  });

  it("yazı tipi, köşe ve düğme biçimi seçeneklerden gelir", () => {
    const degerler = temaBirlesimi(
      tema,
      ayar({ yaziTipi: "yalniz-inter", kose: "keskin", dugmeBicimi: "koseli" }),
    );
    expect(degerler.yaziTipleri.govde).toBe("Inter Variable, system-ui, sans-serif");
    expect(degerler.yaziTipleri.baslik).toBe("Inter Variable, system-ui, sans-serif");
    expect(degerler.koseler).toEqual({ kucuk: "0", orta: "0", dugme: "0" });
    // Kalan değerler temanındır.
    expect(degerler.yaziBoylari).toEqual(tema.degerler.yaziBoylari);
  });

  it("temanın açmadığı renk ve olmayan seçenek birleşime girmez", () => {
    const degerler = temaBirlesimi(
      tema,
      ayar({ renkler: { zemin: ornekRenk.siyah }, kose: "olmayan" }),
    );
    expect(degerler).toEqual(tema.degerler);
  });
});

describe("panelin değerleri", () => {
  it("siteden yalnız ana rengi alır, geri kalanı her sitede aynı", () => {
    const degerler = panelDegerleri({ acik: ornekRenk.turuncu, koyu: ornekRenk.acikTuruncu });
    expect(degerler.renkler.acik.birincil).toBe(ornekRenk.turuncu);
    // Koyu temada sitenin koyu temadaki ana rengi.
    expect(degerler.renkler.koyu.birincil).toBe(ornekRenk.acikTuruncu);
    const { birincil: _a, ...acik } = degerler.renkler.acik;
    const { birincil: _b, ...varsayilanAcik } = varsayilanTemaDegerleri.renkler.acik;
    expect(acik).toEqual(varsayilanAcik);
    expect(degerler.yaziTipleri).toEqual(varsayilanTemaDegerleri.yaziTipleri);
    expect(degerler.koseler).toEqual(varsayilanTemaDegerleri.koseler);
  });

  it("panelde okunmayan ana rengin okunur tonu türetilir", () => {
    // Panelin ana rengin üstündeki yazısı koyudur; çok koyu bir ana renk onunla okunmaz.
    const degerler = panelDegerleri({ acik: ornekRenk.koyuLacivert, koyu: ornekRenk.koyuLacivert });
    for (const mod of ["acik", "koyu"] as const) {
      expect(degerler.renkler[mod].birincil).not.toBe(ornekRenk.koyuLacivert);
      expect(
        kontrastOrani(degerler.renkler[mod]["birincil-ustu"], degerler.renkler[mod].birincil),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("ana renk yoksa ortak değerler", () => {
    expect(panelDegerleri(undefined)).toEqual(varsayilanTemaDegerleri);
  });
});

describe("sayfaya yazılan CSS", () => {
  it("koyu tema kapalıysa cihazın koyu tercihine yazılmaz, zorlanan koyu yine yazılır", () => {
    const css = tasarimCss(varsayilanTemaDegerleri, { koyuTema: false });
    expect(css).not.toContain("prefers-color-scheme");
    expect(css).toContain(":root{color-scheme:light;");
    expect(css).toContain("=koyu]{color-scheme:dark;");
    expect(tasarimCss(varsayilanTemaDegerleri, { koyuTema: true })).toContain(
      "@media (prefers-color-scheme:dark)",
    );
  });

  it("bozuk değer sayfaya yazılmaz: başlangıç değerleri yazılır, hata bir kez kaydedilir", () => {
    const bozuk = structuredClone(varsayilanTemaDegerleri);
    bozuk.koseler.orta = "0;}body{display:none";
    const css = tasarimCss(bozuk, { koyuTema: true });
    expect(css).toBe(temaDegerleriCss(varsayilanTemaDegerleri));
    expect(css).not.toContain("display:none");
    expect(izlenenler).toHaveLength(1);
    expect(izlenenler[0]?.baglam).toMatchObject({ kaynak: "tasarim-degerleri" });
  });

  it("vitrin seçili temayla ve koyu tema ayarıyla yazılır", async () => {
    const css = await sitenTasarimCss(async () => ({
      tema: { tanim: tema },
      ayarlar: ayar({ renkler: { birincil: ornekRenk.turuncu }, koyuTema: true }),
    }));
    expect(css).toContain(`--renk-birincil:${ornekRenk.turuncu};`);
    expect(css).toContain("prefers-color-scheme:dark");
    expect(izlenenler).toEqual([]);
  });

  it("katalog sitenin değerleriyle ve koyu tema ayarından bağımsız koyu temayla yazılır (kart 0290)", async () => {
    const okuyucu = async () => ({
      tema: { tanim: tema },
      ayarlar: ayar({ renkler: { birincil: ornekRenk.turuncu }, koyuTema: false }),
    });
    const vitrin = await sitenTasarimCss(okuyucu);
    expect(vitrin).not.toContain("prefers-color-scheme");
    const katalog = await katalogTasarimCss(okuyucu);
    expect(katalog).toContain(`--renk-birincil:${ornekRenk.turuncu};`);
    expect(katalog).toContain("@media (prefers-color-scheme:dark)");
    expect(katalog).toContain(":root{color-scheme:light dark;");
    expect(izlenenler).toEqual([]);
  });

  it("tema okunamazsa sayfa düşmez: hata kaydedilir, sitenin başlangıç teması yazılır", async () => {
    // Başlangıç teması köşesiz ve koyu temalı: temanın kendi değerlerinden ayırt edilir.
    vi.stubEnv("SITE_KLASORU", "cekirdek/ayar-semasi/testler/ornek-siteler/tema-ozel");
    try {
      const css = await sitenTasarimCss(async () => {
        throw new Error("veritabanı yok");
      });
      expect(css).toContain(`${degiskenAdi.kose("orta")}:0;`);
      expect(css).toContain("prefers-color-scheme:dark");
      expect(izlenenler.map((olay) => olay.baglam)).toContainEqual(
        expect.objectContaining({ kaynak: "tema" }),
      );
      const panel = await panelTasarimCss(async () => {
        throw new Error("veritabanı yok");
      });
      // Panel köşesini siteden almaz, ana rengini başlangıç temasından alır.
      expect(panel).toContain(
        `${degiskenAdi.kose("orta")}:${varsayilanTemaDegerleri.koseler.orta};`,
      );
      expect(panel).toContain(
        `${degiskenAdi.renk("birincil")}:${varsayilanTemaDegerleri.renkler.acik.birincil};`,
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
