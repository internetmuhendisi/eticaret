// Yöneticinin iki aşamalı girişi gerçek veritabanı ve gerçek uçlarla (kart 0028, karar 0044). Yerel
// veritabanı kutusu açık olmalı.
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  girisAdimiCerezi,
  girisAdimiSuresiSaniye,
  ikiAsamaAyari,
  ikiAsamaDenemeSiniri,
  oturumCerezAdlari,
} from "../../kayitlar/oturum.ts";
import {
  yoneticiGirisAdimlari,
  yoneticiIkiAsama,
  yoneticiler,
  yoneticiOturumlari,
  yoneticiYedekKodlari,
} from "../../moduller/ekip/model.ts";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama.ts";
import { girisAdiminiOku, kurulumuHazirla } from "../../moduller/oturum/iki-asamali-giris.ts";
import {
  anahtarOzeti,
  hesapAc,
  oturumAcikMi,
  oturumuDogrula,
  oturumuYenile,
} from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  girisAdresi,
  kodAdresi,
  kurulumAdresi,
  panelAdresi,
} from "../../yonetim-paneli/adresler.ts";
import { yoneticiCikisUcu } from "../herkese-acik/yonetici-cikis.ts";
import { yoneticiGirisUcu } from "../herkese-acik/yonetici-giris.ts";
import { yoneticiKodUcu } from "../herkese-acik/yonetici-kod.ts";
import { yoneticiKurulumOnayUcu } from "../herkese-acik/yonetici-kurulum-onay.ts";
import { panelYoklamasi } from "../panel-korumasi.ts";

const sifre = "uzun-bir-deneme-sifresi";
const adlar = oturumCerezAdlari.yonetici;
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;

const istek = (yol: string, govde: unknown, cerez?: string, adres = yeniAg()) =>
  new Request(`http://yerel/kapi/herkese-acik/${yol}`, {
    method: "POST",
    headers: { "x-forwarded-for": adres, ...(cerez === undefined ? {} : { cookie: cerez }) },
    body: JSON.stringify(govde),
  });

const cerezBasligi = (yanit: Response) =>
  yanit.headers
    .getSetCookie()
    .map((satir) => satir.split(";")[0])
    .filter((satir) => !satir?.endsWith("="))
    .join("; ");

const adlari = (yanit: Response) =>
  yanit.headers
    .getSetCookie()
    .filter((satir) => !satir.includes("Max-Age=0"))
    .map((satir) => satir.split("=")[0]);

const panel = async (yol: string, cerez?: string) =>
  (
    await panelYoklamasi(
      new Request(`http://yerel${yol}`, { headers: cerez === undefined ? {} : { cookie: cerez } }),
    )
  ).yonlendir;

