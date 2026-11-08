// Varyantlı ürün gerçek veritabanıyla (kart 0085, karar 0071): iki seçenekli üründe her birleşimin
// kendi stok koduyla kaydı, aynı birleşimin ve aynı stok kodunun reddi (serviste ve veritabanında,
// aynı anda iki eklemede tek kazanan), eksik ve geçersiz birleşim, basit üründen varyantlıya ve geri
// dönüş, değeri ve seçeneği silinen birleşimin silinmiş işaretlenmesi, ad tekilliği, sınırlar, ürün
// değişikliğinde birim alanı reddi, değişiklik kaydı, fiyat ve stok işlevlerinin birleşimde değişmeden
// çalışması, bozuk kimlik ve iki sitenin ayrı kalması.
import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { varyantSinirlari } from "../../../kayitlar/urun.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { fiyatServisi } from "../../fiyat/servis.ts";
import { stokDurumlari } from "../../stok/durum.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunBirimiDegerleri, urunBirimleri, urunSecenekDegerleri } from "../model.ts";
import { urunServisi } from "../servis.ts";

const servis = urunServisi(() => "Europe/Istanbul");
const fiyat = fiyatServisi(() => ({ saatDilimi: "Europe/Istanbul", paraBirimi: "XTS" }));
const stok = stokServisi();
const ayarlar = { dusukStokEsigi: 5, sonAdetEsigi: 5 };

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("varyant");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
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

const kayitlar = (vt: Veritabani, kimlik: string) =>
  vt
    .select()
    .from(degisiklikKayitlari)
    .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
    .orderBy(degisiklikKayitlari.zaman);

// Beden (S, M) ve Renk (Beyaz, Siyah) seçenekli ürün; değerlerin kimlikleri adlarıyla.
const varyantliUrun = async (vt: Veritabani, ad = "Tişört") => {
  const urun = await servis.urunEkle(vt, yonetici(), { ad, vergiSinifi: null });
  const beden = await servis.secenekEkle(vt, yonetici(), urun, {
    ad: "Beden",
    degerler: ["S", "M"],
  });
  const renk = await servis.secenekEkle(vt, yonetici(), urun, {
    ad: "Renk",
    degerler: ["Beyaz", "Siyah"],
  });
  const okunan = await servis.urunuOku(vt, urun);
  const deger = Object.fromEntries(
    (okunan?.secenekler ?? []).flatMap((secenek) =>
      secenek.degerler.map((d) => [d.ad, d.kimlik] as const),
    ),
  ) as Record<"S" | "M" | "Beyaz" | "Siyah", string>;
  return { urun, beden, renk, deger };
};

const canliBirimSayisi = async (vt: Veritabani, urun: string) =>
  (
    await vt
      .select({ kimlik: urunBirimleri.kimlik })
      .from(urunBirimleri)
      .where(and(eq(urunBirimleri.urun_kimligi, urun), isNull(urunBirimleri.silinme_zamani)))
  ).length;

