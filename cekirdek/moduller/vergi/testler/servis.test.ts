// Vergi sınıfları ve oran tablosu gerçek veritabanıyla (kart 0074, karar 0060): başlangıç verisi bir kez
// yazılır ve sonra değişmez, aynı anda açılan süreçler iki kez yazmaz, silme işaretle yapılır ve sınıf
// yerinde kalır, her değişiklik kayda işle birlikte girer, hatalı bölge ve oran yazılmaz, iki site
// birbirinin tablosunu görmez, başlangıç verisi olan her site kendi verisiyle açılır.
//
// Deneme verisi bilerek sitelerinkinden farklıdır: çekirdekte bir sitenin vergi değeri geçmez
// (cekirdek/testler/vergi-degeri-yok.test.ts).
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { siteKlasorunuOku, vergiBaslangicDosyasi } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninMagazaAyarlari, siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { hesapla, type VergiSonucu } from "../hesap.ts";
import { vergiOranlari, vergiSiniflari } from "../model.ts";
import { type VergiBaslangici, vergiBaslangicSemasi } from "../semalar.ts";
import {
  baslangicVergiYazari,
  siteninVergiServisi,
  type VergiSinifi,
  vergiHesapla,
  vergiServisi,
} from "../servis.ts";

const baslangic: VergiBaslangici = vergiBaslangicSemasi.parse({
  siniflar: [
    {
      ad: "Genel",
      oranlar: [
        { ulke: "TR", oran: "18" },
        { ulke: "TR", il: "TR-06", postaKodu: "06000", oran: "2.5", ad: "Şehir vergisi" },
      ],
    },
    { ad: "İndirimli", oranlar: [{ ulke: "DE", oran: "7.5" }] },
    { ad: "Vergisiz" },
  ],
});
const sinifSayisi = 3;
const oranSayisi = 3;
const servis = vergiServisi(() => baslangic);
const bos = vergiServisi(() => ({ siniflar: [] }));

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("vergi");
  silinecekler.push(site.sil);
  return site.vt;
};
// Başlangıç verisi olmayan servisle (bos) kullanılan site: sınıf ve oran işlemleri tek başına denenir.
const bosSite = siteAc;
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const kayitlar = (vt: Veritabani) =>
  vt
    .select()
    .from(degisiklikKayitlari)
    .where(inArray(degisiklikKayitlari.kayit_turu, ["vergi-sinifi", "vergi-orani"]))
    .orderBy(degisiklikKayitlari.zaman);

const sayilar = async (vt: Veritabani) => ({
  sinif: (await vt.select().from(vergiSiniflari)).length,
  oran: (await vt.select().from(vergiOranlari)).length,
});

// Servisin bildiği hata: kodu ve ayrıntısı.
const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

