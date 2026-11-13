// Yayınlanan kodların kaydı ve eski kodların çevirisi (kart 0122, karar 0113). Kayıttaki her tür, görünüm, alan,
// seçenek ve renk kodu bugünkü tarifte ya da tarifin eski kodlarında karşılığıyla durur; tarifin her kodu kayıttadır.
// Kayıt bozuk örneklerle de denenir: kaldırılan kod eşlemesiz kırmızıdır. Eski düzenin gerçek veritabanından
// okunması düzen servisinin testindedir (cekirdek/moduller/duzen/testler/servis.test.ts).
import { describe, expect, it } from "vitest";
import { denemeBolumu } from "../../../katalog/deneme-bolumu/tarif.ts";
import {
  type BolumKutuphanesi,
  type BolumOrnegi,
  eskiKodlariCevir,
  kutuphaneKodlari,
} from "../duzen.ts";
import { bolumKutuphanesi } from "../kutuphane.ts";
import type { BolumTarifi } from "../tarif.ts";
import kayit from "../yayinlanan-kodlar.json" with { type: "json" };
import { karsiligiOlmayanlar, kayittaOlmayanlar } from "../yayinlanan-kodlar.ts";

describe("mağazanın kütüphanesi", () => {
  it("kayıttaki her kodun bugünkü karşılığı var", () => {
    expect(karsiligiOlmayanlar(bolumKutuphanesi, kayit)).toEqual([]);
  });

  it("tarifin her kodu kayıtta", () => {
    expect(kayittaOlmayanlar(bolumKutuphanesi, kayit)).toEqual([]);
  });

  it("0.40.0'da kaldırılan üç görünüm kayıtta ve karşılığıyla", () => {
    expect(kayit["telif-satiri"].gorunumler).toEqual(
      expect.arrayContaining(["ortali", "iki-yana"]),
    );
    expect(kayit["duyuru-seridi"].gorunumler).toContain("ince");
  });
});

// Eski bir sürümde başka kodları taşıyan deneme bölümü: görünüm "eski", alan "eskiAlan", listede "maddeler.eskiAlt",
// seçim seçeneği "sure=orta", renk "zemin=kutu-9".
const tur = denemeBolumu.tur;
const bugunku = { [tur]: denemeBolumu } as BolumKutuphanesi;
const bugunkuKodlar = kutuphaneKodlari(bugunku)[tur] ?? { gorunumler: [], alanlar: [] };
const eskiKayit = {
  [tur]: {
    gorunumler: [...bugunkuKodlar.gorunumler, "eski"],
    alanlar: [
      ...bugunkuKodlar.alanlar,
      "eskiAlan",
      "maddeler.eskiAlt",
      "sure=orta",
      "zemin=kutu-9",
    ],
  },
};
const eslemeli = (eskiKodlar: NonNullable<BolumTarifi["eskiKodlar"]>): BolumKutuphanesi => ({
  [tur]: { ...denemeBolumu, eskiKodlar },
});
const tamEsleme: NonNullable<BolumTarifi["eskiKodlar"]> = {
  gorunumler: { eski: "dar" },
  alanlar: { eskiAlan: "aciklama", "maddeler.eskiAlt": null },
  secenekler: { sure: { orta: "uzun" }, zemin: { "kutu-9": "kutu-1" } },
};