const yeniYonetici = async () => {
  sayac += 1;
  const eposta = `iki-asama${sayac}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "yonetici", { eposta, sifre });
  return { eposta, hesapKimligi };
};

const sifreAsamasi = async (eposta: string) => {
  const yanit = await yoneticiGirisUcu(istek("yonetici-giris", { eposta, sifre, ...{} }));
  expect(yanit.status).toBe(200);
  const { veri } = (await yanit.json()) as { veri: { sonraki: string } };
  return { cerez: cerezBasligi(yanit), sonraki: veri.sonraki };
};

const anahtarOf = (cerez: string) => cerez.split("=")[1];

const kurulumaHazirla = async (eposta: string) => {
  const { cerez } = await sifreAsamasi(eposta);
  const anahtar = anahtarOf(cerez) ?? "";
  const adim = await girisAdiminiOku(vt, anahtar);
  if (adim === null) throw new Error("Ara adım yok.");
  const kurulum = await kurulumuHazirla(vt, anahtar, adim, "Deneme Mağaza");
  if (kurulum === null) throw new Error("Kurulum yok.");
  return { cerez, gizli: kurulum.gizli };
};

const onayla = (kod: string, cerez: string, adres?: string) =>
  yoneticiKurulumOnayUcu(istek("yonetici-kurulum-onay", { kod }, cerez, adres));
const kodla = (kod: string, cerez: string, adres?: string) =>
  yoneticiKodUcu(istek("yonetici-kod", { kod }, cerez, adres));

// Kurulumu bitmiş yönetici.
const kurulmusYonetici = async () => {
  const { eposta, hesapKimligi } = await yeniYonetici();
  const { cerez, gizli } = await kurulumaHazirla(eposta);
  const adim = kodAdimi();
  const yanit = await onayla(zamanliKod(gizli, adim), cerez);
  expect(yanit.status).toBe(200);
  const { veri } = (await yanit.json()) as { veri: { yedekKodlari: string[] } };
  return { eposta, hesapKimligi, gizli, adim, yedekKodlari: veri.yedekKodlari };
};

const yanlisKod = (dogru: string) => (dogru === "000000" ? "111111" : "000000");

beforeAll(async () => {
  const site = await denemeSitesiAc("ikiasama");
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

const sessiz = () => {
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
};

describe("kurulum", () => {
  it("kurulumu olmayan yönetici şifreden sonra panele değil kurulum ekranına düşer", async () => {
    const { eposta, hesapKimligi } = await yeniYonetici();
    const { cerez, sonraki } = await sifreAsamasi(eposta);
    expect(sonraki).toBe("kurulum");
    expect(await panel(panelAdresi, cerez)).toBe(kurulumAdresi);
    expect(await panel(`${panelAdresi}/urunler?sayfa=2`, cerez)).toBe(
      `${kurulumAdresi}?donus=${encodeURIComponent(`${panelAdresi}/urunler?sayfa=2`)}`,
    );
    expect(await panel(kurulumAdresi, cerez)).toBeNull();
    expect(await panel(kodAdresi, cerez)).toBe(kurulumAdresi);
    const oturumlar = await vt
      .select()
      .from(yoneticiOturumlari)
      .where(eq(yoneticiOturumlari.hesap_kimligi, hesapKimligi));
    expect(oturumlar).toEqual([]);
    expect(await oturumAcikMi(vt, "yonetici", { kisaAnahtar: anahtarOf(cerez) ?? "" })).toBe(false);
  });

  it("ara adım anahtarı oturum çerezinin yerine geçmez", async () => {
    const { eposta } = await yeniYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    const anahtar = anahtarOf(cerez);
    const sahte = `${adlar.kisa}=${anahtar}; ${adlar.yenileme}=${anahtar}`;
    expect(await panel(panelAdresi, sahte)).toBe(girisAdresi);
  });

  it("gizli veritabanında açık durmaz, aynı adımda yenilenen sayfa aynı gizliyi verir", async () => {
    const { eposta, hesapKimligi } = await yeniYonetici();
    const { cerez, gizli } = await kurulumaHazirla(eposta);
    const anahtar = anahtarOf(cerez) ?? "";
    const adim = await girisAdiminiOku(vt, anahtar);
    if (adim === null) throw new Error("Ara adım yok.");
    expect((await kurulumuHazirla(vt, anahtar, adim, "Deneme"))?.gizli).toBe(gizli);
    const [kayit] = await vt
      .select()
      .from(yoneticiGirisAdimlari)
      .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi));
    expect(kayit?.bekleyen_gizli).toBeTruthy();
    expect(kayit?.bekleyen_gizli).not.toContain(gizli);
    // Onaylanmadan kalıcı kayıt açılmaz.
    expect(
      await vt
        .select()
        .from(yoneticiIkiAsama)
        .where(eq(yoneticiIkiAsama.yonetici_kimligi, hesapKimligi)),
    ).toEqual([]);
  });

  it("çalınmış şifreyle görülen gizli, gerçek yöneticinin kurulumundan sonra geçmez", async () => {
    sessiz();
    const { eposta } = await yeniYonetici();
    // Saldırgan şifreyle girer, anahtarı kopyalar, onaylamadan çıkar.
    const saldirgan = await kurulumaHazirla(eposta);
    // Gerçek yönetici kendi girişiyle başka bir anahtar görür ve kurulumu bitirir.
    const gercek = await kurulumaHazirla(eposta);
    expect(gercek.gizli).not.toBe(saldirgan.gizli);
    const adim = kodAdimi();
    expect((await onayla(zamanliKod(gercek.gizli, adim), gercek.cerez)).status).toBe(200);
    // Saldırgan eski adımıyla kurulumu ele geçiremez.
    expect((await onayla(zamanliKod(saldirgan.gizli, adim), saldirgan.cerez)).status).toBe(422);
    // Şifreyle yeniden girip kopyaladığı anahtardan kod üretse de geçmez.
    const yeni = await sifreAsamasi(eposta);
    const kod = zamanliKod(saldirgan.gizli, adim + 1);
    const dogru = zamanliKod(gercek.gizli, adim + 1);
    if (kod !== dogru) expect((await kodla(kod, yeni.cerez)).status).toBe(401);
  });

  it("iki ayrı ara adımdan aynı anda gelen onaydan yalnız biri geçer", async () => {
    sessiz();
    const { eposta, hesapKimligi } = await yeniYonetici();
    const bir = await kurulumaHazirla(eposta);
    const iki = await kurulumaHazirla(eposta);
    const adim = kodAdimi();
    const sonuclar = await Promise.all([
      onayla(zamanliKod(bir.gizli, adim), bir.cerez),
      onayla(zamanliKod(iki.gizli, adim), iki.cerez),
    ]);
    expect(sonuclar.map((yanit) => yanit.status).sort()).toEqual([200, 422]);
    const ozetler = await vt
      .select()
      .from(yoneticiYedekKodlari)
      .where(eq(yoneticiYedekKodlari.yonetici_kimligi, hesapKimligi));
    expect(ozetler).toHaveLength(ikiAsamaAyari.yedekKodSayisi);
  });

  it("yanlış kodla kurulum bitmez, oturum açılmaz; doğru kodla yedek kodlar ve oturum gelir", async () => {
    sessiz();
    const { eposta, hesapKimligi } = await yeniYonetici();
    const { cerez, gizli } = await kurulumaHazirla(eposta);
    const dogru = zamanliKod(gizli, kodAdimi());
    const yanlis = await onayla(yanlisKod(dogru), cerez);
    expect(yanlis.status).toBe(401);
    expect(adlari(yanlis)).toEqual([]);
    expect(await panel(panelAdresi, cerez)).toBe(kurulumAdresi);

    const yanit = await onayla(dogru, cerez);
    expect(yanit.status).toBe(200);
    expect(adlari(yanit)).toEqual([adlar.kisa, adlar.yenileme]);
    const { veri } = (await yanit.json()) as { veri: { yedekKodlari: string[] } };
    expect(veri.yedekKodlari).toHaveLength(ikiAsamaAyari.yedekKodSayisi);
    expect(await panel(panelAdresi, cerezBasligi(yanit))).toBeNull();

    // Yedek kodlar veritabanında açık durmaz, ara adım kapanır.
    const ozetler = await vt
      .select()
      .from(yoneticiYedekKodlari)
      .where(eq(yoneticiYedekKodlari.yonetici_kimligi, hesapKimligi));
    expect(ozetler).toHaveLength(ikiAsamaAyari.yedekKodSayisi);
    for (const kod of veri.yedekKodlari) {
      expect(JSON.stringify(ozetler)).not.toContain(kod);
      expect(JSON.stringify(ozetler)).not.toContain(kod.replace("-", ""));
    }
    expect(await girisAdiminiOku(vt, anahtarOf(cerez))).toBeNull();
  });

  it("biten kurulum yeniden onaylanamaz, gizli bir daha gösterilmez", async () => {
    sessiz();
    const { eposta, gizli, adim } = await kurulmusYonetici();
    const { cerez, sonraki } = await sifreAsamasi(eposta);
    expect(sonraki).toBe("kod");
    expect(await panel(kurulumAdresi, cerez)).toBe(kodAdresi);
    const girisAdimi = await girisAdiminiOku(vt, anahtarOf(cerez));
    if (girisAdimi === null) throw new Error("Ara adım yok.");
    expect(await kurulumuHazirla(vt, anahtarOf(cerez) ?? "", girisAdimi, "Deneme")).toBeNull();
    expect((await onayla(zamanliKod(gizli, adim + 1), cerez)).status).toBe(422);
  });

  it("kurulum ekranı açılmadan onay gelirse oturum açılmaz", async () => {
    sessiz();
    const { eposta } = await yeniYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    const yanit = await onayla("123456", cerez);
    expect(yanit.status).toBe(422);
    expect(adlari(yanit)).toEqual([]);
  });

  it("aynı anda giden iki onaydan yalnız biri geçer, yedek kodlar bir kez üretilir", async () => {
    sessiz();
    const { eposta, hesapKimligi } = await yeniYonetici();
    const { cerez, gizli } = await kurulumaHazirla(eposta);
    const kod = zamanliKod(gizli, kodAdimi());
    const sonuclar = await Promise.all([onayla(kod, cerez), onayla(kod, cerez)]);
    expect(sonuclar.map((yanit) => yanit.status).filter((durum) => durum === 200)).toHaveLength(1);
    const ozetler = await vt
      .select()
      .from(yoneticiYedekKodlari)
      .where(eq(yoneticiYedekKodlari.yonetici_kimligi, hesapKimligi));
    expect(ozetler).toHaveLength(ikiAsamaAyari.yedekKodSayisi);
  });
});

describe("kurulu yöneticinin girişi", () => {
  it("yalnız şifreyle giremez: panele değil kod ekranına düşer, oturum açılmaz", async () => {
    const { eposta, hesapKimligi } = await kurulmusYonetici();
    await vt.delete(yoneticiOturumlari).where(eq(yoneticiOturumlari.hesap_kimligi, hesapKimligi));
    const { cerez, sonraki } = await sifreAsamasi(eposta);
    expect(sonraki).toBe("kod");
    expect(await panel(panelAdresi, cerez)).toBe(kodAdresi);
    expect(await panel(kodAdresi, cerez)).toBeNull();
    const oturumlar = await vt
      .select()
      .from(yoneticiOturumlari)
      .where(eq(yoneticiOturumlari.hesap_kimligi, hesapKimligi));
    expect(oturumlar).toEqual([]);
  });

  it("doğru kodla girer, ara adım kapanır; yanlış kodla giremez", async () => {
    sessiz();
    const { eposta, gizli, adim } = await kurulmusYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    const dogru = zamanliKod(gizli, adim + 1);
    const yanlis = await kodla(yanlisKod(dogru), cerez);
    expect(yanlis.status).toBe(401);
    expect(adlari(yanlis)).toEqual([]);

    const yanit = await kodla(dogru, cerez);
    expect(yanit.status).toBe(200);
    expect(adlari(yanit)).toEqual([adlar.kisa, adlar.yenileme]);
    expect(yanit.headers.getSetCookie().join()).toContain(
      `${girisAdimiCerezi}=; Path=/; Max-Age=0`,
    );
    expect(await panel(panelAdresi, cerezBasligi(yanit))).toBeNull();
    expect(await girisAdiminiOku(vt, anahtarOf(cerez))).toBeNull();
  });

  it("aynı kod ikinci girişte geçmez", async () => {
    sessiz();
    const { eposta, gizli, adim } = await kurulmusYonetici();
    // Kurulumda kullanılan kod.
    const ilk = await sifreAsamasi(eposta);
    expect((await kodla(zamanliKod(gizli, adim), ilk.cerez)).status).toBe(401);
    const dogru = zamanliKod(gizli, adim + 1);
    expect((await kodla(dogru, ilk.cerez)).status).toBe(200);
    const ikinci = await sifreAsamasi(eposta);
    expect((await kodla(dogru, ikinci.cerez)).status).toBe(401);
  });

  it("ara adımsız ya da süresi dolmuş adımla kod denenemez, sayılmaz", async () => {
    sessiz();
    const { eposta, gizli, adim, hesapKimligi } = await kurulmusYonetici();
    const dogru = zamanliKod(gizli, adim + 1);
    expect((await yoneticiKodUcu(istek("yonetici-kod", { kod: dogru }))).status).toBe(401);
    const { cerez } = await sifreAsamasi(eposta);
    await vt
      .update(yoneticiGirisAdimlari)
      .set({ bitis: new Date(Date.now() - 1000) })
      .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi));
    const yanit = await kodla(dogru, cerez);
    expect(yanit.status).toBe(401);
    expect((await yanit.json()).hata.kod).toBe("oturum-yok");
    expect(await panel(panelAdresi, cerez)).toBe(girisAdresi);
    expect(girisAdimiSuresiSaniye).toBeLessThanOrEqual(15 * 60);
  });

  it("silinen yöneticinin ara adımı işe yaramaz", async () => {
    sessiz();
    const { eposta, gizli, adim, hesapKimligi } = await kurulmusYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    await vt
      .update(yoneticiler)
      .set({ silinme_zamani: new Date() })
      .where(eq(yoneticiler.kimlik, hesapKimligi));
    expect((await kodla(zamanliKod(gizli, adim + 1), cerez)).status).toBe(401);
  });

  it("çıkış ara adımı da kapatır", async () => {
    const { eposta, gizli, adim } = await kurulmusYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    const cikis = await yoneticiCikisUcu(
      new Request("http://yerel/kapi/herkese-acik/yonetici-cikis", {
        method: "POST",
        headers: { cookie: cerez },
      }),
    );
    expect(cikis.headers.getSetCookie().join()).toContain(
      `${girisAdimiCerezi}=; Path=/; Max-Age=0`,
    );
    expect((await kodla(zamanliKod(gizli, adim + 1), cerez)).status).toBe(401);
  });
});

describe("yedek kodlar", () => {
  it("yedek kodla girilir, aynı kod ikinci kez reddedilir, başka yedek kod geçer", async () => {
    sessiz();
    const { eposta, yedekKodlari } = await kurulmusYonetici();
    const [ilk, ikinci] = yedekKodlari as [string, string];
    const birinci = await sifreAsamasi(eposta);
    const yanit = await kodla(ilk, birinci.cerez);
    expect(yanit.status).toBe(200);
    expect(adlari(yanit)).toEqual([adlar.kisa, adlar.yenileme]);

    const tekrar = await sifreAsamasi(eposta);
    const reddedilen = await kodla(ilk, tekrar.cerez);
    expect(reddedilen.status).toBe(401);
    expect(adlari(reddedilen)).toEqual([]);
    // Yazılış farkı da kullanılmış kodu geçirmez.
    expect((await kodla(ilk.toUpperCase().replace("-", " "), tekrar.cerez)).status).toBe(401);
    expect((await kodla(ikinci.toUpperCase().replace("-", ""), tekrar.cerez)).status).toBe(200);
  });

  it("aynı anda giden iki istekle aynı yedek kod iki oturum açmaz", async () => {
    sessiz();
    const { eposta, yedekKodlari } = await kurulmusYonetici();
    const kod = yedekKodlari[0] as string;
    const bir = await sifreAsamasi(eposta);
    const iki = await sifreAsamasi(eposta);
    const sonuclar = await Promise.all([kodla(kod, bir.cerez), kodla(kod, iki.cerez)]);
    expect(sonuclar.map((yanit) => yanit.status).sort()).toEqual([200, 401]);
  });

  it("başka yöneticinin yedek kodu geçmez", async () => {
    sessiz();
    const biri = await kurulmusYonetici();
    const oteki = await kurulmusYonetici();
    const { cerez } = await sifreAsamasi(biri.eposta);
    expect((await kodla(oteki.yedekKodlari[0] as string, cerez)).status).toBe(401);
  });

  it("günlüğe kod ve gizli yazılmaz, yedek kodla giriş uyarı olur", async () => {
    const satirlar: string[] = [];
    for (const akim of [process.stdout, process.stderr]) {
      vi.spyOn(akim, "write").mockImplementation((parca) => {
        satirlar.push(String(parca));
        return true;
      });
    }
    const { eposta, gizli, adim, yedekKodlari } = await kurulmusYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    const dogru = zamanliKod(gizli, adim + 1);
    await kodla(yanlisKod(dogru), cerez);
    await kodla(yedekKodlari[0] as string, cerez);
    const metin = satirlar.join("");
    expect(metin).toContain("Yedek kodla giriş yapıldı.");
    expect(metin).toContain("Yanlış kod denemesi.");
    expect(metin).not.toContain(gizli);
    expect(metin).not.toContain(yanlisKod(dogru));
    expect(metin).not.toContain(yedekKodlari[0]);
    expect(metin).not.toContain(eposta);
  });
});

describe("iki aşamadan geçmemiş oturum", () => {
  // Eski sürüm (yayın aralığında, geri dönüşte) şifreyle oturum açar ve bu alanı doldurmaz.
  const damgasizOturum = async () => {
    const { hesapKimligi } = await yeniYonetici();
    const kisa = randomBytes(32).toString("base64url");
    const yenileme = randomBytes(32).toString("base64url");
    const bitis = new Date(Date.now() + 3_600_000);
    await vt.insert(yoneticiOturumlari).values({
      hesap_kimligi: hesapKimligi,
      kisa_anahtar_ozeti: anahtarOzeti(kisa),
      kisa_anahtar_bitis: bitis,
      yenileme_anahtari_ozeti: anahtarOzeti(yenileme),
      oturum_bitis: bitis,
    });
    return { hesapKimligi, kisa, yenileme };
  };

  it("kısa anahtar ve yenileme anahtarı paneli açmaz", async () => {
    const { kisa, yenileme } = await damgasizOturum();
    expect(await panel(panelAdresi, `${adlar.kisa}=${kisa}`)).toBe(girisAdresi);
    expect(await panel(panelAdresi, `${adlar.yenileme}=${yenileme}`)).toBe(girisAdresi);
    expect(await oturumAcikMi(vt, "yonetici", { kisaAnahtar: kisa })).toBe(false);
    expect(await oturumAcikMi(vt, "yonetici", { yenilemeAnahtari: yenileme })).toBe(false);
    expect((await oturumuYenile(vt, "yonetici", yenileme, 3600)).durum).toBe("gecersiz");
    expect(await oturumuDogrula(vt, "yonetici", kisa)).toBeNull();
  });

  it("iki aşamadan geçen oturum damgalıdır", async () => {
    const { hesapKimligi, eposta } = await kurulmusYonetici();
    expect(eposta).toBeTruthy();
    const [oturum] = await vt
      .select()
      .from(yoneticiOturumlari)
      .where(eq(yoneticiOturumlari.hesap_kimligi, hesapKimligi));
    expect(oturum?.iki_asama_zamani).toBeInstanceOf(Date);
  });
});

describe("kod deneme sınırı", () => {
  const { deneme, saniye } = ikiAsamaDenemeSiniri.hesap;

  it("sınır dolunca başka bağlantıdan doğru kod da bekletilir", async () => {
    sessiz();
    const { eposta, gizli, adim } = await kurulmusYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    const dogru = zamanliKod(gizli, adim + 1);
    for (let i = 0; i < deneme; i += 1) {
      expect((await kodla(yanlisKod(dogru), cerez)).status).toBe(401);
    }
    const yanit = await kodla(dogru, cerez);
    expect(yanit.status).toBe(429);
    expect(Number(yanit.headers.get("retry-after"))).toBe(saniye);
    expect(adlari(yanit)).toEqual([]);
  });

  it("şifreyle yeniden girmek deneme hakkı kazandırmaz", async () => {
    sessiz();
    const { eposta, gizli, adim } = await kurulmusYonetici();
    const ilk = await sifreAsamasi(eposta);
    const dogru = zamanliKod(gizli, adim + 1);
    for (let i = 0; i < deneme; i += 1) await kodla(yanlisKod(dogru), ilk.cerez);
    const yeni = await sifreAsamasi(eposta);
    expect((await kodla(dogru, yeni.cerez)).status).toBe(429);
  });

  it("yanlış yedek kod da sayılır, kurulum onayında da sınır çalışır", async () => {
    sessiz();
    const kurulu = await kurulmusYonetici();
    const ilk = await sifreAsamasi(kurulu.eposta);
    for (let i = 0; i < deneme; i += 1) await kodla("yanlis-kodlar", ilk.cerez);
    expect((await kodla(kurulu.yedekKodlari[0] as string, ilk.cerez)).status).toBe(429);

    const { eposta } = await yeniYonetici();
    const { cerez, gizli } = await kurulumaHazirla(eposta);
    const dogru = zamanliKod(gizli, kodAdimi());
    for (let i = 0; i < deneme; i += 1) await onayla(yanlisKod(dogru), cerez);
    expect((await onayla(dogru, cerez)).status).toBe(429);
  });

  it("aynı anda giden yanlış kodlar sınırı aşamaz", async () => {
    sessiz();
    const { eposta, gizli, adim } = await kurulmusYonetici();
    const { cerez } = await sifreAsamasi(eposta);
    const yanlis = yanlisKod(zamanliKod(gizli, adim + 1));
    const sonuclar = await Promise.all(
      Array.from({ length: deneme + 3 }, () => kodla(yanlis, cerez)),
    );
    const durumlar = sonuclar.map((yanit) => yanit.status);
    expect(durumlar.filter((durum) => durum === 401)).toHaveLength(deneme);
    expect(durumlar.filter((durum) => durum === 429)).toHaveLength(3);
  });

  it("doğru kod sayacı sıfırlar", async () => {
    sessiz();
    const { eposta, gizli, adim } = await kurulmusYonetici();
    const ilk = await sifreAsamasi(eposta);
    const dogru = zamanliKod(gizli, adim + 1);
    for (let i = 0; i < deneme - 1; i += 1) await kodla(yanlisKod(dogru), ilk.cerez);
    expect((await kodla(dogru, ilk.cerez)).status).toBe(200);
    const yeni = await sifreAsamasi(eposta);
    for (let i = 0; i < deneme - 1; i += 1) {
      expect((await kodla(yanlisKod(dogru), yeni.cerez)).status).toBe(401);
    }
  });
});

describe("oturum açma yolu", () => {
  const kok = resolve(import.meta.dirname, "../..");
  const dosyalar = (klasor: string): string[] =>
    readdirSync(klasor, { withFileTypes: true }).flatMap((girdi) => {
      if (["node_modules", ".next", "testler"].includes(girdi.name)) return [];
      const yol = join(klasor, girdi.name);
      return girdi.isDirectory() ? dosyalar(yol) : [yol];
    });
  const kullananlar = (ad: RegExp) =>
    dosyalar(kok)
      .filter((yol) => /\.tsx?$/.test(yol) && ad.test(readFileSync(yol, "utf8")))
      .map((yol) => relative(kok, yol).replaceAll("\\", "/"))
      .sort();

  // Yeni bir oturum açma yeri eklenirse bu test kırmızı olur: yönetici oturumu kodsuz açılmamalı.
  it("oturumu yalnız iki aşamalı giriş açar; şifreyle oturum açan işlevi uygulama çağırmaz", () => {
    expect(kullananlar(/\boturumAc\(/)).toEqual([
      "moduller/oturum/iki-asamali-giris.ts",
      "moduller/oturum/servis.ts",
    ]);
    expect(kullananlar(/\bgirisYap\b/)).toEqual(["moduller/oturum/servis.ts"]);
  });
});
