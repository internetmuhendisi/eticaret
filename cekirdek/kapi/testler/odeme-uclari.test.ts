// Ödeme uçları gerçek istek ve gerçek veritabanıyla (kartlar 0213 ve 0214, kararlar 0140 ve 0141):
// - Üye olmayan müşteri robot cevabıyla sipariş verir: yanıtta oturum ve sipariş numarası, sipariş alındı sayfasının
//   erişim çerezi (yalnız o sayfanın yoluna, tarayıcının koduna kapalı); yanıt önbelleğe alınmaz. Hesap açarsa iki oturum
//   çerezi de gelir ve bu çerezle müşteri ucu da çalışır.
// - Sitede kapalı ödeme yöntemiyle sipariş verilmez (is-kurali, yontem-kapali), hiçbir şey yazılmaz.
// - Uydurma robot cevabında, onaysız formda ve tutar taşıyan girdide hiçbir şey yazılmaz (tutar tarayıcıdan gelmez).
// - Üye olmadan alışveriş kapalıyken herkese açık uç oturum-yok döner; giriş yapmış müşteri yine geçer.
// - Müşteri ucu oturumsuz istekte oturum-yok döner.
// - Sipariş takibi (kart 0238): numara (küçük harf, boşluklu) ve e-posta (büyük harf) eşleşince takip çerezi yalnız
//   takip sayfasının yoluna, 30 dakika; veritabanında özeti. Eşleşmeyen e-posta ile olmayan numara aynı cevabı alır.
//   Uydurma robot cevabında takip açılmaz; aynı bağlantıdan altıncı istek sınıra takılır.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { odemeOturumlari } from "../../moduller/odeme/model.ts";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler.ts";
import { girisYap, hesapAc } from "../../moduller/oturum/servis.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { soruyuCoz } from "../../moduller/robot-korumasi/testler/soru-coz.ts";
import { siparisler, siparisTakipErisimleri } from "../../moduller/siparis/model.ts";
import { erisimOzeti } from "../../moduller/siparis/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { odemeUcu } from "../herkese-acik/odeme.ts";
import { siparisTakibiUcu } from "../herkese-acik/siparis-takibi.ts";
import { uyeOdemeUcu } from "../musteri/odeme.ts";
import { oturumCerezleri } from "../oturum-cerezi.ts";

vi.setConfig({ testTimeout: 60_000 });

const yapan = sistemIslemi("test");
const sifre = "uzun-bir-deneme-sifresi";
let vt: Veritabani;
let sil: () => Promise<void>;

const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;
const istek = (yol: string, govde: unknown, basliklar: Record<string, string> = {}) =>
  new Request(`http://yerel/kapi/${yol}`, {
    method: "POST",
    headers: { "x-forwarded-for": yeniAg(), ...basliklar },
    body: JSON.stringify(govde),
  });
const robotCevabi = async () => soruyuCoz(await robotSorusuUret());
const hataKodu = async (yanit: Response) =>
  ((await yanit.json()) as { hata?: { kod: string } }).hata?.kod;

