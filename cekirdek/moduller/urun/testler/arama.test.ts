// Ürün araması gerçek veritabanıyla (kart 0137):
// - Arama ürün adında, markada, kategoride ve stok kodunda arar; silinmiş marka, kategori ve birim sayılmaz.
// - Her Türkçe harf için Türkçe harfsiz ve büyük harfli yazılış aynı ürünü bulur.
// - Birden çok sözcüğün her biri bir alanda geçmelidir; % ve _ joker değildir.
// - Görünmeyen ürün (taslak, gizli, arşiv, zamanı gelmemiş, silinmiş) aramada gelmez.
// - "En uygun": stok kodunun tamamı > adın tamamı > ad başlar > ad içerir > marka > kategori > stok kodu içerir;
//   eşit puanda en yeni önce.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { aramaSinirlari } from "../../../kayitlar/liste.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { filtreliUrunListesi } from "../../../vitrin/urun-listesi/veri.ts";
import { kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { aramaKosulu, aramaSorgusu, uygunlukPuani } from "../arama.ts";
import type { UrunGirdisi } from "../semalar.ts";
import { urunServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const an = new Date("2030-01-15T12:00:00Z");

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async () => {
  const deneme = await denemeSitesiAc("arama");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const ac = (ad: string, ek: Partial<UrunGirdisi> = {}) =>
    urunler.urunEkle(vt, yonetici(), { ad, vergiSinifi: null, durum: "yayinda", ...ek });
  const ara = async (metin: string, siralama: "en-uygun" | "en-yeni" = "en-yeni") => {
    const sorgu = aramaSorgusu(metin);
    if (sorgu === undefined) throw new Error("Sorgu boş.");
    return (
      await filtreliUrunListesi(vt, site, {
        kapsam: aramaKosulu(sorgu),
        uygunluk: uygunlukPuani(sorgu),
        siralama,
        sayfa: 1,
        boyut: 100,
        tukenenUrun: "goster",
        an,
      })
    ).urunler;
  };
  return { vt, ac, ara };
};

describe("arama sorgusu", () => {
  it("boş ve yalnız boşluk sorgu değildir; sözcükler tekrarsız ve sınırlı", () => {
    expect(aramaSorgusu("")).toBeUndefined();
    expect(aramaSorgusu("   ")).toBeUndefined();
    expect(aramaSorgusu("  Keten  GÖMLEK keten ")).toEqual({
      tamami: "keten gomlek keten",
      sozcukler: ["keten", "gomlek"],
    });
    const uzun = Array.from({ length: 20 }, (_, i) => `s${i}`).join(" ");
    expect(aramaSorgusu(uzun)?.sozcukler).toHaveLength(aramaSinirlari.sozcuk);
    expect(aramaSorgusu("a".repeat(500))?.tamami).toHaveLength(aramaSinirlari.metin);
  });
});

describe("alanlar", () => {
  it("ad, marka, kategori ve stok kodu; silinmiş marka, kategori ve birim sayılmaz", async () => {
    const h = await hazirla();
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Deniz Ayakkabı" });
    const kategori = await kategoriEkle(h.vt, yonetici(), { ad: "Bahçe Mobilyası" });
    const adli = await h.ac("Yürüyüş Botu");
    const markali = await h.ac("Spor Model", { marka });
    const kategorili = await h.ac("Salıncak", { kategoriler: [kategori] });
    const kodlu = await h.ac("Kodlu", { stokKodu: "ORN-XYZ-42" });
    expect(await h.ara("yuruyus")).toEqual([adli]);
    expect(await h.ara("ayakkabi")).toEqual([markali]);
    expect(await h.ara("mobilya")).toEqual([kategorili]);
    expect(await h.ara("xyz-42")).toEqual([kodlu]);
    // Servisle silmek bağlantıyı da kaldırır; aramanın kendi süzgecini ölçmek için yalnız silinmiş işareti yazılır.
    await h.vt.execute(sql`update markalar set silinme_zamani = now() where kimlik = ${marka}`);
    await h.vt.execute(
      sql`update kategoriler set silinme_zamani = now() where kimlik = ${kategori}`,
    );
    await h.vt.execute(
      sql`update urun_birimleri set silinme_zamani = now() where urun_kimligi = ${kodlu}`,
    );
    expect(await h.ara("ayakkabi")).toEqual([]);
    expect(await h.ara("mobilya")).toEqual([]);
    expect(await h.ara("xyz-42")).toEqual([]);
    // Servisle silinenler de.
    const marka2 = await markaServisi.ekle(h.vt, yonetici(), { ad: "Rüzgar Giyim" });
    const kategori2 = await kategoriEkle(h.vt, yonetici(), { ad: "Kamp Malzemesi" });
    await h.ac("Mont", { marka: marka2, kategoriler: [kategori2] });
    expect(await h.ara("ruzgar kamp")).toHaveLength(1);
    await markaServisi.sil(h.vt, yonetici(), marka2);
    await kategoriSil(h.vt, yonetici(), kategori2);
    expect(await h.ara("ruzgar")).toEqual([]);
    expect(await h.ara("kamp")).toEqual([]);
  });

  it("her sözcük bir alanda geçer; % ve _ joker değildir", async () => {
    const h = await hazirla();
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Keten Evi" });
    const gomlek = await h.ac("Yazlık Gömlek", { marka });
    await h.ac("Yazlık Şort");
    expect(await h.ara("keten gomlek")).toEqual([gomlek]);
    expect((await h.ara("yazlik")).toSorted()).toHaveLength(2);
    expect(await h.ara("keten sort")).toEqual([]);
    expect(await h.ara("%")).toEqual([]);
    expect(await h.ara("_")).toEqual([]);
    const isaretli = await h.ac("Yüzde %50 İndirim_li");
    expect(await h.ara("%50")).toEqual([isaretli]);
    expect(await h.ara("indirim_li")).toEqual([isaretli]);
  });
});

describe("harfler", () => {
  // Her Türkçe harf (ve şapkalı a, i, u) bir ürün adında; Türkçe harfsiz, büyük harfli ve kendi yazılışıyla aranır.
  const adlar: [string, string, string][] = [
    ["Işıltılı Lamba", "isiltili", "IŞILTILI"],
    ["İğne Seti", "igne", "İĞNE"],
    ["Şömine Örtüsü", "somine", "ŞÖMİNE"],
    ["Ağaç Oyuncak", "agac", "AĞAÇ"],
    ["Üçgen Raf", "ucgen", "ÜÇGEN"],
    ["Kâğıt Defter", "kagit", "KÂĞIT"],
    ["Mîmar Cetveli", "mimar", "MÎMAR"],
    ["Rûhsat Kabı", "ruhsat", "RÛHSAT"],
  ];

  it("Türkçe harfsiz ve büyük harfli yazılış aynı ürünü bulur", async () => {
    const h = await hazirla();
    const kimlikler = new Map<string, string>();
    for (const [ad] of adlar) kimlikler.set(ad, await h.ac(ad));
    for (const [ad, sade, buyuk] of adlar) {
      for (const yazilis of [sade, buyuk, sade.toUpperCase(), ad.split(" ")[0] ?? ""]) {
        expect(await h.ara(yazilis), `${ad}: ${yazilis}`).toEqual([kimlikler.get(ad)]);
      }
    }
  });
});

describe("görünürlük", () => {
  it("taslak, gizli, arşiv, zamanı gelmemiş ve silinmiş ürün gelmez; zamanı gelince gelir", async () => {
    const h = await hazirla();
    const gorunen = await h.ac("Görünen Vazo");
    for (const durum of ["taslak", "gizli", "arsiv"] as const)
      await h.ac("Görünen Vazo", { durum });
    await h.ac("Görünen Vazo", { durum: "zamanlanmis", yayinZamani: "2030-01-15T16:00" });
    await urunler.urunSil(h.vt, yonetici(), await h.ac("Görünen Vazo"));
    expect(await h.ara("vazo")).toEqual([gorunen]);
  });
});

describe("en uygun", () => {
  it("stok kodunun tamamı, adın tamamı, ad başlar, ad içerir, marka, kategori, stok kodu içerir; eşitte en yeni", async () => {
    const h = await hazirla();
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Kupa Evi" });
    const kategori = await kategoriEkle(h.vt, yonetici(), { ad: "Kupalar" });
    // Her basamak, bir alt basamaktaki daha yeni üründen önce gelmelidir: eklenme sırası puanı bozmaz.
    const adTamami = await h.ac("KUPA");
    const adBaslarVeStokKodu = await h.ac("Kupa Bardak", { stokKodu: "KUPA-1" });
    const adBaslarEski = await h.ac("Kupa Seti");
    const adBaslarYeni = await h.ac("Kupa Takımı");
    const markada = await h.ac("Fincan", { marka });
    const kategoride = await h.ac("Fincan Takımı", { kategoriler: [kategori] });
    const stokKoduIcerir = await h.ac("Fincan Seti", { stokKodu: "KUPA-9" });
    const adIcerir = await h.ac("Taş Kupa");
    const stokKoduTamami = await h.ac("Bardak", { stokKodu: "kupa" });
    expect(await h.ara("kupa", "en-uygun")).toEqual([
      stokKoduTamami,
      adTamami,
      adBaslarVeStokKodu,
      adBaslarYeni,
      adBaslarEski,
      adIcerir,
      markada,
      kategoride,
      stokKoduIcerir,
    ]);
    // Öteki sıralamalar puanı kullanmaz.
    expect((await h.ara("kupa", "en-yeni"))[0]).toBe(stokKoduTamami);
    expect((await h.ara("kupa", "en-yeni")).at(-1)).toBe(adTamami);
  });
});