describe("başlangıç verisi", () => {
  it("ilk okumada sınıflar sırasıyla, oranlar milyonda bir birimiyle yazılır ve kayda girer", async () => {
    const vt = await siteAc();
    const tablo = await servis.tabloyuOku(vt);
    expect(tablo.map((sinif) => [sinif.ad, sinif.sira, sinif.silindi])).toEqual([
      ["Genel", 0, false],
      ["İndirimli", 1, false],
      ["Vergisiz", 2, false],
    ]);
    const [genel, indirimli, vergisiz] = tablo;
    expect(genel?.oranlar.map(({ kimlik: _, sinifKimligi: __, ...oran }) => oran)).toEqual([
      { ulke: "TR", oran: 180_000, sira: 0 },
      { ulke: "TR", il: "TR-06", postaKodu: "06000", oran: 25_000, ad: "Şehir vergisi", sira: 1 },
    ]);
    expect(indirimli?.oranlar.map((oran) => oran.oran)).toEqual([75_000]);
    expect(vergisiz?.oranlar).toEqual([]);

    const yazilan = await kayitlar(vt);
    expect(yazilan).toHaveLength(sinifSayisi + oranSayisi);
    for (const kayit of yazilan) {
      expect(kayit.islem).toBe("vergi.baslangic");
      expect(kayit.kim_turu).toBe("sistem");
      expect(kayit.kim_adi).toBe(
        baslangicVergiYazari.tur === "sistem" ? baslangicVergiYazari.ad : "",
      );
      expect(kayit.eski_deger).toBeNull();
    }
  });

  it("yazılmış tablo başlangıç verisi değişse de değişmez", async () => {
    const vt = await siteAc();
    await servis.tabloyuOku(vt);
    const baska = vergiServisi(() =>
      vergiBaslangicSemasi.parse({ siniflar: [{ ad: "Başka", oranlar: [] }] }),
    );
    expect((await baska.tabloyuOku(vt)).map((sinif) => sinif.ad)).toEqual([
      "Genel",
      "İndirimli",
      "Vergisiz",
    ]);
    expect(await sayilar(vt)).toEqual({ sinif: sinifSayisi, oran: oranSayisi });
  });

  it("bütün sınıflar silinince başlangıç verisi yeniden yazılmaz", async () => {
    const vt = await siteAc();
    for (const sinif of await servis.tabloyuOku(vt)) {
      await servis.sinifSil(vt, yonetici(), sinif.kimlik);
    }
    expect(await servis.tabloyuOku(vt)).toEqual([]);
    expect(await sayilar(vt)).toEqual({ sinif: sinifSayisi, oran: oranSayisi });
  });

  it("sırası verilmeyen yeni sınıf silinmemiş sınıfların sonuna gelir", async () => {
    const vt = await siteAc();
    const [, , vergisiz] = await servis.tabloyuOku(vt);
    if (vergisiz === undefined) throw new Error("Sınıf yok.");
    await servis.sinifSil(vt, yonetici(), vergisiz.kimlik);
    await servis.sinifEkle(vt, yonetici(), { ad: "Yeni" });
    expect((await servis.tabloyuOku(vt)).map((sinif) => [sinif.ad, sinif.sira])).toEqual([
      ["Genel", 0],
      ["İndirimli", 1],
      ["Yeni", 2],
    ]);
  });

  it("ilk işlem bir değişiklikse başlangıç verisi önce yazılır", async () => {
    const vt = await siteAc();
    await servis.sinifEkle(vt, yonetici(), { ad: "Yeni", sira: 5 });
    expect((await servis.tabloyuOku(vt)).map((sinif) => sinif.ad)).toEqual([
      "Genel",
      "İndirimli",
      "Vergisiz",
      "Yeni",
    ]);
  });

  it("başlangıç verisi olmayan site sınıfsız başlar, ilk sınıfını kendisi açar", async () => {
    const vt = await siteAc();
    expect(await bos.tabloyuOku(vt)).toEqual([]);
    await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    expect((await bos.tabloyuOku(vt)).map((sinif) => sinif.ad)).toEqual(["Genel"]);
  });

  it("aynı anda açılan okumalar ve değişiklikler başlangıcı bir kez yazar", async () => {
    const vt = await siteAc();
    // Bağlantılar önceden açılır: yoksa açılış süresi okumaları sıraya sokar, yarış hiç olmaz.
    await Promise.all(Array.from({ length: 8 }, () => vt.execute(sql`select pg_sleep(0.05)`)));
    await Promise.all([
      ...Array.from({ length: 6 }, () => servis.tabloyuOku(vt)),
      servis.sinifEkle(vt, yonetici(), { ad: "Birinci" }),
      servis.sinifEkle(vt, yonetici(), { ad: "İkinci" }),
    ]);
    expect(await sayilar(vt)).toEqual({ sinif: sinifSayisi + 2, oran: oranSayisi });
    const baslangicKayitlari = (await kayitlar(vt)).filter((k) => k.islem === "vergi.baslangic");
    expect(baslangicKayitlari).toHaveLength(sinifSayisi + oranSayisi);
  });
});