describe("birleşimler", () => {
  it("iki seçenekli üründe her birleşim kendi stok koduyla kaydedilir ve okunur", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const birlesimler = [
      ["S", "Beyaz"],
      ["S", "Siyah"],
      ["M", "Beyaz"],
      ["M", "Siyah"],
    ] as const;
    const birimler: string[] = [];
    for (const [beden, renk] of birlesimler) {
      birimler.push(
        await servis.birlesimEkle(vt, yonetici(), urun, {
          // Renk önce verilir: okunan sıra seçeneklerin sırasıdır.
          degerler: [deger[renk], deger[beden]],
          stokKodu: `TS-${beden}-${renk}`,
          barkod: "96385074",
          agirlikGram: 180,
        }),
      );
    }
    const okunan = await servis.urunuOku(vt, urun);
    expect(okunan?.tur).toBe("varyantli");
    expect(okunan?.secenekler.map((s) => [s.ad, s.degerler.map((d) => d.ad)])).toEqual([
      ["Beden", ["S", "M"]],
      ["Renk", ["Beyaz", "Siyah"]],
    ]);
    // Basit ürünün birimi ilk seçenekle silinmiş işaretlendi, birleşimler sırasıyla gelir.
    const canli = okunan?.birimler.filter((birim) => !birim.silindi) ?? [];
    expect(canli.map((birim) => [birim.kimlik, birim.stokKodu, birim.degerler])).toEqual(
      birlesimler.map(([beden, renk], i) => [
        birimler[i],
        `TS-${beden}-${renk}`,
        [deger[beden], deger[renk]],
      ]),
    );
    expect(canli.every((birim) => birim.barkod === "96385074" && birim.agirlikGram === 180)).toBe(
      true,
    );
    expect(okunan?.birimler.filter((birim) => birim.silindi)).toHaveLength(1);
  });

  it("aynı birleşim değerlerin sırası farklı verilse de reddedilir", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.S, deger.Beyaz] });
    expect(
      await hatasi(servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.Beyaz, deger.S] })),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "degerler", kod: "birlesim-tekrar" }] });
    expect(await canliBirimSayisi(vt, urun)).toBe(1);
  });

  it("veritabanı da aynı birleşimi reddeder, silinen birleşim yeniden açılabilir", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const birim = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
    });
    const [satir] = await vt
      .select({ birlesim: urunBirimleri.birlesim })
      .from(urunBirimleri)
      .where(eq(urunBirimleri.kimlik, birim));
    await expect(
      vt.insert(urunBirimleri).values({ urun_kimligi: urun, birlesim: satir?.birlesim ?? "" }),
    ).rejects.toThrow();
    // Basit ürün de iki birimle olamaz.
    const basit = await servis.urunEkle(vt, yonetici(), { ad: "Basit", vergiSinifi: null });
    await expect(vt.insert(urunBirimleri).values({ urun_kimligi: basit })).rejects.toThrow();
    await servis.birlesimSil(vt, yonetici(), birim);
    const yeni = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
    });
    expect(yeni).not.toBe(birim);
  });

  it("aynı anda aynı birleşimi ekleyen iki istekten yalnız biri geçer", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const sonuclar = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.M, deger.Siyah] }),
      ),
    );
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    for (const sonuc of sonuclar) {
      if (sonuc.status === "rejected") {
        expect(sonuc.reason).toBeInstanceOf(BilinenHata);
        expect((sonuc.reason as BilinenHata).kod).toBe("cakisma");
      }
    }
    expect(await canliBirimSayisi(vt, urun)).toBe(1);
  });

  it("açık duran eklemenin arkasındaki aynı birleşim kilitte bekler, sonra çakışma alır", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    // Birinci ekleme kendi işleminde yazar ama işlem açık kalır; ikinci istek onun kilidinde
    // beklerken görülür, sonra birinci kaydedilir. Kilit yoksa ikinci istek yazılmamış satırı görmez,
    // tekil indekste bekleyip veritabanı hatası alır.
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((bitti) => {
      birak = bitti;
    });
    let yazdi: () => void = () => undefined;
    const yazildi = new Promise<void>((bitti) => {
      yazdi = bitti;
    });
    const birinci = vt.transaction(async (islem) => {
      await servis.birlesimEkle(islem, yonetici(), urun, { degerler: [deger.M, deger.Siyah] });
      yazdi();
      await tut;
    });
    await yazildi;
    const ikinci = hatasi(
      servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.Siyah, deger.M] }),
    );
    await kilitBekleyeniGor(vt);
    birak();
    await birinci;
    expect(await ikinci).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "degerler", kod: "birlesim-tekrar" }],
    });
    expect(await canliBirimSayisi(vt, urun)).toBe(1);
  });

  it("aynı stok kodu birleşimler arasında, başka üründe ve değiştirmede reddedilir", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    await servis.urunEkle(vt, yonetici(), { ad: "Başka", vergiSinifi: null, stokKodu: "BASKA-1" });
    const ilk = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
      stokKodu: "TS-1",
    });
    const tekrar = { kod: "cakisma", ayrinti: [{ alan: "stokKodu", kod: "stok-kodu-tekrar" }] };
    expect(
      await hatasi(
        servis.birlesimEkle(vt, yonetici(), urun, {
          degerler: [deger.S, deger.Siyah],
          stokKodu: "ts-1",
        }),
      ),
    ).toEqual(tekrar);
    expect(
      await hatasi(
        servis.birlesimEkle(vt, yonetici(), urun, {
          degerler: [deger.S, deger.Siyah],
          stokKodu: "baska-1",
        }),
      ),
    ).toEqual(tekrar);
    const ikinci = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Siyah],
      stokKodu: "TS-2",
    });
    expect(
      await hatasi(servis.birlesimDegistir(vt, yonetici(), ikinci, { stokKodu: "TS-1" })),
    ).toEqual(tekrar);
    // Basit ürün de birleşimin kodunu alamaz.
    expect(
      await hatasi(
        servis.urunEkle(vt, yonetici(), { ad: "Üçüncü", vergiSinifi: null, stokKodu: "Ts-2" }),
      ),
    ).toEqual(tekrar);
    // Kendi kodunun yalnız harf büyüklüğü değişebilir.
    await servis.birlesimDegistir(vt, yonetici(), ilk, { stokKodu: "ts-1" });
    // Silinen birleşimin kodu serbest kalır.
    await servis.birlesimSil(vt, yonetici(), ikinci);
    await servis.birlesimDegistir(vt, yonetici(), ilk, { stokKodu: "TS-2" });
  });

  it("eksik ya da geçersiz birleşim reddedilir", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const baska = await varyantliUrun(vt, "Başka tişört");
    const hata = (kod: string) => ({ kod: "dogrulama", ayrinti: [{ alan: "degerler", kod }] });
    const ekle = (degerler: string[]) =>
      hatasi(servis.birlesimEkle(vt, yonetici(), urun, { degerler }));
    // Bir seçenek eksik.
    expect(await ekle([deger.S])).toEqual(hata("birlesim-eksik"));
    // Aynı seçenekten iki değer.
    expect(await ekle([deger.S, deger.M])).toEqual(hata("birlesim-eksik"));
    // Aynı değer iki kez.
    expect(await ekle([deger.S, deger.S])).toEqual(hata("deger-tekrar"));
    // Başka ürünün değeri, olmayan değer.
    expect(await ekle([deger.S, baska.deger.Beyaz])).toEqual(hata("birlesim-gecersiz"));
    expect(await ekle([deger.S, randomUUID()])).toEqual(hata("birlesim-gecersiz"));
    // Silinmiş değer.
    await servis.degerSil(vt, yonetici(), deger.Siyah);
    expect(await ekle([deger.S, deger.Siyah])).toEqual(hata("birlesim-gecersiz"));
    // Seçeneği olmayan (basit) ürün.
    const basit = await servis.urunEkle(vt, yonetici(), { ad: "Basit", vergiSinifi: null });
    expect(
      await hatasi(servis.birlesimEkle(vt, yonetici(), basit, { degerler: [deger.S] })),
    ).toEqual(hata("birlesim-gecersiz"));
    expect(await canliBirimSayisi(vt, urun)).toBe(0);
  });

  it("basit ürünün birimi birleşim servisinden değişmez ve silinmez", async () => {
    const vt = await siteAc();
    const basit = await servis.urunEkle(vt, yonetici(), { ad: "Basit", vergiSinifi: null });
    const birim = (await servis.urunuOku(vt, basit))?.birimler[0]?.kimlik ?? "";
    expect(await hatasi(servis.birlesimDegistir(vt, yonetici(), birim, { stokKodu: "X" }))).toEqual(
      { kod: "bulunamadi", ayrinti: undefined },
    );
    expect(await hatasi(servis.birlesimSil(vt, yonetici(), birim))).toEqual({
      kod: "bulunamadi",
      ayrinti: undefined,
    });
  });

  it("birleşimin alanları değişir, yalnız değişen alan kayda girer", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const birim = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
      stokKodu: "TS-1",
      agirlikGram: 180,
    });
    await servis.birlesimDegistir(vt, yonetici(), birim, { agirlikGram: 200, barkod: "96385074" });
    // Aynı değer kayda girmez.
    await servis.birlesimDegistir(vt, yonetici(), birim, { agirlikGram: 200 });
    await servis.birlesimDegistir(vt, yonetici(), birim, { stokKodu: null });
    const okunan = (await servis.urunuOku(vt, urun))?.birimler.find((b) => b.kimlik === birim);
    expect(okunan).toMatchObject({ agirlikGram: 200, barkod: "96385074" });
    expect(okunan?.stokKodu).toBeUndefined();
    expect(
      (await kayitlar(vt, birim)).map((k) => [k.islem, k.kayit_turu, k.eski_deger, k.yeni_deger]),
    ).toEqual([
      [
        "urun-birimi.eklendi",
        "urun-birimi",
        null,
        {
          urun,
          degerler: [deger.S, deger.Beyaz].toSorted(),
          stokKodu: "TS-1",
          agirlikGram: 180,
          sira: 1,
        },
      ],
      [
        "urun-birimi.degisti",
        "urun-birimi",
        // Boş değer kayda yazılmaz (ürün kaydıyla aynı).
        { agirlikGram: 180 },
        { barkod: "96385074", agirlikGram: 200 },
      ],
      ["urun-birimi.degisti", "urun-birimi", { stokKodu: "TS-1" }, {}],
    ]);
  });
});

