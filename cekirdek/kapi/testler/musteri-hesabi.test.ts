// Müşteri kaydı, girişi, çıkışı ve hesabı; gerçek veritabanı ve gerçek yerel posta kutusuyla (kart 0033,
// karar 0051). Yerel veritabanı ve posta kutusu açık olmalı.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { istekSinirlari } from "../../kayitlar/kapi.ts";
import { type MusteriOnayTuru, musteriOnayTurleri } from "../../kayitlar/musteri-onaylari.ts";
import { girisDenemeSiniri, oturumCerezAdlari } from "../../kayitlar/oturum.ts";
import { epostaGondericisi } from "../../moduller/eposta/gonderici.ts";
import { epostaKaydiniGonder } from "../../moduller/eposta/gonderim.ts";
import { epostaKayitlari } from "../../moduller/eposta/model.ts";
import { musteriler, musteriOnaylari, musteriOturumlari } from "../../moduller/musteri/model.ts";
import { musteriKaydet } from "../../moduller/musteri/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { soruyuCoz } from "../../moduller/robot-korumasi/testler/soru-coz.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { musteriCikisUcu } from "../herkese-acik/musteri-cikis.ts";
import { musteriGirisUcu } from "../herkese-acik/musteri-giris.ts";
import { musteriKayitUcu } from "../herkese-acik/musteri-kayit.ts";
import { robotSorusuUcu } from "../herkese-acik/robot-sorusu.ts";
import { musteriHesabimUcu } from "../musteri/hesabim.ts";

const sifre = "uzun-bir-deneme-sifresi";
const pazarlamaTuru: MusteriOnayTuru = "pazarlama";
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const yeniEposta = () => {
  sayac += 1;
  return `musteri${sayac}-${randomBytes(4).toString("hex")}@ornek.test`;
};
const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;

const istek = (yol: string, govde?: unknown, basliklar: Record<string, string> = {}) =>
  new Request(`http://yerel/kapi/${yol}`, {
    method: govde === undefined && yol.endsWith("hesabim") ? "GET" : "POST",
    headers: { "x-forwarded-for": yeniAg(), ...basliklar },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });

const robotCevabi = async () => soruyuCoz(await robotSorusuUret());

const gecerliGirdi = async (eposta = yeniEposta()) => ({
  eposta,
  sifre,
  uyelikOnayi: true,
  kvkkOnayi: true,
  pazarlamaIzni: false,
  robotCevabi: await robotCevabi(),
});

const kayit = (girdi: unknown, basliklar?: Record<string, string>) =>
  musteriKayitUcu(istek("herkese-acik/musteri-kayit", girdi, basliklar));
const giris = (eposta: string, girilen: string, adres = yeniAg()) =>
  musteriGirisUcu(
    istek("herkese-acik/musteri-giris", { eposta, sifre: girilen }, { "x-forwarded-for": adres }),
  );

const cerezBasligi = (yanit: Response) =>
  yanit.headers
    .getSetCookie()
    .map((satir) => satir.split(";")[0])
    .join("; ");
const hesabim = (cerez: string) =>
  musteriHesabimUcu(istek("musteri/hesabim", undefined, { cookie: cerez }));

const hesapSayisi = async (eposta: string) =>
  (await vt.select().from(musteriler).where(eq(musteriler.eposta, eposta))).length;
