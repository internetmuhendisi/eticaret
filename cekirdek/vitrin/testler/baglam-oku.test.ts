// Vitrin bağlamı ve düzenin menü bağı gerçek veritabanıyla (kart 0108, karar 0083): mağaza adı, iletişim,
// adres ve sosyal hesaplar mağaza ayarlarından; menüler yalnız bölümlerin seçtikleri, adresleri kurulmuş ve
// görünmeyen öğeleri süzülmüş; silinmiş ya da olmayan menü bağlamda yok; altyapı adı yalnız ayar açıkken; yıl
// sitenin saat dilimine göre. Düzene bölüm eklenirken seçilen menü var ve silinmemiş olmalı; aynı anda silinen
// menüye bağlanılmaz.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { altyapiAdi } from "../../kayitlar/altyapi.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { duzenServisi } from "../../moduller/duzen/servis.ts";
import { kategoriEkle, kategoriSil } from "../../moduller/kategori/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { menuler } from "../../moduller/menu/model.ts";
import { menuEkle, menuSil, ogeEkle } from "../../moduller/menu/servis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../veritabani/testler/kilit-bekleyen.ts";
import { vitrinBaglaminiOku } from "../baglam-oku.ts";
import type { BolumOrnegi } from "../bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../bolum-kutuphanesi/kutuphane.ts";

const ornekSite = siteKlasorunuOku(
  join(import.meta.dirname, "..", "..", "ayar-semasi", "testler", "ornek-siteler", "gecerli"),
);
const site: Site = {
  ...ornekSite,
  duzenBaslangici: { "ust-kisim": [], "ana-sayfa": [], "alt-kisim": [] },
};

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("vitrin-baglam");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const bolum = (tur: string, degerler: Record<string, unknown>): BolumOrnegi => ({
  kimlik: randomUUID(),
  tur,
  gorunum: bolumKutuphanesi[tur]?.gorunumler[0].kod ?? "",
  gizli: false,
  degerler,
});

