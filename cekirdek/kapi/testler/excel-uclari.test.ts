// Excel ile toplu ürün işlemleri eklentisinin panel uçları gerçek istek ve veritabanıyla (kart 0315):
// - Mağaza sahibi dışa aktarmayı başlatır, iş dosyayı yazar, dosyayı .xlsx ve ekli dosya olarak indirir; dosyayı
//   yükler, denetlenir, önizleme gelir, vazgeçer.
// - Başka yöneticinin dosyası ve işi bulunamadıdır. Görevli dışa aktarır (fiyatı görür) ve yükler.
// - Rolsüz yönetici yedi uçta yetki, müşteri ve girişsiz ziyaretçi oturum-yok alır; hiçbir şey yazılmaz.
// - Eklenti kapalıyken yedi uç bulunamadı verir.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import readXlsxFile from "read-excel-file/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { calisanExcelServisi } from "../../eklentiler/excel-ile-toplu-urun-islemleri/isler.ts";
import {
  excelDisaAktarmalari,
  excelIceAktarmalari,
} from "../../eklentiler/excel-ile-toplu-urun-islemleri/model.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  excelDisaAktarmaDurumuUcu,
  excelDisaAktarUcu,
  excelIceAktarmaDurumuUcu,
  excelIndirUcu,
  excelUygulaUcu,
  excelVazgecUcu,
  excelYukleUcu,
} from "../yonetici/excel.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

vi.setConfig({ testTimeout: 120_000 });

let vt: Veritabani;
let sil: () => Promise<void>;
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");