describe("basit ve varyantlı ürün", () => {
  it("basit ürüne ilk seçenek eklenince birimi silinir, fiyatı ve stoğu satırında kalır", async () => {
    const vt = await siteAc();
    const urun = await servis.urunEkle(vt, yonetici(), {
      ad: "Önce basit",
      vergiSinifi: null,
      stokKodu: "BASIT-1",
    });
    const basit = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), basit, { satisFiyati: 1000 });
    await stok.stokDuzelt(vt, yonetici(), basit, {
      yeniMiktar: 7,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    const beden = await servis.secenekEkle(vt, yonetici(), urun, { ad: "Beden", degerler: ["S"] });
    const okunan = await servis.urunuOku(vt, urun);
    expect(okunan?.tur).toBe("varyantli");
    expect(okunan?.birimler).toEqual([expect.objectContaining({ kimlik: basit, silindi: true })]);
    expect((await stok.stoklariOku(vt, [basit])).get(basit)?.miktar).toBe(7);
    expect((await fiyat.fiyatOku(vt, basit))?.satisFiyati).toBe(1000);
    expect((await stokDurumlari(vt, [basit], ayarlar)).get(basit)?.satilabilir).toBe(false);
    // Silinen birimin kodu serbesttir.
    const s = okunan?.secenekler[0]?.degerler[0]?.kimlik ?? "";
    await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [s], stokKodu: "BASIT-1" });
    expect((await kayitlar(vt, basit)).map((k) => [k.islem, k.eski_deger])).toContainEqual([
      "urun-birimi.silindi",
      { urun, stokKodu: "BASIT-1", sira: 0 },
    ]);
    expect((await kayitlar(vt, beden)).map((k) => [k.islem, k.yeni_deger])).toEqual([
      ["urun-secenegi.eklendi", { urun, ad: "Beden", sira: 0, degerler: ["S"] }],
    ]);
  });

  it("birleşimleri olan ürüne yeni seçenek eklenmez; birleşimsiz üründe eklenir", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    // İki seçenek de birleşim yokken eklendi; birleşim açılınca üçüncüsü eklenmez.
    await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.S, deger.Beyaz] });
    expect(
      await hatasi(servis.secenekEkle(vt, yonetici(), urun, { ad: "Kumaş", degerler: ["Pamuk"] })),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "secenek", kod: "secenek-eklenemez" }] });
    expect((await servis.urunuOku(vt, urun))?.secenekler).toHaveLength(2);
  });

  it("son seçenek silinince ürün yeniden basit olur ve boş birimle satılabilir", async () => {
    const vt = await siteAc();
    const { urun, beden, renk, deger } = await varyantliUrun(vt);
    const birim = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
    });
    await servis.secenekSil(vt, yonetici(), renk);
    // Seçeneğin değerleri de kendi satırıyla silinmiş yazılır.
    for (const ad of ["Beyaz", "Siyah"] as const) {
      expect((await kayitlar(vt, deger[ad])).map((k) => [k.islem, k.eski_deger])).toEqual([
        ["urun-secenek-degeri.eklendi", null],
        ["urun-secenek-degeri.silindi", { urun, secenek: renk, ad, sira: ad === "Beyaz" ? 0 : 1 }],
      ]);
    }
    // Her birleşimin silinen seçenekte değeri vardı: hepsi silindi, ürün hâlâ varyantlı.
    let okunan = await servis.urunuOku(vt, urun);
    expect(okunan?.tur).toBe("varyantli");
    expect(okunan?.birimler.find((b) => b.kimlik === birim)?.silindi).toBe(true);
    expect(okunan?.secenekler.find((s) => s.kimlik === renk)).toMatchObject({
      silindi: true,
      degerler: [{ silindi: true }, { silindi: true }],
    });
    expect(await canliBirimSayisi(vt, urun)).toBe(0);
    await servis.secenekSil(vt, yonetici(), beden);
    okunan = await servis.urunuOku(vt, urun);
    expect(okunan?.tur).toBe("basit");
    const yeni = okunan?.birimler.filter((b) => !b.silindi) ?? [];
    expect(yeni).toHaveLength(1);
    expect(yeni[0]?.degerler).toEqual([]);
    // Basit ürün olarak değişir: birim alanları yine ürün değişikliğiyle.
    await servis.urunDegistir(vt, yonetici(), urun, { stokKodu: "GERI-BASIT" });
    expect((await servis.urunuOku(vt, urun))?.birimler.find((b) => !b.silindi)?.stokKodu).toBe(
      "GERI-BASIT",
    );
  });

  it("varyantlı üründe ürün değişikliği birim alanı taşıyamaz, öteki alanlar değişir", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const birim = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
      stokKodu: "TS-1",
    });
    expect(
      await hatasi(
        servis.urunDegistir(vt, yonetici(), urun, { ad: "Yeni", stokKodu: "X", enMm: 1 }),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "stokKodu", kod: "varyantli-urun-birim-alani" },
        { alan: "enMm", kod: "varyantli-urun-birim-alani" },
      ],
    });
    await servis.urunDegistir(vt, yonetici(), urun, { ad: "Yeni ad", durum: "yayinda" });
    const okunan = await servis.urunuOku(vt, urun);
    expect(okunan).toMatchObject({ ad: "Yeni ad", durum: "yayinda" });
    expect(okunan?.birimler.find((b) => b.kimlik === birim)?.stokKodu).toBe("TS-1");
    // Ürün silinince birleşimleri de silinir, her biri kendi satırıyla kayda girer.
    await servis.urunSil(vt, yonetici(), urun);
    expect((await servis.urunuOku(vt, urun))?.birimler.every((b) => b.silindi)).toBe(true);
    expect((await kayitlar(vt, birim)).at(-1)).toMatchObject({
      islem: "urun-birimi.silindi",
      eski_deger: { urun, stokKodu: "TS-1" },
    });
    expect(
      await hatasi(servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.S, deger.Siyah] })),
    ).toEqual({ kod: "bulunamadi", ayrinti: undefined });
  });
});