const birimAc = async () => {
  const srv = urunServisi(() => "Europe/Istanbul");
  const urun = await srv.urunEkle(vt, yapan, {
    ad: `Ödeme denemesi ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await srv.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  await siteninFiyatServisi(calisanSite()).fiyatYaz(vt, yapan, birim, { satisFiyati: 10_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 10,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  return birim;
};

const bilgiler = {
  odemeYontemi: { yontem: "havale" },
  teslimat: {
    ad: "Deniz",
    soyad: "Yılmaz",
    telefon: "0555 000 00 00",
    adres: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Atatürk Bulvarı No: 10",
      postaKodu: "06420",
    },
  },
  fatura: { tur: "bireysel", adresAyni: true },
  onBilgilendirmeOnayi: true,
  mesafeliSatisOnayi: true,
  pazarlamaIzni: false,
};

const misafirGovdesi = async (birim: string, ek: Record<string, unknown> = {}) => ({
  eposta: `misafir-${randomBytes(4).toString("hex")}@ornek.test`,
  hesap: { ac: false },
  bilgiler,
  kalemler: [{ birim, adet: 1 }],
  robotCevabi: await robotCevabi(),
  ...ek,
});
const misafir = async (govde: unknown) => odemeUcu(istek("herkese-acik/odeme", govde));
const uye = async (birim: string, cerez: string) =>
  uyeOdemeUcu(
    istek(
      "musteri/odeme",
      { bilgiler, kalemler: [{ birim, adet: 1 }], robotCevabi: await robotCevabi() },
      { cookie: cerez },
    ),
  );
const cerezSatiri = (basliklar: string[]) =>
  basliklar.map((satir) => satir.split(";")[0]).join("; ");
const uyeCerezi = async () => {
  const eposta = `uye-${randomBytes(4).toString("hex")}@ornek.test`;
  await hesapAc(vt, "musteri", { eposta, sifre });
  const giris = await girisYap(vt, "musteri", { eposta, sifre }, 3600);
  if (giris === null) throw new Error("Giriş yapılamadı.");
  return cerezSatiri(oturumCerezleri("musteri", giris.anahtarlar, 3600));
};
const oturumSayisi = async () => (await vt.select().from(odemeOturumlari)).length;

beforeAll(async () => {
  const site = await denemeSitesiAc("odeme-uclari");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
  // Havale bir hesapla açık (kart 0214); kapıda ödeme kapalı.
  await odemeYontemiServisi(calisanSite()).hesapEkle(vt, yapan, {
    banka: "Deneme",
    sahip: "Deneme",
    iban: "TR420001000000000000000001",
  });
});
afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

describe("herkese açık ödeme ucu", () => {
  it("robot cevabıyla sipariş verilir, yanıt önbelleğe alınmaz, yalnız erişim çerezi yazılır", async () => {
    const birim = await birimAc();
    const once = await oturumSayisi();
    const yanit = await misafir(await misafirGovdesi(birim));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("cache-control")).toBe("no-store");
    const { veri } = (await yanit.json()) as { veri: { oturum: string; siparis: string } };
    expect(veri.oturum).toMatch(/^[0-9a-f-]{36}$/);
    expect(veri.siparis).toMatch(/^[A-Z]{2,5}-\d+$/);
    expect(await oturumSayisi()).toBe(once + 1);
    // Erişim çerezi: yalnız sipariş alındı sayfasının yoluna, HttpOnly, Secure; değeri siparişin anahtarıdır.
    const cerezler = yanit.headers.getSetCookie();
    expect(cerezler).toHaveLength(1);
    const [cerez = ""] = cerezler;
    expect(cerez).toMatch(
      /^siparis-erisim=[A-Za-z0-9_-]+; Path=\/siparis-alindi; Max-Age=86400; HttpOnly; Secure; SameSite=Lax$/,
    );
    const anahtar = cerez.split(";")[0]?.split("=")[1] ?? "";
    const [kayit] = await vt.select().from(siparisler).where(eq(siparisler.numara, veri.siparis));
    expect(kayit?.erisim_ozeti).toBe(erisimOzeti(anahtar));
  });

  it("kapalı ödeme yöntemiyle sipariş verilmez, hiçbir şey yazılmaz", async () => {
    const birim = await birimAc();
    const once = await oturumSayisi();
    const yanit = await misafir(
      await misafirGovdesi(birim, {
        bilgiler: { ...bilgiler, odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" } },
      }),
    );
    expect(yanit.status).toBe(422);
    expect(((await yanit.json()) as { hata: { ayrinti: unknown } }).hata.ayrinti).toEqual([
      { alan: "bilgiler.odemeYontemi", kod: "yontem-kapali" },
    ]);
    expect(await oturumSayisi()).toBe(once);
  });

  it("uydurma robot cevabı, onaysız form ve tutar taşıyan girdi hiçbir şey yazmaz", async () => {
    const birim = await birimAc();
    const once = await oturumSayisi();
    expect(await hataKodu(await misafir(await misafirGovdesi(birim, { robotCevabi: "x" })))).toBe(
      "robot-dogrulamasi",
    );
    expect(
      await hataKodu(
        await misafir(
          await misafirGovdesi(birim, { bilgiler: { ...bilgiler, mesafeliSatisOnayi: false } }),
        ),
      ),
    ).toBe("dogrulama");
    expect(await hataKodu(await misafir(await misafirGovdesi(birim, { toplam: 1 })))).toBe(
      "dogrulama",
    );
    expect(await oturumSayisi()).toBe(once);
  });

  it("ödemede hesap açılır: iki oturum çerezi gelir, müşteri ucu bu çerezle çalışır", async () => {
    const birim = await birimAc();
    const yanit = await misafir(
      await misafirGovdesi(birim, {
        hesap: { ac: true, sifre, uyelikOnayi: true, kvkkOnayi: true },
      }),
    );
    expect(yanit.status).toBe(200);
    const cerezler = yanit.headers
      .getSetCookie()
      .filter((satir) => !satir.startsWith("siparis-erisim="));
    expect(cerezler).toHaveLength(2);
    expect((await uye(birim, cerezSatiri(cerezler))).status).toBe(200);
  });

  it("üye olmadan alışveriş kapalıyken oturum-yok döner, oturum yazılmaz; üye yine geçer", async () => {
    const birim = await birimAc();
    const once = await oturumSayisi();
    await siteninServisi(calisanSite()).degistir(vt, yapan, { uyeOlmadanAlisveris: false });
    try {
      const yanit = await misafir(await misafirGovdesi(birim));
      expect(yanit.status).toBe(401);
      expect(await hataKodu(yanit)).toBe("oturum-yok");
      expect(await oturumSayisi()).toBe(once);
      expect((await uye(birim, await uyeCerezi())).status).toBe(200);
    } finally {
      await siteninServisi(calisanSite()).degistir(vt, yapan, { uyeOlmadanAlisveris: true });
    }
  });
});

describe("müşteri ödeme ucu", () => {
  it("oturumsuz istekte oturum-yok döner", async () => {
    const birim = await birimAc();
    const yanit = await uye(birim, "");
    expect(yanit.status).toBe(401);
    expect(await hataKodu(yanit)).toBe("oturum-yok");
  });
});

describe("sipariş takibi ucu", () => {
  const takip = (govde: unknown, ag = yeniAg()) =>
    siparisTakibiUcu(istek("herkese-acik/siparis-takibi", govde, { "x-forwarded-for": ag }));
  const siparisVer = async () => {
    const govde = await misafirGovdesi(await birimAc());
    const yanit = await misafir(govde);
    const { veri } = (await yanit.json()) as { veri: { siparis: string } };
    return { numara: veri.siparis, eposta: govde.eposta };
  };
  const takipSayisi = async () => (await vt.select().from(siparisTakipErisimleri)).length;

  it("numara ve e-posta eşleşince takip çerezi yalnız takip sayfasına yazılır, veritabanında özeti durur", async () => {
    const { numara, eposta } = await siparisVer();
    const yanit = await takip({
      numara: ` ${numara.toLowerCase().replace("-", " - ")} `,
      eposta: eposta.toUpperCase(),
      robotCevabi: await robotCevabi(),
    });
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("cache-control")).toBe("no-store");
    expect(((await yanit.json()) as { veri: { numara: string } }).veri.numara).toBe(numara);
    const [cerez = ""] = yanit.headers.getSetCookie();
    expect(cerez).toMatch(
      /^siparis-takip=[A-Za-z0-9_-]{43}; Path=\/siparis-takibi; Max-Age=1800; HttpOnly; Secure; SameSite=Lax$/,
    );
    const anahtar = cerez.split(";")[0]?.split("=")[1] ?? "";
    const satirlar = await vt.select().from(siparisTakipErisimleri);
    expect(satirlar.some((satir) => satir.ozet === erisimOzeti(anahtar))).toBe(true);
    expect(satirlar.some((satir) => satir.ozet === anahtar)).toBe(false);
  });

  it("eşleşmeyen e-posta ile olmayan numara aynı cevabı alır, takip açılmaz", async () => {
    const { numara } = await siparisVer();
    const once = await takipSayisi();
    const yanlis = await takip({
      numara,
      eposta: "baskasi@ornek.test",
      robotCevabi: await robotCevabi(),
    });
    const olmayan = await takip({
      numara: "ORN-987654321",
      eposta: "baskasi@ornek.test",
      robotCevabi: await robotCevabi(),
    });
    expect(yanlis.status).toBe(404);
    expect(olmayan.status).toBe(404);
    expect(await yanlis.text()).toBe(await olmayan.text());
    expect(yanlis.headers.getSetCookie()).toEqual([]);
    expect(await takipSayisi()).toBe(once);
  });

  it("uydurma robot cevabında takip açılmaz; aynı bağlantıdan altıncı istek sınıra takılır", async () => {
    const { numara, eposta } = await siparisVer();
    const once = await takipSayisi();
    const robotsuz = await takip({ numara, eposta, robotCevabi: "x" });
    expect(await hataKodu(robotsuz)).toBe("robot-dogrulamasi");
    expect(await takipSayisi()).toBe(once);
    const ag = yeniAg();
    const durumlar: number[] = [];
    for (let i = 0; i < 6; i++) {
      durumlar.push(
        (
          await takip(
            { numara, eposta: "baskasi@ornek.test", robotCevabi: await robotCevabi() },
            ag,
          )
        ).status,
      );
    }
    expect(durumlar).toEqual([404, 404, 404, 404, 404, 429]);
  });
});
