// Panelin bildirim uçları gerçek istek ve veritabanıyla (kart 0280, karar 0198): mağaza sahibi bütün bildirimlerini,
// görevli yalnız izni olan olayınkini görür; sayı ucu listeyle aynı sayar; okundu yalnız kendi satırını değiştirir
// (başkasının kimliği 0), "hepsi" görülebilen bütün okunmamışları okundu yapar. Bozuk girdi 400 alır. Rolsüz
// yönetici, müşteri ve girişsiz ziyaretçi üç uçta reddedilir, hiçbir şey değişmez. Her rolün her uçtaki erişimini
// ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { panelBildirimleri } from "../../moduller/yonetici-bildirimi/model.ts";
import { yoneticiBildirimiYaz } from "../../moduller/yonetici-bildirimi/servis.ts";
import { yorumServisi } from "../../moduller/yorum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  panelBildirimiOkunduUcu,
  panelBildirimleriUcu,
  panelBildirimSayisiUcu,
} from "../yonetici/bildirim.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("bildirim-uclari");
  vt = deneme.vt;
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  await baglantiyiKapat();
  await siteninServisi(site).degistir(
    vt,
    { tur: "yonetici", kimlik: randomUUID() },
    { yorumYalnizSatinAlanlar: false },
  );
}, 60_000);
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const hesap = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri") => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const eposta = `bildirim-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: "uzun-bir-deneme-sifresi" });
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
  return { oturum: await oturumCerezi(vt, tur, hesapKimligi), hesapKimligi };
};

