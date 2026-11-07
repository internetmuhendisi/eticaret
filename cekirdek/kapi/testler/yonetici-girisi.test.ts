// Yönetici giriş ve çıkış uçları, panelin kapısı ve ilk yönetici; gerçek veritabanıyla (kart 0027,
// karar 0042). Yerel veritabanı kutusu açık olmalı.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { istekSinirlari } from "../../kayitlar/kapi.ts";
import { girisAdimiCerezi, girisDenemeSiniri } from "../../kayitlar/oturum.ts";
import { yoneticiler } from "../../moduller/ekip/model.ts";
import { tamYetkiliYoneticiAc, yoneticininIzniVarMi } from "../../moduller/ekip/servis.ts";
import { sinirliSifreDogrula } from "../../moduller/oturum/giris.ts";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama.ts";
import { girisAdiminiOku, kurulumuHazirla } from "../../moduller/oturum/iki-asamali-giris.ts";
import { girisYap, hesapAc, oturumAcikMi, oturumuYenile } from "../../moduller/oturum/servis.ts";
import { baglan, baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  girisAdresi,
  guvenliDonus,
  panelAdresi,
  sifremiUnuttumAdresi,
  sifreYenileAdresi,
} from "../../yonetim-paneli/adresler.ts";
import { yoneticiCikisUcu } from "../herkese-acik/yonetici-cikis.ts";
import { yoneticiGirisUcu } from "../herkese-acik/yonetici-giris.ts";
import { yoneticiKurulumOnayUcu } from "../herkese-acik/yonetici-kurulum-onay.ts";
import { panelYoklamasi } from "../panel-korumasi.ts";

const testIslemi = sistemIslemi("test");

const sifre = "uzun-bir-deneme-sifresi";
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const yeniEposta = () => {
  sayac += 1;
  return `yonetici${sayac}@ornek.test`;
};
const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;

const giris = (eposta: string, girilen: string, adres = yeniAg()) =>
  yoneticiGirisUcu(
    new Request("http://yerel/kapi/herkese-acik/yonetici-giris", {
      method: "POST",
      headers: { "x-forwarded-for": adres },
      body: JSON.stringify({ eposta, sifre: girilen }),
    }),
  );

const cerezBasligi = (yanit: Response) =>
  yanit.headers
    .getSetCookie()
    .map((satir) => satir.split(";")[0])
    .join("; ");

// Şifreden sonra kurulumu da bitirir, gerçek oturum çerezlerini döner (kart 0028).
const tamGiris = async (eposta: string) => {
  const ilk = await giris(eposta, sifre);
  const adimCerezi = cerezBasligi(ilk);
  const anahtar = adimCerezi.split("=")[1];
  const adim = await girisAdiminiOku(vt, anahtar);
  if (adim === null) throw new Error("Ara adım açılmadı.");
  const kurulum = await kurulumuHazirla(vt, anahtar ?? "", adim, "Deneme");
  if (kurulum === null) throw new Error("Kurulum hazırlanamadı.");
  const onay = await yoneticiKurulumOnayUcu(
    new Request("http://yerel/kapi/herkese-acik/yonetici-kurulum-onay", {
      method: "POST",
      headers: { "x-forwarded-for": yeniAg(), cookie: adimCerezi },
      body: JSON.stringify({ kod: zamanliKod(kurulum.gizli, kodAdimi()) }),
    }),
  );
  expect(onay.status).toBe(200);
  return onay;
};

const panel = (yol: string, cerez?: string) =>
  panelYoklamasi(
    new Request(`http://yerel${yol}`, { headers: cerez === undefined ? {} : { cookie: cerez } }),
  );

const gunlukYakala = () => {
  const satirlar: string[] = [];
  for (const akim of [process.stdout, process.stderr]) {
    vi.spyOn(akim, "write").mockImplementation((parca) => {
      satirlar.push(String(parca));
      return true;
    });
  }
  return satirlar;
};

beforeAll(async () => {
  const site = await denemeSitesiAc("giris");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
});

afterEach(() => vi.restoreAllMocks());

afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

