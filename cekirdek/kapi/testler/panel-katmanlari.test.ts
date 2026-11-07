// Panel kapısının iki katmanı (kart 0027, karar 0042): ara katman yeni anahtarı yanıta yazar ve
// veritabanı kapalıyken paneli açmaz; düzen anahtarı değiştirmeden ikinci kez sorar. Yeri yanlış
// sayfa ikinci katmanı kaçırır, sayfa çizerken oturumu yenilemek oturumu kapatır (karar 0039).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { oturumCerezAdlari } from "../../kayitlar/oturum.ts";
import { girisYap, hesapAc } from "../../moduller/oturum/servis.ts";
import PanelDuzeni from "../../uygulama/app/yonetim/(panel)/layout.tsx";
import { proxy } from "../../uygulama/proxy.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { girisAdresi, panelAdresi } from "../../yonetim-paneli/adresler.ts";
import { yoneticiCikisUcu } from "../herkese-acik/yonetici-cikis.ts";

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
}));

const sifre = "uzun-bir-deneme-sifresi";
const adlar = oturumCerezAdlari.yonetici;
let vt: Veritabani;
let sil: () => Promise<void>;
let adres: string;
let sayac = 0;

const anahtarlarAl = async () => {
  sayac += 1;
  const bilgi = { eposta: `katman${sayac}@ornek.test`, sifre };
  await hesapAc(vt, "yonetici", bilgi);
  const giris = await girisYap(vt, "yonetici", bilgi, 3600);
  if (giris === null) throw new Error("Giriş yapılamadı.");
  return giris.anahtarlar;
};

const panelIstegi = (cerez?: string) =>
  new NextRequest(`http://yerel${panelAdresi}`, {
    headers: cerez === undefined ? {} : { cookie: cerez },
  });

beforeAll(async () => {
  const site = await denemeSitesiAc("katman");
  vt = site.vt;
  sil = site.sil;
  adres = site.baglantiAdresi;
  vi.stubEnv("VERITABANI_ADRESI", adres);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
});

afterEach(() => {
  cerezDeposu.clear();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

describe("ara katman", () => {
  it("girişsiz isteği giriş sayfasına yönlendirir", async () => {
    const yanit = await proxy(panelIstegi());
    expect(yanit.status).toBe(307);
    expect(new URL(yanit.headers.get("location") ?? "").pathname).toBe(girisAdresi);
  });

  it("kısa anahtar yoksa yenilenen iki anahtarı yanıta yazar, geçirir", async () => {
    const { yenilemeAnahtari } = await anahtarlarAl();
    const yanit = await proxy(panelIstegi(`${adlar.yenileme}=${yenilemeAnahtari}`));
    expect(yanit.headers.get("location")).toBeNull();
    expect(yanit.headers.get("x-middleware-next")).toBe("1");
    expect(yanit.headers.getSetCookie().map((satir) => satir.split("=")[0])).toEqual([
      adlar.kisa,
      adlar.yenileme,
    ]);
  });

  it("sayfaya gelen POST gövdesiz yönlenir, sorgu ve değer adrese geçmez", async () => {
    const yanit = await proxy(
      new NextRequest(`http://yerel${girisAdresi}?donus=%2Fyonetim`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "eposta=a%40ornek.test&sifre=gizli-deger",
      }),
    );
    expect(yanit.status).toBe(303);
    expect(new URL(yanit.headers.get("location") ?? "").pathname).toBe(girisAdresi);
    expect(yanit.headers.get("location")).not.toContain("gizli-deger");
    expect(yanit.headers.get("location")).not.toContain("sifre");
  });

  it("veritabanı kapalıyken paneli açmaz, 503 döner", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await baglantiyiKapat();
    vi.stubEnv("VERITABANI_ADRESI", "postgres://yok@127.0.0.1:1/yok");
    try {
      const { kisaAnahtar } = await anahtarlarAl();
      const yanit = await proxy(panelIstegi(`${adlar.kisa}=${kisaAnahtar}`));
      expect(yanit.status).toBe(503);
      expect(yanit.headers.get("x-middleware-next")).toBeNull();
      expect(yanit.headers.get("retry-after")).toBeTruthy();

      // Çıkış bu durumda da tarayıcıdaki çerezleri siler.
      const cikis = await yoneticiCikisUcu(
        new Request("http://yerel/kapi/herkese-acik/yonetici-cikis", {
          method: "POST",
          headers: { cookie: `${adlar.kisa}=${kisaAnahtar}` },
        }),
      );
      expect(cikis.status).toBe(500);
      expect(cikis.headers.getSetCookie().join()).toContain("Max-Age=0");
    } finally {
      await baglantiyiKapat();
      vi.stubEnv("VERITABANI_ADRESI", adres);
    }
  });
});

describe("ikinci katman", () => {
  it("oturumsuz düzen giriş sayfasına yönlendirir", async () => {
    await expect(PanelDuzeni({ children: null })).rejects.toThrow(`yonlendir ${girisAdresi}`);
    cerezDeposu.set(adlar.kisa, "uydurma");
    await expect(PanelDuzeni({ children: null })).rejects.toThrow(`yonlendir ${girisAdresi}`);
  });

  it("açık oturumda içeriği çizer, yalnız yenileme anahtarı da yeter", async () => {
    const { kisaAnahtar, yenilemeAnahtari } = await anahtarlarAl();
    cerezDeposu.set(adlar.kisa, kisaAnahtar);
    await expect(PanelDuzeni({ children: "icerik" })).resolves.toBe("icerik");
    cerezDeposu.clear();
    cerezDeposu.set(adlar.yenileme, yenilemeAnahtari);
    await expect(PanelDuzeni({ children: "icerik" })).resolves.toBe("icerik");
  });
});

describe("panel dosyalarının yeri", () => {
  const appKlasoru = resolve(import.meta.dirname, "../../uygulama/app");
  const dosyalar = (klasor: string): string[] =>
    readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
      const yol = join(klasor, girdi.name);
      return girdi.isDirectory() ? dosyalar(yol) : [yol];
    });
  const sayfalar = dosyalar(appKlasoru).map((yol) => relative(appKlasoru, yol));

  it("girişli düzenin dışında yalnız giriş, kod, kurulum ve şifre sıfırlama sayfaları var", () => {
    const disarida = sayfalar.filter(
      (yol) =>
        yol.startsWith(`yonetim${"/"}`) &&
        yol.endsWith("page.tsx") &&
        !yol.startsWith("yonetim/(panel)/"),
    );
    expect(disarida.sort()).toEqual([
      "yonetim/giris/kod/page.tsx",
      "yonetim/giris/kurulum/page.tsx",
      "yonetim/giris/page.tsx",
      "yonetim/giris/sifre-yenile/page.tsx",
      "yonetim/giris/sifremi-unuttum/page.tsx",
    ]);
  });

  it("sayfa ve düzenler oturumu yenileyen işlevi çağırmaz", () => {
    const cagiranlar = sayfalar.filter(
      (yol) =>
        yol.endsWith(".tsx") &&
        readFileSync(join(appKlasoru, yol), "utf8").includes("istektenOturumAl"),
    );
    expect(cagiranlar).toEqual([]);
  });
});