describe("sınıflar", () => {
  it("ekleme, değiştirme ve silme yapanla kayda girer; aynı değer kayda girmez", async () => {
    const vt = await bosSite();
    const kim = yonetici();
    const kimlik = await bos.sinifEkle(vt, kim, { ad: "Genel", sira: 3 });
    await bos.sinifDegistir(vt, kim, kimlik, { ad: "Genel" });
    await bos.sinifDegistir(vt, kim, kimlik, { ad: "Standart" });
    await bos.sinifSil(vt, kim, kimlik);
    const yazilan = await kayitlar(vt);
    expect(yazilan.map((k) => [k.islem, k.eski_deger, k.yeni_deger])).toEqual([
      ["vergi-sinifi.eklendi", null, { ad: "Genel", sira: 3 }],
      ["vergi-sinifi.degisti", { ad: "Genel", sira: 3 }, { ad: "Standart", sira: 3 }],
      ["vergi-sinifi.silindi", { ad: "Standart", sira: 3 }, null],
    ]);
    for (const kayit of yazilan) {
      expect(kayit.kim_kimligi).toBe(kim.tur === "sistem" ? "" : kim.kimlik);
      expect(kayit.kayit_kimligi).toBe(kimlik);
    }
  });

  it("silinmemiş sınıfların adı tekildir, silinmiş sınıfın adı yeniden kullanılabilir", async () => {
    const vt = await bosSite();
    const ilk = await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    const ikinci = await bos.sinifEkle(vt, yonetici(), { ad: "Diğer" });
    expect(await hatasi(bos.sinifEkle(vt, yonetici(), { ad: " Genel " }))).toEqual({
      kod: "is-kurali",
      ayrinti: { kod: "ad-tekrar" },
    });
    expect(await hatasi(bos.sinifDegistir(vt, yonetici(), ikinci, { ad: "Genel" }))).toEqual({
      kod: "is-kurali",
      ayrinti: { kod: "ad-tekrar" },
    });
    await bos.sinifSil(vt, yonetici(), ilk);
    await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    expect((await bos.tabloyuOku(vt)).map((sinif) => sinif.ad).toSorted()).toEqual([
      "Diğer",
      "Genel",
    ]);
  });

  it("aynı anda aynı adla açılan iki sınıftan yalnız biri yazılır", async () => {
    const vt = await bosSite();
    await Promise.all(Array.from({ length: 4 }, () => vt.execute(sql`select pg_sleep(0.05)`)));
    const sonuclar = await Promise.allSettled(
      Array.from({ length: 4 }, () => bos.sinifEkle(vt, yonetici(), { ad: "Genel" })),
    );
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    for (const sonuc of sonuclar) {
      if (sonuc.status === "rejected") {
        expect(sonuc.reason).toBeInstanceOf(BilinenHata);
        expect((sonuc.reason as BilinenHata).ayrinti).toEqual({ kod: "ad-tekrar" });
      }
    }
    expect((await sayilar(vt)).sinif).toBe(1);
  });

  it("geçersiz ad ve sıra yazılmaz", async () => {
    const vt = await bosSite();
    for (const girdi of [
      { ad: "" },
      { ad: "a@b" },
      { ad: "x".repeat(51) },
      { ad: "A", sira: -1 },
    ]) {
      expect((await hatasi(bos.sinifEkle(vt, yonetici(), girdi))).kod).toBe("dogrulama");
    }
    expect((await sayilar(vt)).sinif).toBe(0);
  });

  it("olmayan sınıf bulunamaz", async () => {
    const vt = await bosSite();
    expect((await hatasi(bos.sinifSil(vt, yonetici(), randomUUID()))).kod).toBe("bulunamadi");
    expect((await hatasi(bos.oranEkle(vt, yonetici(), randomUUID(), tr("5")))).kod).toBe(
      "bulunamadi",
    );
  });
});

