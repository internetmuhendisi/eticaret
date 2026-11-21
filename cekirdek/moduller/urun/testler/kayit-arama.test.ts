// Panelde kayıtları arayarak seçmek gerçek veritabanıyla (kart 0143, karar 0116): Türkçe harfsiz ve büyük küçük harf
// ayrımsız arama, adın ortasında geçen metin, joker olmayan % ve _, silinmiş kaydın gelmemesi, taslak ürünün
// gelmesi, kategorilerin üst adlarıyla yolu ve yolda arama, ada göre sıra ve sayfalar, iki site.
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { etiketServisi } from "../../etiket/servis.ts";
import { kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { kayitAra, kayitAramaSinirlari } from "../kayit-arama.ts";
import { urunServisi } from "../servis.ts";

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const urunler = urunServisi(() => "Europe/Istanbul");

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("kayit-arama");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const adlar = (sonuc: { kayitlar: { ad: string }[] }) => sonuc.kayitlar.map((kayit) => kayit.ad);

describe("kayıt arama", () => {
  it("ürünler Türkçe harfsiz, büyük harfle ve adın ortasından bulunur; silinmiş gelmez, taslak gelir", async () => {
    const vt = await siteAc();
    await urunler.urunEkle(vt, yonetici(), { ad: "Yazlık Gömlek", vergiSinifi: null });
    await urunler.urunEkle(vt, yonetici(), {
      ad: "Şık Ceket",
      vergiSinifi: null,
      durum: "yayinda",
    });
    const silinen = await urunler.urunEkle(vt, yonetici(), {
      ad: "Eski Gömlek",
      vergiSinifi: null,
    });
    await urunler.urunSil(vt, yonetici(), silinen);
    expect(adlar(await kayitAra(vt, "urun", "gomlek"))).toEqual(["Yazlık Gömlek"]);
    expect(adlar(await kayitAra(vt, "urun", "SIK"))).toEqual(["Şık Ceket"]);
    expect(adlar(await kayitAra(vt, "urun", "lık gö"))).toEqual(["Yazlık Gömlek"]);
    expect(adlar(await kayitAra(vt, "urun", ""))).toEqual(["Yazlık Gömlek", "Şık Ceket"]);
    // % ve _ joker değildir.
    expect(adlar(await kayitAra(vt, "urun", "%"))).toEqual([]);
    expect(adlar(await kayitAra(vt, "urun", "_"))).toEqual([]);
  });

  it("markalar aranır, ada göre sıralıdır, sayfa sayfa gelir", async () => {
    const vt = await siteAc();
    const toplam = kayitAramaSinirlari.sayfa + 3;
    for (let sira = 0; sira < toplam; sira += 1) {
      await markaServisi.ekle(vt, yonetici(), { ad: `Marka ${String(sira).padStart(2, "0")}` });
    }
    const ilk = await kayitAra(vt, "marka", "marka");
    expect(ilk.kayitlar).toHaveLength(kayitAramaSinirlari.sayfa);
    expect(ilk.dahaVar).toBe(true);
    expect(ilk.kayitlar[0]?.ad).toBe("Marka 00");
    const ikinci = await kayitAra(vt, "marka", "marka", 1);
    expect(adlar(ikinci)).toEqual(["Marka 20", "Marka 21", "Marka 22"]);
    expect(ikinci.dahaVar).toBe(false);
  });

  it("etiketler aranır (kart 0263); silinmiş gelmez", async () => {
    const vt = await siteAc();
    await etiketServisi.ekle(vt, yonetici(), { ad: "Yeni Sezon" });
    const silinen = await etiketServisi.ekle(vt, yonetici(), { ad: "Eski Sezon" });
    await etiketServisi.sil(vt, yonetici(), silinen);
    expect(adlar(await kayitAra(vt, "etiket", "SEZON"))).toEqual(["Yeni Sezon"]);
    // Etiket araması marka ya da ürün getirmez.
    await markaServisi.ekle(vt, yonetici(), { ad: "Sezon Marka" });
    expect(adlar(await kayitAra(vt, "etiket", "sezon"))).toEqual(["Yeni Sezon"]);
  });

  it("kategoriler üstlerinin adıyla gelir ve yolda aranır; silinmiş gelmez", async () => {
    const vt = await siteAc();
    const giyim = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    const kadin = await kategoriEkle(vt, yonetici(), { ad: "Kadın", ust: giyim });
    await kategoriEkle(vt, yonetici(), { ad: "Tişört", ust: kadin });
    await kategoriEkle(vt, yonetici(), { ad: "Tişört", ust: giyim });
    await kategoriSil(vt, yonetici(), await kategoriEkle(vt, yonetici(), { ad: "Eski Tişört" }));
    expect(adlar(await kayitAra(vt, "kategori", "tisort"))).toEqual([
      "Giyim › Kadın › Tişört",
      "Giyim › Tişört",
    ]);
    // Yol ayracı aranmaz.
    expect(adlar(await kayitAra(vt, "kategori", "kadin tisort"))).toEqual([
      "Giyim › Kadın › Tişört",
    ]);
    expect(adlar(await kayitAra(vt, "kategori", "kadin"))).toEqual([
      "Giyim › Kadın",
      "Giyim › Kadın › Tişört",
    ]);
  });

  it("iki site birbirinin kayıtlarını bulmaz", async () => {
    const vt = await siteAc();
    const baska = await siteAc();
    await markaServisi.ekle(baska, yonetici(), { ad: "Başka Marka" });
    expect(adlar(await kayitAra(vt, "marka", ""))).toEqual([]);
  });
});