beforeAll(async () => {
  const site = await denemeSitesiAc("excel-uclari");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
}, 60_000);
let acikSite: unknown;
beforeEach(() => {
  delete ortak[siteAnahtari];
  acikSite = calisanSite();
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const ag = () => `2001:db8:${randomBytes(2).toString("hex")}::1`;
const post = (yol: string, govde: BodyInit, cerez?: string) =>
  new Request(`http://yerel/kapi/yonetici/${yol}`, {
    method: "POST",
    headers: { "x-forwarded-for": ag(), ...(cerez === undefined ? {} : { cookie: cerez }) },
    body: govde,
  });
const get = (yol: string, cerez?: string) =>
  new Request(`http://yerel/kapi/yonetici/${yol}`, {
    headers: { "x-forwarded-for": ag(), ...(cerez === undefined ? {} : { cookie: cerez }) },
  });
const veri = async <T>(yanit: Response) => ((await yanit.json()) as { veri: T }).veri;
const hata = async (yanit: Response) =>
  ((await yanit.json()) as { hata?: { kod: string } }).hata?.kod;

const hesap = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri") => {
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `excel-uc-${randomBytes(4).toString("hex")}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  if (kisi === "magaza-sahibi" || kisi === "gorevli") {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi));
    if (rol === undefined) throw new Error("Rol yok.");
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return { kimlik: hesapKimligi, cerez: await oturumCerezi(vt, tur, hesapKimligi) };
};

const disaAktar = async (cerez: string, ara: string) => {
  const yanit = await excelDisaAktarUcu(
    post("urunler-excel-disa-aktar", JSON.stringify({ sorgu: `ara=${ara}` }), cerez),
  );
  expect(yanit.status).toBe(200);
  const { kimlik } = await veri<{ kimlik: string }>(yanit);
  await calisanExcelServisi().disaAktarmayiHazirla(vt, kimlik);
  return kimlik;
};

describe("panelin Excel uçları", () => {
  it("mağaza sahibi dışa aktarır, indirir, yükler, önizlemeyi görür ve vazgeçer; başkası dosyayı ve işi göremez", async () => {
    const sahip = await hesap("magaza-sahibi");
    const baska = await hesap("magaza-sahibi");
    const e = randomBytes(3).toString("hex");
    await urunServisi(() => "Europe/Istanbul").urunEkle(
      vt,
      { tur: "yonetici", kimlik: sahip.kimlik },
      {
        ad: `Excel uç ${e}`,
        adresAdi: `excel-uc-${e}`,
        vergiSinifi: null,
      },
    );
    const kimlik = await disaAktar(sahip.cerez, e);
    const durum = await veri<{ disaAktarma: { durum: string; urunSayisi: number } }>(
      await excelDisaAktarmaDurumuUcu(
        get(`urunler-excel-disa-aktarma?kimlik=${kimlik}`, sahip.cerez),
      ),
    );
    expect(durum.disaAktarma).toMatchObject({ durum: "hazir", urunSayisi: 1 });
    const indirilen = await excelIndirUcu(get(`urunler-excel-indir?kimlik=${kimlik}`, sahip.cerez));
    expect(indirilen.status).toBe(200);
    expect(indirilen.headers.get("content-type")).toContain("spreadsheetml");
    expect(indirilen.headers.get("content-disposition")).toMatch(
      /^attachment; filename="urunler-\d{4}-\d{2}-\d{2}\.xlsx"/,
    );
    expect(indirilen.headers.get("cache-control")).toContain("no-store");
    const dosya = Buffer.from(await indirilen.arrayBuffer());
    expect(((await readXlsxFile(dosya))[0]?.data[1] ?? [])[0]).toBe(`excel-uc-${e}`);
    // Başka yönetici dosyayı indiremez, durumunu göremez.
    expect(
      (await excelIndirUcu(get(`urunler-excel-indir?kimlik=${kimlik}`, baska.cerez))).status,
    ).toBe(404);
    expect(
      (
        await veri<{ disaAktarma: unknown }>(
          await excelDisaAktarmaDurumuUcu(
            get(`urunler-excel-disa-aktarma?kimlik=${kimlik}`, baska.cerez),
          ),
        )
      ).disaAktarma,
    ).toBeNull();
    // Yükleme, denetim ve önizleme.
    const yuklendi = await excelYukleUcu(
      post("urunler-excel-yukle?ad=urunler.xlsx", new Uint8Array(dosya), sahip.cerez),
    );
    expect(yuklendi.status).toBe(200);
    const is = (await veri<{ kimlik: string }>(yuklendi)).kimlik;
    await calisanExcelServisi().iceAktarmayiDenetle(vt, is);
    const onizleme = await veri<{ iceAktarma: { durum: string; sayilar: { ayni: number } } }>(
      await excelIceAktarmaDurumuUcu(get(`urunler-excel-ice-aktarma?kimlik=${is}`, sahip.cerez)),
    );
    expect(onizleme.iceAktarma).toMatchObject({ durum: "onizleme", sayilar: { ayni: 1 } });
    // Değişiklik yok: uygulanmaz.
    const uygula = await excelUygulaUcu(
      post("urunler-excel-uygula", JSON.stringify({ kimlik: is }), sahip.cerez),
    );
    expect(uygula.status).toBe(422);
    // Başka yönetici işi göremez, vazgeçemez.
    expect(
      (await excelIceAktarmaDurumuUcu(get(`urunler-excel-ice-aktarma?kimlik=${is}`, baska.cerez)))
        .status,
    ).toBe(404);
    expect(
      (
        await excelVazgecUcu(
          post("urunler-excel-vazgec", JSON.stringify({ kimlik: is }), baska.cerez),
        )
      ).status,
    ).toBe(404);
    const vazgec = await excelVazgecUcu(
      post("urunler-excel-vazgec", JSON.stringify({ kimlik: is }), sahip.cerez),
    );
    expect(vazgec.status).toBe(200);
    const [kayit] = await vt
      .select()
      .from(excelIceAktarmalari)
      .where(eq(excelIceAktarmalari.kimlik, is));
    expect(kayit?.durum).toBe("vazgecildi");
    expect(kayit?.dosya).toBeNull();
  });

  it("görevli dışa aktarır (fiyatı görür: fiyat sütunlarıyla; değiştiremez, servis testinde) ve dosya yükler", async () => {
    const gorevli = await hesap("gorevli");
    const kimlik = await disaAktar(gorevli.cerez, randomBytes(3).toString("hex"));
    const [kayit] = await vt
      .select()
      .from(excelDisaAktarmalari)
      .where(eq(excelDisaAktarmalari.kimlik, kimlik));
    expect(kayit?.fiyat_sutunlari).toBe(true);
    expect(kayit?.stok_sutunu).toBe(true);
    const yuklendi = await excelYukleUcu(
      post("urunler-excel-yukle", new Uint8Array([1, 2, 3]), gorevli.cerez),
    );
    expect(yuklendi.status).toBe(200);
  });

  it.each([
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s yedi uçta reddedilir, hiçbir şey yazılmaz", async (_ad, kisi, durum, kod) => {
    const cerez = kisi === "girissiz" ? undefined : (await hesap(kisi)).cerez;
    const once =
      (await vt.select().from(excelIceAktarmalari)).length +
      (await vt.select().from(excelDisaAktarmalari)).length;
    const kimlik = "00000000-0000-4000-8000-000000000000";
    for (const yanit of [
      await excelDisaAktarUcu(post("urunler-excel-disa-aktar", "{}", cerez)),
      await excelDisaAktarmaDurumuUcu(get("urunler-excel-disa-aktarma", cerez)),
      await excelIndirUcu(get(`urunler-excel-indir?kimlik=${kimlik}`, cerez)),
      await excelYukleUcu(post("urunler-excel-yukle", new Uint8Array([1]), cerez)),
      await excelIceAktarmaDurumuUcu(get("urunler-excel-ice-aktarma", cerez)),
      await excelUygulaUcu(post("urunler-excel-uygula", JSON.stringify({ kimlik }), cerez)),
      await excelVazgecUcu(post("urunler-excel-vazgec", JSON.stringify({ kimlik }), cerez)),
    ]) {
      expect(yanit.status).toBe(durum);
      expect(await hata(yanit)).toBe(kod);
    }
    const sonra =
      (await vt.select().from(excelIceAktarmalari)).length +
      (await vt.select().from(excelDisaAktarmalari)).length;
    expect(sonra).toBe(once);
  });

  it("eklenti kapalıyken yedi uç bulunamadı verir", async () => {
    const sahip = await hesap("magaza-sahibi");
    const site = acikSite as ReturnType<typeof calisanSite>;
    ortak[siteAnahtari] = { ...site, ayarlar: { ...site.ayarlar, eklentiler: [] } };
    const kimlik = "00000000-0000-4000-8000-000000000000";
    for (const yanit of [
      await excelDisaAktarUcu(post("urunler-excel-disa-aktar", "{}", sahip.cerez)),
      await excelDisaAktarmaDurumuUcu(get("urunler-excel-disa-aktarma", sahip.cerez)),
      await excelIndirUcu(get(`urunler-excel-indir?kimlik=${kimlik}`, sahip.cerez)),
      await excelYukleUcu(post("urunler-excel-yukle", new Uint8Array([1]), sahip.cerez)),
      await excelIceAktarmaDurumuUcu(get("urunler-excel-ice-aktarma", sahip.cerez)),
      await excelUygulaUcu(post("urunler-excel-uygula", JSON.stringify({ kimlik }), sahip.cerez)),
      await excelVazgecUcu(post("urunler-excel-vazgec", JSON.stringify({ kimlik }), sahip.cerez)),
    ]) {
      expect(yanit.status).toBe(404);
      expect(await hata(yanit)).toBe("bulunamadi");
    }
  });
});
