// Kapının izin kontrolü, gerçek veritabanıyla (kart 0026, karar 0040). Örnek uçlar yalnız bu
// testte durur, uygulamada adresleri yoktur.
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { HesapTuru } from "../../kayitlar/oturum.ts";
import { baslangicRolleri } from "../../moduller/ekip/baslangic-rolleri.ts";
import { yoneticiler } from "../../moduller/ekip/model.ts";
import { rolAl, rolVer } from "../../moduller/ekip/servis.ts";
import { musteriler } from "../../moduller/musteri/model.ts";
import { cikisYap, girisYap, hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { oturumCerezleri } from "../oturum-cerezi.ts";
import { ucTanimla } from "../uc.ts";

const sifre = "uzun-bir-deneme-sifresi";
const sure = 60 * 60;
const rolKodlari = Object.keys(baslangicRolleri) as (keyof typeof baslangicRolleri)[];
const tamYetkili = rolKodlari.find((kod) => baslangicRolleri[kod].tamYetki) ?? "";
const sinirli = rolKodlari.find((kod) => !baslangicRolleri[kod].tamYetki) ?? "";

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const giris = async (tur: HesapTuru) => {
  sayac += 1;
  const bilgi = { eposta: `hesap${sayac}@ornek.test`, sifre };
  const { hesapKimligi } = await hesapAc(vt, tur, bilgi);
  const sonuc = await girisYap(vt, tur, bilgi, sure);
  if (sonuc === null) throw new Error("Giriş yapılamadı.");
  const cerez = oturumCerezleri(tur, sonuc.anahtarlar, sure)
    .map((satir) => satir.split(";")[0])
    .join("; ");
  return { hesapKimligi, cerez, anahtarlar: sonuc.anahtarlar };
};

const istek = (girisAdi: string, cerez?: string, yol = "") =>
  new Request(`http://yerel/kapi/${girisAdi}/ornek${yol}`, {
    headers: cerez === undefined ? {} : { cookie: cerez },
  });

const yoneticiUcu = (isle = vi.fn(async () => ({ tamam: true }))) =>
  ucTanimla({
    giris: "yonetici",
    sema: z.strictObject({ ad: z.string().optional() }),
    izin: "ekip.gor",
    sinir: "genel",
    isle,
  });

// Müşterinin kendi kaydı: kimlik girdiden değil, kapının verdiği erişimden gelir. Kapı kaydı süzmez,
// yalnız oturumun kimliğini verir; bu örnek doğru yazılmış ucun davranışını gösterir. Bütün uçlarda
// ölçüm kart 0030'dadır.
const musteriUcu = ucTanimla({
  giris: "musteri",
  sema: z.strictObject({}),
  izin: "musteri.kendi-hesabi.gor",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi, kapsam }) => {
    const [kayit] = await vt
      .select({ kimlik: musteriler.kimlik, eposta: musteriler.eposta })
      .from(musteriler)
      .where(eq(musteriler.kimlik, hesapKimligi));
    return { kayit, kapsam };
  },
});

const hataKodu = async (yanit: Response) =>
  ((await yanit.json()) as { hata: { kod: string } }).hata.kod;

beforeAll(async () => {
  const site = await denemeSitesiAc("izin");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
});

afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

