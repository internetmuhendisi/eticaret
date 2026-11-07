// Şifre sıfırlama uçları gerçek veritabanıyla, müşteri ve yönetici için (kart 0034, karar 0052).
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { istekSinirlari } from "../../kayitlar/kapi.ts";
import { type HesapTuru, sifreSifirlamaAyari } from "../../kayitlar/oturum.ts";
import { degisiklikKayitlari } from "../../moduller/degisiklik-kaydi/model.ts";
import {
  yoneticiGirisAdimlari,
  yoneticiler,
  yoneticiSifreSifirlamalari,
} from "../../moduller/ekip/model.ts";
import { epostaKayitlari } from "../../moduller/eposta/model.ts";
import {
  musteriler,
  musteriOturumlari,
  musteriSifreSifirlamalari,
} from "../../moduller/musteri/model.ts";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama.ts";
import { girisAdiminiOku, kurulumuHazirla } from "../../moduller/oturum/iki-asamali-giris.ts";
import {
  anahtarOzeti,
  girisYap,
  hesapAc,
  hesapSifresiniDogrula,
  oturumAc,
  oturumAcikMi,
  oturumuDogrula,
  oturumuYenile,
  sifreDegismediyse,
} from "../../moduller/oturum/servis.ts";
import { sifreSifirlamaIste } from "../../moduller/oturum/sifre-sifirlama.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { soruyuCoz } from "../../moduller/robot-korumasi/testler/soru-coz.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { musteriGirisUcu } from "../herkese-acik/musteri-giris.ts";
import {
  musteriSifreSifirlamaUcu,
  musteriSifreYenileUcu,
  yoneticiSifreSifirlamaUcu,
  yoneticiSifreYenileUcu,
} from "../herkese-acik/sifre-sifirlama.ts";
import { yoneticiGirisUcu } from "../herkese-acik/yonetici-giris.ts";
import { yoneticiKurulumOnayUcu } from "../herkese-acik/yonetici-kurulum-onay.ts";

const eskiSifre = "eski-uzun-bir-sifre";
const yeniSifre = "yeni-uzun-bir-sifre";
const siteAdresi = "https://site.ornek";
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const uclar = {
  musteri: {
    iste: musteriSifreSifirlamaUcu,
    yenile: musteriSifreYenileUcu,
    giris: musteriGirisUcu,
    tablo: musteriSifreSifirlamalari,
    hesap: musteriler,
  },
  yonetici: {
    iste: yoneticiSifreSifirlamaUcu,
    yenile: yoneticiSifreYenileUcu,
    giris: yoneticiGirisUcu,
    tablo: yoneticiSifreSifirlamalari,
    hesap: yoneticiler,
  },
} as const;
const turler: HesapTuru[] = ["musteri", "yonetici"];

const yeniEposta = () => {
  sayac += 1;
  return `sifirlama${sayac}-${randomBytes(4).toString("hex")}@ornek.test`;
};
const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;
const post = (yol: string, govde: unknown, basliklar: Record<string, string> = {}) =>
  new Request(`http://yerel/kapi/herkese-acik/${yol}`, {
    method: "POST",
    headers: { "x-forwarded-for": yeniAg(), ...basliklar },
    body: JSON.stringify(govde),
  });
const robotCevabi = async () => soruyuCoz(await robotSorusuUret());

const iste = async (tur: HesapTuru, eposta: string, basliklar?: Record<string, string>) =>
  uclar[tur].iste(post("iste", { eposta, robotCevabi: await robotCevabi() }, basliklar));
const yenile = (tur: HesapTuru, anahtar: string, sifre = yeniSifre) =>
  uclar[tur].yenile(post("yenile", { anahtar, sifre }));
const giris = (tur: HesapTuru, eposta: string, sifre: string) =>
  uclar[tur].giris(post("giris", { eposta, sifre }));

const epostalar = (alici: string) =>
  vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, alici));
const sonBaglanti = async (alici: string) => {
  const satirlar = (await epostalar(alici)).filter(({ sablon }) => sablon === "sifre-sifirlama");
  const { baglanti } = (satirlar.at(-1)?.degiskenler ?? {}) as { baglanti?: string };
  if (baglanti === undefined) throw new Error("bağlantı yok");
  return new URL(baglanti);
};
const anahtarAl = (adres: URL) => new URLSearchParams(adres.hash.slice(1)).get("anahtar") ?? "";