describe("kayıt denetimi bozuk örneklerle", () => {
  it("eşlemesiz kaldırılan görünüm, alan, liste alt alanı, seçenek ve renk yakalanır", () => {
    expect(karsiligiOlmayanlar(bugunku, eskiKayit)).toEqual([
      `${tur}: görünüm eski kaldırılmış, bugünkü karşılığı yok`,
      `${tur}: alan eskiAlan kaldırılmış, bugünkü karşılığı yok`,
      `${tur}: alan maddeler.eskiAlt kaldırılmış, bugünkü karşılığı yok`,
      `${tur}: sure alanının orta seçeneği kaldırılmış, bugünkü karşılığı yok`,
      `${tur}: zemin alanının kutu-9 seçeneği kaldırılmış, bugünkü karşılığı yok`,
    ]);
  });

  it("eşlemeyle her kaldırılan kodun karşılığı var", () => {
    expect(karsiligiOlmayanlar(eslemeli(tamEsleme), eskiKayit)).toEqual([]);
  });

  it("karşılığı bugün olmayan eşleme ve bugün de var olan eski kod yakalanır", () => {
    const sorunlar = karsiligiOlmayanlar(
      eslemeli({
        gorunumler: { eski: "yok", genis: "dar" },
        alanlar: { eskiAlan: "olmayanAlan", baslik: null, "maddeler.eskiAlt": null },
        secenekler: { sure: { orta: "yok" }, zemin: { "kutu-9": "kutu-1" } },
      }),
      eskiKayit,
    );
    expect(sorunlar).toEqual([
      `${tur}: görünüm eski kaldırılmış, bugünkü karşılığı yok`,
      `${tur}: alan eskiAlan kaldırılmış, bugünkü karşılığı yok`,
      `${tur}: sure alanının orta seçeneği kaldırılmış, bugünkü karşılığı yok`,
      `${tur}: eski görünüm genis bugün de var`,
      `${tur}: eski alan baslik bugün de var`,
    ]);
  });

  it("bugün geçerli seçeneğin eşlemesi ve başka üst alana giden alan eşlemesi yakalanır", () => {
    const sorunlar = karsiligiOlmayanlar(
      eslemeli({
        ...tamEsleme,
        alanlar: { eskiAlan: "maddeler.metin", "maddeler.eskiAlt": "aciklama" },
        secenekler: { sure: { orta: "uzun", kisa: "uzun" }, zemin: { "kutu-9": "kutu-1" } },
      }),
      eskiKayit,
    );
    expect(sorunlar).toEqual(
      expect.arrayContaining([
        `${tur}: eski alan eskiAlan başka bir üst alana (maddeler.metin) taşınamaz`,
        `${tur}: eski alan maddeler.eskiAlt başka bir üst alana (aciklama) taşınamaz`,
        `${tur}: sure alanının eski seçeneği kisa bugün de var`,
      ]),
    );
  });

  it("kaldırılan tür yakalanır", () => {
    expect(karsiligiOlmayanlar({}, eskiKayit)).toEqual([
      `${tur}: tür kaldırılmış; eski düzenlerdeki bölümü çizilmez`,
    ]);
  });

  it("kayıtta olmayan yeni tür, görünüm, alan ve seçenek yakalanır", () => {
    const eksikKayit = {
      [tur]: {
        gorunumler: bugunkuKodlar.gorunumler.filter((kod) => kod !== "dar"),
        alanlar: bugunkuKodlar.alanlar.filter((kod) => kod !== "baslik" && kod !== "sure=kisa"),
      },
    };
    expect(kayittaOlmayanlar(bugunku, eksikKayit)).toEqual([
      `${tur}: görünüm dar kayıtta yok`,
      `${tur}: alan baslik kayıtta yok`,
      `${tur}: alan sure=kisa kayıtta yok`,
    ]);
    expect(kayittaOlmayanlar(bugunku, {})).toEqual([`${tur}: tür kayıtta yok`]);
  });
});

describe("eski kodların çevirisi", () => {
  const eskiBolum: BolumOrnegi = {
    kimlik: "0e598bad-2c93-4b15-bf6e-8fb3bca5bc0b",
    tur,
    gorunum: "eski",
    gizli: false,
    degerler: {
      baslik: "S",
      eskiAlan: "Açıklama",
      sure: "orta",
      zemin: "kutu-9",
      maddeler: [
        { metin: "Bir", eskiAlt: "atılır" },
        { metin: "İki", eskiAlt: "atılır" },
      ],
    },
  };

  it("görünüm, alan, liste alt alanı, seçenek ve renk bugünkü karşılığına çevrilir, girdi değişmez", () => {
    const kopya = structuredClone(eskiBolum);
    expect(eskiKodlariCevir(eslemeli(tamEsleme), eskiBolum)).toEqual({
      ...eskiBolum,
      gorunum: "dar",
      degerler: {
        baslik: "S",
        aciklama: "Açıklama",
        sure: "uzun",
        zemin: "kutu-1",
        maddeler: [{ metin: "Bir" }, { metin: "İki" }],
      },
    });
    expect(eskiBolum).toEqual(kopya);
  });

  it("bugün geçerli kod değişmez; yeni alanda değer varsa eski değer atılır", () => {
    const bolum: BolumOrnegi = {
      ...eskiBolum,
      gorunum: "genis",
      degerler: { baslik: "S", sure: "kisa", aciklama: "Yeni", eskiAlan: "Eski" },
    };
    expect(eskiKodlariCevir(eslemeli(tamEsleme), bolum)).toEqual({
      ...bolum,
      degerler: { baslik: "S", sure: "kisa", aciklama: "Yeni" },
    });
  });

  it("bugün geçerli seçenek yanlış bir eşlemeyle de değişmez", () => {
    const bolum: BolumOrnegi = {
      ...eskiBolum,
      gorunum: "genis",
      degerler: { baslik: "S", sure: "kisa" },
    };
    const yanlis = eslemeli({ secenekler: { sure: { kisa: "uzun" } } });
    expect(eskiKodlariCevir(yanlis, bolum).degerler).toEqual({ baslik: "S", sure: "kisa" });
  });

  it("eşlemesi olmayan tarifte ve kütüphanede olmayan türde bölüm olduğu gibi kalır", () => {
    expect(eskiKodlariCevir(bugunku, eskiBolum)).toBe(eskiBolum);
    expect(eskiKodlariCevir({}, eskiBolum)).toBe(eskiBolum);
  });

  it("mağazanın kütüphanesinde 0.40.0'ın telif ve duyuru görünümleri bugünkülere çevrilir", () => {
    const cevir = (bolumTuru: string, gorunum: string) =>
      eskiKodlariCevir(bolumKutuphanesi, { ...eskiBolum, tur: bolumTuru, gorunum, degerler: {} })
        .gorunum;
    expect(cevir("telif-satiri", "ortali")).toBe("duz");
    expect(cevir("telif-satiri", "iki-yana")).toBe("duz");
    expect(cevir("duyuru-seridi", "ince")).toBe("ortali");
    expect(cevir("duyuru-seridi", "iki-yana")).toBe("iki-yana");
  });
});
