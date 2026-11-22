// Tema ayarları ekranının verisi ve formu gerçek veritabanıyla (kart 0260, karar 0168): temanın açtığı renkler ve
// seçenekler, temanın kendi değerine eşit seçeneğin seçili görünmesi, dokunulmadan kaydedilen formun yeni sürüm
// yazmaması, okunmayan rengin önerili reddi ve önerinin kaydı, seçimlerin ve koyu temanın kaydı, temanın kendi
// değerine eşit seçeneği olmayan temada "Temanın kendi" seçimi.

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { varsayilanTemaDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import { ornekRenk } from "../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { temaDemosuAdresiDegiskeni } from "../../kayitlar/site.ts";
import { temaDemosu } from "../../kayitlar/tema.ts";
import { siteninTemaServisi } from "../../moduller/tema/servis.ts";
import { canliCarsi } from "../../temalar/hazir/canli-carsi.ts";
import { baglantiyiKapat, siteninVeritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { temaAyarlariFormu, temaAyarlariGirdisi } from "../tema/ayarlar-formu.ts";
import { temaAyarlariVerisi } from "../tema/ayarlar-verisi.ts";

const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as Record<symbol, unknown>;
// Hazır tema (canli-carsi, başlangıç) ve siteye özel tema (ozel-tema: yalnız ana renk ve tek köşe seçeneği).
const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/tema-ozel-ve-hazir"),
);
const demo = "https://demo.ornek.test";
const kim = { tur: "yonetici", kimlik: randomUUID() } as const;
let sil: () => Promise<void>;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("tema-ayarlari");
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv(temaDemosuAdresiDegiskeni, demo);
  await baglantiyiKapat();
  ortak[siteAnahtari] = site;
});

afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const servis = () => siteninTemaServisi();
const yayinla = (girdi: Parameters<ReturnType<typeof servis>["temayiYayinla"]>[2]) =>
  servis().temayiYayinla(siteninVeritabani(), kim, girdi);

// Her test başlangıç temasından başlar: önceki testin yazdığı sürüm başlangıç hâline yeni bir sürümle döner.
beforeEach(async () => {
  const durum = await servis().temaDurumu(siteninVeritabani());
  if (durum.tema !== "canli-carsi") {
    await yayinla({ tema: "canli-carsi", ayarlar: { koyuTema: false }, duzen: "koru" });
  } else {
    await yayinla({ tema: "canli-carsi", ayarlar: { koyuTema: false } });
  }
});

