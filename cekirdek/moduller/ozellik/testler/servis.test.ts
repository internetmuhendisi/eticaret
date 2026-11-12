// Ürün özellikleri gerçek veritabanıyla (kart 0086, karar 0072): dört türde özelliğin eklenmesi ve
// okunması, ad ve seçenek adı tekilliği, birim ve seçenek kuralı, ürüne değer girilmesi ve türüne
// uymayan değerin serviste ve veritabanında reddi, tür değişikliği kuralı, silinen özelliğin ve
// seçeneğin değerlerinin ürünlerden kalkması, bir değere sahip ürünlerin tek sorguyla gelmesi, açık
// duran yazmalarla yarışlar, sınırlar, değişiklik kaydı, bozuk kimlik ve iki sitenin ayrı kalması.
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import {
  ozellikDegerAlanlari,
  ozellikSinirlari,
  ozellikTurleri,
} from "../../../kayitlar/ozellik.ts";
import type { Veritabani, VeritabaniIslemi } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import type { UrunGirdisi } from "../../urun/semalar.ts";
import { urunServisi } from "../../urun/servis.ts";
import type { VitrinSecenekleri } from "../../urun/vitrin.ts";
import { ozellikler, ozellikSecenekleri, urunOzellikDegerleri } from "../model.ts";
import type { OzellikGirdisi, UrunOzellikDegeri } from "../semalar.ts";
import { ozellikServisi as servis } from "../servis.ts";

const goster: VitrinSecenekleri = { tukenenUrun: "goster" };
const urunSrv = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("ozellik");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  vi.restoreAllMocks();
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

// Veritabanının reddettiği yazmanın hata kodu (23514 denetim, 23503 bağ).
const veritabaniHatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (hata === undefined) throw new Error("Veritabanı yazmayı reddetmeliydi.");
  const kaynak = (hata as { cause?: unknown }).cause ?? hata;
  return (kaynak as { code?: string }).code;
};

const ekle = (vt: Veritabani | VeritabaniIslemi, girdi: OzellikGirdisi) =>
  servis.ekle(vt, yonetici(), girdi);

const urunEkle = (vt: Veritabani | VeritabaniIslemi, ek: Partial<UrunGirdisi> = {}) =>
  urunSrv.urunEkle(vt, yonetici(), {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: null,
    durum: "yayinda",
    ...ek,
  });

const degerleri = async (vt: Veritabani, urun: string) =>
  (await urunSrv.urunuOku(vt, urun))?.ozellikler;

// Dört türden birer özellik; liste türünde üç seçenek.
const ornekOzellikler = async (vt: Veritabani) => {
  const malzeme = await ekle(vt, {
    ad: "Malzeme",
    tur: "liste",
    filtrede: true,
    secenekler: ["Pamuk", "Yün", "Keten"],
  });
  const secenekler = (await servis.oku(malzeme, vt))?.secenekler ?? [];
  const secenek = (ad: string) => {
    const bulunan = secenekler.find((s) => s.ad === ad)?.kimlik;
    if (bulunan === undefined) throw new Error(`Seçenek yok: ${ad}`);
    return bulunan;
  };
  return {
    malzeme,
    pamuk: secenek("Pamuk"),
    yun: secenek("Yün"),
    keten: secenek("Keten"),
    yazar: await ekle(vt, { ad: "Yazar", tur: "metin" }),
    uzunluk: await ekle(vt, { ad: "Uzunluk", tur: "sayi", birim: "cm", filtrede: true }),
    yikanabilir: await ekle(vt, { ad: "Yıkanabilir", tur: "evet-hayir" }),
  };
};

const kayitlar = (vt: Veritabani, kimlik: string) =>
  vt
    .select()
    .from(degisiklikKayitlari)
    .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
    .orderBy(asc(degisiklikKayitlari.zaman));

// Bir işi kendi işleminde yapıp işlemi açık tutar; birak() çağrılınca işlem kaydedilir.
const acikIslem = async (vt: Veritabani, is: (islem: VeritabaniIslemi) => Promise<unknown>) => {
  let birak: () => void = () => undefined;
  const tut = new Promise<void>((coz) => {
    birak = coz;
  });
  let yazdi: () => void = () => undefined;
  const yazildi = new Promise<void>((coz) => {
    yazdi = coz;
  });
  const bitti = vt.transaction(async (islem) => {
    await is(islem);
    yazdi();
    await tut;
  });
  await Promise.race([yazildi, bitti]);
  // Söz nesne içinde döner: async işlevden doğrudan dönen söz beklenirdi.
  return { birak: () => birak(), bitti };
};

