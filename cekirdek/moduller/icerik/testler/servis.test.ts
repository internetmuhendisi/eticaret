// Blog servisi gerçek veritabanı ve klasörle (kart 0272, karar 0176):
// - Yazı: yalnız başlıkla taslak olarak eklenir, adres adı başlıktan üretilir (sayı alır), verilen aynı adres reddedilir;
//   değişiklik kaydına başlık, adres, durum, zaman, kategori ve kapak girer, içerik ve özet girmez; aynı değer kayda
//   girmez.
// - Yayın zamanı: yayına alınan yazı veritabanının anını alır; taslağa alınıp yeniden yayınlanan yazı ilk yayın anını
//   korur; zamanlanmış yazının zamanı zorunlu, sitenin saat diliminde çevrilir, yaşanmayan saat reddedilir; zamanından
//   bir milisaniye önce vitrinde yok, zamanında var.
// - Çakışma: ekranın gördüğü değişme anı eskiyse hiçbir şey yazılmaz.
// - Kapak: hazır olmayan (olmayan, silinmiş) görsel reddedilir; kapak metni zorunlu.
// - Kategori: silinmiş kategoriye bağlanılmaz; ad harf ayrımsız tekil; silinince yazıları kategorisiz kalır ve kaydına
//   girer; sıralama yalnız tam kümeyle, sırası değişen kayda girer; sınır.
// - Silme ve adres: yazı silinince vitrinde yok, adı değişince eski adres yenisine yönlenir, silinen yazının adresi
//   yönlenmez; taslak yazının adresi bulunamaz.
// - Vitrin: yazı sayfasının içeriği temizlenir (betik, olay özniteliği, görsel, javascript: bağlantı düşer); blog
//   kapalıyken liste ve yazı verisi yoktur; liste yalnız görünenler, en yeni önce, kategori süzgeci ve sayfa; kategoriler yalnız yazısı görünenler.
// - Panel listesi: görünen durum (zamanı gelmiş zamanlanmış yayındadır), sayılar, Türkçe harfsiz ve jokersiz arama,
//   kategori süzgeci, sıralama; silinmiş yazı yok.
// - Veritabanının durum denetimi kayıtla aynı; iki site birbirinin yazısını görmez.
// - Başlangıç blogu kurulur, ikinci çağrı yazmaz; vitrin bağlamı blog kapalıyken boş, açıkken bölümün kaynağıyla dolu.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import { blogYaziDurumlari } from "../../../kayitlar/blog.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { vitrinBaglaminiOku } from "../../../vitrin/baglam-oku.ts";
import { blogListesiVerisi, blogYazisiVerisi } from "../../../vitrin/blog/veri.ts";
import { bolumKutuphanesi } from "../../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyalar } from "../../dosya/model.ts";
import { dosyaSil, gorselKaydet } from "../../dosya/servis.ts";
import { vitrindeKullaniliyorMu } from "../../duzen/gorsel.ts";
import { kayitAdresiniCoz } from "../../gorunurluk/adres.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { blogBaslangiciniKur } from "../baslangic.ts";
import { blogYazilari } from "../model.ts";
import { blogPanelListesi } from "../panel-listesi.ts";
import { blogKategorileriniOku, blogYazisiOku, icerikServisi } from "../servis.ts";
import { vitrinBlogKategorileri, vitrinBlogYazilari, vitrinBlogYazisi } from "../vitrin.ts";

vi.setConfig({ testTimeout: 120_000 });

const ornekSite = siteKlasorunuOku(
  join(import.meta.dirname, "..", "..", "..", "ayar-semasi", "testler", "ornek-siteler", "gecerli"),
);
const site: Site = {
  ...ornekSite,
  ayarlar: { ...ornekSite.ayarlar, saatDilimi: "Europe/Istanbul" },
  duzenBaslangici: {
    "ust-kisim": [],
    "ana-sayfa": [
      { tur: "blog-yazilari", gorunum: "izgara", gizli: false, degerler: { baslik: "Blogdan" } },
    ],
    "alt-kisim": [],
  },
  blogBaslangici: { kategoriler: [], yazilar: [] },
};