describe("şifre sıfırlama sayfaları (kart 0034)", () => {
  it("girişsiz açılır, yönlendirilmez; alt adresleri açılmaz, panele geçilmez", async () => {
    for (const yol of [sifremiUnuttumAdresi, sifreYenileAdresi]) {
      expect((await panel(yol)).yonlendir).toBeNull();
      expect((await panel(`${yol}/baska`)).yonlendir).toBe(
        `${girisAdresi}?donus=${encodeURIComponent(panelAdresi)}`.replace(/\?donus=.*/, ""),
      );
    }
    expect(guvenliDonus(sifreYenileAdresi)).toBe(panelAdresi);
  });
});

describe("giriş ucu", () => {
  it("doğru şifre oturum değil, yalnız ara adım çerezi yazar", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const yanit = await giris(eposta, sifre);
    expect(yanit.status).toBe(200);
    expect((await yanit.json()).veri).toEqual({ sonraki: "kurulum" });
    const cerezler = yanit.headers.getSetCookie();
    expect(cerezler.map((satir) => satir.split("=")[0])).toEqual([girisAdimiCerezi]);
    for (const satir of cerezler) expect(satir).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });

  it("yanlış şifre ile kayıtlı olmayan e-postanın cevabı aynıdır, çerez yazılmaz", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const yanlis = await giris(eposta, "yanlis-bir-sifre-burada");
    const kayitsiz = await giris(yeniEposta(), "yanlis-bir-sifre-burada");
    expect(yanlis.status).toBe(401);
    expect(kayitsiz.status).toBe(401);
    expect(await yanlis.text()).toBe(await kayitsiz.text());
    expect(yanlis.headers.getSetCookie()).toEqual([]);
  });

  it("kısa şifre de aynı cevabı alır, kuralı belli etmez", async () => {
    const yanit = await giris(yeniEposta(), "kisa");
    expect(yanit.status).toBe(401);
  });

  it("günlüğe e-posta kısaltılmış yazılır, şifre yazılmaz", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const satirlar = gunlukYakala();
    await giris(eposta, "yanlis-bir-sifre-burada");
    const basarili = await tamGiris(eposta);
    await yoneticiCikisUcu(
      new Request("http://yerel/kapi/herkese-acik/yonetici-cikis", {
        method: "POST",
        headers: { cookie: cerezBasligi(basarili) },
      }),
    );
    const metin = satirlar.join("");
    expect(metin).toContain("Yanlış giriş denemesi.");
    expect(metin).toContain("Şifre doğrulandı.");
    expect(metin).toContain("İki aşamalı giriş kuruldu.");
    expect(metin).toContain("Çıkış yapıldı.");
    expect(metin).not.toContain(eposta);
    expect(metin).not.toContain(sifre);
    expect(metin).not.toContain("yanlis-bir-sifre-burada");
  });
});