describe("kullanılan sınıfın silinmesi", () => {
  it("silme işaretle yapılır: sınıf ve oranları yerinde kalır, istenince silinmiş olarak okunur", async () => {
    const vt = await siteAc();
    const [genel] = await servis.tabloyuOku(vt);
    if (genel === undefined) throw new Error("Sınıf yok.");
    await servis.sinifSil(vt, yonetici(), genel.kimlik);

    expect((await servis.tabloyuOku(vt)).map((sinif) => sinif.ad)).toEqual([
      "İndirimli",
      "Vergisiz",
    ]);
    const silinmisle = await servis.tabloyuOku(vt, { silinmisSiniflar: true });
    const silinen = silinmisle.find((sinif) => sinif.kimlik === genel.kimlik);
    // Ürün bu kimliğe bağlı kalır, vergisi bu oranlarla hesaplanır (kart 0075).
    expect(silinen).toEqual({ ...genel, silindi: true });
    const [satir] = await vt
      .select({ silinme: vergiSiniflari.silinme_zamani })
      .from(vergiSiniflari)
      .where(eq(vergiSiniflari.kimlik, genel.kimlik));
    expect(satir?.silinme).toBeInstanceOf(Date);
  });

  it("silinmiş sınıf ve oranları değiştirilemez, ona oran eklenemez", async () => {
    const vt = await siteAc();
    const [genel] = await servis.tabloyuOku(vt);
    const [oran] = genel?.oranlar ?? [];
    if (genel === undefined || oran === undefined) throw new Error("Sınıf yok.");
    await servis.sinifSil(vt, yonetici(), genel.kimlik);
    const silinmis = { kod: "is-kurali", ayrinti: { kod: "sinif-silinmis" } };
    expect(await hatasi(servis.sinifSil(vt, yonetici(), genel.kimlik))).toEqual(silinmis);
    expect(await hatasi(servis.sinifDegistir(vt, yonetici(), genel.kimlik, { sira: 9 }))).toEqual(
      silinmis,
    );
    expect(await hatasi(servis.oranEkle(vt, yonetici(), genel.kimlik, tr("5")))).toEqual(silinmis);
    expect(await hatasi(servis.oranDegistir(vt, yonetici(), oran.kimlik, tr("5")))).toEqual(
      silinmis,
    );
    expect(await hatasi(servis.oranSil(vt, yonetici(), oran.kimlik))).toEqual(silinmis);
  });

  it("oranı olan sınıf veritabanında kalıcı silinemez", async () => {
    const vt = await siteAc();
    const [genel] = await servis.tabloyuOku(vt);
    if (genel === undefined) throw new Error("Sınıf yok.");
    await expect(
      vt.delete(vergiSiniflari).where(eq(vergiSiniflari.kimlik, genel.kimlik)),
    ).rejects.toThrow();
  });
});

const tr = (oran: string, ek: Record<string, unknown> = {}) => ({ ulke: "TR", oran, ...ek });

