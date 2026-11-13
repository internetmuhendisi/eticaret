// Stoğa gelince haber ver uçları gerçek istek ve gerçek veritabanıyla (kart 0144, karar 0117):
// - Üye olmayan müşteri robot cevabıyla talep bırakır; cevapsız ya da uydurma cevapta veritabanına bakılmaz.
// - Mağaza sahibi üye olmayana kapatınca herkese açık uç oturum-yok döner, talep yazılmaz; giriş yapmış müşteri
//   yine bırakır (müşteri ucu, hesabının adresiyle).
// - Eklenti kapalıyken iki uç bulunamadı verir.
// - Satılabilir birime is-kurali, olmayan birime bulunamadı.
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { stokBildirimiTalepleri } from "../../eklentiler/stoga-gelince-haber-ver/model.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { girisYap, hesapAc } from "../../moduller/oturum/servis.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { soruyuCoz } from "../../moduller/robot-korumasi/testler/soru-coz.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { stokBildirimiUcu } from "../herkese-acik/stok-bildirimi.ts";
import { uyeStokBildirimiUcu } from "../musteri/stok-bildirimi.ts";
import { oturumCerezleri } from "../oturum-cerezi.ts";

vi.setConfig({ testTimeout: 60_000 });

const yapan = sistemIslemi("test");
const sifre = "uzun-bir-deneme-sifresi";
let vt: Veritabani;
let sil: () => Promise<void>;

const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;
const istek = (yol: string, govde: unknown, basliklar: Record<string, string> = {}) =>
  new Request(`http://yerel/kapi/${yol}`, {
    method: "POST",
    headers: { "x-forwarded-for": yeniAg(), ...basliklar },
    body: JSON.stringify(govde),
  });
const robotCevabi = async () => soruyuCoz(await robotSorusuUret());
const hataKodu = async (yanit: Response) =>
  ((await yanit.json()) as { hata?: { kod: string } }).hata?.kod;

const birimAc = async (stok = 0) => {
  const srv = urunServisi(() => "Europe/Istanbul");
  const urun = await srv.urunEkle(vt, yapan, {
    ad: `Uç denemesi ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await srv.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  await siteninFiyatServisi(calisanSite()).fiyatYaz(vt, yapan, birim, { satisFiyati: 10_000 });
  if (stok > 0) {
    await stokServisi().stokDuzelt(vt, yapan, birim, {
      yeniMiktar: stok,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
  }
  return birim;
};
const talepler = (birim: string) =>
  vt
    .select({ eposta: stokBildirimiTalepleri.eposta })
    .from(stokBildirimiTalepleri)
    .where(eq(stokBildirimiTalepleri.birim_kimligi, birim));

const misafir = async (birim: string, eposta: string, cevap?: string) =>
  stokBildirimiUcu(
    istek("herkese-acik/stok-bildirimi", {
      birim,
      eposta,
      robotCevabi: cevap ?? (await robotCevabi()),
    }),
  );
const uye = async (birim: string) => {
  const eposta = `uye-${randomBytes(4).toString("hex")}@ornek.test`;
  await hesapAc(vt, "musteri", { eposta, sifre });
  const giris = await girisYap(vt, "musteri", { eposta, sifre }, 3600);
  if (giris === null) throw new Error("Giriş yapılamadı.");
  const cerez = oturumCerezleri("musteri", giris.anahtarlar, 3600)
    .map((satir) => satir.split(";")[0])
    .join("; ");
  return {
    eposta,
    yanit: await uyeStokBildirimiUcu(istek("musteri/stok-bildirimi", { birim }, { cookie: cerez })),
  };
};

// Çalışan sitenin ayarı testte değiştirilir (eklenti kapalı); sonra geri konur.
const anahtar = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as { [anahtar]?: unknown };
const eklentisiz = async <T>(is: () => Promise<T>): Promise<T> => {
  const site = calisanSite();
  ortak[anahtar] = { ...site, ayarlar: { ...site.ayarlar, eklentiler: [] } };
  try {
    return await is();
  } finally {
    ortak[anahtar] = site;
  }
};

beforeAll(async () => {
  const site = await denemeSitesiAc("stok-bildirimi-uclari");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
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

describe("herkese açık uç", () => {
  it("robot cevabıyla talep yazılır; uydurma cevapta yazılmaz", async () => {
    const birim = await birimAc();
    const eposta = `misafir-${randomBytes(4).toString("hex")}@ornek.test`;
    const uydurma = await misafir(birim, eposta, "uydurma");
    expect(await hataKodu(uydurma)).toBe("robot-dogrulamasi");
    expect(await talepler(birim)).toEqual([]);
    const yanit = await misafir(birim, eposta.toUpperCase());
    expect(yanit.status).toBe(200);
    expect(await talepler(birim)).toEqual([{ eposta }]);
  });

  it("satılabilir birime is-kurali, olmayan birime bulunamadı", async () => {
    const stokta = await birimAc(3);
    expect(await hataKodu(await misafir(stokta, "a@ornek.test"))).toBe("is-kurali");
    expect(await hataKodu(await misafir(randomUUID(), "a@ornek.test"))).toBe("bulunamadi");
  });

  it("üye olmayana kapalıyken oturum-yok döner, talep yazılmaz; üye yine bırakır", async () => {
    const birim = await birimAc();
    await siteninServisi(calisanSite()).degistir(vt, yapan, { stokBildirimiUyeOlmayan: false });
    try {
      const yanit = await misafir(birim, "kapali@ornek.test");
      expect(yanit.status).toBe(401);
      expect(await hataKodu(yanit)).toBe("oturum-yok");
      expect(await talepler(birim)).toEqual([]);
      const { eposta, yanit: uyeYaniti } = await uye(birim);
      expect(uyeYaniti.status).toBe(200);
      expect(await talepler(birim)).toEqual([{ eposta }]);
    } finally {
      await siteninServisi(calisanSite()).degistir(vt, yapan, { stokBildirimiUyeOlmayan: true });
    }
  });
});

describe("eklenti kapalı", () => {
  it("iki uç bulunamadı verir, talep yazılmaz", async () => {
    const birim = await birimAc();
    await eklentisiz(async () => {
      expect(await hataKodu(await misafir(birim, "kapali@ornek.test"))).toBe("bulunamadi");
      expect(await hataKodu((await uye(birim)).yanit)).toBe("bulunamadi");
      // Üye olmayana kapalı ayarda da önce eklentinin kapalılığı söylenir (bağımsız kontrolün bulgusu).
      await siteninServisi(calisanSite()).degistir(vt, yapan, { stokBildirimiUyeOlmayan: false });
      try {
        expect(await hataKodu(await misafir(birim, "kapali@ornek.test"))).toBe("bulunamadi");
      } finally {
        await siteninServisi(calisanSite()).degistir(vt, yapan, { stokBildirimiUyeOlmayan: true });
      }
    });
    expect(await talepler(birim)).toEqual([]);
  });
});
