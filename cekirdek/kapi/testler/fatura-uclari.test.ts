// Siparişin faturasının uçları gerçek istek, veritabanı ve dosya klasörüyle (kart 0268, karar 0170):
// - Mağaza sahibi PDF'i yükler (görsel ve sınırı aşan dosya alanın koduyla reddedilir), faturayı yazar; panel dosyayı
//   indirilecek dosya olarak verir: PDF türü, ekli dosya adı, sayfada çalışmaz (sandbox), önbelleğe alınmaz.
// - Görevli faturayı yazar ve indirir (siparis.yonet, siparis.gor); rolsüz yönetici, müşteri ve girişsiz ziyaretçi
//   dört yönetici ucunda reddedilir ve fatura değişmez.
// - Üye yalnız kendi siparişinin dosyasını indirir: başka üyenin, dosyasız ve girişsiz istek reddedilir.
// - Takipte yalnız takip anahtarının siparişinin dosyası verilir: çerezsiz ve başka numara bulunamadı.
// - Kaldırılan faturanın dosyası artık verilmez.
// Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { belgeSinirlari } from "../../kayitlar/dosya.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { soruyuCoz } from "../../moduller/robot-korumasi/testler/soru-coz.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { odemeUcu } from "../herkese-acik/odeme.ts";
import { siparisTakibiUcu, takipFaturaDosyasiUcu } from "../herkese-acik/siparis-takibi.ts";
import { uyeFaturaDosyasiUcu } from "../musteri/fatura.ts";
import { uyeOdemeUcu } from "../musteri/odeme.ts";
import {
  faturaYuklemeUcu,
  panelFaturaDosyasiUcu,
  siparisFaturaKaldirUcu,
  siparisFaturaUcu,
} from "../yonetici/fatura.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

vi.setConfig({ testTimeout: 60_000 });

const yapan = sistemIslemi("test");
let vt: Veritabani;
let sil: () => Promise<void>;
let klasor: string;
let sayac = 0;

beforeAll(async () => {
  const site = await denemeSitesiAc("fatura-uclari");
  vt = site.vt;
  sil = site.sil;
  klasor = mkdtempSync(join(tmpdir(), "fatura-uclari-"));
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv("DOSYA_KLASORU", klasor);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
  await odemeYontemiServisi(calisanSite()).hesapEkle(vt, yapan, {
    banka: "Deneme",
    sahip: "Deneme",
    iban: "TR420001000000000000000001",
  });
}, 60_000);
afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  rmSync(klasor, { recursive: true, force: true });
  await sil();
});

const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;
const post = (yol: string, govde: BodyInit, cerez?: string) =>
  new Request(`http://yerel/kapi/${yol}`, {
    method: "POST",
    headers: { "x-forwarded-for": yeniAg(), ...(cerez === undefined ? {} : { cookie: cerez }) },
    body: govde,
  });
const get = (yol: string, cerez?: string) =>
  new Request(`http://yerel/kapi/${yol}`, {
    headers: { "x-forwarded-for": yeniAg(), ...(cerez === undefined ? {} : { cookie: cerez }) },
  });
const hataKodu = async (yanit: Response) =>
  ((await yanit.json()) as { hata?: { kod: string; ayrinti?: { alan: string; kod: string }[] } })
    .hata;
const veri = async <T>(yanit: Response) => ((await yanit.json()) as { veri: T }).veri;
const pdf = (ek = "") => Buffer.from(`%PDF-1.7\n${ek}\n%%EOF\n`, "latin1");