describe("deneme sınırı", () => {
  it("hesap sınırı dolunca başka bağlantıdan doğru şifre de bekletilir", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    for (let i = 0; i < girisDenemeSiniri.hesap.deneme; i += 1) {
      expect((await giris(eposta, "yanlis-bir-sifre-burada")).status).toBe(401);
    }
    const yanit = await giris(eposta, sifre);
    expect(yanit.status).toBe(429);
    expect(Number(yanit.headers.get("retry-after"))).toBe(girisDenemeSiniri.hesap.saniye);
    expect(yanit.headers.getSetCookie()).toEqual([]);
  });

  it("kayıtlı olmayan e-postada da aynı sınır çalışır, e-posta belli olmaz", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const eposta = yeniEposta();
    for (let i = 0; i < girisDenemeSiniri.hesap.deneme; i += 1) await giris(eposta, "yanlis-sifre");
    expect((await giris(eposta, "yanlis-sifre")).status).toBe(429);
  });

  it("başarılı giriş hesabın yanlış sayacını sıfırlar", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    for (let tur = 0; tur < 2; tur += 1) {
      for (let i = 0; i < girisDenemeSiniri.hesap.deneme - 1; i += 1) {
        expect((await giris(eposta, "yanlis-bir-sifre-burada")).status).toBe(401);
      }
      expect((await giris(eposta, sifre)).status).toBe(200);
    }
  });

  it("bağlantı sınırı hesaptan bağımsızdır, aynı /64 tek bağlantıdır, başka bağlantı etkilenmez", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    // Saatler ileri alınır: uçtaki dakikalık sıkı sınır bağlantı sınırından önce durdurmasın.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    try {
      const ag = `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}`;
      const toplam = girisDenemeSiniri.baglanti.deneme;
      for (let i = 0; i < toplam; i += 1) {
        if (i % istekSinirlari.siki.istek === 0) vi.advanceTimersByTime(61_000);
        const yanit = await giris(yeniEposta(), "yanlis-bir-sifre-burada", `${ag}::${i + 1}`);
        expect(yanit.status).toBe(401);
      }
      vi.advanceTimersByTime(61_000);
      expect((await giris(yeniEposta(), "yanlis-bir-sifre-burada", `${ag}::abcd`)).status).toBe(
        429,
      );
      expect((await giris(yeniEposta(), "yanlis-bir-sifre-burada")).status).toBe(401);
    } finally {
      vi.useRealTimers();
    }
  });

  it("başarılı giriş bağlantının denemesini tüketmez", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const baglanti = `basarili-${randomBytes(4).toString("hex")}`;
    for (let i = 0; i <= girisDenemeSiniri.baglanti.deneme; i += 1) {
      await sinirliSifreDogrula(vt, "yonetici", { eposta, sifre }, baglanti);
    }
  });

  it("veritabanı hatası denemeyi tüketmez, büyük harfli yazış aynı sayaca düşer", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const kapali = baglan("postgres://yok@127.0.0.1:1/yok");
    const eposta = yeniEposta();
    const baglanti = `kapali-${randomBytes(4).toString("hex")}`;
    try {
      for (let i = 0; i <= girisDenemeSiniri.hesap.deneme; i += 1) {
        await expect(
          sinirliSifreDogrula(kapali, "yonetici", { eposta, sifre }, baglanti),
        ).rejects.not.toMatchObject({ kod: "istek-siniri" });
      }
    } finally {
      await kapali.$client.end();
    }
    for (let i = 0; i < girisDenemeSiniri.hesap.deneme; i += 1) {
      await expect(
        sinirliSifreDogrula(vt, "yonetici", { eposta, sifre }, baglanti),
      ).rejects.toMatchObject({ kod: "giris-hatasi" });
    }
    await expect(
      sinirliSifreDogrula(vt, "yonetici", { eposta: eposta.toUpperCase(), sifre }, baglanti),
    ).rejects.toMatchObject({ kod: "istek-siniri" });
  });

  it("aynı anda giden yanlış denemeler sınırı aşamaz", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const toplam = girisDenemeSiniri.hesap.deneme + 5;
    const sonuclar = await Promise.all(
      Array.from({ length: toplam }, () => giris(eposta, "yanlis-bir-sifre-burada")),
    );
    const sayilar = sonuclar.map((yanit) => yanit.status);
    expect(sayilar.filter((durum) => durum === 401)).toHaveLength(girisDenemeSiniri.hesap.deneme);
    expect(sayilar.filter((durum) => durum === 429)).toHaveLength(5);
  });
});

describe("panel kapısı", () => {
  it("girişsiz istek giriş sayfasına yönlenir, istenen adres taşınır", async () => {
    expect((await panel(panelAdresi)).yonlendir).toBe(girisAdresi);
    expect((await panel(`${panelAdresi}/urunler?sayfa=2`)).yonlendir).toBe(
      `${girisAdresi}?donus=${encodeURIComponent(`${panelAdresi}/urunler?sayfa=2`)}`,
    );
    expect((await panel(girisAdresi)).yonlendir).toBeNull();
  });

  it("girişli istek geçer, giriş sayfasından panele döner, başka siteye dönmez", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const cerez = cerezBasligi(await tamGiris(eposta));
    expect((await panel(panelAdresi, cerez)).yonlendir).toBeNull();
    expect((await panel(girisAdresi, cerez)).yonlendir).toBe(panelAdresi);
    expect((await panel(`${girisAdresi}?donus=%2Fyonetim%2Furunler`, cerez)).yonlendir).toBe(
      `${panelAdresi}/urunler`,
    );
    expect((await panel(`${girisAdresi}?donus=https://kotu.test`, cerez)).yonlendir).toBe(
      panelAdresi,
    );
  });

  it("çıkıştan sonra panele girilemez, çerezler silinir, eski anahtar işe yaramaz", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const cerez = cerezBasligi(await tamGiris(eposta));
    const cikis = await yoneticiCikisUcu(
      new Request("http://yerel/kapi/herkese-acik/yonetici-cikis", {
        method: "POST",
        headers: { cookie: cerez },
      }),
    );
    expect(cikis.status).toBe(200);
    expect(cikis.headers.getSetCookie().join()).toContain("Max-Age=0");
    const sonra = await panel(panelAdresi, cerez);
    expect(sonra.yonlendir).toBe(girisAdresi);
    expect(sonra.cerezler.join()).toContain("Max-Age=0");
  });

  it("müşteri çerez adıyla yönetici paneline girilemez", async () => {
    const yanit = await panel(panelAdresi, "__Host-musteri-oturum=uydurma");
    expect(yanit.yonlendir).toBe(girisAdresi);
  });
});