describe("silme", () => {
  it("değeri silinen birleşim silinmiş işaretlenir, ötekiler ve geçmişi kalır", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const sBeyaz = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
      stokKodu: "S-B",
    });
    const sSiyah = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.S, deger.Siyah],
    });
    const mBeyaz = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.M, deger.Beyaz],
    });
    await stok.stokDuzelt(vt, yonetici(), sBeyaz, {
      yeniMiktar: 3,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    await servis.degerSil(vt, yonetici(), deger.S);
    const okunan = await servis.urunuOku(vt, urun);
    const silindi = Object.fromEntries((okunan?.birimler ?? []).map((b) => [b.kimlik, b.silindi]));
    expect([silindi[sBeyaz], silindi[sSiyah], silindi[mBeyaz]]).toEqual([true, true, false]);
    // Satırlar ve değer bağlantıları kalır: eski sipariş birimine ve değerine bağlı kalır.
    expect(okunan?.birimler.find((b) => b.kimlik === sBeyaz)?.degerler).toEqual([
      deger.S,
      deger.Beyaz,
    ]);
    expect(
      await vt.select().from(urunSecenekDegerleri).where(eq(urunSecenekDegerleri.kimlik, deger.S)),
    ).toHaveLength(1);
    expect((await stok.stoklariOku(vt, [sBeyaz])).get(sBeyaz)?.miktar).toBe(3);
    expect((await stokDurumlari(vt, [sBeyaz], ayarlar)).get(sBeyaz)?.satilabilir).toBe(false);
    // Silinen birleşim değişmez, değer yeniden silinemez.
    expect(await hatasi(servis.birlesimDegistir(vt, yonetici(), sBeyaz, { sira: 9 }))).toEqual({
      kod: "bulunamadi",
      ayrinti: undefined,
    });
    expect(await hatasi(servis.degerSil(vt, yonetici(), deger.S))).toEqual({
      kod: "bulunamadi",
      ayrinti: undefined,
    });
    expect((await kayitlar(vt, sBeyaz)).at(-1)).toMatchObject({
      islem: "urun-birimi.silindi",
      eski_deger: { urun, stokKodu: "S-B", degerler: [deger.S, deger.Beyaz].toSorted() },
      yeni_deger: null,
    });
    expect((await kayitlar(vt, deger.S)).map((k) => [k.islem, k.eski_deger])).toEqual([
      ["urun-secenek-degeri.eklendi", null],
      ["urun-secenek-degeri.silindi", expect.objectContaining({ urun, ad: "S" })],
    ]);
    // Aynı adla yeni değer açılabilir, yeni birleşim eskisiyle çakışmaz.
    const [beden] = okunan?.secenekler ?? [];
    const yeniS = await servis.degerEkle(vt, yonetici(), beden?.kimlik ?? "", { ad: "S" });
    await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [yeniS, deger.Beyaz] });
  });

  it("seçeneğin son değeri silinmez; seçenek silinebilir", async () => {
    const vt = await siteAc();
    const urun = await servis.urunEkle(vt, yonetici(), { ad: "Tek renk", vergiSinifi: null });
    const renk = await servis.secenekEkle(vt, yonetici(), urun, {
      ad: "Renk",
      degerler: ["Beyaz"],
    });
    const beyaz = (await servis.urunuOku(vt, urun))?.secenekler[0]?.degerler[0]?.kimlik ?? "";
    const birim = await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [beyaz] });
    expect(await hatasi(servis.degerSil(vt, yonetici(), beyaz))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "deger", kod: "son-deger" }],
    });
    expect(
      (await servis.urunuOku(vt, urun))?.birimler.find((b) => b.kimlik === birim)?.silindi,
    ).toBe(false);
    // İkinci değer eklenince ilki silinebilir.
    await servis.degerEkle(vt, yonetici(), renk, { ad: "Siyah" });
    await servis.degerSil(vt, yonetici(), beyaz);
    await servis.secenekSil(vt, yonetici(), renk);
    expect((await servis.urunuOku(vt, urun))?.tur).toBe("basit");
  });

  it("silinmemiş değerin bağlantıları ve öteki ürünün birleşimleri değişmez", async () => {
    const vt = await siteAc();
    const a = await varyantliUrun(vt, "A");
    const b = await varyantliUrun(vt, "B");
    const bBirim = await servis.birlesimEkle(vt, yonetici(), b.urun, {
      degerler: [b.deger.S, b.deger.Beyaz],
    });
    await servis.birlesimEkle(vt, yonetici(), a.urun, { degerler: [a.deger.S, a.deger.Beyaz] });
    await servis.degerSil(vt, yonetici(), a.deger.S);
    expect(
      (await servis.urunuOku(vt, b.urun))?.birimler.find((x) => x.kimlik === bBirim)?.silindi,
    ).toBe(false);
    expect(
      await vt
        .select()
        .from(urunBirimiDegerleri)
        .where(eq(urunBirimiDegerleri.birim_kimligi, bBirim)),
    ).toHaveLength(2);
  });
});