describe("oranlar", () => {
  it("aynı bölgede birden çok oran durur, ekleme, değiştirme ve silme kayda girer", async () => {
    const vt = await bosSite();
    const kim = yonetici();
    const sinif = await bos.sinifEkle(vt, kim, { ad: "Genel" });
    const birinci = await bos.oranEkle(vt, kim, sinif, tr("4", { sira: 1 }));
    await bos.oranEkle(vt, kim, sinif, tr("0.0001", { ad: "Ek", sira: 0 }));
    const [okunan] = await bos.tabloyuOku(vt);
    expect(okunan?.oranlar.map((oran) => [oran.oran, oran.ad, oran.sira])).toEqual([
      [1, "Ek", 0],
      [40_000, undefined, 1],
    ]);

    await bos.oranDegistir(vt, kim, birinci, tr("4", { sira: 1 }));
    await bos.oranDegistir(vt, kim, birinci, tr("4.25", { il: "TR-34", sira: 1 }));
    await bos.oranSil(vt, kim, birinci);
    expect((await bos.tabloyuOku(vt))[0]?.oranlar.map((oran) => oran.oran)).toEqual([1]);

    const oranKayitlari = (await kayitlar(vt)).filter((k) => k.kayit_kimligi === birinci);
    const eski = { sinif, ulke: "TR", oranMilyonda: 40_000, sira: 1 };
    const yeni = { sinif, ulke: "TR", il: "TR-34", oranMilyonda: 42_500, sira: 1 };
    expect(oranKayitlari.map((k) => [k.islem, k.eski_deger, k.yeni_deger])).toEqual([
      ["vergi-orani.eklendi", null, eski],
      ["vergi-orani.degisti", eski, yeni],
      ["vergi-orani.silindi", yeni, null],
    ]);
    // Silinen oran satırı yerinde kalır.
    expect((await sayilar(vt)).oran).toBe(2);
    expect((await hatasi(bos.oranSil(vt, kim, birinci))).kod).toBe("bulunamadi");
  });

  it("hatalı oran, bölge ve posta kodu yazılmaz", async () => {
    const vt = await bosSite();
    const sinif = await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    const hatalilar: unknown[] = [
      tr("100.0001"),
      tr("101"),
      tr("4,5,1"),
      tr("-1"),
      tr("1.23456"),
      tr(""),
      { ulke: "TR", oran: 20 },
      { ulke: "XX", oran: "5" },
      { ulke: "DE", il: "TR-06", oran: "5" },
      { ulke: "TR", il: "TR-99", oran: "5" },
      { ulke: "TR", postaKodu: "6000", oran: "5" },
      { ulke: "TR", oran: "5", ilce: "TR-06-007" },
      { ulke: "TR", oran: "5", ad: "a@b" },
    ];
    for (const girdi of hatalilar) {
      expect((await hatasi(bos.oranEkle(vt, yonetici(), sinif, girdi as never))).kod).toBe(
        "dogrulama",
      );
    }
    expect((await sayilar(vt)).oran).toBe(0);
    // Hata ayrıntısı alanı ve kodu söyler: ekran metni koddan çözer.
    expect(await hatasi(bos.oranEkle(vt, yonetici(), sinif, tr("101")))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "oran", kod: "oran-siniri" }],
    });
    expect(
      await hatasi(bos.oranEkle(vt, yonetici(), sinif, { ulke: "DE", il: "TR-06", oran: "5" })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "il", kod: "il-baska-ulkenin" }] });
    expect(await hatasi(bos.oranEkle(vt, yonetici(), sinif, tr("5", { ad: "a@b" })))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "ad", kod: "ad-bicimi" }],
    });
    // Sınırdaki değerler geçer.
    await bos.oranEkle(vt, yonetici(), sinif, tr("100"));
    await bos.oranEkle(vt, yonetici(), sinif, tr("0"));
    expect((await bos.tabloyuOku(vt))[0]?.oranlar.map((oran) => oran.oran).toSorted()).toEqual([
      0, 1_000_000,
    ]);
  });

  it("değişiklikte yalnız verilen alan değişir, null isteğe bağlı alanı boşaltır", async () => {
    const vt = await bosSite();
    const sinif = await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    const kimlik = await bos.oranEkle(
      vt,
      yonetici(),
      sinif,
      tr("4", { il: "TR-34", postaKodu: "34000", ad: "Ek", sira: 3 }),
    );
    const oku = async () => (await bos.tabloyuOku(vt))[0]?.oranlar[0];
    await bos.oranDegistir(vt, yonetici(), kimlik, { oran: "7,5" });
    expect(await oku()).toEqual({
      kimlik,
      sinifKimligi: sinif,
      ulke: "TR",
      il: "TR-34",
      postaKodu: "34000",
      oran: 75_000,
      ad: "Ek",
      sira: 3,
    });
    await bos.oranDegistir(vt, yonetici(), kimlik, { il: null, ad: null });
    expect(await oku()).toEqual({
      kimlik,
      sinifKimligi: sinif,
      ulke: "TR",
      postaKodu: "34000",
      oran: 75_000,
      sira: 3,
    });
  });

  it("değişiklikte bölge kuralı birleşmiş sonuca uygulanır", async () => {
    const vt = await bosSite();
    const sinif = await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    const kimlik = await bos.oranEkle(vt, yonetici(), sinif, tr("4", { il: "TR-34" }));
    // Yalnız ülke değişince eski il yeni ülkeyle tutarsız kalır.
    expect(await hatasi(bos.oranDegistir(vt, yonetici(), kimlik, { ulke: "DE" }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "il", kod: "il-baska-ulkenin" }],
    });
    expect(
      (await hatasi(bos.oranDegistir(vt, yonetici(), kimlik, { postaKodu: "1" }))).ayrinti,
    ).toEqual([{ alan: "postaKodu", kod: "posta-kodu-bicimi" }]);
    await bos.oranDegistir(vt, yonetici(), kimlik, { ulke: "DE", il: null });
    expect((await bos.tabloyuOku(vt))[0]?.oranlar[0]?.ulke).toBe("DE");
  });

  it("sırası verilmeyen oran sınıfın sonuna gelir", async () => {
    const vt = await bosSite();
    const sinif = await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    await bos.oranEkle(vt, yonetici(), sinif, tr("1", { sira: 4 }));
    await bos.oranEkle(vt, yonetici(), sinif, tr("2"));
    expect((await bos.tabloyuOku(vt))[0]?.oranlar.map((oran) => oran.sira)).toEqual([4, 5]);
  });

  it("veritabanı sınırın dışındaki oranı da reddeder", async () => {
    const vt = await bosSite();
    const sinif = await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    await expect(
      vt
        .insert(vergiOranlari)
        .values({ sinif_kimligi: sinif, ulke: "TR", oran_milyonda: 1_000_001 }),
    ).rejects.toThrow();
  });
});

