// Panel menüsü ve sayfa izni rol başına, gerçek veritabanıyla (kart 0141, karar 0111). Menü yöneticinin sunucudan
// okunan izinlerinden kurulur; izni olmayan sayfa menüde görünmez, adresi bilinse de bulunamadı verir. Bugün
// panelin ağacında izin isteyen sayfa olmadığı için süzme deneme ağacıyla, gerçek izin adlarıyla denenir; çizilen
// çerçeve panelin gerçek düzeniyle denenir.
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { altyapiAdi } from "../../kayitlar/altyapi.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { oturumCerezAdlari } from "../../kayitlar/oturum.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { yoneticiler } from "../../moduller/ekip/model.ts";
import { rolVer, yoneticininYetkileri } from "../../moduller/ekip/servis.ts";
import { girisYap, hesapAc } from "../../moduller/oturum/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { yorumlar } from "../../moduller/yorum/model.ts";
import PanelDuzeni from "../../uygulama/app/yonetim/(panel)/layout.tsx";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { girisAdresi } from "../adresler.ts";
import { panelOturumu } from "../panel-oturumu.ts";
import { PanelSayfasi, panelSayfaBilgisi, panelSayfasiniAc } from "../panel-sayfasi.tsx";
import { menuyuKur, type PanelSayfaKodu, type PanelSayfaTanimi } from "../sayfa-agaci.ts";
import { denemeAgaci } from "./deneme-agaci.ts";

const { cerezDeposu } = vi.hoisted(() => ({ cerezDeposu: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (ad: string) => {
      const value = cerezDeposu.get(ad);
      return value === undefined ? undefined : { value };
    },
  }),
}));
vi.mock("next/navigation", () => ({
  // Çerçevenin çıkış koruması (kart 0259) gezinmek için yönlendiriciyi kullanır.
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  redirect: (adres: string) => {
    throw new Error(`yonlendir ${adres}`);
  },
  notFound: () => {
    throw new Error("bulunamadi");
  },
  usePathname: () => "/yonetim",
}));

const metin = metinOkuyucu("tr");
const testIslemi = sistemIslemi("test");
const sifre = "uzun-bir-deneme-sifresi";
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

// Rolüyle bir yönetici açar ve oturumunun kısa anahtarını çereze koyar.
const yoneticiyleGir = async (rolKodu?: "magaza-sahibi" | "gorevli") => {
  sayac += 1;
  const bilgi = { eposta: `yetki${sayac}@ornek.test`, sifre };
  const { hesapKimligi } = await hesapAc(vt, "yonetici", bilgi);
  if (rolKodu !== undefined) {
    await rolVer(vt, { yoneticiKimligi: hesapKimligi, rolKodu }, testIslemi);
  }
  const giris = await girisYap(vt, "yonetici", bilgi, 3600);
  if (giris === null) throw new Error("Giriş yapılamadı.");
  cerezDeposu.clear();
  cerezDeposu.set(oturumCerezAdlari.yonetici.kisa, giris.anahtarlar.kisaAnahtar);
  return { kimlik: hesapKimligi, eposta: bilgi.eposta };
};

const menudekiler = async (kimlik: string) =>
  menuyuKur(denemeAgaci, await yoneticininYetkileri(vt, kimlik)).flatMap(({ sayfalar }) =>
    sayfalar.map(({ kod }) => kod),
  );

beforeAll(async () => {
  const site = await denemeSitesiAc("panel-yetkisi");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
});

afterEach(() => cerezDeposu.clear());

afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

describe("rol başına menü", () => {
  it("mağaza sahibi bütün sayfaları, görevli yalnız izinlilerini, rolsüz yönetici yalnız izinsizleri görür", async () => {
    const sahip = await yoneticiyleGir("magaza-sahibi");
    const gorevli = await yoneticiyleGir("gorevli");
    const rolsuz = await yoneticiyleGir();
    expect(await menudekiler(sahip.kimlik)).toEqual([
      "karsilama",
      "urunler",
      "bolumler",
      "menuler",
      "tema",
    ]);
    // Görevli ürünü görür; vitrin bölümleri, menüler ve tema izni yoktur (baslangic-rolleri.ts).
    expect(await menudekiler(gorevli.kimlik)).toEqual(["karsilama", "urunler"]);
    expect(await menudekiler(rolsuz.kimlik)).toEqual(["karsilama"]);
  });
});