const onaylar = async (eposta: string) => {
  const satirlar = await vt
    .select({
      tur: musteriOnaylari.tur,
      verildi: musteriOnaylari.verildi,
      metin_surumu: musteriOnaylari.metin_surumu,
    })
    .from(musteriOnaylari)
    .innerJoin(musteriler, eq(musteriler.kimlik, musteriOnaylari.musteri_kimligi))
    .where(eq(musteriler.eposta, eposta));
  return Object.fromEntries(satirlar.map(({ tur, ...kalan }) => [tur, kalan]));
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
  const site = await denemeSitesiAc("musteri");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
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

describe("kayıt", () => {
  it("hesap açar, oturumu başlatır, çerezler güvenlidir", async () => {
    const girdi = await gecerliGirdi();
    const yanit = await kayit(girdi);
    expect(yanit.status).toBe(200);
    const cerezler = yanit.headers.getSetCookie();
    expect(cerezler.map((satir) => satir.split("=")[0])).toEqual([
      oturumCerezAdlari.musteri.kisa,
      oturumCerezAdlari.musteri.yenileme,
    ]);
    for (const satir of cerezler) expect(satir).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    const hesap = await hesabim(cerezBasligi(yanit));
    expect((await hesap.json()).veri).toEqual({ eposta: girdi.eposta });
  });

  it("kendi şemasından geçmeyen pazarlama izni olmadan kayıt açmaz; işaretsizse izin verilmemiş yazılır", async () => {
    const { pazarlamaIzni: _, ...eksik } = await gecerliGirdi();
    expect((await kayit(eksik)).status).toBe(400);
    expect(await hesapSayisi(eksik.eposta)).toBe(0);

    const girdi = await gecerliGirdi();
    expect((await kayit(girdi)).status).toBe(200);
    expect(await onaylar(girdi.eposta)).toEqual({
      "uyelik-sozlesmesi": {
        verildi: true,
        metin_surumu: musteriOnayTurleri["uyelik-sozlesmesi"].metinSurumu,
      },
      "kvkk-aydinlatma": {
        verildi: true,
        metin_surumu: musteriOnayTurleri["kvkk-aydinlatma"].metinSurumu,
      },
      pazarlama: { verildi: false, metin_surumu: musteriOnayTurleri.pazarlama.metinSurumu },
    });
  });

  it("verilen pazarlama izni kaydedilir", async () => {
    const girdi = { ...(await gecerliGirdi()), pazarlamaIzni: true };
    expect((await kayit(girdi)).status).toBe(200);
    expect((await onaylar(girdi.eposta))[pazarlamaTuru]?.verildi).toBe(true);
  });

  it.each([
    ["uyelikOnayi", false],
    ["kvkkOnayi", false],
    ["uyelikOnayi", "true"],
    ["kvkkOnayi", 1],
  ])("zorunlu onay olmadan kayıt açılmaz: %s = %s", async (alan, deger) => {
    const girdi = { ...(await gecerliGirdi()), [alan]: deger };
    const yanit = await kayit(girdi);
    expect(yanit.status).toBe(400);
    expect(await hesapSayisi(girdi.eposta)).toBe(0);
  });

  it("onay kaydı sonradan değiştirilemez, silinemez", async () => {
    const girdi = await gecerliGirdi();
    await kayit(girdi);
    await expect(
      vt.update(musteriOnaylari).set({ verildi: true }).where(sql`true`),
    ).rejects.toMatchObject({ cause: { code: "23001" } });
    await expect(vt.delete(musteriOnaylari).where(sql`true`)).rejects.toMatchObject({
      cause: { code: "23001" },
    });
    await expect(vt.execute(sql`truncate musteri_onaylari`)).rejects.toMatchObject({
      cause: { code: "23001" },
    });
  });

  it("kısa şifre ve bozuk e-posta reddedilir, şifre yanıta ve günlüğe yazılmaz", async () => {
    const satirlar = gunlukYakala();
    const kisa = await kayit({ ...(await gecerliGirdi()), sifre: "kisa" });
    expect(kisa.status).toBe(400);
    expect(await kisa.text()).not.toContain('kisa"');
    expect((await kayit({ ...(await gecerliGirdi()), eposta: "gecersiz" })).status).toBe(400);
    await kayit(await gecerliGirdi());
    expect(satirlar.join("")).not.toContain(sifre);
  });
});

describe("kayıtlı e-posta", () => {
  it("çakışma döner, büyük harfle de; ikinci hesap ve ikinci e-posta olmaz, eski şifre geçerli kalır", async () => {
    const girdi = await gecerliGirdi();
    await kayit(girdi);
    const yanit = await kayit({
      ...(await gecerliGirdi(girdi.eposta.toUpperCase())),
      sifre: "baska-bir-uzun-sifre",
    });
    expect(yanit.status).toBe(409);
    expect((await yanit.json()).hata.kod).toBe("cakisma");
    expect(yanit.headers.getSetCookie()).toEqual([]);
    expect(await hesapSayisi(girdi.eposta)).toBe(1);
    expect(
      await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, girdi.eposta)),
    ).toHaveLength(1);
    expect((await giris(girdi.eposta, sifre)).status).toBe(200);
  });

  it("aynı anda giden iki kayıttan biri geçer", async () => {
    const eposta = yeniEposta();
    const yanitlar = await Promise.all([
      kayit(await gecerliGirdi(eposta)),
      kayit(await gecerliGirdi(eposta)),
    ]);
    expect(yanitlar.map(({ status }) => status).toSorted()).toEqual([200, 409]);
    expect(await hesapSayisi(eposta)).toBe(1);
  });

  it("yönetici hesabı aynı e-postayla müşteri olmayı engellemez", async () => {
    const girdi = await gecerliGirdi();
    await hesapAc(vt, "yonetici", { eposta: girdi.eposta, sifre });
    expect((await kayit(girdi)).status).toBe(200);
  });
});

