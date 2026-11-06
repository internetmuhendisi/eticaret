// Roller ve izin sorusu, gerçek veritabanıyla (kart 0026, karar 0040).
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sistemIslemi } from "../../../kayitlar/degisiklik-islemleri.ts";
import { type GirisIzni, type IzinAdi, izinler } from "../../../kayitlar/izinler.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { baslangicRolleri } from "../baslangic-rolleri.ts";
import { rolIzinleri, roller, yoneticiler } from "../model.ts";
import { rolAl, rolVer, yoneticininIzniVarMi } from "../servis.ts";

const testIslemi = sistemIslemi("test");

const rolKodlari = Object.keys(baslangicRolleri) as (keyof typeof baslangicRolleri)[];
const [tamYetkiliKod] = rolKodlari.filter((kod) => baslangicRolleri[kod].tamYetki);
const [sinirliKod] = rolKodlari.filter((kod) => !baslangicRolleri[kod].tamYetki);
if (tamYetkiliKod === undefined || sinirliKod === undefined) {
  throw new Error("Başlangıçta tam yetkili ve sınırlı rol olmalı.");
}
const sinirliRolunIzinleri: readonly IzinAdi[] = baslangicRolleri[sinirliKod].izinler;
const yoneticiIzinleri = (Object.keys(izinler) as IzinAdi[]).filter(
  (izin): izin is GirisIzni<"yonetici"> => izinler[izin].giris === "yonetici",
);

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const yeniYonetici = async (): Promise<string> => {
  sayac += 1;
  const { hesapKimligi } = await hesapAc(vt, "yonetici", {
    eposta: `yonetici${sayac}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  return hesapKimligi;
};

beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ekip"));
});
afterAll(() => sil());

describe("başlangıç rolleri", () => {
  it("veritabanındaki roller tanımla aynı", async () => {
    const satirlar = await vt.select().from(roller);
    const izinSatirlari = await vt
      .select({ kod: roller.kod, izin: rolIzinleri.izin })
      .from(rolIzinleri)
      .innerJoin(roller, eq(roller.kimlik, rolIzinleri.rol_kimligi));
    const bulunan = Object.fromEntries(
      satirlar.map(({ kod, tam_yetki }) => [
        kod,
        {
          tamYetki: tam_yetki,
          izinler: izinSatirlari.filter((satir) => satir.kod === kod).map(({ izin }) => izin),
        },
      ]),
    );
    expect(bulunan).toEqual(baslangicRolleri);
  });

  it("tam yetkili ve sınırlı rol var, sınırlı rol tam yetkili değil", () => {
    expect(baslangicRolleri[tamYetkiliKod].izinler).toEqual([]);
    expect(yoneticiIzinleri.filter((izin) => !sinirliRolunIzinleri.includes(izin))).not.toEqual([]);
  });
});

describe("izin sorusu", () => {
  it("rolsüz yöneticinin hiçbir izni yok", async () => {
    const kimlik = await yeniYonetici();
    for (const izin of yoneticiIzinleri) {
      expect(await yoneticininIzniVarMi(vt, kimlik, izin)).toBe(false);
    }
  });

  it("tam yetkili rol bütün yönetici izinlerini verir", async () => {
    const kimlik = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: kimlik, rolKodu: tamYetkiliKod }, testIslemi);
    for (const izin of yoneticiIzinleri) {
      expect(await yoneticininIzniVarMi(vt, kimlik, izin)).toBe(true);
    }
  });

  it("sınırlı rol yalnız kendi izinlerini verir", async () => {
    const kimlik = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: kimlik, rolKodu: sinirliKod }, testIslemi);
    for (const izin of yoneticiIzinleri) {
      expect(await yoneticininIzniVarMi(vt, kimlik, izin)).toBe(
        sinirliRolunIzinleri.includes(izin),
      );
    }
  });
});

describe("rol verme ve alma", () => {
  it("aynı rolü iki kez vermek hata değildir, bilinmeyen rol ve yönetici bulunamadı döner", async () => {
    const kimlik = await yeniYonetici();
    await rolVer(vt, { yoneticiKimligi: kimlik, rolKodu: sinirliKod }, testIslemi);
    await rolVer(vt, { yoneticiKimligi: kimlik, rolKodu: sinirliKod }, testIslemi);
    await expect(
      rolVer(vt, { yoneticiKimligi: kimlik, rolKodu: "yok" }, testIslemi),
    ).rejects.toMatchObject({
      kod: "bulunamadi",
    });
    await expect(
      rolVer(
        vt,
        {
          yoneticiKimligi: "00000000-0000-4000-8000-000000000000",
          rolKodu: sinirliKod,
        },
        testIslemi,
      ),
    ).rejects.toMatchObject({ kod: "bulunamadi" });
  });

  it("silinmiş hesaba rol verilmez", async () => {
    const kimlik = await yeniYonetici();
    await vt
      .update(yoneticiler)
      .set({ silinme_zamani: new Date() })
      .where(eq(yoneticiler.kimlik, kimlik));
    await expect(
      rolVer(vt, { yoneticiKimligi: kimlik, rolKodu: sinirliKod }, testIslemi),
    ).rejects.toMatchObject({ kod: "bulunamadi" });
  });

  it("alınan rolün izni hemen gider, taşınmayan rol alınamaz", async () => {
    const kimlik = await yeniYonetici();
    const [izin] = baslangicRolleri[sinirliKod].izinler;
    if (izin === undefined) throw new Error("Sınırlı rolün izni olmalı.");
    await rolVer(vt, { yoneticiKimligi: kimlik, rolKodu: sinirliKod }, testIslemi);
    expect(await yoneticininIzniVarMi(vt, kimlik, izin)).toBe(true);
    await rolAl(vt, { yoneticiKimligi: kimlik, rolKodu: sinirliKod }, testIslemi);
    expect(await yoneticininIzniVarMi(vt, kimlik, izin)).toBe(false);
    await expect(
      rolAl(vt, { yoneticiKimligi: kimlik, rolKodu: sinirliKod }, testIslemi),
    ).rejects.toMatchObject({ kod: "bulunamadi" });
  });
});

describe("son mağaza sahibi", () => {
  it("son tam yetkilinin rolü alınamaz, başkası varsa alınır, silinmiş hesap sayılmaz", async () => {
    // Ayrı veritabanı: bu dosyanın öteki testlerindeki tam yetkililer sayıma girmesin.
    const taban = await denemeSitesiAc("ekip-sahip");
    try {
      const yeni = async (eposta: string) =>
        (await hesapAc(taban.vt, "yonetici", { eposta, sifre: "uzun-bir-deneme-sifresi" }))
          .hesapKimligi;
      const birinci = await yeni("birinci@ornek.test");
      const ikinci = await yeni("ikinci@ornek.test");
      const rol = { rolKodu: tamYetkiliKod };
      await rolVer(taban.vt, { yoneticiKimligi: birinci, ...rol }, testIslemi);
      await expect(
        rolAl(taban.vt, { yoneticiKimligi: birinci, ...rol }, testIslemi),
      ).rejects.toMatchObject({
        kod: "is-kurali",
      });
      expect(await yoneticininIzniVarMi(taban.vt, birinci, "ekip.gor")).toBe(true);

      await rolVer(taban.vt, { yoneticiKimligi: ikinci, ...rol }, testIslemi);
      await rolAl(taban.vt, { yoneticiKimligi: birinci, ...rol }, testIslemi);
      expect(await yoneticininIzniVarMi(taban.vt, birinci, "ekip.gor")).toBe(false);

      // İkinci kalan tek sahip; başka sahip silinmişse sayılmaz.
      await rolVer(taban.vt, { yoneticiKimligi: birinci, ...rol }, testIslemi);
      await taban.vt
        .update(yoneticiler)
        .set({ silinme_zamani: new Date() })
        .where(eq(yoneticiler.kimlik, birinci));
      await expect(
        rolAl(taban.vt, { yoneticiKimligi: ikinci, ...rol }, testIslemi),
      ).rejects.toMatchObject({
        kod: "is-kurali",
      });
    } finally {
      await taban.sil();
    }
  });

  it("iki sahibin rolü aynı anda alınınca biri kalır", async () => {
    const taban = await denemeSitesiAc("ekip-esz");
    try {
      const rol = { rolKodu: tamYetkiliKod };
      const kimlikler = await Promise.all(
        ["a@ornek.test", "b@ornek.test"].map(async (eposta) => {
          const { hesapKimligi } = await hesapAc(taban.vt, "yonetici", {
            eposta,
            sifre: "uzun-bir-deneme-sifresi",
          });
          await rolVer(taban.vt, { yoneticiKimligi: hesapKimligi, ...rol }, testIslemi);
          return hesapKimligi;
        }),
      );
      const sonuclar = await Promise.allSettled(
        kimlikler.map((yoneticiKimligi) =>
          rolAl(taban.vt, { yoneticiKimligi, ...rol }, testIslemi),
        ),
      );
      expect(sonuclar.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
      expect(sonuclar.find(({ status }) => status === "rejected")).toMatchObject({
        reason: { kod: "is-kurali" },
      });
    } finally {
      await taban.sil();
    }
  });
});