describe("vitrin bağlamı", () => {
  it("mağaza ayarlarından ad, iletişim, adres ve sosyal hesaplar; boş bilgi bağlamda yok", async () => {
    const vt = await siteAc();
    const bos = await vitrinBaglaminiOku(vt, site, [], bolumKutuphanesi);
    expect(bos.iletisim).toEqual({});
    expect(bos.sosyalHesaplar).toEqual([]);
    expect(bos.magazaAdi).toBe(site.kimlik.gorunenAd);
    expect(bos.logoAdresi).toBeUndefined();
    expect(bos.odemeIsaretleri).toEqual([]);
    expect(Object.values(bos.islevler).every((acik) => !acik)).toBe(true);

    await siteninServisi(site).degistir(vt, yonetici(), {
      magazaAdi: "Yeni Ad",
      iletisimTelefonu: "+90 312 000 00 00",
      iletisimEpostasi: "iletisim@ornek.test",
      magazaAdresi: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Deneme Sokak No: 1",
        postaKodu: "06000",
      },
      sosyalHesaplar: [
        { site: "instagram", hesap: "ornek.dukkan" },
        { site: "tiktok", hesap: "ornek_dukkan" },
      ],
    });
    const dolu = await vitrinBaglaminiOku(vt, site, [], bolumKutuphanesi);
    expect(dolu.magazaAdi).toBe("Yeni Ad");
    expect(dolu.iletisim.telefon).toEqual({
      metin: "+90 312 000 00 00",
      adres: "tel:+903120000000",
    });
    expect(dolu.iletisim.eposta).toEqual({
      metin: "iletisim@ornek.test",
      adres: "mailto:iletisim@ornek.test",
    });
    expect(dolu.iletisim.adres).toEqual(["Deneme Sokak No: 1", "06000 Çankaya / Ankara"]);
    expect(dolu.sosyalHesaplar).toEqual([
      { site: "instagram", adres: "https://www.instagram.com/ornek.dukkan" },
      { site: "tiktok", adres: "https://www.tiktok.com/@ornek_dukkan" },
    ]);
  });

  it("sosyal hesap kullanıcı adıyla yazılır: @, eğik çizgi, boşluk, nokta ya da tireyle başlayan ad ve aynı hesap iki kez geçmez", async () => {
    const vt = await siteAc();
    for (const hesaplar of [
      [{ site: "tiktok", hesap: "@ornek" }],
      [{ site: "instagram", hesap: "ornek/../a" }],
      [{ site: "x", hesap: "ornek dukkan" }],
      // Harf ya da rakamla başlamayan ad adresi platformun ana sayfasına çözerdi (kart 0108 kontrolü).
      [{ site: "instagram", hesap: ".." }],
      [{ site: "instagram", hesap: "-" }],
      [{ site: "baska", hesap: "ornek" }],
      [
        { site: "x", hesap: "ornek" },
        { site: "x", hesap: "ornek" },
      ],
    ]) {
      await expect(
        siteninServisi(site).degistir(vt, yonetici(), {
          sosyalHesaplar: hesaplar as never,
        }),
        JSON.stringify(hesaplar),
      ).rejects.toThrow();
    }
  });

  it("menüler yalnız bölümlerin seçtikleri; olmayan ve silinmiş menü yok; adresler kurulmuş, silinen hedef süzülmüş", async () => {
    const vt = await siteAc();
    const ana = await menuEkle(vt, yonetici(), { kod: "ana-menu", ad: "Ana", tur: "elle" });
    await menuEkle(vt, yonetici(), { kod: "secilmeyen", ad: "S", tur: "elle" });
    const silinecek = await menuEkle(vt, yonetici(), { kod: "silinecek", ad: "S", tur: "elle" });
    const giyim = await kategoriEkle(vt, yonetici(), { ad: "Giyim", adresAdi: "giyim" });
    const eski = await kategoriEkle(vt, yonetici(), { ad: "Eski", adresAdi: "eski" });
    const baslik = await ogeEkle(vt, yonetici(), ana, {
      metin: "Başlık",
      hedef: { tur: "baslik" },
    });
    await ogeEkle(vt, yonetici(), ana, { hedef: { tur: "kategori", kimlik: giyim }, ust: baslik });
    await ogeEkle(vt, yonetici(), ana, {
      metin: "Yardım",
      hedef: { tur: "adres", adres: "https://yardim.example", yeniSekme: true },
      ust: baslik,
    });
    await ogeEkle(vt, yonetici(), ana, { hedef: { tur: "kategori", kimlik: eski } });
    await kategoriSil(vt, yonetici(), eski);
    await menuSil(vt, yonetici(), silinecek);

    const baglam = await vitrinBaglaminiOku(
      vt,
      site,
      [
        bolum("menu-satiri", { anaMenu: "ana-menu", kategoriMenusu: "olmayan" }),
        bolum("ust-satir", { menuler: [{ menu: "silinecek" }] }),
      ],
      bolumKutuphanesi,
    );
    expect(Object.keys(baglam.menuler)).toEqual(["ana-menu"]);
    expect(baglam.menuler["ana-menu"]).toEqual([
      {
        kimlik: baslik,
        metin: "Başlık",
        yeniSekme: false,
        altlar: [
          {
            kimlik: expect.any(String),
            metin: "Giyim",
            adres: "/kategori/giyim",
            yeniSekme: false,
            altlar: [],
          },
          {
            kimlik: expect.any(String),
            metin: "Yardım",
            adres: "https://yardim.example",
            yeniSekme: true,
            altlar: [],
          },
        ],
      },
    ]);
  });

  it("altyapı adı yalnız altyapı sahibinin ayarı açıkken; yıl sitenin saat diliminde", async () => {
    const vt = await siteAc();
    // İstanbul'da yılbaşı geçti, UTC'de daha 31 Aralık.
    const an = new Date("2026-12-31T22:30:00Z");
    const istanbul: Site = { ...site, ayarlar: { ...site.ayarlar, saatDilimi: "Europe/Istanbul" } };
    const kapali = await vitrinBaglaminiOku(vt, istanbul, [], bolumKutuphanesi, an);
    expect(kapali.altyapiAdi).toBeUndefined();
    expect(kapali.yil).toBe("2027");
    const newYork: Site = {
      ...site,
      ayarlar: { ...site.ayarlar, saatDilimi: "America/New_York", vitrindeAltyapiAdi: true },
    };
    const acik = await vitrinBaglaminiOku(vt, newYork, [], bolumKutuphanesi, an);
    expect(acik.altyapiAdi).toBe(altyapiAdi);
    expect(acik.yil).toBe("2026");
  });

  // Kart 0109: ürün kartını çizen bölüm görünümü bağlamdan alır.
  it("parça görünümleri sitenin geçerli temasından", async () => {
    const vt = await siteAc();
    const yatayli: Site = {
      ...site,
      temalar: site.temalar.map((tema) => ({
        ...tema,
        tanim: { ...tema.tanim, gorunumler: { "urun-karti": "yatay" } },
      })),
    };
    expect((await vitrinBaglaminiOku(vt, site, [], bolumKutuphanesi)).parcaGorunumleri).toEqual({
      "urun-karti": "dikey",
    });
    expect((await vitrinBaglaminiOku(vt, yatayli, [], bolumKutuphanesi)).parcaGorunumleri).toEqual({
      "urun-karti": "yatay",
    });
  });
});