// Hesap açar, sıfırlama ister, anahtarı döner.
const hazirla = async (tur: HesapTuru) => {
  const eposta = yeniEposta();
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
  expect((await iste(tur, eposta)).status).toBe(200);
  return { eposta, hesapKimligi, anahtar: anahtarAl(await sonBaglanti(eposta)) };
};

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
  const site = await denemeSitesiAc("sifirlama");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv("SITE_ADRESI", `${siteAdresi}/`);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
}, 60_000);
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
}, 60_000);

describe.each(turler)("%s: istek", (tur) => {
  it("kayıtlı ve kayıtsız e-postanın cevabı aynıdır, ikisi de en kısa süreyi bekler; kayıtsıza e-posta gitmez", async () => {
    const kayitli = yeniEposta();
    const kayitsiz = yeniEposta();
    await hesapAc(vt, tur, { eposta: kayitli, sifre: eskiSifre });
    const olc = async (eposta: string) => {
      const girdi = post("iste", { eposta, robotCevabi: await robotCevabi() });
      const bas = performance.now();
      const yanit = await uclar[tur].iste(girdi);
      return { yanit, sure: performance.now() - bas };
    };
    const a = await olc(kayitli);
    const b = await olc(kayitsiz);
    expect([a.yanit.status, b.yanit.status]).toEqual([200, 200]);
    expect(await a.yanit.text()).toBe(await b.yanit.text());
    expect(a.yanit.headers.getSetCookie()).toEqual([]);
    expect(b.yanit.headers.getSetCookie()).toEqual([]);
    // Zamanlayıcı birkaç milisaniye erken uyanabilir.
    expect(a.sure).toBeGreaterThanOrEqual(sifreSifirlamaAyari.enAzCevapMs - 5);
    expect(b.sure).toBeGreaterThanOrEqual(sifreSifirlamaAyari.enAzCevapMs - 5);
    expect(await epostalar(kayitli)).toHaveLength(1);
    expect(await epostalar(kayitsiz)).toHaveLength(0);
  });

  it("kapalı hesaba e-posta gitmez", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
    await vt
      .update(uclar[tur].hesap)
      .set({ silinme_zamani: new Date() })
      .where(eq(uclar[tur].hesap.eposta, eposta));
    expect((await iste(tur, eposta)).status).toBe(200);
    expect(await epostalar(eposta)).toHaveLength(0);
  });

  it("robot cevabı olmadan e-posta gitmez", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
    expect((await uclar[tur].iste(post("iste", { eposta }))).status).toBe(400);
    expect((await uclar[tur].iste(post("iste", { eposta, robotCevabi: "uydurma" }))).status).toBe(
      403,
    );
    expect(await epostalar(eposta)).toHaveLength(0);
  });

  it("bağlantı sitenin adresindedir, istekteki adrese uymaz; anahtar # sonrasındadır, veritabanında özeti durur", async () => {
    const eposta = yeniEposta();
    const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
    await iste(tur, eposta, { host: "kotu.ornek", "x-forwarded-host": "kotu.ornek" });
    const adres = await sonBaglanti(eposta);
    expect(adres.origin).toBe(siteAdresi);
    expect(adres.search).toBe("");
    const anahtar = anahtarAl(adres);
    expect(anahtar.length).toBeGreaterThan(40);
    const [satir] = await vt
      .select()
      .from(uclar[tur].tablo)
      .where(eq(uclar[tur].tablo.hesap_kimligi, hesapKimligi));
    expect(JSON.stringify(satir)).not.toContain(anahtar);
    const [kuyruk] = await epostalar(eposta);
    expect(kuyruk?.sablon).toBe("sifre-sifirlama");
  });

  it("hesap sınırı dolunca cevap aynı kalır, e-posta gitmez", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
    gunlukYakala();
    for (let sira = 0; sira < sifreSifirlamaAyari.hesap.deneme; sira++) await iste(tur, eposta);
    const fazla = await iste(tur, eposta);
    expect(fazla.status).toBe(200);
    expect(await epostalar(eposta)).toHaveLength(sifreSifirlamaAyari.hesap.deneme);
  });

  it("istek ucunun sıkı sınırı dolar", async () => {
    const adres = yeniAg();
    const durumlar: number[] = [];
    for (let sira = 0; sira <= istekSinirlari.siki.istek; sira++) {
      durumlar.push((await uclar[tur].iste(post("iste", {}, { "x-forwarded-for": adres }))).status);
    }
    expect(durumlar.at(-1)).toBe(429);
  });
});