describe("robot koruması", () => {
  it("cevapsız kayıt açılmaz", async () => {
    const { robotCevabi: _, ...girdi } = await gecerliGirdi();
    expect((await kayit(girdi)).status).toBe(400);
    expect(await hesapSayisi(girdi.eposta)).toBe(0);
  });

  it("uydurma cevapla kayıt açılmaz, kayıtlı e-posta da belli olmaz", async () => {
    const yeni = { ...(await gecerliGirdi()), robotCevabi: "uydurma" };
    const yeniYanit = await kayit(yeni);
    expect(yeniYanit.status).toBe(403);
    expect((await yeniYanit.json()).hata.kod).toBe("robot-dogrulamasi");
    expect(await hesapSayisi(yeni.eposta)).toBe(0);

    const kayitli = await gecerliGirdi();
    await kayit(kayitli);
    const kayitliYanit = await kayit({ ...kayitli, robotCevabi: "uydurma" });
    expect(kayitliYanit.status).toBe(403);
  });

  it("aynı cevapla ikinci hesap açılmaz", async () => {
    const birinci = await gecerliGirdi();
    expect((await kayit(birinci)).status).toBe(200);
    const ikinci = { ...birinci, eposta: yeniEposta() };
    expect((await kayit(ikinci)).status).toBe(403);
    expect(await hesapSayisi(ikinci.eposta)).toBe(0);
  });

  it("uçtan alınan soru çözülünce kayıt açılır", async () => {
    const soru = await robotSorusuUcu(
      new Request("http://yerel/kapi/herkese-acik/robot-sorusu", {
        headers: { "x-forwarded-for": yeniAg() },
      }),
    );
    expect(soru.status).toBe(200);
    const { veri } = await soru.json();
    const girdi = { ...(await gecerliGirdi()), robotCevabi: await soruyuCoz(veri) };
    expect((await kayit(girdi)).status).toBe(200);
  });
});

describe("kapı sınırları", () => {
  it("başka adresten gelen kayıt, giriş ve çıkış reddedilir", async () => {
    const girdi = await gecerliGirdi();
    const sahte = { origin: "https://baska.ornek", "sec-fetch-site": "cross-site" };
    expect((await kayit(girdi, sahte)).status).toBe(403);
    expect(await hesapSayisi(girdi.eposta)).toBe(0);
    expect(
      (
        await musteriGirisUcu(
          istek("herkese-acik/musteri-giris", { eposta: girdi.eposta, sifre }, sahte),
        )
      ).status,
    ).toBe(403);
    expect((await musteriCikisUcu(istek("herkese-acik/musteri-cikis", {}, sahte))).status).toBe(
      403,
    );
  });

  it("kayıt ucunun sıkı istek sınırı dolar", async () => {
    const adres = yeniAg();
    const durumlar: number[] = [];
    for (let sira = 0; sira <= istekSinirlari.siki.istek; sira++) {
      const yanit = await musteriKayitUcu(
        istek("herkese-acik/musteri-kayit", {}, { "x-forwarded-for": adres }),
      );
      durumlar.push(yanit.status);
    }
    expect(durumlar.at(-1)).toBe(429);
    expect(durumlar.slice(0, -1).every((durum) => durum === 400)).toBe(true);
  });
});

describe("işlem bütünlüğü", () => {
  it("son adım olan oturum açılamazsa hesap, onay ve e-posta da kalmaz", async () => {
    const eposta = yeniEposta();
    await expect(
      musteriKaydet(
        vt,
        { eposta, sifre, uyelikOnayi: true, kvkkOnayi: true, pazarlamaIzni: true },
        // Geçersiz süre: oturum satırı yazılamaz, öncekiler çoktan yazılmıştır.
        Number.NaN,
      ),
    ).rejects.toThrow();
    expect(await hesapSayisi(eposta)).toBe(0);
    expect(
      await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, eposta)),
    ).toEqual([]);
  });
});