describe("değişiklik kaydı", () => {
  it("kayıt yazılamazsa değişiklik de geri alınır", async () => {
    const vt = await bosSite();
    // Adı boş "sistem" kaydın kuralına aykırıdır: kayıt düşer, sınıf da yazılmamalı.
    const gecersiz: DegisikligiYapan = { tur: "sistem", ad: "" };
    await expect(bos.sinifEkle(vt, gecersiz, { ad: "Genel" })).rejects.toThrow();
    expect(await sayilar(vt)).toEqual({ sinif: 0, oran: 0 });
    const sinif = await bos.sinifEkle(vt, yonetici(), { ad: "Genel" });
    await expect(bos.oranEkle(vt, gecersiz, sinif, tr("5"))).rejects.toThrow();
    await expect(bos.sinifSil(vt, gecersiz, sinif)).rejects.toThrow();
    expect(await sayilar(vt)).toEqual({ sinif: 1, oran: 0 });
    expect((await bos.tabloyuOku(vt)).map((s) => s.silindi)).toEqual([false]);
  });
});

describe("iki site", () => {
  it("bir sitenin sınıfı ve oranı ötekinde görünmez", async () => {
    const [birinci, ikinci] = await Promise.all([siteAc(), siteAc()]);
    const sinif = await servis.sinifEkle(birinci, yonetici(), { ad: "Yalnız birincide" });
    await servis.oranEkle(birinci, yonetici(), sinif, tr("3"));
    const ikincininki = await servis.tabloyuOku(ikinci);
    expect(ikincininki.map((s) => s.ad)).toEqual(["Genel", "İndirimli", "Vergisiz"]);
    expect(ikincininki.flatMap((s) => s.oranlar)).toHaveLength(oranSayisi);
    expect(
      await ikinci.select().from(vergiSiniflari).where(eq(vergiSiniflari.kimlik, sinif)),
    ).toEqual([]);
    expect((await servis.tabloyuOku(birinci)).map((s) => s.ad)).toContain("Yalnız birincide");
  });
});

describe("kargo sınıfı (kart 0075)", () => {
  const kargolu = vergiServisi(() =>
    vergiBaslangicSemasi.parse({
      siniflar: [
        { ad: "Genel", kargo: true, oranlar: [{ ulke: "TR", oran: "18" }] },
        { ad: "Diğer" },
      ],
    }),
  );
  const kargoSinifi = async (vt: Veritabani, s = kargolu) =>
    (await s.tabloyuOku(vt, { silinmisSiniflar: true })).filter((k) => k.kargo).map((k) => k.ad);

  it("başlangıç verisindeki kargo işareti yazılır ve kayda girer", async () => {
    const vt = await siteAc();
    expect(await kargoSinifi(vt)).toEqual(["Genel"]);
    const kayit = (await kayitlar(vt)).find((k) => (k.yeni_deger as { kargo?: true }).kargo);
    expect(kayit?.islem).toBe("vergi.baslangic");
  });

  it("değiştirme eskisini kaldırır, kayda girer; null kargoyu vergisiz yapar; aynı seçim kayda girmez", async () => {
    const vt = await siteAc();
    const [genel, diger] = await kargolu.tabloyuOku(vt);
    if (genel === undefined || diger === undefined) throw new Error("Sınıf yok.");
    const kim = yonetici();
    await kargolu.kargoSinifiniDegistir(vt, kim, diger.kimlik);
    await kargolu.kargoSinifiniDegistir(vt, kim, diger.kimlik);
    expect(await kargoSinifi(vt)).toEqual(["Diğer"]);
    await kargolu.kargoSinifiniDegistir(vt, kim, null);
    expect(await kargoSinifi(vt)).toEqual([]);
    const degisenler = (await kayitlar(vt)).filter((k) => k.islem === "vergi.kargo-sinifi");
    expect(degisenler.map((k) => [k.eski_deger, k.yeni_deger])).toEqual([
      [{ kargoSinifi: genel.kimlik }, { kargoSinifi: diger.kimlik }],
      [{ kargoSinifi: diger.kimlik }, { kargoSinifi: null }],
    ]);
  });

  it("silinmiş sınıf kargo sınıfı yapılamaz; seçiliyken silinen sınıf kargo sınıfı kalır", async () => {
    const vt = await siteAc();
    const [genel, diger] = await kargolu.tabloyuOku(vt);
    if (genel === undefined || diger === undefined) throw new Error("Sınıf yok.");
    await kargolu.sinifSil(vt, yonetici(), diger.kimlik);
    expect(await hatasi(kargolu.kargoSinifiniDegistir(vt, yonetici(), diger.kimlik))).toEqual({
      kod: "is-kurali",
      ayrinti: { kod: "sinif-silinmis" },
    });
    await kargolu.sinifSil(vt, yonetici(), genel.kimlik);
    expect(await kargoSinifi(vt)).toEqual(["Genel"]);
    expect((await hatasi(kargolu.kargoSinifiniDegistir(vt, yonetici(), randomUUID()))).kod).toBe(
      "bulunamadi",
    );
  });

  it("aynı anda gelen seçimlerden sonra yalnız bir kargo sınıfı kalır", async () => {
    const vt = await siteAc();
    const siniflar = await kargolu.tabloyuOku(vt);
    await Promise.all(Array.from({ length: 6 }, () => vt.execute(sql`select pg_sleep(0.05)`)));
    await Promise.all(
      Array.from({ length: 6 }, (_, sira) =>
        kargolu.kargoSinifiniDegistir(vt, yonetici(), siniflar[sira % 2]?.kimlik ?? null),
      ),
    );
    expect(await kargoSinifi(vt)).toHaveLength(1);
  });
});