describe("tema ayarları ekranının verisi", () => {
  it("hazır temada açılan renk, seçenekler ve temanın kendi değerine eşit seçenek; hiçbiri kayıtlı değil", async () => {
    const veri = await temaAyarlariVerisi();
    expect(veri.tema).toEqual({
      kod: "canli-carsi",
      ad: expect.any(String),
      demo: `${demo}/?${temaDemosu.parametre}=canli-carsi`,
    });
    expect(veri.degistirilebilir).toBe(true);
    expect(veri.sonYayin).not.toBe("");
    expect(veri.renkler).toEqual([
      { ad: "birincil", temaninRengi: varsayilanTemaDegerleri.renkler.acik.birincil.toUpperCase() },
    ]);
    expect(veri.yaziTipleri.secenekler.map(({ kod }) => kod)).toEqual([
      "inter-jost",
      "manrope",
      "inter-archivo",
    ]);
    expect([veri.yaziTipleri.eslesen, veri.koseler.eslesen, veri.dugmeBicimleri.eslesen]).toEqual([
      "inter-jost",
      "orta",
      "hap",
    ]);
    expect([veri.yaziTipleri.kayitli, veri.koseler.kayitli, veri.dugmeBicimleri.kayitli]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(veri.urunFiltresi).toEqual({ temaninki: canliCarsi.gorunumler["urun-filtresi"] });
    // Formun başlangıcı: temanın rengi ve temanın kendi değerine eşit seçenekler.
    expect(temaAyarlariFormu(veri)).toEqual({
      renkler: { birincil: varsayilanTemaDegerleri.renkler.acik.birincil.toUpperCase() },
      yaziTipi: "inter-jost",
      kose: "orta",
      dugmeBicimi: "hap",
      koyuTema: false,
      urunFiltresi: canliCarsi.gorunumler["urun-filtresi"],
    });
  });

  it("dokunulmadan kaydedilen form yeni sürüm yazmaz", async () => {
    const veri = await temaAyarlariVerisi();
    const surum = await yayinla(temaAyarlariGirdisi(temaAyarlariFormu(veri), veri));
    expect(surum.sira).toBe(veri.sira);
  });

  it("okunmayan renk önerisiyle reddedilir, hiçbir şey yazılmaz; öneri kaydedilir ve ekranın verisine gelir", async () => {
    const veri = await temaAyarlariVerisi();
    const form = { ...temaAyarlariFormu(veri), renkler: { birincil: ornekRenk.siyah } };
    const hata = await yayinla(temaAyarlariGirdisi(form, veri)).catch((sebep: unknown) => sebep);
    expect(hata).toMatchObject({
      kod: "dogrulama",
      ayrinti: [
        {
          alan: "ayarlar.renkler.birincil",
          kod: "kontrast-yetersiz",
          oneri: expect.stringMatching(/^#[0-9A-F]{6}$/),
        },
      ],
    });
    expect((await servis().temaDurumu(siteninVeritabani())).sira).toBe(veri.sira);
    const oneri = (hata as { ayrinti: { oneri: string }[] }).ayrinti[0]?.oneri ?? "";
    await yayinla(temaAyarlariGirdisi({ ...form, renkler: { birincil: oneri } }, veri));
    const sonra = await temaAyarlariVerisi();
    expect(sonra.sira).toBe(veri.sira + 1);
    expect(sonra.renkler[0]?.kayitli).toBe(oneri);
    expect(temaAyarlariFormu(sonra).renkler.birincil).toBe(oneri);
  });

  it("seçimler, koyu tema ve filtrenin yeri kaydedilir; temanın rengine dönen renk yazılmaz", async () => {
    const veri = await temaAyarlariVerisi();
    const oteki = veri.urunFiltresi.temaninki === "solda" ? "ustte" : "solda";
    await yayinla(
      temaAyarlariGirdisi(
        {
          ...temaAyarlariFormu(veri),
          yaziTipi: "manrope",
          kose: "keskin",
          dugmeBicimi: "koseli",
          koyuTema: true,
          urunFiltresi: oteki,
        },
        veri,
      ),
    );
    expect((await servis().temaDurumu(siteninVeritabani())).ayarlar).toEqual({
      renkler: {},
      yaziTipi: "manrope",
      kose: "keskin",
      dugmeBicimi: "koseli",
      koyuTema: true,
      urunFiltresi: oteki,
    });
    const sonra = await temaAyarlariVerisi();
    expect([
      sonra.yaziTipleri.kayitli,
      sonra.koseler.kayitli,
      sonra.dugmeBicimleri.kayitli,
    ]).toEqual(["manrope", "keskin", "koseli"]);
    expect(sonra.koyuTema).toBe(true);
    // Formun başlangıcı kayıtlı seçimdir (temanın kendi değerine eşit seçenek değil).
    expect(temaAyarlariFormu(sonra)).toMatchObject({
      yaziTipi: "manrope",
      kose: "keskin",
      dugmeBicimi: "koseli",
      koyuTema: true,
      urunFiltresi: oteki,
    });
    // Kayıtlı seçim temanın kendi değerine eşit seçeneğe geri dönünce yine yazılır (mağaza sahibinin seçimi).
    const geri = temaAyarlariGirdisi({ ...temaAyarlariFormu(sonra), kose: "orta" }, sonra);
    expect(geri.ayarlar).toMatchObject({ kose: "orta" });
  });

  it("temanın kendi değerine eşit seçeneği olmayan temada 'Temanın kendi' seçilidir; boş seçim yazılmaz", async () => {
    await yayinla({ tema: "ozel-tema", ayarlar: { koyuTema: false }, duzen: "koru" });
    const veri = await temaAyarlariVerisi();
    expect(veri.tema.demo).toBeUndefined();
    expect(veri.renkler.map(({ ad }) => ad)).toEqual(["birincil"]);
    expect(veri.yaziTipleri.secenekler).toEqual([]);
    expect(veri.dugmeBicimleri.secenekler).toEqual([]);
    expect(veri.koseler).toEqual({
      secenekler: [{ kod: "keskin", kucuk: "0", orta: "0" }],
      temaninKendi: { kucuk: "4px", orta: "8px" },
    });
    const form = temaAyarlariFormu(veri);
    expect(form.kose).toBe("");
    expect(temaAyarlariGirdisi(form, veri).ayarlar).not.toHaveProperty("kose");
    expect(temaAyarlariGirdisi({ ...form, kose: "keskin" }, veri).ayarlar).toMatchObject({
      kose: "keskin",
    });
  });

  it("ekranın gördüğü sürüm eskiyse kayıt çakışır ve hiçbir şey yazılmaz; güncel sürümle yazılır", async () => {
    const eskiEkran = await temaAyarlariVerisi();
    // Arada başka bir sekme (ya da geri dönüş) yeni bir sürüm yazar.
    await yayinla({ tema: "canli-carsi", ayarlar: { koyuTema: false, kose: "keskin" } });
    const once = await servis().temaDurumu(siteninVeritabani());
    const hata = await yayinla(
      temaAyarlariGirdisi({ ...temaAyarlariFormu(eskiEkran), koyuTema: true }, eskiEkran),
    ).catch((sebep: unknown) => sebep);
    expect(hata).toMatchObject({ kod: "cakisma", ayrinti: [{ alan: "son", kod: "tema-degisti" }] });
    const sonra = await servis().temaDurumu(siteninVeritabani());
    expect({ sira: sonra.sira, ayarlar: sonra.ayarlar }).toEqual({
      sira: once.sira,
      ayarlar: once.ayarlar,
    });
    const guncel = await temaAyarlariVerisi();
    const surum = await yayinla(
      temaAyarlariGirdisi({ ...temaAyarlariFormu(guncel), koyuTema: true }, guncel),
    );
    expect(surum.ayarlar).toMatchObject({ kose: "keskin", koyuTema: true });
  });

  it("kayıtlı tema kullanılamıyorsa vitrinin teması gösterilir ve ekran bunu bilir", async () => {
    await yayinla({ tema: "ozel-tema", ayarlar: { koyuTema: false }, duzen: "koru" });
    // Altyapı sahibi özel temayı sitenin listesinden çıkarır.
    ortak[siteAnahtari] = {
      ...site,
      temalar: site.temalar.filter((tema) => tema.kod !== "ozel-tema"),
    };
    try {
      const veri = await temaAyarlariVerisi();
      expect(veri.tema.kod).toBe("canli-carsi");
      expect(veri.temaKullanilamaz).toBe(true);
    } finally {
      ortak[siteAnahtari] = site;
    }
    expect((await temaAyarlariVerisi()).temaKullanilamaz).toBe(false);
  });

  it("ayar kapalıysa değiştirilemez", async () => {
    ortak[siteAnahtari] = { ...site, ayarlar: { ...site.ayarlar, temaDegistirilebilir: false } };
    try {
      expect((await temaAyarlariVerisi()).degistirilebilir).toBe(false);
    } finally {
      ortak[siteAnahtari] = site;
    }
  });
});