describe("düzenin menü bağı", () => {
  const servis = duzenServisi(() => site);

  it("bölüm yalnız var olan, silinmemiş menüye bağlanır; hata alanın yoluyla döner", async () => {
    const vt = await siteAc();
    expect(
      await hatasi(
        servis.bolumEkle(vt, yonetici(), "ust-kisim", {
          tur: "menu-satiri",
          degerler: { anaMenu: "ana-menu", kategoriMenusu: "kategoriler" },
        }),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "degerler.anaMenu", kod: "kayit-yok" },
        { alan: "degerler.kategoriMenusu", kod: "kayit-yok" },
      ],
    });
    const menu = await menuEkle(vt, yonetici(), { kod: "ana-menu", ad: "Ana", tur: "elle" });
    const kimlik = await servis.bolumEkle(vt, yonetici(), "ust-kisim", {
      tur: "ust-satir",
      degerler: { menuler: [{ menu: "ana-menu" }] },
    });
    await menuSil(vt, yonetici(), menu);
    expect(
      await hatasi(servis.bolumDegistir(vt, yonetici(), kimlik, { gorunum: "logo-ortada" })),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "degerler.menuler.0.menu", kod: "kayit-yok" }],
    });
    // Silinen menüye başvuran bölüm vitrinde yine çizilir: menü bağlamda olmadığı için boş kalır.
    expect((await servis.cizilecekBolumler(vt, "ust-kisim")).map((b) => b.kimlik)).toEqual([
      kimlik,
    ]);
  });

  it("aynı anda silinen menüye bağlanılmaz: silme bitene kadar beklenir, sonra reddedilir", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const menu = await menuEkle(vt, yonetici(), { kod: "ana-menu", ad: "Ana", tur: "elle" });
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let yazdi: () => void = () => undefined;
    const yazildi = new Promise<void>((coz) => {
      yazdi = coz;
    });
    const silme = vt.transaction(async (islem) => {
      await islem
        .update(menuler)
        .set({ silinme_zamani: sql`now()` })
        .where(eq(menuler.kimlik, menu));
      yazdi();
      await tut;
    });
    await yazildi;
    const ekleme = hatasi(
      servis.bolumEkle(vt, yonetici(), "alt-kisim", {
        tur: "baglanti-sutunlari",
        degerler: { menu: "ana-menu" },
      }),
    );
    await kilitBekleyeniGor(vt);
    birak();
    await silme;
    expect((await ekleme).ayrinti).toEqual([{ alan: "degerler.menu", kod: "kayit-yok" }]);
  });
});