const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
beforeAll(() => {
  ortak[siteAnahtari] = site;
});
afterAll(() => {
  delete ortak[siteAnahtari];
});

const servis = icerikServisi(() => site.ayarlar.saatDilimi);
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async (ad = "blog") => {
  const deneme = await denemeSitesiAc(ad);
  const klasor = mkdtempSync(join(tmpdir(), "blog-"));
  temizlenecekler.push(deneme.sil, () => rmSync(klasor, { recursive: true, force: true }));
  const vt = deneme.vt;
  const gorsel = async () => {
    const icerik = await sharp({
      create: { width: 640, height: 400, channels: 3, background: { r: 20, g: 120, b: 200 } },
    })
      .png()
      .toBuffer();
    const sonuc = await gorselKaydet(vt, icerik, klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    return sonuc.dosya.kimlik;
  };
  const kayitlar = (kimlik: string) =>
    vt
      .select({
        islem: degisiklikKayitlari.islem,
        eski: degisiklikKayitlari.eski_deger,
        yeni: degisiklikKayitlari.yeni_deger,
      })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
      .orderBy(degisiklikKayitlari.zaman);
  return { vt, klasor, gorsel, kayitlar };
};

const hataKodu = async (is: Promise<unknown>): Promise<string[]> => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) {
      return [
        hata.kod,
        ...((hata.ayrinti ?? []) as { alan: string; kod: string }[]).map(
          (s) => `${s.alan}:${s.kod}`,
        ),
      ];
    }
    throw hata;
  }
  throw new Error("Hata beklenirdi.");
};

const veritabaniAni = async (vt: Veritabani): Promise<Date> => {
  const sonuc = await vt.execute(sql`select now() as an`);
  return new Date(String((sonuc.rows[0] as { an: string }).an));
};

