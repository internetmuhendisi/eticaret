// Sepet ucu gerçek istek ve gerçek veritabanıyla (kart 0213): ödeme adımının verdiği teslimat ve fatura bölgesi vergi
// hesabına ulaşır. Deneme sitesinin tablosunda Türkiye %18, İstanbul'un 34000 posta kodunda yalnız ek %0,5 vardır
// (en özel oran, karar 0061); vergi teslimat adresine göre hesaplanır (vergiAdresi varsayılanı).
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { sepetUcu } from "../herkese-acik/sepet.ts";

vi.setConfig({ testTimeout: 60_000 });

const yapan = sistemIslemi("test");
let vt: Veritabani;
let sil: () => Promise<void>;

beforeAll(async () => {
  const site = await denemeSitesiAc("sepet-ucu");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
  );
  await baglantiyiKapat();
});
afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const istek = (govde: unknown) =>
  new Request("http://yerel/kapi/herkese-acik/sepet", {
    method: "POST",
    headers: { "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1` },
    body: JSON.stringify(govde),
  });

describe("sepet ucu", () => {
  it("ödeme adımının teslimat bölgesi vergiyi değiştirir", async () => {
    const tablo = await siteninVergiServisi(calisanSite()).tabloyuOku(vt);
    const genel = tablo.find((sinif) => sinif.ad === "Genel")?.kimlik ?? null;
    const srv = urunServisi(() => "Europe/Istanbul");
    const urun = await srv.urunEkle(vt, yapan, {
      ad: `Vergi denemesi ${randomBytes(4).toString("hex")}`,
      vergiSinifi: genel,
      durum: "yayinda",
    });
    const birim = (await srv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(calisanSite()).fiyatYaz(vt, yapan, birim, { satisFiyati: 11_800 });
    await stokServisi().stokDuzelt(vt, yapan, birim, {
      yeniMiktar: 5,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    const oranlar = async (teslimat: { ulke: string; il: string; postaKodu: string }) => {
      const yanit = await sepetUcu(
        istek({ kalemler: [{ birim, adet: 1 }], vergiBolgeleri: { teslimat } }),
      );
      expect(yanit.status).toBe(200);
      const { veri } = (await yanit.json()) as { veri: { vergiDokumu: { oran: string }[] } };
      return veri.vergiDokumu.map(({ oran }) => oran);
    };
    const ankara = await oranlar({ ulke: "TR", il: "TR-06", postaKodu: "06420" });
    const istanbul = await oranlar({ ulke: "TR", il: "TR-34", postaKodu: "34000" });
    expect(ankara).toHaveLength(1);
    expect(istanbul).toHaveLength(1);
    expect(istanbul).not.toEqual(ankara);
  });
});
