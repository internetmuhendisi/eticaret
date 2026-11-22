// Logo yükleme ve kaldırma uçları gerçek istek, veritabanı ve dosya klasörüyle (kart 0094, karar 0165): mağaza sahibi
// logoyu yükler, logo ucu yenisini verir, değişiklik kayda girer, kaldırınca ilk logoya dönülür. Dosya gövdesi
// sınırı aşınca bildirilen uzunlukla hiç okunmaz, uzunluk bildirilmemişse okunurken kesilir. Reddedilen dosya
// alanın koduyla döner. Görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir, logo değişmez. Yükleme
// sınırı (30 istek) dolunca 429. Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener. Çalışan site
// sürecin ortak alanına konarak verilir.
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { dosyaSinirlari } from "../../kayitlar/dosya.ts";
import { istekSinirlari } from "../../kayitlar/kapi.ts";
import { degisiklikKayitlari } from "../../moduller/degisiklik-kaydi/model.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { logoUcu } from "../herkese-acik/logo.ts";
import { logoKaldirmaUcu, logoYuklemeUcu } from "../yonetici/logo.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "marka-logolu"));

let vt: Veritabani;
let sil: () => Promise<void>;
let klasor: string;
let sayac = 0;

beforeAll(async () => {
  const acilan = await denemeSitesiAc("logo-uclari");
  vt = acilan.vt;
  sil = acilan.sil;
  klasor = mkdtempSync(join(tmpdir(), "logo-uclari-"));
  vi.stubEnv("VERITABANI_ADRESI", acilan.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv("DOSYA_KLASORU", klasor);
  ortak[siteAnahtari] = site;
  await baglantiyiKapat();
}, 60_000);
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  rmSync(klasor, { recursive: true, force: true });
  await sil();
});