describe.each(turler)("%s: yeni şifre", (tur) => {
  it("yeni şifre geçer, eskisi geçmez, 'şifreniz değişti' kuyruğa girer, oturum açılmaz", async () => {
    const { eposta, anahtar } = await hazirla(tur);
    const yanit = await yenile(tur, anahtar);
    expect(yanit.status).toBe(200);
    expect(yanit.headers.getSetCookie()).toEqual([]);
    expect((await giris(tur, eposta, yeniSifre)).status).toBe(200);
    expect((await giris(tur, eposta, eskiSifre)).status).toBe(401);
    expect((await epostalar(eposta)).map(({ sablon }) => sablon)).toContain("sifre-degisti");
  });

  it("kullanılmış bağlantı reddedilir", async () => {
    const { eposta, anahtar } = await hazirla(tur);
    expect((await yenile(tur, anahtar)).status).toBe(200);
    expect((await yenile(tur, anahtar, "baska-uzun-bir-sifre")).status).toBe(422);
    expect((await giris(tur, eposta, yeniSifre)).status).toBe(200);
  });

  it("süresi dolmuş bağlantı reddedilir", async () => {
    const { eposta, anahtar, hesapKimligi } = await hazirla(tur);
    await vt
      .update(uclar[tur].tablo)
      .set({ bitis: new Date(Date.now() - 1000) })
      .where(eq(uclar[tur].tablo.hesap_kimligi, hesapKimligi));
    expect((await yenile(tur, anahtar)).status).toBe(422);
    expect((await giris(tur, eposta, eskiSifre)).status).toBe(200);
  });

  it("bağlantının süresi ayardaki kadardır", async () => {
    const { hesapKimligi } = await hazirla(tur);
    const [satir] = await vt
      .select()
      .from(uclar[tur].tablo)
      .where(eq(uclar[tur].tablo.hesap_kimligi, hesapKimligi));
    const kalan = (satir?.bitis.getTime() ?? 0) - Date.now();
    expect(kalan).toBeLessThanOrEqual(sifreSifirlamaAyari.gecerlilikSaniye * 1000);
    expect(kalan).toBeGreaterThan((sifreSifirlamaAyari.gecerlilikSaniye - 60) * 1000);
  });

  it("uydurma anahtar reddedilir, yeni istek eski bağlantıyı geçersiz kılar", async () => {
    expect((await yenile(tur, "uydurma-bir-anahtar")).status).toBe(422);
    const { eposta, anahtar: eski } = await hazirla(tur);
    await iste(tur, eposta);
    const yeni = anahtarAl(await sonBaglanti(eposta));
    expect(yeni).not.toBe(eski);
    expect((await yenile(tur, eski)).status).toBe(422);
    expect((await yenile(tur, yeni)).status).toBe(200);
  });

  it("şifre değişince hesabın öteki bağlantıları da geçmez", async () => {
    const { eposta, anahtar, hesapKimligi } = await hazirla(tur);
    await vt.insert(uclar[tur].tablo).values({
      hesap_kimligi: hesapKimligi,
      anahtar_ozeti: anahtarOzeti("ikinci-bir-anahtar"),
      bitis: new Date(Date.now() + 60_000),
    });
    expect((await yenile(tur, anahtar)).status).toBe(200);
    expect((await yenile(tur, "ikinci-bir-anahtar", "baska-uzun-bir-sifre")).status).toBe(422);
    expect((await giris(tur, eposta, yeniSifre)).status).toBe(200);
  });

  it("kısa şifre bağlantıyı harcamaz", async () => {
    const { anahtar } = await hazirla(tur);
    expect((await yenile(tur, anahtar, "kisa")).status).toBe(400);
    expect((await yenile(tur, anahtar)).status).toBe(200);
  });

  it("aynı anda giden iki istekten biri geçer", async () => {
    const { anahtar } = await hazirla(tur);
    const yanitlar = await Promise.all([
      yenile(tur, anahtar),
      yenile(tur, anahtar, "baska-uzun-bir-sifre"),
    ]);
    expect(yanitlar.map(({ status }) => status).toSorted()).toEqual([200, 422]);
  });

  it("eski oturumun iki anahtarı da geçmez", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
    const oturum = await girisYap(vt, tur, { eposta, sifre: eskiSifre }, 3600);
    if (oturum === null) throw new Error("oturum açılmadı");
    const { kisaAnahtar, yenilemeAnahtari } = oturum.anahtarlar;
    expect(await oturumAcikMi(vt, tur, oturum.anahtarlar)).toBe(true);
    await iste(tur, eposta);
    await yenile(tur, anahtarAl(await sonBaglanti(eposta)));
    expect(await oturumuDogrula(vt, tur, kisaAnahtar)).toBeNull();
    expect((await oturumuYenile(vt, tur, yenilemeAnahtari, 3600)).durum).toBe("gecersiz");
    expect(await oturumAcikMi(vt, tur, oturum.anahtarlar)).toBe(false);
  });

  it("anahtar ve şifre günlüğe yazılmaz, e-posta kısaltılır", async () => {
    const satirlar = gunlukYakala();
    const { eposta, anahtar } = await hazirla(tur);
    await yenile(tur, anahtar);
    const metin = satirlar.join("");
    expect(metin).toContain("Şifre sıfırlandı");
    expect(metin).not.toContain(anahtar);
    expect(metin).not.toContain(yeniSifre);
    expect(metin).not.toContain(eposta);
  });
});