describe("blog yazısı", () => {
  it("yalnız başlıkla taslak olarak eklenir; adres başlıktan üretilir, verilen aynı adres reddedilir", async () => {
    const h = await hazirla();
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), { baslik: "Kışa Hazırlık" });
    const yazi = await blogYazisiOku(h.vt, kimlik);
    expect(yazi).toMatchObject({ adresAdi: "kisa-hazirlik", durum: "taslak", yayinZamani: null });
    const ikinci = await servis.yaziEkle(h.vt, yonetici(), { baslik: "Kışa hazırlık" });
    expect((await blogYazisiOku(h.vt, ikinci.kimlik))?.adresAdi).toBe("kisa-hazirlik-2");
    expect(
      await hataKodu(
        servis.yaziEkle(h.vt, yonetici(), { baslik: "Başka", adresAdi: "kisa-hazirlik" }),
      ),
    ).toEqual(["cakisma", "adresAdi:adres-adi-tekrar"]);
    expect(await hataKodu(servis.yaziEkle(h.vt, yonetici(), { baslik: "  " }))).toContain(
      "dogrulama",
    );
  });

  it("değişiklik kaydına içerik ve özet girmez; aynı değer kayda girmez", async () => {
    const h = await hazirla();
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Termos",
      ozet: "Kısa özet",
      icerik: "<p>Uzun içerik</p>",
    });
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { icerik: "<p>Yeni içerik</p>" });
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { baslik: "Termos" });
    const kayitlar = await h.kayitlar(kimlik);
    expect(kayitlar.map((k) => k.islem)).toEqual(["blog-yazisi.eklendi", "blog-yazisi.degisti"]);
    expect(JSON.stringify(kayitlar)).not.toContain("içerik");
    expect(JSON.stringify(kayitlar)).not.toContain("özet");
    expect(kayitlar[0]?.yeni).toMatchObject({ baslik: "Termos", durum: "taslak" });
  });

  it("yayına alınan yazı veritabanının anını alır; taslağa alınıp yeniden yayınlanınca ilk anı korur", async () => {
    const h = await hazirla();
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), { baslik: "Yazı" });
    const once = await veritabaniAni(h.vt);
    const yayinda = await servis.yaziDegistir(h.vt, yonetici(), kimlik, { durum: "yayinda" });
    const ilk = yayinda.yayinZamani?.getTime() ?? 0;
    expect(ilk).toBeGreaterThanOrEqual(once.getTime() - 1);
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { durum: "taslak" });
    expect(await vitrinBlogYazisi(h.vt, kimlik)).toBeNull();
    const yeniden = await servis.yaziDegistir(h.vt, yonetici(), kimlik, { durum: "yayinda" });
    expect(yeniden.yayinZamani?.getTime()).toBe(ilk);
  });

  it("zamanlanmış yazının zamanı zorunlu ve sitenin saat diliminde; zamanından önce vitrinde yok", async () => {
    const h = await hazirla();
    expect(
      await hataKodu(servis.yaziEkle(h.vt, yonetici(), { baslik: "Z", durum: "zamanlanmis" })),
    ).toEqual(["dogrulama", "yayinZamani:yayin-zamani-gerekli"]);
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Yılbaşı",
      durum: "zamanlanmis",
      yayinZamani: "2030-12-01T09:00",
    });
    const an = new Date("2030-12-01T06:00:00.000Z");
    expect((await blogYazisiOku(h.vt, kimlik))?.yayinZamani?.toISOString()).toBe(an.toISOString());
    expect(await vitrinBlogYazisi(h.vt, kimlik, new Date(an.getTime() - 1))).toBeNull();
    expect(await vitrinBlogYazisi(h.vt, kimlik, an)).not.toBeNull();
    // Zamanı gelmemiş yazı yayına alınınca şimdiki anı alır (gelecekteki zaman ilk yayın değildir).
    const once = await veritabaniAni(h.vt);
    const yayinda = await servis.yaziDegistir(h.vt, yonetici(), kimlik, { durum: "yayinda" });
    expect(yayinda.yayinZamani?.getTime()).toBeLessThan(an.getTime());
    expect(yayinda.yayinZamani?.getTime()).toBeGreaterThanOrEqual(once.getTime() - 1);
  });

  it("yaşanmayan yerel saat reddedilir", async () => {
    const h = await hazirla();
    const yerel = icerikServisi(() => "America/New_York");
    expect(
      await hataKodu(
        yerel.yaziEkle(h.vt, yonetici(), {
          baslik: "Yaz saati",
          durum: "zamanlanmis",
          yayinZamani: "2030-03-10T02:30",
        }),
      ),
    ).toEqual(["dogrulama", "yayinZamani:yayin-zamani-gecersiz"]);
  });

  it("ekranın gördüğü değişme anı eskiyse hiçbir şey yazılmaz", async () => {
    const h = await hazirla();
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), { baslik: "Eski" });
    const gorulen = (await blogYazisiOku(h.vt, kimlik))?.guncellenmeZamani ?? new Date();
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { baslik: "Başkası" }, gorulen);
    expect(
      await hataKodu(servis.yaziDegistir(h.vt, yonetici(), kimlik, { baslik: "Ben" }, gorulen)),
    ).toEqual(["cakisma", "yazi:yazi-degisti"]);
    expect((await blogYazisiOku(h.vt, kimlik))?.baslik).toBe("Başkası");
  });

  it("kapak hazır görsel olmalı; kapak metni zorunlu; vitrin görseli ucu yalnız vitrindeki yazının kapağını verir", async () => {
    const h = await hazirla();
    const dosya = await h.gorsel();
    expect(
      await hataKodu(
        servis.yaziEkle(h.vt, yonetici(), {
          baslik: "Kapaksız",
          kapak: { dosya: randomUUID(), metin: "Görsel" },
        }),
      ),
    ).toEqual(["dogrulama", "kapak.dosya:gorsel-gecersiz"]);
    expect(
      await hataKodu(
        servis.yaziEkle(h.vt, yonetici(), { baslik: "Metinsiz", kapak: { dosya, metin: " " } }),
      ),
    ).toContain("dogrulama");
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Kapaklı",
      kapak: { dosya: dosya.toUpperCase(), metin: "Mavi görsel" },
    });
    expect((await blogYazisiOku(h.vt, kimlik))?.kapak).toEqual({ dosya, metin: "Mavi görsel" });
    // Taslağın kapağı vitrinde açılmaz; yayına alınınca açılır; blog kapalıyken açılmaz.
    expect(await vitrindeKullaniliyorMu(h.vt, site, dosya)).toBe(false);
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { durum: "yayinda" });
    await siteninServisi(site).degistir(
      h.vt,
      yonetici(),
      { blogAcik: true },
      { kendiIslevi: true },
    );
    expect(await vitrindeKullaniliyorMu(h.vt, site, dosya)).toBe(true);
    await siteninServisi(site).degistir(
      h.vt,
      yonetici(),
      { blogAcik: false },
      { kendiIslevi: true },
    );
    expect(await vitrindeKullaniliyorMu(h.vt, site, dosya)).toBe(false);
    // Silinmiş görsel yeni yazıya bağlanmaz.
    const silinen = await h.gorsel();
    await dosyaSil(h.vt, silinen);
    expect(
      await hataKodu(
        servis.yaziEkle(h.vt, yonetici(), { baslik: "Y", kapak: { dosya: silinen, metin: "G" } }),
      ),
    ).toEqual(["dogrulama", "kapak.dosya:gorsel-gecersiz"]);
  });

  it("adı değişen yazının eski adresi yenisine yönlenir; silinen ve taslak yazının adresi bulunamaz", async () => {
    const h = await hazirla();
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Termos bakımı",
      durum: "yayinda",
    });
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { adresAdi: "termos-rehberi" });
    expect(await kayitAdresiniCoz(h.vt, "blog-yazisi", "termos-bakimi")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "termos-rehberi",
    });
    const cozum = await kayitAdresiniCoz(h.vt, "blog-yazisi", "termos-rehberi");
    expect(cozum.sonuc === "kayit" && cozum.kayit.ad).toBe("Termos bakımı");
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { durum: "taslak" });
    expect((await kayitAdresiniCoz(h.vt, "blog-yazisi", "termos-rehberi")).sonuc).toBe("yok");
    expect((await kayitAdresiniCoz(h.vt, "blog-yazisi", "termos-bakimi")).sonuc).toBe("yok");
    await servis.yaziDegistir(h.vt, yonetici(), kimlik, { durum: "yayinda" });
    await servis.yaziSil(h.vt, yonetici(), kimlik);
    expect(await vitrinBlogYazisi(h.vt, kimlik)).toBeNull();
    expect((await kayitAdresiniCoz(h.vt, "blog-yazisi", "termos-rehberi")).sonuc).toBe("yok");
    expect((await kayitAdresiniCoz(h.vt, "blog-yazisi", "termos-bakimi")).sonuc).toBe("yok");
    expect(await blogYazisiOku(h.vt, kimlik)).toBeNull();
    expect(await hataKodu(servis.yaziSil(h.vt, yonetici(), kimlik))).toEqual(["bulunamadi"]);
    // Silinen yazının adı serbest kalır.
    const yeni = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Yeni",
      adresAdi: "termos-rehberi",
    });
    expect((await blogYazisiOku(h.vt, yeni.kimlik))?.adresAdi).toBe("termos-rehberi");
  });
});

