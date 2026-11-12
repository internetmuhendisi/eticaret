// Panel menüsü ve sayfa izni rol başına, gerçek veritabanıyla (kart 0141, karar 0111). Menü yöneticinin sunucudan
// okunan izinlerinden kurulur; izni olmayan sayfa menüde görünmez, adresi bilinse de bulunamadı verir. Bugün
// panelin ağacında izin isteyen sayfa olmadığı için süzme deneme ağacıyla, gerçek izin adlarıyla denenir; çizilen
// çerçeve panelin gerçek düzeniyle denenir.
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { altyapiAdi } from "../../kayitlar/altyapi.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { oturumCerezAdlari } from "../../kayitlar/oturum.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { yoneticiler } from "../../moduller/ekip/model.ts";
import { rolVer, yoneticininYetkileri } from "../../moduller/ekip/servis.ts";
import { girisYap, hesapAc } from "../../moduller/oturum/servis.ts";
import PanelDuzeni from "../../uygulama/app/yonetim/(panel)/layout.tsx";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { girisAdresi } from "../adresler.ts";
import { panelOturumu } from "../panel-oturumu.ts";
import { panelSayfaBilgisi, panelSayfasiniAc } from "../panel-sayfasi.tsx";
import { menuyuKur, type PanelSayfaKodu } from "../sayfa-agaci.ts";
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
