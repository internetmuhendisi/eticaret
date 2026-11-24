// Panelin bölüm formunun seçenekleri gerçek veritabanıyla (kart 0142): yalnız silinmemiş kayıtlar, ada göre;
// menüler koduyla; görsellerde yalnız bütün boyutları hazır, kendisi boyut olmayan ve silinmemiş görseller, en
// yeni önce; iki site ayrı.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { gorselBoyutAdlari } from "../../../kayitlar/gorsel.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { dosyaBoyutlari, dosyalar } from "../../dosya/model.ts";
import { dosyaSil, gorselKaydet } from "../../dosya/servis.ts";
import { etiketServisi } from "../../etiket/servis.ts";
import { icerikServisi } from "../../icerik/servis.ts";
import { kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { menuEkle, menuSil } from "../../menu/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { duzenSecenekleri } from "../secenekler.ts";

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const urunler = urunServisi(() => "Europe/Istanbul");

const temizlenecekler: (() => Promise<void> | void)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("duzen-secenek");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const gorselAc = async (vt: Veritabani, genislik = 200) => {
  const klasor = mkdtempSync(join(tmpdir(), "duzen-secenek-"));
  temizlenecekler.push(() => rmSync(klasor, { recursive: true, force: true }));
  const icerik = await sharp({
    create: { width: genislik, height: 100, channels: 3, background: { r: 40, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
  const sonuc = await gorselKaydet(vt, icerik, klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};

describe("bölüm formunun seçenekleri", () => {
  it("yalnız silinmemiş kategori, marka, etiket, ürün ve menü gelir, ada göre sıralı", async () => {
    const vt = await siteAc();
    const giyim = await kategoriEkle(vt, yonetici(), { ad: "giyim" });
    const ayakkabi = await kategoriEkle(vt, yonetici(), { ad: "Ayakkabı" });
    const silinenKategori = await kategoriEkle(vt, yonetici(), { ad: "Eski" });
    await kategoriSil(vt, yonetici(), silinenKategori);
    const zeta = await markaServisi.ekle(vt, yonetici(), { ad: "Zeta" });
    const alfa = await markaServisi.ekle(vt, yonetici(), { ad: "alfa" });
    await markaServisi.sil(vt, yonetici(), await markaServisi.ekle(vt, yonetici(), { ad: "Beta" }));
    const etiket = await etiketServisi.ekle(vt, yonetici(), { ad: "Yeni" });
    await etiketServisi.sil(
      vt,
      yonetici(),
      await etiketServisi.ekle(vt, yonetici(), { ad: "Eski" }),
    );
    const kupa = await urunler.urunEkle(vt, yonetici(), { ad: "Kupa", vergiSinifi: null });
    const taslak = await urunler.urunEkle(vt, yonetici(), { ad: "Bardak", vergiSinifi: null });
    const silinen = await urunler.urunEkle(vt, yonetici(), { ad: "Tabak", vergiSinifi: null });
    await urunler.urunSil(vt, yonetici(), silinen);
    await menuEkle(vt, yonetici(), { kod: "ust", ad: "Üst menü", tur: "elle" });
    await menuEkle(vt, yonetici(), { kod: "alt", ad: "Alt bilgi", tur: "elle" });
    await menuSil(
      vt,
      yonetici(),
      await menuEkle(vt, yonetici(), { kod: "eski", ad: "Eski", tur: "elle" }),
    );

    const secenekler = await duzenSecenekleri(vt);
    // Kategoriler ağaç sırasında ve üstlerinin adıyla: aynı adlı iki alt kategori ayırt edilir.
    const kadin = await kategoriEkle(vt, yonetici(), { ad: "Kadın", ust: giyim });
    const kadinTisort = await kategoriEkle(vt, yonetici(), { ad: "Tişört", ust: kadin });
    const giyimTisort = await kategoriEkle(vt, yonetici(), { ad: "Tişört", ust: giyim });
    const { kategoriler } = await duzenSecenekleri(vt);
    const ad = (kimlik: string) => kategoriler.find((k) => k.kimlik === kimlik)?.ad;
    expect(ad(kadinTisort)).toBe("giyim › Kadın › Tişört");
    expect(ad(giyimTisort)).toBe("giyim › Tişört");
    const sira = kategoriler.map((k) => k.kimlik);
    expect(sira.indexOf(kadin)).toBeGreaterThan(sira.indexOf(giyim));
    expect(sira.indexOf(kadinTisort)).toBe(sira.indexOf(kadin) + 1);
    expect(sira).not.toContain(silinenKategori);
    expect(sira).toContain(ayakkabi);
    expect(secenekler.markalar).toEqual([
      { kimlik: alfa, ad: "alfa" },
      { kimlik: zeta, ad: "Zeta" },
    ]);
    expect(secenekler.etiketler).toEqual([{ kimlik: etiket, ad: "Yeni" }]);
    // Taslak ürün de seçilebilir: vitrinde görünmeyen ürünü bölüm zaten göstermez.
    expect(secenekler.urunler).toEqual([
      { kimlik: taslak, ad: "Bardak" },
      { kimlik: kupa, ad: "Kupa" },
    ]);
    expect(secenekler.menuler).toEqual([
      { kimlik: "alt", ad: "Alt bilgi" },
      { kimlik: "ust", ad: "Üst menü" },
    ]);
  });

  it("blog kategorileri adres adlarıyla, kendi sıralarıyla; silinmiş gelmez (kart 0272)", async () => {
    const vt = await siteAc();
    const blog = icerikServisi(() => "Europe/Istanbul");
    const rehber = await blog.kategoriEkle(vt, yonetici(), { ad: "Rehber" });
    const bakim = await blog.kategoriEkle(vt, yonetici(), { ad: "Bakım" });
    const silinen = await blog.kategoriEkle(vt, yonetici(), { ad: "Eski" });
    await blog.kategoriSil(vt, yonetici(), silinen.kimlik);
    await blog.kategorileriSirala(vt, yonetici(), [bakim.kimlik, rehber.kimlik]);
    expect((await duzenSecenekleri(vt)).blogKategorileri).toEqual([
      { kimlik: "bakim", ad: "Bakım" },
      { kimlik: "rehber", ad: "Rehber" },
    ]);
  });

  it("görsellerde yalnız bütün boyutları hazır ve silinmemiş görseller, en yeni önce; boyut dosyaları gelmez", async () => {
    const vt = await siteAc();
    const eski = await gorselAc(vt, 300);
    const yeni = await gorselAc(vt, 400);
    const silinen = await gorselAc(vt);
    await dosyaSil(vt, silinen);
    // Bir boyutu silinmiş görsel hazır değildir.
    const eksik = await gorselAc(vt);
    const [boyut] = await vt
      .select({ dosya: dosyaBoyutlari.dosya_kimligi })
      .from(dosyaBoyutlari)
      .where(eq(dosyaBoyutlari.kaynak_kimligi, eksik));
    if (boyut === undefined) throw new Error("boyut yok");
    await vt
      .update(dosyalar)
      .set({ silinme_zamani: sql`now()` })
      .where(eq(dosyalar.kimlik, boyut.dosya));
    // Aynı anda yazılmış iki görselin sırası kimlikle bellidir; zamanlar elle ayrılır.
    await vt.execute(
      sql`update dosyalar set olusturma_zamani = now() - interval '1 hour' where kimlik = ${eski}`,
    );

    const { gorseller } = await duzenSecenekleri(vt);
    expect(gorseller.map((gorsel) => gorsel.kimlik)).toEqual([yeni, eski]);
    expect(gorseller[0]).toEqual({ kimlik: yeni, genislik: 400, yukseklik: 100 });
    const boyutlar = await vt.select({ dosya: dosyaBoyutlari.dosya_kimligi }).from(dosyaBoyutlari);
    expect(boyutlar.length).toBe(gorselBoyutAdlari.length * 4);
  });

  it("iki site birbirinin kayıtlarını görmez", async () => {
    const vt = await siteAc();
    const baska = await siteAc();
    await kategoriEkle(baska, yonetici(), { ad: "Başka" });
    await gorselAc(baska);
    const secenekler = await duzenSecenekleri(vt);
    expect(secenekler.kategoriler).toEqual([]);
    expect(secenekler.gorseller).toEqual([]);
  });
});