describe("seçenek ve değer adları", () => {
  it("ad, harf büyüklüğü ve noktalı noktasız i ayrımı olmadan tekildir", async () => {
    const vt = await siteAc();
    const { urun, beden, deger } = await varyantliUrun(vt);
    const adTekrar = { kod: "cakisma", ayrinti: [{ alan: "ad", kod: "secenek-ad-tekrar" }] };
    expect(
      await hatasi(servis.secenekEkle(vt, yonetici(), urun, { ad: "BEDEN", degerler: ["X"] })),
    ).toEqual(adTekrar);
    const baska = await servis.urunEkle(vt, yonetici(), { ad: "Seçeneksiz", vergiSinifi: null });
    const ad = await servis.secenekEkle(vt, yonetici(), baska, { ad: "Kalıp", degerler: ["Dar"] });
    expect(
      await hatasi(servis.secenekEkle(vt, yonetici(), baska, { ad: "KALIP", degerler: ["Bol"] })),
    ).toEqual(adTekrar);
    // Kendi adının yalnız harf büyüklüğü değişebilir; başka seçeneğin adı alınamaz.
    await servis.secenekDegistir(vt, yonetici(), ad, { ad: "KALIP" });
    const ikinci = await servis.secenekEkle(vt, yonetici(), baska, {
      ad: "Boy",
      degerler: ["Kısa"],
    });
    expect(await hatasi(servis.secenekDegistir(vt, yonetici(), ikinci, { ad: "kalip" }))).toEqual(
      adTekrar,
    );
    // Değerler: eklemede, girdi içinde ve değiştirmede.
    expect(await hatasi(servis.degerEkle(vt, yonetici(), beden, { ad: "m" }))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "ad", kod: "deger-ad-tekrar" }],
    });
    expect(
      await hatasi(
        servis.secenekEkle(vt, yonetici(), baska, { ad: "Renk", degerler: ["Mavi", "MAVİ"] }),
      ),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "degerler.1", kod: "deger-ad-tekrar" }] });
    expect(await hatasi(servis.degerDegistir(vt, yonetici(), deger.S, { ad: "M" }))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "ad", kod: "deger-ad-tekrar" }],
    });
    // Yarıda kalan seçenek hiç yazılmadı.
    expect((await servis.urunuOku(vt, baska))?.secenekler.map((s) => s.ad)).toEqual([
      "KALIP",
      "Boy",
    ]);
    // Aynı ad başka üründe ve başka seçenekte serbesttir; veritabanı da tekrarı reddeder.
    await servis.secenekEkle(vt, yonetici(), baska, { ad: "Beden", degerler: ["S"] });
    await expect(
      vt.insert(urunSecenekDegerleri).values({ secenek_kimligi: beden, ad: "ı" }),
    ).resolves.toBeDefined();
    await expect(
      vt.insert(urunSecenekDegerleri).values({ secenek_kimligi: beden, ad: "I" }),
    ).rejects.toThrow();
  });

  it("ad ve sıra değişir, değişiklik kayda girer; kayda uygun olmayan ad reddedilir", async () => {
    const vt = await siteAc();
    const { urun, beden, deger } = await varyantliUrun(vt);
    await servis.secenekDegistir(vt, yonetici(), beden, { ad: "Numara", sira: 5 });
    await servis.degerDegistir(vt, yonetici(), deger.S, { ad: "Küçük" });
    // Aynı değer kayda girmez.
    await servis.degerDegistir(vt, yonetici(), deger.S, { ad: "Küçük" });
    const okunan = await servis.urunuOku(vt, urun);
    expect(okunan?.secenekler.map((s) => [s.ad, s.degerler.map((d) => d.ad)])).toEqual([
      ["Renk", ["Beyaz", "Siyah"]],
      ["Numara", ["Küçük", "M"]],
    ]);
    expect((await kayitlar(vt, beden)).map((k) => [k.islem, k.eski_deger, k.yeni_deger])).toEqual([
      ["urun-secenegi.eklendi", null, { urun, ad: "Beden", sira: 0, degerler: ["S", "M"] }],
      ["urun-secenegi.degisti", { ad: "Beden", sira: 0 }, { ad: "Numara", sira: 5 }],
    ]);
    expect((await kayitlar(vt, deger.S)).map((k) => [k.islem, k.eski_deger, k.yeni_deger])).toEqual(
      [
        ["urun-secenek-degeri.eklendi", null, { urun, secenek: beden, ad: "S", sira: 0 }],
        ["urun-secenek-degeri.degisti", { ad: "S" }, { ad: "Küçük" }],
      ],
    );
    expect(
      await hatasi(servis.degerEkle(vt, yonetici(), beden, { ad: "biri@ornek.test" })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "ad", kod: "kayda-uygun-degil" }] });
  });
});