describe("özellik tanımı", () => {
  it("dört türde özellik yazılır ve sırasıyla, seçenekleriyle okunur", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    expect(await servis.oku(o.uzunluk, vt)).toEqual({
      kimlik: o.uzunluk,
      ad: "Uzunluk",
      tur: "sayi",
      birim: "cm",
      filtrede: true,
      sira: 2,
      secenekler: [],
      silindi: false,
    });
    expect(await servis.oku(o.malzeme, vt)).toMatchObject({
      tur: "liste",
      filtrede: true,
      sira: 0,
      secenekler: [
        { kimlik: o.pamuk, ad: "Pamuk", sira: 0 },
        { kimlik: o.yun, ad: "Yün", sira: 1 },
        { kimlik: o.keten, ad: "Keten", sira: 2 },
      ],
    });
    expect((await servis.oku(o.yazar, vt))?.filtrede).toBe(false);
    expect((await servis.hepsiniOku(vt)).map((ozellik) => ozellik.ad)).toEqual([
      "Malzeme",
      "Yazar",
      "Uzunluk",
      "Yıkanabilir",
    ]);
    const yeni = await servis.secenekEkle(vt, yonetici(), o.malzeme, { ad: "Polyester" });
    expect((await servis.oku(o.malzeme, vt))?.secenekler.at(-1)).toEqual({
      kimlik: yeni,
      ad: "Polyester",
      sira: 3,
    });
  });

  it("veritabanındaki tür listesi ve değer denetimi kayıtla aynı", async () => {
    const vt = await siteAc();
    const tanim = async (ad: string) =>
      (
        (
          await vt.execute(
            sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = ${ad}`,
          )
        ).rows[0] as { tanim: string } | undefined
      )?.tanim ?? "";
    const turler = [...(await tanim("ozellikler_tur")).matchAll(/'([a-z-]+)'/g)].map((e) => e[1]);
    expect(turler.toSorted()).toEqual([...ozellikTurleri].toSorted());
    const denetim = await tanim("urun_ozellik_degerleri_deger");
    for (const tur of ozellikTurleri) {
      expect(denetim).toContain(`'${tur}'::text) = (${ozellikDegerAlanlari[tur]} IS NOT NULL)`);
    }
  });

  it("ad harf ve noktalı noktasız i ayrımsız tekildir; silinen özelliğin adı serbest kalır", async () => {
    const vt = await siteAc();
    const bir = await ekle(vt, { ad: "Kumaş", tur: "metin" });
    const beklenen = { kod: "cakisma", ayrinti: [{ alan: "ad", kod: "ad-tekrar" }] };
    expect(await hatasi(ekle(vt, { ad: "KUMAŞ", tur: "liste" }))).toEqual(beklenen);
    const iki = await ekle(vt, { ad: "Işık", tur: "metin" });
    expect(await hatasi(ekle(vt, { ad: "ışık", tur: "metin" }))).toEqual(beklenen);
    expect(await hatasi(servis.degistir(vt, yonetici(), iki, { ad: "kumaş" }))).toEqual(beklenen);
    // Kendi adının yazılışını değiştirmek tekrar sayılmaz.
    await servis.degistir(vt, yonetici(), bir, { ad: "KUMAŞ" });
    await servis.sil(vt, yonetici(), bir);
    await ekle(vt, { ad: "Kumaş", tur: "sayi" });
    // Veritabanındaki tekil indeks ikinci ağdır.
    expect(
      await veritabaniHatasi(vt.insert(ozellikler).values({ ad: "kumaş", tur: "metin" })),
    ).toBe("23505");
  });

  it("seçenek adı özellik içinde tekildir, girdi içindeki tekrar da yakalanır", async () => {
    const vt = await siteAc();
    expect(
      await hatasi(ekle(vt, { ad: "Renk", tur: "liste", secenekler: ["Kırmızı", "KIRMIZI"] })),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "secenekler.1", kod: "secenek-ad-tekrar" }] });
    expect(await servis.hepsiniOku(vt)).toEqual([]);
    const renk = await ekle(vt, { ad: "Renk", tur: "liste", secenekler: ["Kırmızı", "Mavi"] });
    const beklenen = { kod: "cakisma", ayrinti: [{ alan: "ad", kod: "secenek-ad-tekrar" }] };
    expect(await hatasi(servis.secenekEkle(vt, yonetici(), renk, { ad: "mavi" }))).toEqual(
      beklenen,
    );
    const [kirmizi] = (await servis.oku(renk, vt))?.secenekler ?? [];
    if (kirmizi === undefined) throw new Error("Seçenek yok.");
    expect(
      await hatasi(servis.secenekDegistir(vt, yonetici(), kirmizi.kimlik, { ad: "MAVİ" })),
    ).toEqual(beklenen);
    // Başka özellikte aynı ad serbesttir.
    await ekle(vt, { ad: "Astar rengi", tur: "liste", secenekler: ["Mavi"] });
  });

  it("birim yalnız sayıda, seçenek yalnız listede olur; kural birleşmiş kayda uygulanır", async () => {
    const vt = await siteAc();
    expect(await hatasi(ekle(vt, { ad: "Yazar", tur: "metin", birim: "cm" }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "birim", kod: "birim-yalniz-sayi" }],
    });
    expect(await hatasi(ekle(vt, { ad: "Yazar", tur: "metin", secenekler: ["A"] }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "secenekler", kod: "secenek-yalniz-liste" }],
    });
    // Boş seçenek listesi her türde kabul edilir.
    await ekle(vt, { ad: "Notlar", tur: "metin", secenekler: [] });
    const uzunluk = await ekle(vt, { ad: "Uzunluk", tur: "sayi", birim: "cm" });
    expect(await hatasi(servis.degistir(vt, yonetici(), uzunluk, { tur: "metin" }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "birim", kod: "birim-yalniz-sayi" }],
    });
    await servis.degistir(vt, yonetici(), uzunluk, { tur: "metin", birim: null });
    expect(await servis.oku(uzunluk, vt)).toMatchObject({ tur: "metin" });
    expect((await servis.oku(uzunluk, vt))?.birim).toBeUndefined();
    expect(await hatasi(servis.secenekEkle(vt, yonetici(), uzunluk, { ad: "A" }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "ozellik", kod: "secenek-yalniz-liste" }],
    });
    // Veritabanı da birimi yalnız sayıda kabul eder.
    expect(
      await veritabaniHatasi(
        vt.insert(ozellikler).values({ ad: "Başka", tur: "metin", birim: "cm" }),
      ),
    ).toBe("23514");
  });

  it("değeri ya da seçeneği olan özelliğin türü değişmez", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt, { ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }] });
    const beklenen = { kod: "is-kurali", ayrinti: [{ alan: "tur", kod: "tur-degisemez" }] };
    expect(await hatasi(servis.degistir(vt, yonetici(), o.yazar, { tur: "sayi" }))).toEqual(
      beklenen,
    );
    expect(await hatasi(servis.degistir(vt, yonetici(), o.malzeme, { tur: "metin" }))).toEqual(
      beklenen,
    );
    // Veritabanındaki bağ da değeri olan özelliğin türünü tutar.
    expect(
      await veritabaniHatasi(
        vt.update(ozellikler).set({ tur: "sayi" }).where(eq(ozellikler.kimlik, o.yazar)),
      ),
    ).toBe("23503");
    // Değer kalkınca tür değişir.
    await urunSrv.urunDegistir(vt, yonetici(), urun, { ozellikler: [] });
    await servis.degistir(vt, yonetici(), o.yazar, { tur: "sayi" });
    expect((await servis.oku(o.yazar, vt))?.tur).toBe("sayi");
  });

  it("sınırlar: sitede özellik ve özellikte seçenek sayısı", async () => {
    const vt = await siteAc();
    await vt.insert(ozellikler).values(
      Array.from({ length: ozellikSinirlari.ozellik - 1 }, (_, i) => ({
        ad: `Özellik ${i}`,
        tur: "metin",
      })),
    );
    const liste = await ekle(vt, {
      ad: "Son",
      tur: "liste",
      secenekler: Array.from({ length: ozellikSinirlari.secenek }, (_, i) => `Seçenek ${i}`),
    });
    expect(await hatasi(ekle(vt, { ad: "Fazla", tur: "metin" }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "ad", kod: "ozellik-siniri" }],
    });
    expect(await hatasi(servis.secenekEkle(vt, yonetici(), liste, { ad: "Fazla" }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "ad", kod: "secenek-siniri" }],
    });
    // Silinen yer açar.
    await servis.sil(vt, yonetici(), liste);
    await ekle(vt, { ad: "Fazla", tur: "metin" });
  });

  it("bozuk ve olmayan kimlik bulunamadı sayılır", async () => {
    const vt = await siteAc();
    for (const kimlik of ["bozuk", randomUUID()]) {
      expect(await servis.oku(kimlik, vt)).toBeUndefined();
      expect(await hatasi(servis.degistir(vt, yonetici(), kimlik, { ad: "X" }))).toMatchObject({
        kod: "bulunamadi",
      });
      expect(await hatasi(servis.sil(vt, yonetici(), kimlik))).toMatchObject({
        kod: "bulunamadi",
      });
      expect(await hatasi(servis.secenekEkle(vt, yonetici(), kimlik, { ad: "X" }))).toMatchObject({
        kod: "bulunamadi",
      });
      expect(await hatasi(servis.secenekSil(vt, yonetici(), kimlik))).toMatchObject({
        kod: "bulunamadi",
      });
      expect(await servis.urunleri(vt, kimlik, "x")).toEqual({ urunler: [], toplam: 0 });
    }
    expect(
      await hatasi(urunEkle(vt, { ozellikler: [{ ozellik: "bozuk", deger: "x" }] })),
    ).toMatchObject({ kod: "dogrulama" });
  });
});

// Kart 0119: büyük harfle verilen özellik kimliği aynı özelliktir.
describe("büyük harfli kimlik", () => {
  it("büyük harfle okunan liste özelliğinin seçenekleri gelir", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    expect((await servis.oku(o.malzeme.toUpperCase(), vt))?.secenekler.map((s) => s.ad)).toEqual([
      "Pamuk",
      "Yün",
      "Keten",
    ]);
  });
});

describe("ürünün değerleri", () => {
  it("her türün değeri yazılır ve özelliklerin sırasıyla okunur", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt, {
      ozellikler: [
        { ozellik: o.yikanabilir, deger: false },
        { ozellik: o.uzunluk, deger: 12.5 },
        { ozellik: o.yazar, deger: "  Ayşe Yılmaz  " },
        { ozellik: o.malzeme.toUpperCase(), deger: o.keten.toUpperCase() },
      ],
    });
    expect(await degerleri(vt, urun)).toEqual([
      { ozellik: o.malzeme, deger: o.keten },
      { ozellik: o.yazar, deger: "Ayşe Yılmaz" },
      { ozellik: o.uzunluk, deger: 12.5 },
      { ozellik: o.yikanabilir, deger: false },
    ]);
    // Aynı değerler yeniden verilince değişiklik kayda girmez.
    await urunSrv.urunDegistir(vt, yonetici(), urun, {
      ozellikler: [
        { ozellik: o.uzunluk, deger: 12.5 },
        { ozellik: o.malzeme, deger: o.keten },
        { ozellik: o.yazar, deger: "Ayşe Yılmaz" },
        { ozellik: o.yikanabilir, deger: false },
      ],
    });
    expect(
      (await kayitlar(vt, urun)).filter((satir) => satir.islem === "urun.degisti"),
    ).toHaveLength(0);
  });

  it("türüne uymayan değer serviste reddedilir, hiçbir değer yazılmaz", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt, { ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }] });
    // Listenin ilk değeri geçerlidir: sorun ikinci değerin alanıyla döner.
    const not = await ekle(vt, { ad: "Not", tur: "metin" });
    const uymayanlar: [UrunOzellikDegeri, string][] = [
      [{ ozellik: o.uzunluk, deger: "12" }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.uzunluk, deger: true }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.uzunluk, deger: 1.00001 }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.uzunluk, deger: 1e-7 }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.uzunluk, deger: ozellikSinirlari.sayi + 1 }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.uzunluk, deger: Number.NaN }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.yikanabilir, deger: "evet" }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.yikanabilir, deger: 1 }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.yazar, deger: 5 }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.yazar, deger: "   " }, "ozellik-deger-gecersiz"],
      [
        { ozellik: o.yazar, deger: "x".repeat(ozellikSinirlari.metin + 1) },
        "ozellik-deger-gecersiz",
      ],
      [{ ozellik: o.yazar, deger: "satis@ornek.test" }, "kayda-uygun-degil"],
      [{ ozellik: o.malzeme, deger: "Pamuk" }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.malzeme, deger: false }, "ozellik-deger-gecersiz"],
      [{ ozellik: o.malzeme, deger: randomUUID() }, "ozellik-secenek-gecersiz"],
    ];
    for (const [deger, kod] of uymayanlar) {
      const beklenen = { kod: "dogrulama", ayrinti: [{ alan: "ozellikler.1.deger", kod }] };
      const liste = [{ ozellik: not, deger: "Geçerli not" }, deger];
      expect(
        await hatasi(urunSrv.urunDegistir(vt, yonetici(), urun, { ozellikler: liste })),
      ).toEqual(beklenen);
      expect(await hatasi(urunEkle(vt, { ozellikler: liste }))).toEqual(beklenen);
    }
    expect(await degerleri(vt, urun)).toEqual([{ ozellik: o.yazar, deger: "Ayşe" }]);
    expect(await vt.select().from(urunOzellikDegerleri)).toHaveLength(1);
  });

  it("başka özelliğin seçeneği, silinmiş seçenek, olmayan ve silinmiş özellik, aynı özellik iki kez", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const renk = await ekle(vt, { ad: "Renk", tur: "liste", secenekler: ["Mavi"] });
    const mavi = (await servis.oku(renk, vt))?.secenekler[0]?.kimlik ?? "";
    await servis.secenekSil(vt, yonetici(), o.yun);
    const silinecek = await ekle(vt, { ad: "Eski", tur: "metin" });
    await servis.sil(vt, yonetici(), silinecek);
    const durumlar: [UrunOzellikDegeri[], { alan: string; kod: string }[]][] = [
      [
        [{ ozellik: o.malzeme, deger: mavi }],
        [{ alan: "ozellikler.0.deger", kod: "ozellik-secenek-gecersiz" }],
      ],
      [
        [{ ozellik: o.malzeme, deger: o.yun }],
        [{ alan: "ozellikler.0.deger", kod: "ozellik-secenek-gecersiz" }],
      ],
      [
        [{ ozellik: randomUUID(), deger: "x" }],
        [{ alan: "ozellikler.0.ozellik", kod: "ozellik-gecersiz" }],
      ],
      [
        [{ ozellik: silinecek, deger: "x" }],
        [{ alan: "ozellikler.0.ozellik", kod: "ozellik-gecersiz" }],
      ],
      [
        [
          { ozellik: o.yazar, deger: "A" },
          { ozellik: o.yazar.toUpperCase(), deger: "B" },
        ],
        [{ alan: "ozellikler", kod: "ozellik-tekrar" }],
      ],
    ];
    for (const [liste, ayrinti] of durumlar) {
      expect(await hatasi(urunEkle(vt, { ozellikler: liste }))).toEqual({
        kod: "dogrulama",
        ayrinti,
      });
    }
    expect(await vt.select().from(urunOzellikDegerleri)).toHaveLength(0);
  });

  it("türüne uymayan değer veritabanında da reddedilir", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const renk = await ekle(vt, { ad: "Renk", tur: "liste", secenekler: ["Mavi"] });
    const mavi = (await servis.oku(renk, vt))?.secenekler[0]?.kimlik;
    const urun = await urunEkle(vt);
    const yaz = (satir: Partial<typeof urunOzellikDegerleri.$inferInsert>) =>
      veritabaniHatasi(
        vt.insert(urunOzellikDegerleri).values({
          urun_kimligi: urun,
          ozellik_kimligi: o.uzunluk,
          tur: "sayi",
          ...satir,
        }),
      );
    // Satırın türü alanıyla uyuşmuyor ya da iki alan dolu.
    expect(await yaz({ metin_degeri: "12" })).toBe("23514");
    expect(await yaz({ sayi_degeri: 12, metin_degeri: "12" })).toBe("23514");
    expect(await yaz({})).toBe("23514");
    // Satırın türü özelliğin türüyle uyuşmuyor.
    expect(await yaz({ tur: "metin", metin_degeri: "12" })).toBe("23503");
    // Seçenek başka özelliğin.
    expect(
      await yaz({ ozellik_kimligi: o.malzeme, tur: "liste", secenek_kimligi: mavi ?? null }),
    ).toBe("23503");
    // Doğrusu yazılır.
    await vt.insert(urunOzellikDegerleri).values({
      urun_kimligi: urun,
      ozellik_kimligi: o.uzunluk,
      tur: "sayi",
      sayi_degeri: 12,
    });
  });

  it("değişiklikte liste baştan yazılır, kayda yalnız değişen değerler girer", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const kim = yonetici();
    const urun = await urunSrv.urunEkle(vt, kim, {
      ad: "Atkı",
      vergiSinifi: null,
      ozellikler: [
        { ozellik: o.malzeme, deger: o.yun },
        { ozellik: o.uzunluk, deger: 180 },
      ],
    });
    await urunSrv.urunDegistir(vt, kim, urun, {
      ozellikler: [
        { ozellik: o.malzeme, deger: o.pamuk },
        { ozellik: o.yikanabilir, deger: true },
      ],
    });
    expect(await degerleri(vt, urun)).toEqual([
      { ozellik: o.malzeme, deger: o.pamuk },
      { ozellik: o.yikanabilir, deger: true },
    ]);
    // Başka alan değişince değerler yerinde kalır.
    await urunSrv.urunDegistir(vt, kim, urun, { ad: "Uzun atkı" });
    expect(await degerleri(vt, urun)).toHaveLength(2);
    await urunSrv.urunDegistir(vt, kim, urun, { ozellikler: [] });
    expect(await degerleri(vt, urun)).toEqual([]);
    const sirali = (liste: UrunOzellikDegeri[]) =>
      liste.toSorted((a, b) => (a.ozellik < b.ozellik ? -1 : 1));
    const satirlar = await kayitlar(vt, urun);
    expect(satirlar.map((s) => [s.islem, s.eski_deger, s.yeni_deger])).toEqual([
      [
        "urun.eklendi",
        null,
        expect.objectContaining({
          ozellikler: sirali([
            { ozellik: o.malzeme, deger: o.yun },
            { ozellik: o.uzunluk, deger: 180 },
          ]),
        }),
      ],
      [
        "urun.degisti",
        {
          ozellikler: sirali([
            { ozellik: o.malzeme, deger: o.yun },
            { ozellik: o.uzunluk, deger: 180 },
          ]),
        },
        {
          ozellikler: sirali([
            { ozellik: o.malzeme, deger: o.pamuk },
            { ozellik: o.yikanabilir, deger: true },
          ]),
        },
      ],
      ["urun.degisti", { ad: "Atkı" }, { ad: "Uzun atkı" }],
      [
        "urun.degisti",
        {
          ozellikler: sirali([
            { ozellik: o.malzeme, deger: o.pamuk },
            { ozellik: o.yikanabilir, deger: true },
          ]),
        },
        { ozellikler: [] },
      ],
    ]);
  });

  it("sayının ondalığı ve eksi sıfır", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt, { ozellikler: [{ ozellik: o.uzunluk, deger: -0 }] });
    expect(await degerleri(vt, urun)).toEqual([{ ozellik: o.uzunluk, deger: 0 }]);
    for (const deger of [1.0001, -ozellikSinirlari.sayi, ozellikSinirlari.sayi - 0.0001]) {
      await urunSrv.urunDegistir(vt, yonetici(), urun, {
        ozellikler: [{ ozellik: o.uzunluk, deger }],
      });
      expect(await degerleri(vt, urun)).toEqual([{ ozellik: o.uzunluk, deger }]);
    }
  });
});

describe("silme", () => {
  it("silinen özelliğin değerleri ürünlerden kalkar, ürün değişmez, kalkan ürünler kayda girer", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const kim = yonetici();
    const bir = await urunEkle(vt, {
      ozellikler: [
        { ozellik: o.yazar, deger: "Ayşe" },
        { ozellik: o.uzunluk, deger: 10 },
      ],
    });
    const iki = await urunEkle(vt, { ozellikler: [{ ozellik: o.yazar, deger: "Ali" }] });
    const once = await urunSrv.urunuOku(vt, bir);
    await servis.sil(vt, kim, o.yazar);
    expect(await degerleri(vt, bir)).toEqual([{ ozellik: o.uzunluk, deger: 10 }]);
    expect(await degerleri(vt, iki)).toEqual([]);
    expect({ ...(await urunSrv.urunuOku(vt, bir)), ozellikler: [] }).toEqual({
      ...once,
      ozellikler: [],
    });
    expect((await servis.oku(o.yazar, vt))?.silindi).toBe(true);
    expect((await servis.hepsiniOku(vt)).map((ozellik) => ozellik.kimlik)).not.toContain(o.yazar);
    expect(await servis.urunleri(vt, o.yazar, "Ayşe")).toEqual({ urunler: [], toplam: 0 });
    const [silme] = (await kayitlar(vt, o.yazar)).filter((s) => s.islem === "ozellik.silindi");
    expect(silme).toMatchObject({
      kayit_turu: "ozellik",
      kim_kimligi: kim.tur === "sistem" ? null : kim.kimlik,
      eski_deger: {
        ad: "Yazar",
        tur: "metin",
        filtrede: false,
        sira: 1,
        urunler: [bir, iki].toSorted(),
      },
      yeni_deger: null,
    });
    // Silinmiş özellik değişmez.
    expect(await hatasi(servis.degistir(vt, kim, o.yazar, { ad: "X" }))).toMatchObject({
      kod: "bulunamadi",
    });
  });

  it("silinen seçenek yalnız onu taşıyan ürünlerden kalkar", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const yunlu = await urunEkle(vt, {
      ozellikler: [
        { ozellik: o.malzeme, deger: o.yun },
        { ozellik: o.yazar, deger: "Ayşe" },
      ],
    });
    const pamuklu = await urunEkle(vt, { ozellikler: [{ ozellik: o.malzeme, deger: o.pamuk }] });
    await servis.secenekSil(vt, yonetici(), o.yun);
    expect(await degerleri(vt, yunlu)).toEqual([{ ozellik: o.yazar, deger: "Ayşe" }]);
    expect(await degerleri(vt, pamuklu)).toEqual([{ ozellik: o.malzeme, deger: o.pamuk }]);
    expect((await servis.oku(o.malzeme, vt))?.secenekler.map((s) => s.ad)).toEqual([
      "Pamuk",
      "Keten",
    ]);
    expect((await kayitlar(vt, o.yun)).map((s) => [s.islem, s.eski_deger, s.yeni_deger])).toEqual([
      ["ozellik-secenegi.eklendi", null, { ozellik: o.malzeme, ad: "Yün", sira: 1 }],
      [
        "ozellik-secenegi.silindi",
        { ozellik: o.malzeme, ad: "Yün", sira: 1, urunler: [yunlu] },
        null,
      ],
    ]);
    // Aynı adla yeni seçenek açılabilir.
    await servis.secenekEkle(vt, yonetici(), o.malzeme, { ad: "Yün" });
  });
});

describe("bir değere sahip ürünler", () => {
  it("tek sorguyla, sayfa ve toplamla gelir; vitrin süzgeci ve silinmiş ürün", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const pamuklu = (ek: Partial<UrunGirdisi> = {}) =>
      urunEkle(vt, { ozellikler: [{ ozellik: o.malzeme, deger: o.pamuk }], ...ek });
    const bir = await pamuklu();
    const iki = await pamuklu();
    const taslak = await pamuklu({ durum: "taslak" });
    const silinen = await pamuklu();
    await urunSrv.urunSil(vt, yonetici(), silinen);
    await urunEkle(vt, { ozellikler: [{ ozellik: o.malzeme, deger: o.yun }] });
    const sorgu = vi.spyOn(vt.$client, "query");
    const hepsi = await servis.urunleri(vt, o.malzeme, o.pamuk);
    expect(sorgu).toHaveBeenCalledTimes(1);
    expect(hepsi).toEqual({ urunler: [taslak, iki, bir], toplam: 3 });
    expect(
      await servis.urunleri(vt, o.malzeme, o.pamuk, { vitrin: { yer: "liste", ...goster } }),
    ).toEqual({ urunler: [iki, bir], toplam: 2 });
    expect(await servis.urunleri(vt, o.malzeme, o.pamuk, { sayfa: 2, boyut: 2 })).toEqual({
      urunler: [bir],
      toplam: 3,
    });
  });

  it("her türde değer eşleşir; metin harf ayrımsız, sayı ondalık yazılışından bağımsız", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt, {
      ozellikler: [
        { ozellik: o.yazar, deger: "Işıl Şen" },
        { ozellik: o.uzunluk, deger: 1.5 },
        { ozellik: o.yikanabilir, deger: false },
        { ozellik: o.malzeme, deger: o.keten },
      ],
    });
    const baska = await urunEkle(vt, {
      ozellikler: [
        { ozellik: o.yazar, deger: "Işıl" },
        { ozellik: o.uzunluk, deger: 15 },
        { ozellik: o.yikanabilir, deger: true },
      ],
    });
    const bul = async (ozellik: string, deger: string | number | boolean) =>
      (await servis.urunleri(vt, ozellik, deger)).urunler;
    expect(await bul(o.yazar, "ışıl şen")).toEqual([urun]);
    expect(await bul(o.yazar, " IŞIL ŞEN ")).toEqual([urun]);
    expect(await bul(o.uzunluk, 1.5)).toEqual([urun]);
    expect(await bul(o.uzunluk, 1.5)).toEqual([urun]);
    expect(await bul(o.uzunluk, Number.POSITIVE_INFINITY)).toEqual([]);
    expect(await bul(o.yikanabilir, false)).toEqual([urun]);
    expect(await bul(o.yikanabilir, true)).toEqual([baska]);
    expect(await bul(o.malzeme, o.keten)).toEqual([urun]);
    expect(await bul(o.malzeme, o.keten.toUpperCase())).toEqual([urun]);
    expect(await bul(o.malzeme, o.pamuk)).toEqual([]);
    // Değer başka özellikte aranmaz.
    expect(await bul(o.malzeme, "Işıl Şen")).toEqual([]);
  });

  it("veritabanından silinmiş işaretli özelliğin ürünü gelmez", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    await urunEkle(vt, { ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }] });
    // Değeri kaldırmadan yalnız işaret: süzgeç ikinci ağdır.
    await vt
      .update(ozellikler)
      .set({ silinme_zamani: sql`now()` })
      .where(eq(ozellikler.kimlik, o.yazar));
    expect(await servis.urunleri(vt, o.yazar, "Ayşe")).toEqual({ urunler: [], toplam: 0 });
  });

  it("veritabanından silinmiş işaretli seçeneğin ürünü gelmez", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    await urunEkle(vt, { ozellikler: [{ ozellik: o.malzeme, deger: o.yun }] });
    // Değeri kaldırmadan yalnız işaret: süzgeç ikinci ağdır.
    await vt
      .update(ozellikSecenekleri)
      .set({ silinme_zamani: sql`now()` })
      .where(eq(ozellikSecenekleri.kimlik, o.yun));
    expect(await servis.urunleri(vt, o.malzeme, o.yun)).toEqual({ urunler: [], toplam: 0 });
  });
});

describe("yarış", () => {
  it("açık duran özellik silmesinin özelliğine değer yazılamaz", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt);
    const silme = await acikIslem(vt, (islem) => servis.sil(islem, yonetici(), o.yazar));
    const yazma = hatasi(
      urunSrv.urunDegistir(vt, yonetici(), urun, {
        ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }],
      }),
    );
    await kilitBekleyeniGor(vt);
    silme.birak();
    await silme.bitti;
    expect(await yazma).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "ozellikler.0.ozellik", kod: "ozellik-gecersiz" }],
    });
    expect(await vt.select().from(urunOzellikDegerleri)).toHaveLength(0);
  });

  it("açık duran değer yazmasının özelliği silinince değer de kalkar ve kayda girer", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt);
    const yazma = await acikIslem(vt, (islem) =>
      urunSrv.urunDegistir(islem, yonetici(), urun, {
        ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }],
      }),
    );
    const silme = servis.sil(vt, yonetici(), o.yazar);
    await kilitBekleyeniGor(vt);
    yazma.birak();
    await yazma.bitti;
    await silme;
    expect(await degerleri(vt, urun)).toEqual([]);
    expect(await vt.select().from(urunOzellikDegerleri)).toHaveLength(0);
    const [kayit] = (await kayitlar(vt, o.yazar)).filter((s) => s.islem === "ozellik.silindi");
    expect(kayit?.eski_deger).toMatchObject({ urunler: [urun] });
  });

  it("açık duran seçenek silmesi bitmeden okunan değer kayda silinmiş seçenekle girmez", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt, {
      ozellikler: [
        { ozellik: o.malzeme, deger: o.yun },
        { ozellik: o.yazar, deger: "Ayşe" },
      ],
    });
    const silme = await acikIslem(vt, (islem) => servis.secenekSil(islem, yonetici(), o.yun));
    const degisiklik = urunSrv.urunDegistir(vt, yonetici(), urun, {
      ozellikler: [{ ozellik: o.yazar, deger: "Ali" }],
    });
    await kilitBekleyeniGor(vt);
    silme.birak();
    await silme.bitti;
    await degisiklik;
    const [kayit] = (await kayitlar(vt, urun)).filter((s) => s.islem === "urun.degisti");
    expect(kayit?.eski_deger).toEqual({ ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }] });
    expect(await degerleri(vt, urun)).toEqual([{ ozellik: o.yazar, deger: "Ali" }]);
  });

  it("açık duran değer yazması bitmeden tür değişmez", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const urun = await urunEkle(vt);
    const yazma = await acikIslem(vt, (islem) =>
      urunSrv.urunDegistir(islem, yonetici(), urun, {
        ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }],
      }),
    );
    const tur = hatasi(servis.degistir(vt, yonetici(), o.yazar, { tur: "sayi" }));
    await kilitBekleyeniGor(vt);
    yazma.birak();
    await yazma.bitti;
    expect(await tur).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "tur", kod: "tur-degisemez" }],
    });
  });

  it("açık duran eklemenin arkasındaki aynı ad kilitte bekler, sonra çakışma alır", async () => {
    const vt = await siteAc();
    // Kilit yoksa ikinci istek yazılmamış satırı görmez, tekil indekste bekleyip veritabanı hatası
    // alır (bilinen hata değil).
    const birinci = await acikIslem(vt, (islem) => ekle(islem, { ad: "Yazar", tur: "metin" }));
    const ikinci = hatasi(ekle(vt, { ad: "YAZAR", tur: "sayi" }));
    await kilitBekleyeniGor(vt);
    birinci.birak();
    await birinci.bitti;
    expect(await ikinci).toEqual({ kod: "cakisma", ayrinti: [{ alan: "ad", kod: "ad-tekrar" }] });
  });
});

describe("değişiklik kaydı", () => {
  it("özellik ve seçenek yazmaları kayda aynı işlemde, yalnız değişen alanla girer", async () => {
    const vt = await siteAc();
    const kim = yonetici();
    const kimlik = await servis.ekle(vt, kim, {
      ad: "Boy",
      tur: "sayi",
      birim: "cm",
      secenekler: undefined,
    });
    await servis.degistir(vt, kim, kimlik, { birim: "mm", filtrede: true });
    // Aynı kalan değişiklik kayda girmez.
    await servis.degistir(vt, kim, kimlik, { birim: "mm" });
    expect(
      (await kayitlar(vt, kimlik)).map((s) => [
        s.islem,
        s.kayit_turu,
        s.kim_kimligi,
        s.eski_deger,
        s.yeni_deger,
      ]),
    ).toEqual([
      [
        "ozellik.eklendi",
        "ozellik",
        kim.tur === "sistem" ? null : kim.kimlik,
        null,
        { ad: "Boy", tur: "sayi", birim: "cm", filtrede: false, sira: 0 },
      ],
      [
        "ozellik.degisti",
        "ozellik",
        kim.tur === "sistem" ? null : kim.kimlik,
        { birim: "cm", filtrede: false },
        { birim: "mm", filtrede: true },
      ],
    ]);
    // Kayıt düşerse değişiklik de geri alınır.
    await expect(
      vt.transaction(async (islem) => {
        await servis.degistir(islem, kim, kimlik, { ad: "Yükseklik" });
        throw new Error("geri al");
      }),
    ).rejects.toThrow("geri al");
    expect((await servis.oku(kimlik, vt))?.ad).toBe("Boy");
  });

  it("özellikle eklenen her seçenek kendi satırıyla kayda girer", async () => {
    const vt = await siteAc();
    const o = await ornekOzellikler(vt);
    const satirlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.islem, "ozellik-secenegi.eklendi"),
          inArray(degisiklikKayitlari.kayit_kimligi, [o.pamuk, o.yun, o.keten]),
        ),
      );
    expect(satirlar.map((s) => s.yeni_deger)).toEqual(
      expect.arrayContaining([
        { ozellik: o.malzeme, ad: "Pamuk", sira: 0 },
        { ozellik: o.malzeme, ad: "Yün", sira: 1 },
        { ozellik: o.malzeme, ad: "Keten", sira: 2 },
      ]),
    );
    expect(satirlar).toHaveLength(3);
  });
});

describe("iki site", () => {
  it("bir sitenin özelliği ve değerleri ötekinde görünmez, aynı ad serbesttir", async () => {
    const [a, b] = await Promise.all([siteAc(), siteAc()]);
    const o = await ornekOzellikler(a);
    await urunEkle(a, { ozellikler: [{ ozellik: o.yazar, deger: "Ayşe" }] });
    expect(await servis.oku(o.yazar, b)).toBeUndefined();
    expect(await servis.hepsiniOku(b)).toEqual([]);
    expect(await servis.urunleri(b, o.yazar, "Ayşe")).toEqual({ urunler: [], toplam: 0 });
    expect(await hatasi(urunEkle(b, { ozellikler: [{ ozellik: o.yazar, deger: "x" }] }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "ozellikler.0.ozellik", kod: "ozellik-gecersiz" }],
    });
    await ekle(b, { ad: "Yazar", tur: "metin" });
  });
});
