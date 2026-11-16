// Sepetin vitrin verisi gerçek veritabanı ve klasörle (kart 0212, karar 0135): ürünün adı ve adresi, birleşimin
// seçimi ürünün seçenek sırasıyla, birleşimin kendi görseli (seçmeyen birleşimde ana görsel), birim fiyatının fiyat
// gösterim işleviyle birebir aynı olması, satır tutarının ve toplamların sitenin para biçimiyle yazılması, vergi
// dökümünün oranı yüzde olarak, eski fiyatın yazılışı; kaldırılan satırda ad ve fiyat olmaması.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { siteninBicimleyicisi } from "../../../metinler/site-metni.ts";
import { gorselKaydet } from "../../../moduller/dosya/servis.ts";
import { fiyatGosterimServisi } from "../../../moduller/fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../../../moduller/fiyat/servis.ts";
import { stokServisi } from "../../../moduller/stok/servis.ts";
import { urunServisi } from "../../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../../moduller/vergi/servis.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kayitAdresleri } from "../../adresler.ts";
import { sepetGorunumu } from "../veri.ts";

vi.setConfig({ testTimeout: 60_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
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
const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();
const bicim = siteninBicimleyicisi(site.ayarlar);

const temizlenecekler: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async () => {
  const deneme = await denemeSitesiAc("sepet-veri");
  const dosyaKlasoru = mkdtempSync(join(tmpdir(), "sepet-veri-"));
  temizlenecekler.push(deneme.sil, () => rmSync(dosyaKlasoru, { recursive: true, force: true }));
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const gorselEkle = async (urun: string, metin: string, mavi: number) => {
    const icerik = await sharp({
      create: { width: 800, height: 800, channels: 3, background: { r: 40, g: 90, b: mavi } },
    })
      .png()
      .toBuffer();
    const kayit = await gorselKaydet(vt, icerik, dosyaKlasoru);
    if (!kayit.tamam) throw new Error(kayit.hata);
    return urunler.galeriyeGorselEkle(vt, yonetici(), urun, {
      dosya: kayit.dosya.kimlik,
      alternatifMetin: metin,
    });
  };
  const stokYaz = (birim: string, yeniMiktar: number) =>
    stok.stokDuzelt(vt, yonetici(), birim, { yeniMiktar, gorulenMiktar: 0, sebep: "sayim" });
  return { vt, genel, gorselEkle, stokYaz };
};

describe("sepetin vitrin verisi", () => {
  it("varyantlı ürünün seçimi, birleşimin görseli, fiyatı ve yazılı tutarlar", async () => {
    const h = await hazirla();
    const urun = await urunler.urunEkle(h.vt, yonetici(), {
      ad: "Deneme Sweatshirt",
      vergiSinifi: h.genel,
      durum: "yayinda",
    });
    const griGorsel = await h.gorselEkle(urun, "Gri sweatshirt", 200);
    const laciGorsel = await h.gorselEkle(urun, "Lacivert sweatshirt", 20);
    await urunler.secenekEkle(h.vt, yonetici(), urun, {
      ad: "Renk",
      degerler: ["Gri", "Lacivert"],
    });
    await urunler.secenekEkle(h.vt, yonetici(), urun, { ad: "Beden", degerler: ["S", "M"] });
    const okunan = await urunler.urunuOku(h.vt, urun);
    const d = Object.fromEntries(
      (okunan?.secenekler ?? []).flatMap((s) => s.degerler.map((x) => [x.ad, x.kimlik] as const)),
    ) as Record<"Gri" | "Lacivert" | "S" | "M", string>;
    // Değerler ters sırada verilir: seçim yine ürünün seçenek sırasıyladır (Renk, Beden).
    const laciM = await urunler.birlesimEkle(h.vt, yonetici(), urun, {
      degerler: [d.M, d.Lacivert],
      stokKodu: "DS-L-M",
      gorsel: laciGorsel,
    });
    const griS = await urunler.birlesimEkle(h.vt, yonetici(), urun, {
      degerler: [d.Gri, d.S],
      stokKodu: "DS-G-S",
    });
    await fiyat.fiyatYaz(h.vt, yonetici(), laciM, {
      satisFiyati: 64_990,
      indirimliFiyat: 54_990,
    });
    await fiyat.fiyatYaz(h.vt, yonetici(), griS, { satisFiyati: 64_990 });
    await h.stokYaz(laciM, 6);
    await h.stokYaz(griS, 6);

    const veri = await sepetGorunumu(h.vt, site, [
      { birim: laciM, adet: 2, gorulenTutar: 59_990 },
      { birim: griS, adet: 1 },
      { birim: randomUUID(), adet: 1 },
    ]);
    const [laci, gri, yok] = veri.satirlar;
    expect(laci).toMatchObject({
      urun: {
        kimlik: urun,
        ad: "Deneme Sweatshirt",
        adres: kayitAdresleri.urun(okunan?.adresAdi ?? ""),
      },
      secim: [
        { secenek: "Renk", deger: "Lacivert" },
        { secenek: "Beden", deger: "M" },
      ],
      gorsel: { alternatifMetin: "Lacivert sweatshirt" },
      adet: 2,
      birimTutari: 54_990,
      yaziliTutar: bicim.para(109_980),
      uyarilar: [{ kod: "fiyat-degisti", eskiTutar: 59_990, eskiYazili: bicim.para(59_990) }],
    });
    // Birleşimin seçili görseli yoksa ana görsel (galerinin ilk görseli).
    expect(gri?.gorsel?.alternatifMetin).toBe("Gri sweatshirt");
    expect(griGorsel).toBeTypeOf("string");
    // Birim fiyatı fiyat gösterim işleviyle birebir aynıdır.
    const gosterim = fiyatGosterimServisi(site);
    const beklenen = gosterim.araliginiKur([
      (await gosterim.gosterilecekFiyatlar(h.vt, [laciM])).get(laciM) ?? fail(),
    ]);
    expect(laci?.fiyat).toEqual({
      tek: beklenen?.tek,
      yaziliAralik: beklenen?.yaziliAralik,
      enDusuk: {
        tutar: beklenen?.enDusuk.tutar,
        yazili: beklenen?.enDusuk.yazili,
        ekMetin: beklenen?.enDusuk.ekMetin,
      },
      enYuksek: { tutar: beklenen?.enYuksek.tutar },
    });
    expect(yok).toMatchObject({ satilabilir: false, secim: [], uyarilar: [{ kod: "kaldirildi" }] });
    expect(yok?.urun).toBeUndefined();
    expect(yok?.fiyat).toBeUndefined();

    // 2 × 549,90 + 649,90 = 1.749,70; vergi dahil %18: 266,90 (satır yuvarlaması).
    expect(veri).toMatchObject({
      adet: 3,
      gosterim: "vergi-dahil",
      kargo: "ucretsiz",
      yazili: {
        araToplam: bicim.para(174_970),
        toplam: bicim.para(174_970),
      },
      odemeyeGecilebilir: false,
    });
    expect(veri.vergiDokumu).toEqual([
      { ad: "Deneme vergisi", oran: bicim.yuzde(18), yazili: expect.any(String) },
    ]);
    // JSON'a dönüşünce aynı kalır: tarih taşımaz.
    expect(JSON.parse(JSON.stringify(veri))).toEqual(veri);
  });
});

function fail(): never {
  throw new Error("Fiyat yok.");
}