describe("sınırlar", () => {
  it("en çok üç seçenek, seçenek başına elli değer", async () => {
    const vt = await siteAc();
    const urun = await servis.urunEkle(vt, yonetici(), { ad: "Sınır", vergiSinifi: null });
    const ilk = await servis.secenekEkle(vt, yonetici(), urun, {
      ad: "A",
      degerler: Array.from({ length: varyantSinirlari.deger }, (_, i) => `d${i}`),
    });
    await servis.secenekEkle(vt, yonetici(), urun, { ad: "B", degerler: ["b"] });
    await servis.secenekEkle(vt, yonetici(), urun, { ad: "C", degerler: ["c"] });
    expect(
      await hatasi(servis.secenekEkle(vt, yonetici(), urun, { ad: "D", degerler: ["d"] })),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "secenek", kod: "secenek-siniri" }] });
    expect(await hatasi(servis.degerEkle(vt, yonetici(), ilk, { ad: "fazla" }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "ad", kod: "deger-siniri" }],
    });
    expect(
      await hatasi(
        servis.secenekEkle(vt, yonetici(), urun, {
          ad: "E",
          degerler: Array.from({ length: varyantSinirlari.deger + 1 }, (_, i) => `e${i}`),
        }),
      ),
    ).toMatchObject({ kod: "dogrulama" });
    // Silinen değerin yeri boşalır.
    const okunan = await servis.urunuOku(vt, urun);
    await servis.degerSil(vt, yonetici(), okunan?.secenekler[0]?.degerler[0]?.kimlik ?? "");
    await servis.degerEkle(vt, yonetici(), ilk, { ad: "yeni" });
  });

  it("en çok yüz birleşim", async () => {
    const vt = await siteAc();
    const urun = await servis.urunEkle(vt, yonetici(), { ad: "Çok", vergiSinifi: null });
    await servis.secenekEkle(vt, yonetici(), urun, {
      ad: "A",
      degerler: Array.from({ length: 11 }, (_, i) => `a${i}`),
    });
    await servis.secenekEkle(vt, yonetici(), urun, {
      ad: "B",
      degerler: Array.from({ length: 10 }, (_, i) => `b${i}`),
    });
    const [a, b] = (await servis.urunuOku(vt, urun))?.secenekler ?? [];
    const ciftler = (a?.degerler ?? []).flatMap((x) =>
      (b?.degerler ?? []).map((y) => [x.kimlik, y.kimlik]),
    );
    for (const cift of ciftler.slice(0, varyantSinirlari.birlesim)) {
      await servis.birlesimEkle(vt, yonetici(), urun, { degerler: cift });
    }
    expect(
      await hatasi(
        servis.birlesimEkle(vt, yonetici(), urun, {
          degerler: ciftler[varyantSinirlari.birlesim] ?? [],
        }),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "degerler", kod: "birlesim-siniri" }] });
  });
});