describe("aynı anda giden işler", () => {
  const bekle = (ms: number) => new Promise((coz) => setTimeout(coz, ms));

  it("müşteri: sıfırlamayla üst üste binen eski şifreli giriş açık oturum bırakmaz", async () => {
    gunlukYakala();
    for (let tur = 0; tur < 6; tur++) {
      const { eposta, anahtar, hesapKimligi } = await hazirla("musteri");
      let bitti = false;
      const yenileme = yenile("musteri", anahtar).then((yanit) => {
        bitti = true;
        return yanit;
      });
      const girisler: Promise<Response>[] = [];
      while (!bitti) {
        girisler.push(giris("musteri", eposta, eskiSifre));
        await bekle(5);
      }
      expect((await yenileme).status).toBe(200);
      await Promise.all(girisler);
      expect(
        await vt
          .select()
          .from(musteriOturumlari)
          .where(
            and(
              eq(musteriOturumlari.hesap_kimligi, hesapKimligi),
              isNull(musteriOturumlari.kapanma_zamani),
            ),
          ),
      ).toEqual([]);
    }
  }, 60_000);

  it("yönetici: sıfırlamayla üst üste binen eski şifreli giriş ara adım bırakmaz", async () => {
    gunlukYakala();
    for (let tur = 0; tur < 6; tur++) {
      const { eposta, anahtar, hesapKimligi } = await hazirla("yonetici");
      let bitti = false;
      const yenileme = yenile("yonetici", anahtar).then((yanit) => {
        bitti = true;
        return yanit;
      });
      const girisler: Promise<Response>[] = [];
      while (!bitti) {
        girisler.push(giris("yonetici", eposta, eskiSifre));
        await bekle(5);
      }
      expect((await yenileme).status).toBe(200);
      await Promise.all(girisler);
      expect(
        await vt
          .select()
          .from(yoneticiGirisAdimlari)
          .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi)),
      ).toEqual([]);
    }
  }, 60_000);

  it("şifre doğrulandıktan sonra değiştiyse oturum açılmaz", async () => {
    const { eposta, anahtar, hesapKimligi } = await hazirla("musteri");
    const dogrulanan = await hesapSifresiniDogrula(vt, "musteri", { eposta, sifre: eskiSifre });
    if (dogrulanan === null) throw new Error("şifre doğrulanmadı");
    await yenile("musteri", anahtar);
    await expect(
      sifreDegismediyse(vt, "musteri", dogrulanan, (islem) =>
        oturumAc(islem, "musteri", hesapKimligi, 3600),
      ),
    ).rejects.toMatchObject({ kod: "giris-hatasi" });
  });

  it.each(turler)("%s: aynı anda iki istek tek canlı bağlantı bırakır", async (tur) => {
    const eposta = yeniEposta();
    const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
    await Promise.all([iste(tur, eposta), iste(tur, eposta)]);
    expect(
      await vt
        .select()
        .from(uclar[tur].tablo)
        .where(eq(uclar[tur].tablo.hesap_kimligi, hesapKimligi)),
    ).toHaveLength(1);
  });

  it.each(turler)(
    "%s: günlük e-posta sınırı dolar",
    async (tur) => {
      const eposta = yeniEposta();
      await hesapAc(vt, tur, { eposta, sifre: eskiSifre });
      gunlukYakala();
      const { hesap, hesapGunluk } = sifreSifirlamaAyari;
      vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
      try {
        for (let sira = 0; sira < hesapGunluk.deneme + hesap.deneme; sira++) {
          await sifreSifirlamaIste(vt, tur, { eposta }, "/yol");
          // 15 dakikalık sınıra takılmasın diye süre ilerler.
          vi.setSystemTime(Date.now() + ((hesap.saniye + 1) * 1000) / (hesap.deneme - 1));
        }
      } finally {
        vi.useRealTimers();
      }
      expect(await epostalar(eposta)).toHaveLength(hesapGunluk.deneme);
    },
    30_000,
  );
});

