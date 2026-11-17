// Ödeme uçları gerçek istek ve gerçek veritabanıyla (kart 0213, karar 0140):
// - Üye olmayan müşteri robot cevabıyla oturum açar; yanıt önbelleğe alınmaz; hesap açarsa iki oturum çerezi gelir ve
//   bu çerezle müşteri ucu da çalışır.
// - Uydurma robot cevabında, onaysız formda ve tutar taşıyan girdide hiçbir şey yazılmaz (tutar tarayıcıdan gelmez).
// - Üye olmadan alışveriş kapalıyken herkese açık uç oturum-yok döner; giriş yapmış müşteri yine geçer.
// - Müşteri ucu oturumsuz istekte oturum-yok döner.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { odemeOturumlari } from "../../moduller/odeme/model.ts";
import { girisYap, hesapAc } from "../../moduller/oturum/servis.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { soruyuCoz } from "../../moduller/robot-korumasi/testler/soru-coz.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { odemeUcu } from "../herkese-acik/odeme.ts";
import { uyeOdemeUcu } from "../musteri/odeme.ts";
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

const birimAc = async () => {
  const srv = urunServisi(() => "Europe/Istanbul");
  const urun = await srv.urunEkle(vt, yapan, {
    ad: `Ödeme denemesi ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await srv.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  await siteninFiyatServisi(calisanSite()).fiyatYaz(vt, yapan, birim, { satisFiyati: 10_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 10,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  return birim;
};

const bilgiler = {
  teslimat: {
    ad: "Deniz",
    soyad: "Yılmaz",
    telefon: "0555 000 00 00",
    adres: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Atatürk Bulvarı No: 10",
      postaKodu: "06420",
    },
  },
  fatura: { tur: "bireysel", adresAyni: true },
  onBilgilendirmeOnayi: true,
  mesafeliSatisOnayi: true,
  pazarlamaIzni: false,
};

const misafirGovdesi = async (birim: string, ek: Record<string, unknown> = {}) => ({
  eposta: `misafir-${randomBytes(4).toString("hex")}@ornek.test`,
  hesap: { ac: false },
  bilgiler,
  kalemler: [{ birim, adet: 1 }],
  robotCevabi: await robotCevabi(),
  ...ek,
});
const misafir = async (govde: unknown) => odemeUcu(istek("herkese-acik/odeme", govde));
const uye = async (birim: string, cerez: string) =>
  uyeOdemeUcu(
    istek(
      "musteri/odeme",
      { bilgiler, kalemler: [{ birim, adet: 1 }], robotCevabi: await robotCevabi() },
      { cookie: cerez },
    ),
  );
const cerezSatiri = (basliklar: string[]) =>
  basliklar.map((satir) => satir.split(";")[0]).join("; ");
const uyeCerezi = async () => {
  const eposta = `uye-${randomBytes(4).toString("hex")}@ornek.test`;
  await hesapAc(vt, "musteri", { eposta, sifre });
  const giris = await girisYap(vt, "musteri", { eposta, sifre }, 3600);
  if (giris === null) throw new Error("Giriş yapılamadı.");
  return cerezSatiri(oturumCerezleri("musteri", giris.anahtarlar, 3600));
};
const oturumSayisi = async () => (await vt.select().from(odemeOturumlari)).length;

beforeAll(async () => {
  const site = await denemeSitesiAc("odeme-uclari");
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

describe("herkese açık ödeme ucu", () => {
  it("robot cevabıyla oturum açılır, yanıt önbelleğe alınmaz, çerez yazılmaz", async () => {
    const birim = await birimAc();
    const once = await oturumSayisi();
    const yanit = await misafir(await misafirGovdesi(birim));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("cache-control")).toBe("no-store");
    expect(yanit.headers.getSetCookie()).toEqual([]);
    const { veri } = (await yanit.json()) as { veri: { oturum: string; bitis: string } };
    expect(veri.oturum).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(veri.bitis))).toBe(false);
    expect(await oturumSayisi()).toBe(once + 1);
  });

  it("uydurma robot cevabı, onaysız form ve tutar taşıyan girdi hiçbir şey yazmaz", async () => {
    const birim = await birimAc();
    const once = await oturumSayisi();
    expect(await hataKodu(await misafir(await misafirGovdesi(birim, { robotCevabi: "x" })))).toBe(
      "robot-dogrulamasi",
    );
    expect(
      await hataKodu(
        await misafir(
          await misafirGovdesi(birim, { bilgiler: { ...bilgiler, mesafeliSatisOnayi: false } }),
        ),
      ),
    ).toBe("dogrulama");
    expect(await hataKodu(await misafir(await misafirGovdesi(birim, { toplam: 1 })))).toBe(
      "dogrulama",
    );
    expect(await oturumSayisi()).toBe(once);
  });

  it("ödemede hesap açılır: iki oturum çerezi gelir, müşteri ucu bu çerezle çalışır", async () => {
    const birim = await birimAc();
    const yanit = await misafir(
      await misafirGovdesi(birim, {
        hesap: { ac: true, sifre, uyelikOnayi: true, kvkkOnayi: true },
      }),
    );
    expect(yanit.status).toBe(200);
    const cerezler = yanit.headers.getSetCookie();
    expect(cerezler).toHaveLength(2);
    expect((await uye(birim, cerezSatiri(cerezler))).status).toBe(200);
  });

  it("üye olmadan alışveriş kapalıyken oturum-yok döner, oturum yazılmaz; üye yine geçer", async () => {
    const birim = await birimAc();
    const once = await oturumSayisi();
    await siteninServisi(calisanSite()).degistir(vt, yapan, { uyeOlmadanAlisveris: false });
    try {
      const yanit = await misafir(await misafirGovdesi(birim));
      expect(yanit.status).toBe(401);
      expect(await hataKodu(yanit)).toBe("oturum-yok");
      expect(await oturumSayisi()).toBe(once);
      expect((await uye(birim, await uyeCerezi())).status).toBe(200);
    } finally {
      await siteninServisi(calisanSite()).degistir(vt, yapan, { uyeOlmadanAlisveris: true });
    }
  });
});

describe("müşteri ödeme ucu", () => {
  it("oturumsuz istekte oturum-yok döner", async () => {
    const birim = await birimAc();
    const yanit = await uye(birim, "");
    expect(yanit.status).toBe(401);
    expect(await hataKodu(yanit)).toBe("oturum-yok");
  });
});