describe("blog kategorisi", () => {
  it("ad harf ayrımsız tekil; silinmiş kategoriye bağlanılmaz; silinince yazıları kategorisiz kalır", async () => {
    const h = await hazirla();
    const rehber = await servis.kategoriEkle(h.vt, yonetici(), { ad: "Rehber" });
    expect(await hataKodu(servis.kategoriEkle(h.vt, yonetici(), { ad: "REHBER" }))).toEqual([
      "cakisma",
      "ad:ad-tekrar",
    ]);
    const bakim = await servis.kategoriEkle(h.vt, yonetici(), { ad: "Bakım" });
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Yazı",
      kategori: rehber.kimlik,
    });
    await servis.kategoriSil(h.vt, yonetici(), rehber.kimlik);
    expect((await blogYazisiOku(h.vt, kimlik))?.kategori).toBeNull();
    const [kayit] = (await h.kayitlar(rehber.kimlik)).filter(
      (k) => k.islem === "blog-kategorisi.silindi",
    );
    expect(kayit?.eski).toMatchObject({ ad: "Rehber", yazilar: [kimlik] });
    expect(
      await hataKodu(servis.yaziDegistir(h.vt, yonetici(), kimlik, { kategori: rehber.kimlik })),
    ).toEqual(["dogrulama", "kategori:kategori-gecersiz"]);
    // Silinen kategorinin adı serbest kalır.
    await servis.kategoriEkle(h.vt, yonetici(), { ad: "Rehber" });
    expect((await blogKategorileriniOku(h.vt)).map((k) => k.ad)).toEqual(["Bakım", "Rehber"]);
    expect(bakim.kimlik).toBeDefined();
  });

  it("sıralama yalnız tam kümeyle; yalnız sırası değişen kayda girer", async () => {
    const h = await hazirla();
    const a = (await servis.kategoriEkle(h.vt, yonetici(), { ad: "A" })).kimlik;
    const b = (await servis.kategoriEkle(h.vt, yonetici(), { ad: "B" })).kimlik;
    const c = (await servis.kategoriEkle(h.vt, yonetici(), { ad: "C" })).kimlik;
    expect(await hataKodu(servis.kategorileriSirala(h.vt, yonetici(), [a, b]))).toEqual([
      "cakisma",
      "kimlikler:siralama-gecersiz",
    ]);
    expect(await hataKodu(servis.kategorileriSirala(h.vt, yonetici(), [a, a, b]))).toEqual([
      "cakisma",
      "kimlikler:siralama-gecersiz",
    ]);
    await servis.kategorileriSirala(h.vt, yonetici(), [a, c.toUpperCase(), b]);
    expect((await blogKategorileriniOku(h.vt)).map((k) => k.ad)).toEqual(["A", "C", "B"]);
    expect((await h.kayitlar(a)).filter((k) => k.islem === "blog-kategorisi.siralandi")).toEqual(
      [],
    );
    expect(
      (await h.kayitlar(c)).filter((k) => k.islem === "blog-kategorisi.siralandi"),
    ).toHaveLength(1);
  });
});