describe("fiyat ve stok birleşimde", () => {
  it("fiyat ve stok işlevleri birleşimde basit üründeki gibi çalışır", async () => {
    const vt = await siteAc();
    const { urun, deger } = await varyantliUrun(vt);
    const s = await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.S, deger.Beyaz] });
    const m = await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.M, deger.Beyaz] });
    await fiyat.fiyatYaz(vt, yonetici(), s, { satisFiyati: 24990 });
    await fiyat.fiyatYaz(vt, yonetici(), m, {
      satisFiyati: 27990,
      indirimliFiyat: 25990,
      indirimBaslangici: null,
      indirimBitisi: null,
    });
    const gecerli = await fiyat.gecerliFiyatlar(vt, [s, m], new Date());
    expect([gecerli.get(s)?.tutar, gecerli.get(m)?.tutar]).toEqual([24990, 25990]);
    await stok.stokDuzelt(vt, yonetici(), s, { yeniMiktar: 2, gorulenMiktar: 0, sebep: "sayim" });
    await vt.transaction((islem) =>
      stok.stokDus(islem, yonetici(), [{ birim: s, adet: 1 }], {
        sebep: "siparis",
        kaynak: randomUUID(),
      }),
    );
    const durumlar = await stokDurumlari(vt, [s, m], ayarlar);
    expect([durumlar.get(s)?.miktar, durumlar.get(s)?.satilabilir]).toEqual([1, true]);
    expect(durumlar.get(m)?.tukendi).toBe(true);
    // Birleşim silinince fiyat yazılmaz, stok düşmez.
    await servis.birlesimSil(vt, yonetici(), s);
    expect(await hatasi(fiyat.fiyatYaz(vt, yonetici(), s, { satisFiyati: 1 }))).toMatchObject({
      kod: "bulunamadi",
    });
    expect(
      await hatasi(
        vt.transaction((islem) =>
          stok.stokDus(islem, yonetici(), [{ birim: s, adet: 1 }], {
            sebep: "siparis",
            kaynak: randomUUID(),
          }),
        ),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "birim-gecersiz" }] });
  });
});