describe("sayfa izni", () => {
  it("izni olmayan sayfa bulunamadı verir, izinli sayfa ve alt sayfası yolla açılır", async () => {
    await yoneticiyleGir("gorevli");
    await expect(panelSayfasiniAc("tema", denemeAgaci)).rejects.toThrow("bulunamadi");
    await expect(panelSayfasiniAc("menu-ogesi", denemeAgaci)).rejects.toThrow("bulunamadi");
    await expect(panelSayfasiniAc("olmayan", denemeAgaci)).rejects.toThrow("bulunamadi");
    const urunler = await panelSayfasiniAc("urunler", denemeAgaci);
    expect(urunler.yol.map(({ kod }) => kod)).toEqual(["karsilama", "urunler"]);

    await yoneticiyleGir("magaza-sahibi");
    const oge = await panelSayfasiniAc("menu-ogesi", denemeAgaci);
    expect(oge.yol.map(({ kod }) => kod)).toEqual(["karsilama", "menuler", "menu-ogesi"]);
  });

  // Kart 0148: panelin gerçek tema ekranı yalnız tema izni olan role açılır.
  it("gerçek tema ekranı: görevli ve rolsüz yönetici bulunamadı alır, mağaza sahibi açar", async () => {
    for (const rol of ["gorevli", undefined] as const) {
      await yoneticiyleGir(rol);
      await expect(panelSayfasiniAc("tema")).rejects.toThrow("bulunamadi");
      expect(await panelSayfaBilgisi("tema")).toEqual({});
    }
    await yoneticiyleGir("magaza-sahibi");
    const { yol } = await panelSayfasiniAc("tema");
    expect(yol.map(({ kod }) => kod)).toEqual(["karsilama", "tema"]);
  });

  // Kart 0278: mağaza bilgileri mağaza ayarıdır, yalnız mağaza sahibine açılır.
  it("mağaza bilgileri: görevli ve rolsüz yönetici bulunamadı alır, mağaza sahibi açar", async () => {
    for (const rol of ["gorevli", undefined] as const) {
      await yoneticiyleGir(rol);
      await expect(panelSayfasiniAc("magaza-bilgileri")).rejects.toThrow("bulunamadi");
    }
    await yoneticiyleGir("magaza-sahibi");
    const { yol } = await panelSayfasiniAc("magaza-bilgileri");
    expect(yol.map(({ kod }) => kod)).toEqual(["karsilama", "magaza-bilgileri"]);
  });

  it("eklentinin getirdiği sayfa eklenti sitede kapalıyken bulunamadı verir, açıkken açılır (kart 0144)", async () => {
    await yoneticiyleGir("magaza-sahibi");
    const agac: PanelSayfaTanimi[] = [
      ...denemeAgaci,
      {
        ...denemeAgaci[1],
        kod: "eklentili",
        adres: "/yonetim/eklentili",
        izin: null,
        eklenti: "stoga-gelince-haber-ver",
      } as PanelSayfaTanimi,
    ];
    // Deneme sitesinde eklenti açıktır (ornek-siteler/gecerli/ayarlar.json).
    expect((await panelSayfasiniAc("eklentili", agac)).sayfa.kod).toBe("eklentili");
    const anahtar = Symbol.for("cekirdek.calisanSite");
    const ortak = globalThis as { [anahtar]?: unknown };
    const acikSite = calisanSite();
    ortak[anahtar] = { ...acikSite, ayarlar: { ...acikSite.ayarlar, eklentiler: [] } };
    try {
      await expect(panelSayfasiniAc("eklentili", agac)).rejects.toThrow("bulunamadi");
      expect(await panelSayfaBilgisi("eklentili" as PanelSayfaKodu, agac)).toEqual({});
    } finally {
      ortak[anahtar] = acikSite;
    }
  });

  // Bulunamadı veren sayfanın adı sekme başlığında da görünmez (bağımsız kontrolün bulgusu).
  it("izni olmayan sayfanın sekme başlığı sayfanın adını taşımaz, izinli sayfanınki taşır", async () => {
    const kod = (deger: string) => deger as PanelSayfaKodu;
    await yoneticiyleGir("gorevli");
    expect(await panelSayfaBilgisi(kod("tema"), denemeAgaci)).toEqual({});
    expect(JSON.stringify(await panelSayfaBilgisi(kod("urunler"), denemeAgaci))).toContain(
      metin("yonetim.sayfa.karsilama.ad"),
    );
    await yoneticiyleGir("magaza-sahibi");
    expect(JSON.stringify(await panelSayfaBilgisi(kod("tema"), denemeAgaci))).toContain(
      metin("yonetim.sayfa.karsilama.ad"),
    );
  });

  it("oturumsuz, uydurma anahtarlı ve hesabı kapatılmış yönetici giriş sayfasına yönlenir", async () => {
    await expect(panelSayfasiniAc("karsilama", denemeAgaci)).rejects.toThrow(
      `yonlendir ${girisAdresi}`,
    );
    cerezDeposu.set(oturumCerezAdlari.yonetici.kisa, "uydurma");
    await expect(panelOturumu()).rejects.toThrow(`yonlendir ${girisAdresi}`);

    const { kimlik } = await yoneticiyleGir("magaza-sahibi");
    await expect(panelOturumu()).resolves.toMatchObject({ kimlik });
    await vt
      .update(yoneticiler)
      .set({ silinme_zamani: new Date() })
      .where(eq(yoneticiler.kimlik, kimlik));
    await expect(panelOturumu()).rejects.toThrow(`yonlendir ${girisAdresi}`);
  });
});