const istek = (yol: string, oturum: string | undefined, govde?: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
    method: govde === undefined ? "GET" : "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });

type Liste = {
  okunmamis: number;
  bildirimler: { kimlik: string; baslik: string; alt: string; okundu: boolean; adres: string }[];
};
const listele = async (oturum: string): Promise<Liste> => {
  const yanit = await panelBildirimleriUcu(istek("panel-bildirimleri", oturum));
  expect(yanit.status).toBe(200);
  expect(yanit.headers.get("cache-control")).toContain("no-store");
  return ((await yanit.json()) as { veri: Liste }).veri;
};
const sayi = async (oturum: string) => {
  const yanit = await panelBildirimSayisiUcu(istek("panel-bildirim-sayisi", oturum));
  expect(yanit.status).toBe(200);
  return ((await yanit.json()) as { veri: { okunmamis: number } }).veri.okunmamis;
};
const okundu = async (oturum: string, govde: unknown) => {
  const yanit = await panelBildirimiOkunduUcu(istek("panel-bildirimi-okundu", oturum, govde));
  return {
    durum: yanit.status,
    veri: ((await yanit.json()) as { veri?: { okundu: number; okunmamis: number } }).veri,
  };
};

// Onay bekleyen bir yorum (mağaza sahibi ve görevli görür) ve kartla ödemenin uyuşmazlığı (yalnız mağaza sahibi).
const olaylar = async () => {
  const urun = await urunServisi(() => site.ayarlar.saatDilimi).urunEkle(
    vt,
    { tur: "yonetici", kimlik: randomUUID() },
    { ad: `Bu${randomBytes(3).toString("hex")} Fincan`, vergiSinifi: null, durum: "yayinda" },
  );
  const musteri = await hesap("musteri");
  await yorumServisi(site).yorumYaz(vt, musteri.hesapKimligi, {
    urun,
    puan: 4,
    metin: "Deneme",
    ad: "Deneme Müşteri",
  });
  await yoneticiBildirimiYaz(vt, {
    bildirim: "kartla-odeme-uyusmazligi",
    anahtar: `deneme:${randomUUID()}`,
    kayit: null,
    veri: { gun: "2026-11-20", sayi: 1 },
  });
};

describe("panelin bildirim uçları", () => {
  it("izne göre liste ve sayı; okundu yalnız kendi satırını değiştirir; hepsi", async () => {
    const sahip = await hesap("magaza-sahibi");
    const gorevli = await hesap("gorevli");
    await olaylar();
    const sahibin = await listele(sahip.oturum);
    expect(sahibin.okunmamis).toBe(2);
    expect(sahibin.bildirimler.map((b) => b.baslik).sort()).toEqual(
      ["Kartla ödemeler kuruluşun kaydıyla uyuşmuyor", "Yorum onay bekliyor"].sort(),
    );
    expect(await sayi(sahip.oturum)).toBe(2);
    const gorevlinin = await listele(gorevli.oturum);
    expect(gorevlinin.bildirimler.map((b) => b.baslik)).toEqual(["Yorum onay bekliyor"]);
    expect(gorevlinin.bildirimler[0]?.adres).toBe("/yonetim/yorumlar");
    expect(await sayi(gorevli.oturum)).toBe(1);

    // Görevli sahibin bildirimini okundu yapamaz.
    const sahibinYorumu = sahibin.bildirimler.find((b) => b.baslik === "Yorum onay bekliyor");
    expect(await okundu(gorevli.oturum, { kimlik: sahibinYorumu?.kimlik })).toEqual({
      durum: 200,
      veri: { okundu: 0, okunmamis: 1 },
    });
    expect(await sayi(sahip.oturum)).toBe(2);
    // Kendi bildirimi; ikinci kez 0.
    expect(await okundu(sahip.oturum, { kimlik: sahibinYorumu?.kimlik })).toEqual({
      durum: 200,
      veri: { okundu: 1, okunmamis: 1 },
    });
    expect(await okundu(sahip.oturum, { kimlik: sahibinYorumu?.kimlik })).toEqual({
      durum: 200,
      veri: { okundu: 0, okunmamis: 1 },
    });
    expect(await okundu(sahip.oturum, { hepsi: true })).toEqual({
      durum: 200,
      veri: { okundu: 1, okunmamis: 0 },
    });
    const sonra = await listele(sahip.oturum);
    expect(sonra.okunmamis).toBe(0);
    expect(sonra.bildirimler.every((b) => b.okundu)).toBe(true);
    // Görevlininki değişmedi.
    expect(await sayi(gorevli.oturum)).toBe(1);
  });

  it("bozuk girdi 400 alır, hiçbir şey değişmez", async () => {
    const sahip = await hesap("magaza-sahibi");
    await olaylar();
    for (const govde of [
      { kimlik: "bozuk" },
      { hepsi: false },
      {},
      { kimlik: randomUUID(), hepsi: true },
    ]) {
      expect((await okundu(sahip.oturum, govde)).durum, JSON.stringify(govde)).toBe(400);
    }
    expect(await sayi(sahip.oturum)).toBe(2);
    const yanit = await panelBildirimleriUcu(istek("panel-bildirimleri?fazla=1", sahip.oturum));
    expect(yanit.status).toBe(400);
  });

  it("rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir; hiçbir şey değişmez", async () => {
    await hesap("magaza-sahibi");
    await olaylar();
    const okunmamislar = async () =>
      (await vt.select().from(panelBildirimleri).where(isNull(panelBildirimleri.okunma_zamani)))
        .length;
    const once = await okunmamislar();
    const rolsuz = await hesap("rolsuz");
    const musteri = await hesap("musteri");
    for (const [oturum, kod] of [
      [rolsuz.oturum, 403],
      [musteri.oturum, 401],
      [undefined, 401],
    ] as const) {
      expect((await panelBildirimleriUcu(istek("panel-bildirimleri", oturum))).status).toBe(kod);
      expect((await panelBildirimSayisiUcu(istek("panel-bildirim-sayisi", oturum))).status).toBe(
        kod,
      );
      expect(
        (await panelBildirimiOkunduUcu(istek("panel-bildirimi-okundu", oturum, { hepsi: true })))
          .status,
      ).toBe(kod);
    }
    expect(await okunmamislar()).toBe(once);
  });
});