describe("yönetici girişi", () => {
  it("izni olan rol uca erişir, kapı işe kimliği ve kapsamı verir", async () => {
    const yonetici = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: yonetici.hesapKimligi, rolKodu: tamYetkili });
    const isle = vi.fn(async () => ({ tamam: true }));
    const yanit = await yoneticiUcu(isle)(istek("yonetici", yonetici.cerez));
    expect(yanit.status).toBe(200);
    expect(await yanit.json()).toEqual({ basarili: true, veri: { tamam: true } });
    expect(isle.mock.calls[0]?.at(3)).toEqual({
      hesapKimligi: yonetici.hesapKimligi,
      kapsam: "tumu",
    });
  });

  it("izni olmayan rol yetki hatası alır, iş çalışmaz", async () => {
    const yonetici = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: yonetici.hesapKimligi, rolKodu: sinirli });
    const isle = vi.fn(async () => ({ tamam: true }));
    const yanit = await yoneticiUcu(isle)(istek("yonetici", yonetici.cerez));
    expect(yanit.status).toBe(403);
    expect(await hataKodu(yanit)).toBe("yetki");
    expect(isle).not.toHaveBeenCalled();
  });

  it("rolü olmayan yönetici yetki hatası alır", async () => {
    const yonetici = await giris("yonetici");
    expect(await hataKodu(await yoneticiUcu()(istek("yonetici", yonetici.cerez)))).toBe("yetki");
  });

  it("rol alınınca sonraki istekte erişim kesilir, verilince açılır", async () => {
    const yonetici = await giris("yonetici");
    const uc = yoneticiUcu();
    const rol = { yoneticiKimligi: yonetici.hesapKimligi, rolKodu: tamYetkili };
    await rolVer(vt, rol);
    expect((await uc(istek("yonetici", yonetici.cerez))).status).toBe(200);
    // Son sahibin rolü alınamaz, bu yüzden başka bir sahip de açılır.
    const oteki = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: oteki.hesapKimligi, rolKodu: tamYetkili });
    await rolAl(vt, rol);
    expect((await uc(istek("yonetici", yonetici.cerez))).status).toBe(403);
    await rolVer(vt, rol);
    expect((await uc(istek("yonetici", yonetici.cerez))).status).toBe(200);
  });

  it("girişsiz istek oturum-yok alır, iş ve doğrulama çalışmaz", async () => {
    const isle = vi.fn(async () => ({ tamam: true }));
    const yanit = await yoneticiUcu(isle)(istek("yonetici", undefined, "?fazla=1"));
    expect(yanit.status).toBe(401);
    expect(await hataKodu(yanit)).toBe("oturum-yok");
    expect(isle).not.toHaveBeenCalled();
  });

  it("yetkisiz istek girdi hatası değil yetki hatası alır", async () => {
    const yonetici = await giris("yonetici");
    const yanit = await yoneticiUcu()(istek("yonetici", yonetici.cerez, "?fazla=1"));
    expect(await hataKodu(yanit)).toBe("yetki");
  });

  it("çıkış yapan ve silinen hesap oturum-yok alır, geçersiz çerez silinir", async () => {
    const cikan = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: cikan.hesapKimligi, rolKodu: tamYetkili });
    await cikisYap(vt, "yonetici", cikan.anahtarlar);
    const yanit = await yoneticiUcu()(istek("yonetici", cikan.cerez));
    expect(yanit.status).toBe(401);
    expect(yanit.headers.getSetCookie().join()).toContain("Max-Age=0");

    const silinen = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: silinen.hesapKimligi, rolKodu: tamYetkili });
    await vt
      .update(yoneticiler)
      .set({ silinme_zamani: new Date() })
      .where(eq(yoneticiler.kimlik, silinen.hesapKimligi));
    expect((await yoneticiUcu()(istek("yonetici", silinen.cerez))).status).toBe(401);
  });

  it("sınırlı rol izinli uca rol_izinleri satırıyla erişir, kapsamı kendisidir", async () => {
    const yonetici = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: yonetici.hesapKimligi, rolKodu: sinirli });
    const isle = vi.fn(async () => ({ tamam: true }));
    const uc = ucTanimla({
      giris: "yonetici",
      sema: z.strictObject({}),
      izin: "ekip.kendi-hesabi.gor",
      sinir: "genel",
      isle,
    });
    expect((await uc(istek("yonetici", yonetici.cerez))).status).toBe(200);
    expect(isle.mock.calls[0]?.at(3)).toEqual({
      hesapKimligi: yonetici.hesapKimligi,
      kapsam: "kendi",
    });
  });

  it("anahtar yenilenip izin yoksa yetki döner, yeni çerezler yine yazılır", async () => {
    const yonetici = await giris("yonetici");
    const yanit = await yoneticiUcu()(istek("yonetici", yonetici.cerez.split("; ")[1]));
    expect(await hataKodu(yanit)).toBe("yetki");
    expect(yanit.headers.getSetCookie()).toHaveLength(2);
  });

  it("kısa anahtar çerezde yoksa yenilenen anahtar yanıta yazılır, izinli istek geçer", async () => {
    const yonetici = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: yonetici.hesapKimligi, rolKodu: tamYetkili });
    const yalnizYenileme = yonetici.cerez.split("; ")[1];
    const yanit = await yoneticiUcu()(istek("yonetici", yalnizYenileme));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.getSetCookie()).toHaveLength(2);
  });

  it("müşteri oturumu yönetici girişinde geçmez", async () => {
    const musteri = await giris("musteri");
    const yanit = await yoneticiUcu()(istek("yonetici", musteri.cerez));
    expect(yanit.status).toBe(401);
  });
});