const cerez = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri" | "girissiz") => {
  if (kisi === "girissiz") return { cerez: undefined, hesapKimligi: "" };
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `logo${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  if (kisi === "magaza-sahibi" || kisi === "gorevli") {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi));
    if (rol === undefined) throw new Error(`${kisi} rolü yok.`);
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return { cerez: await oturumCerezi(vt, tur, hesapKimligi), hesapKimligi };
};

// Her istek kendi istemci adresinden gelir: yükleme sınırı yalnız onu ölçen testte dolar.
const yeniAdres = () => `2001:db8:${randomBytes(2).toString("hex")}::1`;
const istek = (
  yol: string,
  oturum: string | undefined,
  govde: BodyInit | undefined,
  {
    adres = yeniAdres(),
    basliklar = {},
  }: { adres?: string; basliklar?: Record<string, string> } = {},
) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": adres,
      ...(oturum === undefined ? {} : { cookie: oturum }),
      ...basliklar,
    },
    ...(govde === undefined ? {} : { body: govde, duplex: "half" }),
  } as RequestInit);

const gorsel = (renk: { r: number; g: number; b: number }) =>
  sharp({ create: { width: 64, height: 32, channels: 3, background: renk } })
    .png()
    .toBuffer();

const logoEtiketi = async () =>
  (await logoUcu(new Request("http://magaza.ornek.test/kapi/herkese-acik/logo"))).headers.get(
    "etag",
  );

// Parça parça okunan gövde: kaç bayt istendiği sayılır.
const sayanGovde = (parca: number, toplam: number) => {
  const okunan = { bayt: 0 };
  const akis = new ReadableStream<Uint8Array>({
    pull: (denetim) => {
      if (okunan.bayt >= toplam) {
        denetim.close();
        return;
      }
      okunan.bayt += parca;
      denetim.enqueue(new Uint8Array(parca));
    },
  });
  return { akis, okunan };
};

describe("logo uçları", () => {
  it("mağaza sahibi logoyu yükler: logo ucu yenisini verir, değişiklik kayda girer; kaldırınca ilk logoya döner", async () => {
    const sahip = await cerez("magaza-sahibi");
    const ilk = await logoEtiketi();
    const yanit = await logoYuklemeUcu(
      istek("logo-yukle", sahip.cerez, await gorsel({ r: 200, g: 40, b: 40 })),
    );
    expect(yanit.status).toBe(200);
    const govde = (await yanit.json()) as { veri: { kaynak: string; adres: string } };
    expect(govde.veri.kaynak).toBe("yuklenen");
    expect(govde.veri.adres).toMatch(/^\/kapi\/herkese-acik\/logo\?s=[0-9a-f]{16}$/);
    const yeni = await logoEtiketi();
    expect(yeni).not.toBe(ilk);
    expect(govde.veri.adres.slice(-16)).toBe(yeni?.slice(1, 17));
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kim_turu, "yonetici"),
          eq(degisiklikKayitlari.kim_kimligi, sahip.hesapKimligi),
        ),
      );
    expect(kayitlar.length).toBe(1);

    const kaldir = await logoKaldirmaUcu(istek("logo-kaldir", sahip.cerez, "{}"));
    expect(kaldir.status).toBe(200);
    expect(((await kaldir.json()) as { veri: { kaynak: string } }).veri.kaynak).toBe("ilk");
    expect(await logoEtiketi()).toBe(ilk);
    expect(await siteninServisi(site).tekOku(vt, "logo")).toBeUndefined();
  });

  it("sınırı aşan uzunluk bildiren gövde hiç okunmadan cok-buyuk alır", async () => {
    const sahip = await cerez("magaza-sahibi");
    const { akis, okunan } = sayanGovde(64 * 1024, dosyaSinirlari.enCokBayt + 1);
    const yanit = await logoYuklemeUcu(
      istek("logo-yukle", sahip.cerez, akis, {
        basliklar: { "content-length": String(dosyaSinirlari.enCokBayt + 1) },
      }),
    );
    expect(yanit.status).toBe(400);
    expect(await yanit.json()).toMatchObject({
      hata: { kod: "dogrulama", ayrinti: [{ alan: "dosya", kod: "cok-buyuk" }] },
    });
    // Akış ilk parçayı istemeden yanıt döner (Request akışın başını önceden okuyabilir: en çok bir parça).
    expect(okunan.bayt).toBeLessThanOrEqual(64 * 1024);
  });

  it("uzunluk bildirmeyen gövde sınırı aşınca okuma kesilir", async () => {
    const sahip = await cerez("magaza-sahibi");
    const parca = 256 * 1024;
    const { akis, okunan } = sayanGovde(parca, dosyaSinirlari.enCokBayt * 3);
    const yanit = await logoYuklemeUcu(istek("logo-yukle", sahip.cerez, akis));
    expect(yanit.status).toBe(400);
    expect(await yanit.json()).toMatchObject({
      hata: { ayrinti: [{ alan: "dosya", kod: "cok-buyuk" }] },
    });
    expect(okunan.bayt).toBeLessThanOrEqual(dosyaSinirlari.enCokBayt + 2 * parca);
  });

  it("görsel olmayan ve boş dosya alanın koduyla reddedilir, logo değişmez", async () => {
    const sahip = await cerez("magaza-sahibi");
    const once = await logoEtiketi();
    for (const [icerik, kod] of [
      ["<svg xmlns='http://www.w3.org/2000/svg'></svg>", "tur-izinsiz"],
      [new Uint8Array(), "bos"],
      [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]), "bozuk"],
    ] as const) {
      const yanit = await logoYuklemeUcu(istek("logo-yukle", sahip.cerez, icerik));
      expect(yanit.status).toBe(400);
      expect(await yanit.json()).toMatchObject({
        hata: { kod: "dogrulama", ayrinti: [{ alan: "dosya", kod }] },
      });
    }
    expect(await logoEtiketi()).toBe(once);
  });

  it("görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir, logo değişmez", async () => {
    const once = await logoEtiketi();
    const icerik = await gorsel({ r: 10, g: 120, b: 10 });
    for (const [kisi, kod] of [
      ["gorevli", "yetki"],
      ["rolsuz", "yetki"],
      ["musteri", "oturum-yok"],
      ["girissiz", "oturum-yok"],
    ] as const) {
      const oturum = (await cerez(kisi)).cerez;
      const yukle = await logoYuklemeUcu(istek("logo-yukle", oturum, icerik));
      expect(((await yukle.json()) as { hata: { kod: string } }).hata.kod).toBe(kod);
      const kaldir = await logoKaldirmaUcu(istek("logo-kaldir", oturum, "{}"));
      expect(((await kaldir.json()) as { hata: { kod: string } }).hata.kod).toBe(kod);
    }
    expect(await logoEtiketi()).toBe(once);
  });

  it("yetkisiz ve girişsiz isteğin gövdesi okunmaz: yetki gövdeden önce denetlenir", async () => {
    for (const kisi of ["gorevli", "girissiz"] as const) {
      const oturum = (await cerez(kisi)).cerez;
      const { akis, okunan } = sayanGovde(64 * 1024, dosyaSinirlari.enCokBayt);
      const yanit = await logoYuklemeUcu(istek("logo-yukle", oturum, akis));
      expect(yanit.status, kisi).toBe(kisi === "gorevli" ? 403 : 401);
      // Request akışın başını önceden okuyabilir: en çok bir parça.
      expect(okunan.bayt, kisi).toBeLessThanOrEqual(64 * 1024);
    }
  });

  it("yükleme sınırı dolunca 429 ve Retry-After", async () => {
    const sahip = await cerez("magaza-sahibi");
    const adres = yeniAdres();
    const { istek: sinir } = istekSinirlari.yukleme;
    for (let i = 0; i < sinir; i += 1) {
      const yanit = await logoYuklemeUcu(istek("logo-yukle", sahip.cerez, "x", { adres }));
      expect(yanit.status).toBe(400);
    }
    const asan = await logoYuklemeUcu(istek("logo-yukle", sahip.cerez, "x", { adres }));
    expect(asan.status).toBe(429);
    expect(Number(asan.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