describe("hoş geldin e-postası", () => {
  const { POSTA_KUTUSU_PORTU: kutuPortu, POSTA_SMTP_PORTU: smtpPortu } = process.env;
  const site = {
    kimlik: { gorunenAd: "Deneme <Mağaza>" },
    ayarlar: { dil: "tr", epostaGonderenAdresi: "gonderen@ornek.test" },
    baslangic: { magazaAdi: "Deneme <Mağaza>" },
  } as unknown as Site;

  it("kayıttan sonra kuyruğa girer ve yerel posta kutusuna düşer", async () => {
    const girdi = await gecerliGirdi();
    expect((await kayit(girdi)).status).toBe(200);
    const [kayitSatiri] = await vt
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.alici, girdi.eposta));
    expect(kayitSatiri?.sablon).toBe("hos-geldin");
    await epostaKaydiniGonder(vt, kayitSatiri?.kimlik ?? "", {
      site,
      gonderici: epostaGondericisi(`smtp://localhost:${smtpPortu}`),
    });
    const yanit = await fetch(
      `http://127.0.0.1:${kutuPortu}/api/v1/search?query=${encodeURIComponent(`to:"${girdi.eposta}"`)}`,
    );
    const { messages } = (await yanit.json()) as {
      messages: { Subject: string; Snippet: string }[];
    };
    expect(messages).toHaveLength(1);
    expect(messages[0]?.Subject).toContain("Deneme <Mağaza>");
    expect(messages[0]?.Snippet).not.toContain(sifre);
  });
});

describe("giriş ve çıkış", () => {
  it("doğru şifre oturum açar, yanlış şifre ile kayıtsız e-postanın cevabı aynıdır", async () => {
    const girdi = await gecerliGirdi();
    await kayit(girdi);
    const dogru = await giris(girdi.eposta, sifre);
    expect(dogru.status).toBe(200);
    expect(dogru.headers.getSetCookie()).toHaveLength(2);

    const yanlis = await giris(girdi.eposta, "yanlis-bir-sifre-burada");
    const kayitsiz = await giris(yeniEposta(), "yanlis-bir-sifre-burada");
    expect(yanlis.status).toBe(401);
    expect(kayitsiz.status).toBe(401);
    expect(await yanlis.text()).toBe(await kayitsiz.text());
    expect(yanlis.headers.getSetCookie()).toEqual([]);
  });

  it("deneme sınırı dolunca doğru şifre de beklemeye girer; kayıtsız e-postada da dolar", async () => {
    const girdi = await gecerliGirdi();
    await kayit(girdi);
    gunlukYakala();
    for (const eposta of [girdi.eposta, yeniEposta()]) {
      const durumlar: number[] = [];
      for (let sira = 0; sira < girisDenemeSiniri.hesap.deneme; sira++) {
        durumlar.push((await giris(eposta, "yanlis-bir-sifre-burada")).status);
      }
      expect(new Set(durumlar)).toEqual(new Set([401]));
      const sonraki = await giris(eposta, sifre);
      expect(sonraki.status).toBe(429);
      expect(Number(sonraki.headers.get("retry-after"))).toBeGreaterThan(0);
    }
  });

  it("çıkış oturumu kapatır, çerezleri siler; eski çerez bir daha geçmez", async () => {
    const girdi = await gecerliGirdi();
    const acilis = await kayit(girdi);
    const cerez = cerezBasligi(acilis);
    expect((await hesabim(cerez)).status).toBe(200);
    const cikis = await musteriCikisUcu(istek("herkese-acik/musteri-cikis", {}, { cookie: cerez }));
    expect(cikis.status).toBe(200);
    for (const satir of cikis.headers.getSetCookie()) expect(satir).toContain("Max-Age=0");
    expect((await hesabim(cerez)).status).toBe(401);
    expect(
      await vt
        .select()
        .from(musteriOturumlari)
        .where(sql`${musteriOturumlari.kapanma_zamani} is null
        and ${musteriOturumlari.hesap_kimligi} = (select kimlik from musteriler where eposta = ${girdi.eposta})`),
    ).toEqual([]);
  });

  it("oturumsuz hesabım isteği oturum yok döner, oturumsuz çıkış hata vermez", async () => {
    expect((await hesabim("")).status).toBe(401);
    expect((await musteriCikisUcu(istek("herkese-acik/musteri-cikis", {}))).status).toBe(200);
  });

  it("müşteri çerezi yönetici çerezi sayılmaz: başka hesap türünde oturum açmaz", async () => {
    const girdi = await gecerliGirdi();
    const cerez = cerezBasligi(await kayit(girdi));
    expect(cerez).not.toContain("yonetici");
    const yonetici = cerez.replaceAll("__Host-musteri", "__Host-yonetici");
    expect((await hesabim(yonetici)).status).toBe(401);
  });
});