describe("veritabanıyla vergi hesabı (kart 0075)", () => {
  // Deneme sitesi: sitenin ayarları ve tablosu veritabanından okunur, mağaza adresi ayardan gelir.
  const denemeSitesi = () => {
    const site = siteKlasorunuOku(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "ayar-semasi",
        "testler",
        "ornek-siteler",
        "vergi-dolu",
      ),
    );
    return {
      ...site,
      baslangic: {
        ...site.baslangic,
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
  };

  it("ayarları, silinmiş sınıfı, kargo sınıfını ve mağaza adresini veritabanından alır", async () => {
    const vt = await siteAc();
    const site = denemeSitesi();
    const servisi = siteninVergiServisi(site);
    const [genel] = await servisi.tabloyuOku(vt);
    if (genel === undefined) throw new Error("Sınıf yok.");
    await servisi.kargoSinifiniDegistir(vt, yonetici(), genel.kimlik);
    await servisi.sinifSil(vt, yonetici(), genel.kimlik);
    const hesap = () =>
      vergiHesapla(
        vt,
        {
          satirlar: [{ birimFiyat: 3333, adet: 3, sinif: genel.kimlik }],
          kargo: { tutar: 2990 },
          // Teslimat bölgesi tabloda yok: mağaza adresinin bölgesi kullanılır.
          teslimatAdresi: { ulke: "DE" },
        },
        site,
      );
    // Varsayılan vergi dahil: 9999 × 18 / 118 = 1525,27 → 1525; kargo 2990 × 18 / 118 = 456,10 → 456.
    const dahil = await hesap();
    expect([dahil.bolge, dahil.satirlar[0]?.vergi, dahil.kargo?.vergi]).toEqual([
      "magaza",
      1525,
      456,
    ]);
    expect(dahil.dokum.map((satir) => satir.ad)).toEqual(["Deneme vergisi"]);
    // Ayar değişince hesap değişir: hariç 9999 × 0,18 = 1799,82 → 1800; 2990 × 0,18 = 538,2 → 538.
    await siteninServisi(site).degistir(vt, yonetici(), { fiyatGirisi: "vergi-haric" });
    const haric = await hesap();
    expect([haric.satirlar[0]?.vergi, haric.kargo?.vergi]).toEqual([1800, 538]);
    await siteninServisi(site).degistir(vt, yonetici(), { vergiAcik: false });
    expect((await hesap()).toplam.vergi).toBe(0);
  });
});

// Çekirdekte site adı geçmez (cekirdek/testler/site-adi-yok.test.ts): siteler klasörden okunur.
// Beklenen değerler sitenin kendi dosyasından okunur: çekirdekte sitenin vergi değeri yazmaz.
const sitelerKlasoru = join(import.meta.dirname, "..", "..", "..", "..", "siteler");
const vergiliSiteler = readdirSync(sitelerKlasoru, { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .map((girdi) => join(sitelerKlasoru, girdi.name))
  .filter((klasor) => existsSync(join(klasor, vergiBaslangicDosyasi)));

describe("başlangıç verisi olan her site", () => {
  it("en az bir site var", () => {
    expect(vergiliSiteler.length).toBeGreaterThan(0);
  });

  for (const klasor of vergiliSiteler) {
    const site = siteKlasorunuOku(klasor);
    const dosya = vergiBaslangicSemasi.parse(
      JSON.parse(readFileSync(join(klasor, vergiBaslangicDosyasi), "utf8")),
    );

    it(`${site.kimlik.kodAdi} vergi adı ve dosyasındaki sınıflarla, her sınıf kendi oranıyla açılır`, async () => {
      const vt = await siteAc();
      const ayarlar = await siteninMagazaAyarlari(vt, site);
      expect(ayarlar.vergiAcik).toBe(true);
      expect(ayarlar.vergiAdi).toBeDefined();
      expect(ayarlar.vergiAdi).toBe(site.baslangic.vergiAdi);

      const tablo = await siteninVergiServisi(site).tabloyuOku(vt);
      expect(tablo.length).toBeGreaterThan(0);
      expect(tablo.map((sinif) => sinif.ad)).toEqual(dosya.siniflar.map((sinif) => sinif.ad));
      expect(tablo.map((sinif) => sinif.oranlar.map(({ ulke, oran }) => ({ ulke, oran })))).toEqual(
        dosya.siniflar.map((sinif) => sinif.oranlar.map(({ ulke, oran }) => ({ ulke, oran }))),
      );
      expect(tablo.map((sinif) => sinif.kargo)).toEqual(
        dosya.siniflar.map((sinif) => sinif.kargo === true),
      );
    });

    it(`${site.kimlik.kodAdi} vergisini ayarları ve dosyasıyla aynı hesaplar`, async () => {
      const vt = await siteAc();
      const tablo = await siteninVergiServisi(site).tabloyuOku(vt);
      const satirlar = (siniflar: { kimlik: string }[]) =>
        siniflar.map((sinif) => ({ birimFiyat: 12_345, adet: 2, sinif: sinif.kimlik }));
      const adres = site.baslangic.magazaAdresi;
      const teslimatAdresi = adres === undefined ? undefined : { ulke: adres.ulke, il: adres.il };
      const vtSonucu = await vergiHesapla(
        vt,
        {
          satirlar: satirlar(tablo),
          kargo: { tutar: 2990 },
          ...(teslimatAdresi ? { teslimatAdresi } : {}),
        },
        site,
      );
      // Aynı hesap veritabanına uğramadan, sitenin dosyalarından kurulan tabloyla.
      const dosyaTablosu: VergiSinifi[] = dosya.siniflar.map((sinif, sira) => ({
        kimlik: sinif.ad,
        ad: sinif.ad,
        sira,
        silindi: false,
        kargo: sinif.kargo === true,
        oranlar: sinif.oranlar.map((oran, oranSirasi) => ({
          kimlik: `${sinif.ad}-${oranSirasi}`,
          sinifKimligi: sinif.ad,
          ...oran,
          sira: oranSirasi,
        })),
      }));
      const dosyaSonucu = hesapla({
        ayarlar: site.baslangic,
        tablo: dosyaTablosu,
        adresler: {
          ...(teslimatAdresi ? { teslimat: teslimatAdresi } : {}),
          ...(adres ? { magaza: adres } : {}),
        },
        satirlar: satirlar(dosyaTablosu),
        kargo: { tutar: 2990 },
      });
      const kimliksiz = (sonuc: VergiSonucu) => ({
        ...sonuc,
        satirlar: sonuc.satirlar.map((k) => ({
          ...k,
          oranlar: k.oranlar.map(({ oranKimligi: _, ...o }) => o),
        })),
        kargo: sonuc.kargo && {
          ...sonuc.kargo,
          oranlar: sonuc.kargo.oranlar.map(({ oranKimligi: _, ...o }) => o),
        },
      });
      expect(kimliksiz(vtSonucu)).toEqual(kimliksiz(dosyaSonucu));
      expect(vtSonucu.toplam.vergi).toBeGreaterThan(0);
    });
  }
});