describe("panelin çerçevesi", () => {
  const icerik = "icerik";
  const ciz = async () =>
    renderToString(
      <MetinSaglayici dil="tr">
        {(await PanelDuzeni({ children: <p>{icerik}</p> })) as ReactElement}
      </MetinSaglayici>,
    );

  it("menü, giriş yapan yönetici, vitrine git, çıkış ve altyapı adı çerçevede; içerik ana bölgede", async () => {
    const { eposta } = await yoneticiyleGir();
    const html = await ciz();
    expect(html).toContain(`aria-label="${metin("yonetim.cerceve.menu")}"`);
    expect(html).toContain(metin("yonetim.sayfa.karsilama.ad"));
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(eposta);
    expect(html).toContain(metin("yonetim.eylem.vitrineGit"));
    expect(html).toContain('target="_blank"');
    expect(html).toContain(metin("yonetim.cikis.dugme"));
    expect(html).toContain(altyapiAdi);
    expect(html).toContain(`aria-label="${metin("yonetim.cerceve.menuyuAc")}"`);
    expect(html).toMatch(/<main[^>]*><p>icerik<\/p><\/main>/);
  });
});

describe("menüdeki sayı (kart 0277)", () => {
  const icerik = "icerik";
  const ciz = async () =>
    renderToString(
      <MetinSaglayici dil="tr">
        {(await PanelDuzeni({ children: <p>{icerik}</p> })) as ReactElement}
      </MetinSaglayici>,
    );

  it("Yorumlar menüde onay bekleyen yorum sayısıyla; görevli de görür, rolsüz yöneticide sayfa da sayı da yok", async () => {
    const urun = await urunServisi(() => "Europe/Istanbul").urunEkle(vt, testIslemi, {
      ad: "Sayaç ürünü",
      vergiSinifi: null,
      durum: "yayinda",
    });
    await vt.insert(yorumlar).values(
      (["onay-bekliyor", "onay-bekliyor", "yayinda"] as const).map((durum) => ({
        urun_kimligi: urun,
        puan: 4,
        metin: "Deneme",
        ad: "Deneme M.",
        durum,
      })),
    );
    const yazi = metin("yonetim.yorumlar.menuSayisi").replace("{sayi}", "2");
    for (const rol of ["magaza-sahibi", "gorevli"] as const) {
      await yoneticiyleGir(rol);
      const html = await ciz();
      expect(html).toMatch(
        new RegExp(
          `${metin("yonetim.sayfa.yorumlar.ad")}<span[^>]*aria-hidden="true"[^>]*>2</span>`,
        ),
      );
      expect(html).toContain(`<span class="sr-only">${yazi}</span>`);
    }
    await yoneticiyleGir();
    const html = await ciz();
    expect(html).not.toContain(metin("yonetim.sayfa.yorumlar.ad"));
    expect(html).not.toContain(yazi);
  });
});