describe("kimlik ve siteler", () => {
  it("bozuk ve olmayan kimlik bulunamadıdır", async () => {
    const vt = await siteAc();
    const bulunamadi = { kod: "bulunamadi", ayrinti: undefined };
    for (const kimlik of ["bozuk", randomUUID()]) {
      expect(
        await hatasi(servis.secenekEkle(vt, yonetici(), kimlik, { ad: "A", degerler: ["a"] })),
      ).toEqual(bulunamadi);
      expect(await hatasi(servis.secenekDegistir(vt, yonetici(), kimlik, { ad: "A" }))).toEqual(
        bulunamadi,
      );
      expect(await hatasi(servis.secenekSil(vt, yonetici(), kimlik))).toEqual(bulunamadi);
      expect(await hatasi(servis.degerEkle(vt, yonetici(), kimlik, { ad: "a" }))).toEqual(
        bulunamadi,
      );
      expect(await hatasi(servis.degerDegistir(vt, yonetici(), kimlik, { ad: "a" }))).toEqual(
        bulunamadi,
      );
      expect(await hatasi(servis.degerSil(vt, yonetici(), kimlik))).toEqual(bulunamadi);
      expect(
        await hatasi(servis.birlesimEkle(vt, yonetici(), kimlik, { degerler: [randomUUID()] })),
      ).toEqual(bulunamadi);
      expect(await hatasi(servis.birlesimDegistir(vt, yonetici(), kimlik, { sira: 1 }))).toEqual(
        bulunamadi,
      );
      expect(await hatasi(servis.birlesimSil(vt, yonetici(), kimlik))).toEqual(bulunamadi);
    }
  });

  it("bir sitenin seçeneği ve birleşimi öteki sitede yoktur", async () => {
    const a = await siteAc();
    const b = await siteAc();
    const { urun, beden, deger } = await varyantliUrun(a);
    const birim = await servis.birlesimEkle(a, yonetici(), urun, {
      degerler: [deger.S, deger.Beyaz],
    });
    expect(await servis.urunuOku(b, urun)).toBeUndefined();
    expect(await hatasi(servis.degerEkle(b, yonetici(), beden, { ad: "L" }))).toMatchObject({
      kod: "bulunamadi",
    });
    expect(await hatasi(servis.birlesimSil(b, yonetici(), birim))).toMatchObject({
      kod: "bulunamadi",
    });
    const sayi = await b.execute<{ sayi: number }>(
      sql`select (select count(*) from urun_secenekleri)::int + (select count(*) from urun_birimi_degerleri)::int as sayi`,
    );
    expect(sayi.rows[0]?.sayi).toBe(0);
  });
});