describe("hesap türleri karışmaz", () => {
  it("müşteri bağlantısı yönetici ucunda, yönetici bağlantısı müşteri ucunda geçmez", async () => {
    const musteri = await hazirla("musteri");
    const yonetici = await hazirla("yonetici");
    expect((await yenile("yonetici", musteri.anahtar)).status).toBe(422);
    expect((await yenile("musteri", yonetici.anahtar)).status).toBe(422);
  });

  it("aynı e-posta iki tarafta da varsa yalnız istenen hesabın şifresi değişir", async () => {
    const eposta = yeniEposta();
    await hesapAc(vt, "musteri", { eposta, sifre: eskiSifre });
    await hesapAc(vt, "yonetici", { eposta, sifre: eskiSifre });
    await iste("musteri", eposta);
    await yenile("musteri", anahtarAl(await sonBaglanti(eposta)));
    expect((await giris("musteri", eposta, yeniSifre)).status).toBe(200);
    expect((await giris("yonetici", eposta, eskiSifre)).status).toBe(200);
  });

  it("müşteri bağlantısı panelin adresine, yönetici bağlantısı panele gider", async () => {
    const musteri = await hazirla("musteri");
    const yonetici = await hazirla("yonetici");
    expect((await sonBaglanti(musteri.eposta)).pathname).toBe("/sifre-yenile");
    expect((await sonBaglanti(yonetici.eposta)).pathname).toBe("/yonetim/giris/sifre-yenile");
  });
});

describe("yöneticinin iki aşamalı girişi", () => {
  const cerezBasligi = (yanit: Response) =>
    yanit.headers
      .getSetCookie()
      .map((satir) => satir.split(";")[0])
      .join("; ");

  const kurulumBitir = async (eposta: string, sifre: string) => {
    const ilk = await giris("yonetici", eposta, sifre);
    const cerez = cerezBasligi(ilk);
    const anahtar = cerez.split("=")[1] ?? "";
    const adim = await girisAdiminiOku(vt, anahtar);
    if (adim === null) throw new Error("ara adım yok");
    const kurulum = await kurulumuHazirla(vt, anahtar, adim, "Deneme");
    if (kurulum === null) throw new Error("kurulum yok");
    const onay = await yoneticiKurulumOnayUcu(
      post("onay", { kod: zamanliKod(kurulum.gizli, kodAdimi()) }, { cookie: cerez }),
    );
    expect(onay.status).toBe(200);
  };

  it("sıfırlamadan sonra yeni şifre yine kod ister, oturum açmaz", async () => {
    const { eposta, anahtar } = await hazirla("yonetici");
    await kurulumBitir(eposta, eskiSifre);
    expect((await yenile("yonetici", anahtar)).status).toBe(200);
    const yanit = await giris("yonetici", eposta, yeniSifre);
    expect((await yanit.json()).veri).toEqual({ sonraki: "kod" });
    expect(yanit.headers.getSetCookie().some((satir) => satir.includes("yonetici-oturum"))).toBe(
      false,
    );
  });

  it("kurulumu yapmamış yönetici kurulum ekranına düşer", async () => {
    const { eposta, anahtar } = await hazirla("yonetici");
    await yenile("yonetici", anahtar);
    expect((await (await giris("yonetici", eposta, yeniSifre)).json()).veri).toEqual({
      sonraki: "kurulum",
    });
  });

  it("eski şifreyle açılmış yarım giriş adımı silinir", async () => {
    const { eposta, anahtar, hesapKimligi } = await hazirla("yonetici");
    const ilk = await giris("yonetici", eposta, eskiSifre);
    const adimAnahtari = cerezBasligi(ilk).split("=")[1];
    expect(await girisAdiminiOku(vt, adimAnahtari)).not.toBeNull();
    await yenile("yonetici", anahtar);
    expect(await girisAdiminiOku(vt, adimAnahtari)).toBeNull();
    expect(
      await vt
        .select()
        .from(yoneticiGirisAdimlari)
        .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi)),
    ).toEqual([]);
  });

  it("değişiklik kaydına yazılır, şifre ve e-posta taşımaz", async () => {
    const { anahtar, hesapKimligi } = await hazirla("yonetici");
    await yenile("yonetici", anahtar);
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, hesapKimligi),
          eq(degisiklikKayitlari.islem, "yonetici.sifre-sifirlandi"),
        ),
      );
    expect(kayitlar).toHaveLength(1);
    expect(kayitlar[0]?.kim_kimligi).toBe(hesapKimligi);
    expect(kayitlar[0]?.yeni_deger).toBeNull();
  });
});