describe("müşteri girişi", () => {
  it("yalnız kendi kaydına erişir, kapsamı kendisidir", async () => {
    const birinci = await giris("musteri");
    const ikinci = await giris("musteri");
    const yanit = await musteriUcu(istek("musteri", birinci.cerez));
    const { veri } = (await yanit.json()) as {
      veri: { kayit: { kimlik: string }; kapsam: string };
    };
    expect(veri.kayit.kimlik).toBe(birinci.hesapKimligi);
    expect(veri.kayit.kimlik).not.toBe(ikinci.hesapKimligi);
    expect(veri.kapsam).toBe("kendi");
  });

  it("kimlik beklemeyen uçta başka müşterinin kimliği doğrulama hatası alır", async () => {
    const birinci = await giris("musteri");
    const ikinci = await giris("musteri");
    const yanit = await musteriUcu(
      istek("musteri", birinci.cerez, `?hesapKimligi=${ikinci.hesapKimligi}`),
    );
    expect(yanit.status).toBe(400);
  });

  it("yönetici oturumu müşteri girişinde geçmez, girişsiz istek oturum-yok alır", async () => {
    const yonetici = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: yonetici.hesapKimligi, rolKodu: tamYetkili });
    expect(await hataKodu(await musteriUcu(istek("musteri", yonetici.cerez)))).toBe("oturum-yok");
    expect(await hataKodu(await musteriUcu(istek("musteri")))).toBe("oturum-yok");
  });
});

describe("tür kontrolünü aşan tanım", () => {
  const zorla = (giris: string, izin: string) =>
    ucTanimla({
      giris,
      sema: z.strictObject({}),
      izin,
      sinir: "genel",
      isle: async () => ({ acik: true }),
    } as never);

  it.each([
    ["yönetici girişinde herkese açık beyan", "yonetici", "herkese-acik"],
    ["yönetici girişinde müşteri izni", "yonetici", "musteri.kendi-hesabi.gor"],
    ["müşteri girişinde yönetici izni", "musteri", "ekip.gor"],
    ["kayıtta olmayan izin", "yonetici", "uydurma"],
    ["sahip girişi", "sahip", "ekip.gor"],
    ["herkese açık girişte gerçek izin", "herkese-acik", "ekip.gor"],
  ])("%s açılmaz", async (_, girisAdi, izin) => {
    const yanit = await zorla(girisAdi, izin)(istek(girisAdi));
    expect(yanit.status).toBe(403);
    expect(await hataKodu(yanit)).toBe("yetki");
  });
});

describe("sıra", () => {
  it("sahte istek oturuma bakılmadan reddedilir, yenileme anahtarı harcanmaz", async () => {
    // İzinli hesap ve yalnız yenileme çerezi: oturuma bakılsaydı anahtar yenilenir, çerez yazılırdı.
    const yonetici = await giris("yonetici");
    await rolVer(vt, { yoneticiKimligi: yonetici.hesapKimligi, rolKodu: tamYetkili });
    const yalnizYenileme = yonetici.cerez.split("; ")[1] ?? "";
    const sahte = new Request("http://yerel/kapi/yonetici/ornek", { method: "POST" });
    for (const [ad, deger] of Object.entries({
      host: "a.ornek.test",
      origin: "https://kotu.test",
      cookie: yalnizYenileme,
    })) {
      sahte.headers.set(ad, deger);
    }
    const yanit = await yoneticiUcu()(sahte);
    expect(await hataKodu(yanit)).toBe("yetki");
    expect(yanit.headers.getSetCookie()).toEqual([]);
    // Anahtar hâlâ geçerli: aynı istek sahte olmadan geçer.
    expect((await yoneticiUcu()(istek("yonetici", yalnizYenileme))).status).toBe(200);
  });
});