describe("vitrin ve panel listesi", () => {
  it("vitrinde yalnız görünen yazılar, en yeni önce, kategoriyle ve sayfayla", async () => {
    const h = await hazirla();
    const rehber = await servis.kategoriEkle(h.vt, yonetici(), { ad: "Rehber" });
    const bos = await servis.kategoriEkle(h.vt, yonetici(), { ad: "Boş" });
    const ekle = (baslik: string, girdi: Record<string, unknown>) =>
      servis.yaziEkle(h.vt, yonetici(), { baslik, ...girdi });
    const eski = await ekle("Eski", { durum: "yayinda" });
    await h.vt
      .update(blogYazilari)
      .set({ yayin_zamani: new Date("2026-01-01T00:00:00Z") })
      .where(eq(blogYazilari.kimlik, eski.kimlik));
    const yeni = await ekle("Yeni", { durum: "yayinda", kategori: rehber.kimlik });
    await ekle("Taslak", { kategori: rehber.kimlik });
    await ekle("Gelecek", { durum: "zamanlanmis", yayinZamani: "2099-01-01T00:00" });
    const silinen = await ekle("Silinen", { durum: "yayinda" });
    await servis.yaziSil(h.vt, yonetici(), silinen.kimlik);
    const hepsi = await vitrinBlogYazilari(h.vt, { sayfa: 1, boyut: 12 });
    expect(hepsi.yazilar.map((y) => y.baslik)).toEqual(["Yeni", "Eski"]);
    expect(hepsi.yazilar[0]?.kategori).toEqual({ ad: "Rehber", adresAdi: "rehber" });
    const kategoride = await vitrinBlogYazilari(h.vt, { kategori: "rehber", sayfa: 1, boyut: 12 });
    expect(kategoride.yazilar.map((y) => y.kimlik)).toEqual([yeni.kimlik]);
    const ikinciSayfa = await vitrinBlogYazilari(h.vt, { sayfa: 9, boyut: 1 });
    expect(ikinciSayfa).toMatchObject({ sayfa: 2, sayfaSayisi: 2, toplam: 2 });
    expect(ikinciSayfa.yazilar.map((y) => y.baslik)).toEqual(["Eski"]);
    expect(await vitrinBlogKategorileri(h.vt)).toEqual([{ ad: "Rehber", adresAdi: "rehber" }]);
    expect(bos.kimlik).toBeDefined();
  });

  it("yazı sayfasının içeriği temizlenir; blog kapalıyken liste ve yazı sayfası verisi yoktur", async () => {
    const h = await hazirla();
    const { kimlik } = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Temizlik",
      durum: "yayinda",
      icerik:
        '<p onclick="alert(1)">Metin <strong>kalın</strong></p><script>alert(2)</script><a href="javascript:alert(3)">bağ</a><img src="x" onerror="alert(4)">',
    });
    await siteninServisi(site).degistir(
      h.vt,
      yonetici(),
      { blogAcik: false },
      { kendiIslevi: true },
    );
    expect(await blogYazisiVerisi(h.vt, site, kimlik)).toBeNull();
    expect(await blogListesiVerisi(h.vt, site, { sayfa: 1 })).toBeNull();
    await siteninServisi(site).degistir(
      h.vt,
      yonetici(),
      { blogAcik: true },
      { kendiIslevi: true },
    );
    const yazi = await blogYazisiVerisi(h.vt, site, kimlik);
    expect(yazi?.icerik).toContain("<strong>kalın</strong>");
    for (const yasak of ["onclick", "<script", "alert", "javascript:", "<img", "onerror"]) {
      expect(yazi?.icerik).not.toContain(yasak);
    }
    expect(
      (await blogListesiVerisi(h.vt, site, { sayfa: 1 }))?.yazilar.map((y) => y.adres),
    ).toEqual(["/blog/temizlik"]);
  });

  it("panel: görünen durum, sayılar, Türkçe harfsiz ve jokersiz arama, kategori süzgeci, silinmiş yok", async () => {
    const h = await hazirla();
    const rehber = await servis.kategoriEkle(h.vt, yonetici(), { ad: "Rehber" });
    await servis.yaziEkle(h.vt, yonetici(), { baslik: "Kışlık %50 öneriler", durum: "yayinda" });
    await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Çay rehberi",
      kategori: rehber.kimlik,
    });
    const zamani = await servis.yaziEkle(h.vt, yonetici(), {
      baslik: "Zamanı gelen",
      durum: "zamanlanmis",
      yayinZamani: "2030-01-01T00:00",
    });
    const silinen = await servis.yaziEkle(h.vt, yonetici(), { baslik: "Silinen" });
    await servis.yaziSil(h.vt, yonetici(), silinen.kimlik);
    const liste = (girdi: Partial<Parameters<typeof blogPanelListesi>[1]>, an?: Date) =>
      blogPanelListesi(
        h.vt,
        { siralama: "baslik-artan", sayfa: 1, sayfaBoyu: 25, ...girdi },
        { dil: "tr-TR", ...(an === undefined ? {} : { an }) },
      );
    const simdi = await liste({});
    expect(simdi.satirlar.map((s) => s.baslik)).toEqual([
      "Çay rehberi",
      "Kışlık %50 öneriler",
      "Zamanı gelen",
    ]);
    expect(simdi.durumSayilari).toEqual({ taslak: 1, zamanlanmis: 1, yayinda: 1 });
    const sonra = await liste({ durum: "yayinda" }, new Date("2030-01-02T00:00:00Z"));
    expect(sonra.satirlar.map((s) => s.kimlik)).toContain(zamani.kimlik);
    expect(sonra.durumSayilari).toEqual({ taslak: 1, zamanlanmis: 0, yayinda: 2 });
    expect((await liste({ ara: "KISLIK" })).satirlar.map((s) => s.baslik)).toEqual([
      "Kışlık %50 öneriler",
    ]);
    expect((await liste({ ara: "cay" })).satirlar).toHaveLength(1);
    expect((await liste({ ara: "%" })).satirlar).toHaveLength(1);
    expect((await liste({ ara: "_" })).satirlar).toHaveLength(0);
    const kategoride = await liste({ kategori: [rehber.kimlik.toUpperCase(), "bozuk"] });
    expect(kategoride.satirlar.map((s) => s.baslik)).toEqual(["Çay rehberi"]);
    expect(kategoride.satirlar[0]?.kategori).toEqual({ kimlik: rehber.kimlik, ad: "Rehber" });
  });

  it("veritabanının durum denetimi kayıtla aynı; iki site birbirinin yazısını görmez", async () => {
    const a = await hazirla("blog-a");
    const b = await hazirla("blog-b");
    const sonuc = await a.vt.execute(
      sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'blog_yazilari_durum'`,
    );
    const tanim = String((sonuc.rows[0] as { tanim: string }).tanim);
    expect([...tanim.matchAll(/'([a-z-]+)'/g)].map((e) => e[1]).sort()).toEqual(
      [...blogYaziDurumlari].sort(),
    );
    await servis.yaziEkle(a.vt, yonetici(), { baslik: "Yalnız A", durum: "yayinda" });
    expect((await vitrinBlogYazilari(b.vt, { sayfa: 1, boyut: 12 })).toplam).toBe(0);
  });
});

describe("başlangıç blogu ve vitrin bağlamı", () => {
  it("başlangıç blogu bir kez kurulur; bağlam blog kapalıyken boş, açıkken bölümün yazılarıyla dolu", async () => {
    const h = await hazirla();
    const baslangicli: Site = {
      ...site,
      blogBaslangici: {
        kategoriler: [{ ad: "Rehber", adresAdi: "rehber" }],
        yazilar: [
          {
            baslik: "İlk",
            adresAdi: "ilk",
            icerik: "<p>Bir</p>",
            kategori: "rehber",
            durum: "yayinda",
            yayinZamani: "2026-11-10T10:00",
          },
          {
            baslik: "İkinci",
            adresAdi: "ikinci",
            ozet: "Özet",
            icerik: "",
            durum: "yayinda",
            yayinZamani: "2026-11-18T10:00",
          },
          { baslik: "Taslak", adresAdi: "taslak", icerik: "", durum: "taslak" },
        ],
      },
    };
    expect(await blogBaslangiciniKur(h.vt, baslangicli, () => h.klasor)).toBe(true);
    expect(await blogBaslangiciniKur(h.vt, baslangicli, () => h.klasor)).toBe(false);
    const liste = await vitrinBlogYazilari(h.vt, { sayfa: 1, boyut: 12 });
    expect(liste.yazilar.map((y) => [y.baslik, y.yayinZamani.toISOString()])).toEqual([
      ["İkinci", "2026-11-18T07:00:00.000Z"],
      ["İlk", "2026-11-10T07:00:00.000Z"],
    ]);
    const bolumler = baslangicli.duzenBaslangici["ana-sayfa"].map((bolum) => ({
      ...bolum,
      kimlik: randomUUID(),
      gorunum: "izgara",
      gizli: false,
    }));
    const kapali = await vitrinBaglaminiOku(h.vt, baslangicli, bolumler, bolumKutuphanesi);
    expect(kapali.islevler.blog).toBe(false);
    expect(kapali.blogYazilari).toEqual({});
    await siteninServisi(baslangicli).degistir(
      h.vt,
      yonetici(),
      { blogAcik: true },
      { kendiIslevi: true },
    );
    const acik = await vitrinBaglaminiOku(h.vt, baslangicli, bolumler, bolumKutuphanesi);
    expect(acik.islevler.blog).toBe(true);
    expect(acik.blogYazilari["son:3"]?.map((y) => [y.baslik, y.adres, y.ozet])).toEqual([
      ["İkinci", "/blog/ikinci", "Özet"],
      ["İlk", "/blog/ilk", undefined],
    ]);
    expect(acik.blogYazilari["son:3"]?.[0]?.tarih.makine).toBe("2026-11-18");
    // Görselsiz başlangıç blogu dosya kaydetmez.
    expect(await h.vt.select({ kimlik: dosyalar.kimlik }).from(dosyalar)).toEqual([]);
  });
});