// Kart 0301: taslağın "Ayarlar" grubu gerçek düzende, rol başına; sayfa yolunda grubun adı bağlantısız.
describe("Ayarlar grubu (kart 0301)", () => {
  const icerik = "icerik";
  const ciz = async (dugum: Promise<unknown>) =>
    renderToString(<MetinSaglayici dil="tr">{(await dugum) as ReactElement}</MetinSaglayici>);
  const sirali = (html: string, adlar: string[]) => {
    const yerler = adlar.map((ad) => html.indexOf(`>${ad}<`));
    expect(yerler.every((yer) => yer >= 0)).toBe(true);
    expect([...yerler].sort((a, b) => a - b)).toEqual(yerler);
  };
  const sayfa = (kod: string) => metin(`yonetim.sayfa.${kod}.ad` as Parameters<typeof metin>[0]);

  it("mağaza sahibinde ayar ekranları Ayarlar başlığının altında, siparişlerden sonra; görevlide yalnız izinlileri", async () => {
    await yoneticiyleGir("magaza-sahibi");
    const sahip = await ciz(PanelDuzeni({ children: <p>{icerik}</p> }));
    sirali(sahip, [
      metin("yonetim.grup.satis"),
      sayfa("siparisler"),
      sayfa("musteriler"),
      metin("yonetim.grup.ayarlar"),
      sayfa("magazaBilgileri"),
      sayfa("siparisAyarlari"),
      sayfa("odemeYontemleri"),
      sayfa("bankaHesaplari"),
      sayfa("kargo"),
      sayfa("ekip"),
    ]);
    // Görevli ödeme yöntemlerini görür (odeme-yontemi.gor), mağaza ayarlarını görmez.
    await yoneticiyleGir("gorevli");
    const gorevli = await ciz(PanelDuzeni({ children: <p>{icerik}</p> }));
    sirali(gorevli, [
      metin("yonetim.grup.ayarlar"),
      sayfa("odemeYontemleri"),
      sayfa("bankaHesaplari"),
    ]);
    expect(gorevli).not.toContain(`>${sayfa("magazaBilgileri")}<`);
    expect(gorevli).not.toContain(`>${sayfa("kargo")}<`);
  });

  it("sayfa yolu: Karşılama bağlantı, grubun adı bağlantısız, sayfanın adı geçerli sayfa", async () => {
    await yoneticiyleGir("magaza-sahibi");
    const html = await ciz(PanelSayfasi({ kod: "magaza-bilgileri" }));
    const yol = html.slice(html.indexOf("<nav"), html.indexOf("</nav>"));
    expect(yol).toMatch(new RegExp(`<a [^>]*href="/yonetim"[^>]*>${sayfa("karsilama")}</a>`));
    expect(yol).toContain(
      `<span class="inline-flex min-h-8 items-center">${metin("yonetim.grup.ayarlar")}</span>`,
    );
    expect(yol).not.toMatch(new RegExp(`<a [^>]*>${metin("yonetim.grup.ayarlar")}</a>`));
    expect(yol).toContain(`aria-current="page"`);
    expect(yol.indexOf(metin("yonetim.grup.ayarlar"))).toBeLessThan(
      yol.indexOf(sayfa("magazaBilgileri")),
    );
  });
});