describe("dönüş adresi", () => {
  it.each([
    [null, panelAdresi],
    ["", panelAdresi],
    ["https://kotu.test", panelAdresi],
    ["//kotu.test/yonetim", panelAdresi],
    ["/\\kotu.test", panelAdresi],
    ["/yonetim\\..\\kotu", panelAdresi],
    ["/baska", panelAdresi],
    ["/yonetimx", panelAdresi],
    ["/yonetim/../baska", panelAdresi],
    ["/yonetim/%2e%2e/baska", panelAdresi],
    ["javascript:alert(1)", panelAdresi],
    [girisAdresi, panelAdresi],
    [`${girisAdresi}/kurulum`, panelAdresi],
    [`${girisAdresi}/kod?donus=/yonetim`, panelAdresi],
    ["/yonetim", "/yonetim"],
    ["/yonetim/urunler?sayfa=2", "/yonetim/urunler?sayfa=2"],
  ])("%j → %s", (deger, beklenen) => {
    expect(guvenliDonus(deger)).toBe(beklenen);
  });
});

describe("anahtarı değiştirmeyen oturum sorusu", () => {
  it("kısa anahtar, yenileme anahtarı ve az önce değişen anahtarı kabul eder; kapalıyı etmez", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "yonetici", { eposta, sifre });
    const ilk = await girisYap(vt, "yonetici", { eposta, sifre }, 3600);
    if (ilk === null) throw new Error("Giriş yapılamadı.");
    const { kisaAnahtar, yenilemeAnahtari } = ilk.anahtarlar;
    expect(await oturumAcikMi(vt, "yonetici", { kisaAnahtar })).toBe(true);
    expect(await oturumAcikMi(vt, "yonetici", { yenilemeAnahtari })).toBe(true);
    expect(await oturumAcikMi(vt, "yonetici", {})).toBe(false);
    expect(await oturumAcikMi(vt, "yonetici", { kisaAnahtar: "yok" })).toBe(false);
    expect(await oturumAcikMi(vt, "musteri", { kisaAnahtar })).toBe(false);

    const yenilenen = await oturumuYenile(vt, "yonetici", yenilemeAnahtari, 3600);
    expect(yenilenen.durum).toBe("yenilendi");
    // Az önce değişti: sayfa eski anahtarı görürken panel atmamalı.
    expect(await oturumAcikMi(vt, "yonetici", { yenilemeAnahtari })).toBe(true);
  });

  it("silinmiş hesabın oturumu açık sayılmaz", async () => {
    const eposta = yeniEposta();
    const { hesapKimligi } = await hesapAc(vt, "yonetici", { eposta, sifre });
    const ilk = await girisYap(vt, "yonetici", { eposta, sifre }, 3600);
    if (ilk === null) throw new Error("Giriş yapılamadı.");
    await vt
      .update(yoneticiler)
      .set({ silinme_zamani: new Date() })
      .where(eq(yoneticiler.kimlik, hesapKimligi));
    expect(await oturumAcikMi(vt, "yonetici", ilk.anahtarlar)).toBe(false);
  });
});

describe("tam yetkili yönetici açma", () => {
  it("hesabı tam yetkili açar, girişi çalışır; aynı e-posta çakışır", async () => {
    const eposta = yeniEposta();
    const { hesapKimligi } = await tamYetkiliYoneticiAc(vt, { eposta, sifre }, testIslemi);
    expect(await yoneticininIzniVarMi(vt, hesapKimligi, "ekip.rol-ata")).toBe(true);
    expect((await giris(eposta, sifre)).status).toBe(200);
    await expect(tamYetkiliYoneticiAc(vt, { eposta, sifre }, testIslemi)).rejects.toMatchObject({
      kod: "cakisma",
    });
  });
});