type Kisi = "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri";
const kisi = async (tur: Kisi) => {
  sayac += 1;
  const hesapTuru = tur === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, hesapTuru, {
    eposta: `fatura${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  if (tur === "magaza-sahibi" || tur === "gorevli") {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, tur));
    if (rol === undefined) throw new Error(`${tur} rolü yok.`);
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return { cerez: await oturumCerezi(vt, hesapTuru, hesapKimligi), hesapKimligi };
};

const birimAc = async () => {
  const srv = urunServisi(() => "Europe/Istanbul");
  const urun = await srv.urunEkle(vt, yapan, {
    ad: `Fatura denemesi ${randomBytes(4).toString("hex")}`,
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
const robotCevabi = async () => soruyuCoz(await robotSorusuUret());
// Üye olmayanın siparişi (e-postasıyla) ya da üyenin siparişi.
const misafirSiparisi = async () => {
  const eposta = `misafir-${randomBytes(4).toString("hex")}@ornek.test`;
  const yanit = await odemeUcu(
    post(
      "herkese-acik/odeme",
      JSON.stringify({
        eposta,
        hesap: { ac: false },
        bilgiler,
        kalemler: [{ birim: await birimAc(), adet: 1 }],
        robotCevabi: await robotCevabi(),
      }),
    ),
  );
  return { numara: (await veri<{ siparis: string }>(yanit)).siparis, eposta };
};
const uyeSiparisi = async (cerez: string) => {
  const yanit = await uyeOdemeUcu(
    post(
      "musteri/odeme",
      JSON.stringify({
        bilgiler,
        kalemler: [{ birim: await birimAc(), adet: 1 }],
        robotCevabi: await robotCevabi(),
      }),
      cerez,
    ),
  );
  return (await veri<{ siparis: string }>(yanit)).siparis;
};

const yukle = (icerik: Uint8Array, cerez?: string) =>
  faturaYuklemeUcu(post("yonetici/fatura-yukle", new Uint8Array(icerik), cerez));
const yaz = (
  numara: string,
  fatura: { numara: string; tarih: string; dosya: string | null },
  cerez?: string,
  gorulen: unknown = null,
) =>
  siparisFaturaUcu(
    post(
      "yonetici/siparis-fatura",
      JSON.stringify({ numara, gorulen, fatura, eposta: false }),
      cerez,
    ),
  );
const faturasi = async (numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  return satir?.fatura_numarasi ?? null;
};

describe("panelin fatura uçları", () => {
  it("mağaza sahibi PDF'i yükler ve faturayı yazar; panel dosyayı indirilecek, önbelleksiz ve sandbox'lı verir; kaldırınca verilmez", async () => {
    const sahip = await kisi("magaza-sahibi");
    const { numara } = await misafirSiparisi();
    const icerik = pdf("panel");
    const yuklenen = await yukle(icerik, sahip.cerez);
    expect(yuklenen.status).toBe(200);
    const { dosya, boyut } = await veri<{ dosya: string; boyut: number }>(yuklenen);
    expect(boyut).toBe(icerik.length);
    const yazilan = await yaz(
      numara,
      { numara: "ORN2026000000142", tarih: "2026-11-17", dosya },
      sahip.cerez,
    );
    expect(yazilan.status).toBe(200);
    expect(await veri(yazilan)).toMatchObject({
      numara,
      fatura: { numara: "ORN2026000000142", tarih: "2026-11-17", dosya: { kimlik: dosya, boyut } },
    });
    const indirilen = await panelFaturaDosyasiUcu(
      get(`yonetici/siparis-faturasi?numara=${numara}`, sahip.cerez),
    );
    expect(indirilen.status).toBe(200);
    expect(indirilen.headers.get("content-type")).toBe("application/pdf");
    expect(indirilen.headers.get("content-disposition")).toBe(
      `attachment; filename="fatura-${numara}.pdf"`,
    );
    expect(indirilen.headers.get("content-security-policy")).toBe("sandbox; default-src 'none'");
    expect(indirilen.headers.get("cache-control")).toBe("private, no-store");
    expect(indirilen.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await indirilen.arrayBuffer()).equals(icerik)).toBe(true);
    // Arada değişen fatura: çakışma.
    const eski = await yaz(
      numara,
      { numara: "F-9", tarih: "2026-11-17", dosya: null },
      sahip.cerez,
    );
    expect(eski.status).toBe(409);
    const kaldirilan = await siparisFaturaKaldirUcu(
      post(
        "yonetici/siparis-fatura-kaldir",
        JSON.stringify({
          numara,
          gorulen: { numara: "ORN2026000000142", tarih: "2026-11-17", dosya },
        }),
        sahip.cerez,
      ),
    );
    expect(kaldirilan.status).toBe(200);
    expect(
      (await panelFaturaDosyasiUcu(get(`yonetici/siparis-faturasi?numara=${numara}`, sahip.cerez)))
        .status,
    ).toBe(404);
  });

  it("görsel, imzasız, boş ve sınırı aşan dosya alanın koduyla reddedilir; numaranın biçimi alanın yoluyla döner", async () => {
    const sahip = await kisi("magaza-sahibi");
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    for (const [icerik, kod] of [
      [png, "tur-izinsiz"],
      [Buffer.from("<html></html>"), "tur-izinsiz"],
      [Buffer.alloc(0), "bos"],
      [Buffer.concat([pdf(), Buffer.alloc(belgeSinirlari.enCokBayt)]), "cok-buyuk"],
    ] as const) {
      const yanit = await yukle(icerik, sahip.cerez);
      expect(yanit.status, kod).toBe(400);
      expect(await hataKodu(yanit)).toMatchObject({
        kod: "dogrulama",
        ayrinti: [{ alan: "dosya", kod }],
      });
    }
    const { numara } = await misafirSiparisi();
    const bozuk = await yaz(
      numara,
      { numara: "fatura@ornek.test", tarih: "2026-11-17", dosya: null },
      sahip.cerez,
    );
    expect(bozuk.status).toBe(400);
    expect((await hataKodu(bozuk))?.ayrinti?.[0]?.alan).toBe("fatura.numara");
    expect(await faturasi(numara)).toBeNull();
  });

  it("görevli yazar ve indirir; rolsüz yönetici, müşteri ve girişsiz ziyaretçi dört uçta reddedilir, fatura değişmez", async () => {
    const gorevli = await kisi("gorevli");
    const { numara } = await misafirSiparisi();
    const yuklenen = await yukle(pdf("gorevli"), gorevli.cerez);
    expect(yuklenen.status).toBe(200);
    const { dosya } = await veri<{ dosya: string }>(yuklenen);
    expect(
      (await yaz(numara, { numara: "F-1", tarih: "2026-11-17", dosya }, gorevli.cerez)).status,
    ).toBe(200);
    expect(
      (
        await panelFaturaDosyasiUcu(
          get(`yonetici/siparis-faturasi?numara=${numara}`, gorevli.cerez),
        )
      ).status,
    ).toBe(200);
    const gorulen = { numara: "F-1", tarih: "2026-11-17", dosya };
    for (const [ad, cerez, kod] of [
      ["rolsüz", (await kisi("rolsuz")).cerez, "yetki"],
      ["müşteri", (await kisi("musteri")).cerez, "oturum-yok"],
      ["girişsiz", undefined, "oturum-yok"],
    ] as const) {
      for (const yanit of [
        await yukle(pdf(), cerez),
        await yaz(numara, { numara: "F-2", tarih: "2026-11-17", dosya: null }, cerez, gorulen),
        await siparisFaturaKaldirUcu(
          post("yonetici/siparis-fatura-kaldir", JSON.stringify({ numara, gorulen }), cerez),
        ),
        await panelFaturaDosyasiUcu(get(`yonetici/siparis-faturasi?numara=${numara}`, cerez)),
      ]) {
        expect((await hataKodu(yanit))?.kod, ad).toBe(kod);
      }
    }
    expect(await faturasi(numara)).toBe("F-1");
  });
});

describe("müşterinin fatura uçları", () => {
  it("üye yalnız kendi siparişinin dosyasını indirir; başka üyenin, dosyasız ve girişsiz istek reddedilir", async () => {
    const sahip = await kisi("magaza-sahibi");
    const uye = await kisi("musteri");
    const baskasi = await kisi("musteri");
    const numara = await uyeSiparisi(uye.cerez);
    const dosyasiz = await uyeSiparisi(uye.cerez);
    const icerik = pdf("uye");
    const { dosya } = await veri<{ dosya: string }>(await yukle(icerik, sahip.cerez));
    await yaz(numara, { numara: "F-1", tarih: "2026-11-17", dosya }, sahip.cerez);
    await yaz(dosyasiz, { numara: "F-2", tarih: "2026-11-17", dosya: null }, sahip.cerez);
    const kendi = await uyeFaturaDosyasiUcu(
      get(`musteri/siparis-faturasi?numara=${numara}`, uye.cerez),
    );
    expect(kendi.status).toBe(200);
    expect(kendi.headers.get("content-disposition")).toBe(
      `attachment; filename="fatura-${numara}.pdf"`,
    );
    expect(kendi.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await kendi.arrayBuffer()).equals(icerik)).toBe(true);
    expect(
      (await uyeFaturaDosyasiUcu(get(`musteri/siparis-faturasi?numara=${numara}`, baskasi.cerez)))
        .status,
    ).toBe(404);
    expect(
      (await uyeFaturaDosyasiUcu(get(`musteri/siparis-faturasi?numara=${dosyasiz}`, uye.cerez)))
        .status,
    ).toBe(404);
    expect(
      (await hataKodu(await uyeFaturaDosyasiUcu(get(`musteri/siparis-faturasi?numara=${numara}`))))
        ?.kod,
    ).toBe("oturum-yok");
  });

  it("takipte yalnız takip anahtarının siparişinin dosyası verilir; çerezsiz ve başka numara bulunamadı", async () => {
    const sahip = await kisi("magaza-sahibi");
    const { numara, eposta } = await misafirSiparisi();
    const oteki = await misafirSiparisi();
    const icerik = pdf("takip");
    const { dosya } = await veri<{ dosya: string }>(await yukle(icerik, sahip.cerez));
    await yaz(numara, { numara: "F-1", tarih: "2026-11-17", dosya }, sahip.cerez);
    const { dosya: otekiDosya } = await veri<{ dosya: string }>(
      await yukle(pdf("oteki"), sahip.cerez),
    );
    await yaz(oteki.numara, { numara: "F-2", tarih: "2026-11-17", dosya: otekiDosya }, sahip.cerez);
    const takip = await siparisTakibiUcu(
      post(
        "herkese-acik/siparis-takibi",
        JSON.stringify({ numara, eposta, robotCevabi: await robotCevabi() }),
      ),
    );
    expect(takip.status).toBe(200);
    // Çerez takip uçlarının yoluna da yazılır (ikinci satır).
    const kapiCerezi = takip.headers
      .getSetCookie()
      .find((satir) => satir.includes("/kapi/herkese-acik/siparis-takibi"));
    const cerez = kapiCerezi?.split(";")[0] ?? "";
    const kendi = await takipFaturaDosyasiUcu(
      get(`herkese-acik/siparis-takibi/fatura?numara=${numara}`, cerez),
    );
    expect(kendi.status).toBe(200);
    expect(kendi.headers.get("content-security-policy")).toBe("sandbox; default-src 'none'");
    expect(Buffer.from(await kendi.arrayBuffer()).equals(icerik)).toBe(true);
    expect(
      (
        await takipFaturaDosyasiUcu(
          get(`herkese-acik/siparis-takibi/fatura?numara=${oteki.numara}`, cerez),
        )
      ).status,
    ).toBe(404);
    expect(
      (await takipFaturaDosyasiUcu(get(`herkese-acik/siparis-takibi/fatura?numara=${numara}`)))
        .status,
    ).toBe(404);
  });
});
