// Siparişleri dışa aktarma uçları gerçek istek ve veritabanıyla (kart 0316, karar 0185):
// - Mağaza sahibi listenin sorgusuyla başlatır (arama ve sayfa yok sayılır), iş dosyayı yazar, durum hazır olur, dosya
//   CSV ve ekli dosya olarak, önbelleğe alınmadan iner. Seçili siparişlerle de başlar; tekrarlı numara reddedilir.
// - Kapsamda sipariş yoksa is-kurali. Başka yöneticinin dosyası bulunamadı, durumu yoktur.
// - Görevli dışa aktarır (siparis.gor); rolsüz yönetici üç uçta yetki, müşteri ve girişsiz ziyaretçi oturum-yok alır,
//   hiçbir şey yazılmaz.
// Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar.ts";
import { odemeServisi } from "../../moduller/odeme/servis.ts";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { calisanDisaAktarmaServisi } from "../../moduller/siparis/isler.ts";
import { siparisDisaAktarmalari } from "../../moduller/siparis/model.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  siparisDisaAktarmaDurumuUcu,
  siparisDisaAktarmaIndirUcu,
  siparisDisaAktarUcu,
} from "../yonetici/siparis-disa-aktarma.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

// Bayt sırası işareti (U+FEFF): CSV dosyası onunla başlar.
const bom = String.fromCharCode(0xfeff);

vi.setConfig({ testTimeout: 60_000 });

const yapan = sistemIslemi("test");
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const site = await denemeSitesiAc("siparis-disa-aktarma-uclari");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await odemeYontemiServisi(calisanSite()).hesapEkle(vt, yapan, {
    banka: "Deneme",
    sahip: "Deneme",
    iban: "TR420001000000000000000001",
  });
}, 60_000);
afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const yeniAg = () =>
  `2001:db8:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;
const post = (govde: unknown, cerez?: string) =>
  new Request("http://yerel/kapi/yonetici/siparisler-disa-aktar", {
    method: "POST",
    headers: { "x-forwarded-for": yeniAg(), ...(cerez === undefined ? {} : { cookie: cerez }) },
    body: JSON.stringify(govde),
  });
const get = (yol: string, cerez?: string) =>
  new Request(`http://yerel/kapi/yonetici/${yol}`, {
    headers: { "x-forwarded-for": yeniAg(), ...(cerez === undefined ? {} : { cookie: cerez }) },
  });
const hata = async (yanit: Response) =>
  ((await yanit.json()) as { hata?: { kod: string; ayrinti?: unknown } }).hata;
const veri = async <T>(yanit: Response) => ((await yanit.json()) as { veri: T }).veri;

type Kisi = "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri";
const kisi = async (tur: Kisi) => {
  sayac += 1;
  const hesapTuru = tur === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, hesapTuru, {
    eposta: `disa${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
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

const siparisVer = async () => {
  const srv = urunServisi(() => "Europe/Istanbul");
  const urun = await srv.urunEkle(vt, yapan, {
    ad: `Dışa aktarma ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  const birim = (await srv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(calisanSite()).fiyatYaz(vt, yapan, birim, { satisFiyati: 10_000 });
  await stokServisi().stokDuzelt(vt, yapan, birim, {
    yeniMiktar: 10,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const sonuc = await odemeServisi(calisanSite()).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta: "musteri@ornek.test", hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
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
      }),
      kalemler: [{ birim, adet: 1 }],
    },
    3600,
  );
  return sonuc.siparis.numara;
};

describe("siparişleri dışa aktarma uçları", () => {
  it("mağaza sahibi listenin sorgusuyla dışa aktarır ve CSV'yi indirir; başkası göremez", async () => {
    const ilk = await siparisVer();
    const ikinci = await siparisVer();
    const sahip = await kisi("magaza-sahibi");
    const baska = await kisi("magaza-sahibi");
    // Arama ve sayfa kapsamda yoktur: aranan metne uymayan sipariş de dosyadadır.
    const yanit = await siparisDisaAktarUcu(
      post(
        { kapsam: { tur: "liste", sorgu: "odeme=havale&ara=hic-yok&sayfa=3" }, duzen: "siparis" },
        sahip.cerez,
      ),
    );
    expect(yanit.status).toBe(200);
    const { kimlik } = await veri<{ kimlik: string }>(yanit);
    const hazirlaniyor = await siparisDisaAktarmaDurumuUcu(
      get("siparisler-disa-aktarma", sahip.cerez),
    );
    expect((await veri<{ disaAktarma: { durum: string } }>(hazirlaniyor)).disaAktarma.durum).toBe(
      "hazirlaniyor",
    );
    await calisanDisaAktarmaServisi().hazirla(vt, kimlik);
    const durum = await siparisDisaAktarmaDurumuUcu(
      get(`siparisler-disa-aktarma?kimlik=${kimlik}`, sahip.cerez),
    );
    expect(await veri(durum)).toEqual({
      disaAktarma: { kimlik, durum: "hazir", duzen: "siparis", siparisSayisi: 2, indirildi: false },
    });
    const indir = await siparisDisaAktarmaIndirUcu(
      get(`siparisler-disa-aktarma-indir?kimlik=${kimlik}`, sahip.cerez),
    );
    expect(indir.status).toBe(200);
    expect(indir.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(indir.headers.get("content-disposition")).toMatch(
      /^attachment; filename="siparisler-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(indir.headers.get("cache-control")).toContain("no-store");
    const icerik = Buffer.from(await indir.arrayBuffer()).toString("utf8");
    expect(icerik.startsWith(bom)).toBe(true);
    expect(icerik).toContain(ilk);
    expect(icerik).toContain(ikinci);
    // Başka yöneticinin dosyası yoktur.
    const baskasi = await siparisDisaAktarmaIndirUcu(
      get(`siparisler-disa-aktarma-indir?kimlik=${kimlik}`, baska.cerez),
    );
    expect(baskasi.status).toBe(404);
    const baskaDurum = await siparisDisaAktarmaDurumuUcu(
      get(`siparisler-disa-aktarma?kimlik=${kimlik}`, baska.cerez),
    );
    expect(await veri(baskaDurum)).toEqual({ disaAktarma: null });
  });

  it("seçili siparişlerle başlar; tekrarlı numara ve boş kapsam reddedilir", async () => {
    const numara = await siparisVer();
    const sahip = await kisi("magaza-sahibi");
    const secili = await siparisDisaAktarUcu(
      post({ kapsam: { tur: "secili", numaralar: [numara] }, duzen: "kalem" }, sahip.cerez),
    );
    expect(secili.status).toBe(200);
    const tekrar = await siparisDisaAktarUcu(
      post({ kapsam: { tur: "secili", numaralar: [numara, numara] }, duzen: "kalem" }, sahip.cerez),
    );
    expect((await hata(tekrar))?.kod).toBe("dogrulama");
    const bos = await siparisDisaAktarUcu(
      post({ kapsam: { tur: "liste", sorgu: "durum=kargoda" }, duzen: "siparis" }, sahip.cerez),
    );
    expect(await hata(bos)).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "kapsam", kod: "siparis-yok" }],
    });
  });

  it("görevli dışa aktarır; rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir, hiçbir şey yazılmaz", async () => {
    await siparisVer();
    const gorevli = await kisi("gorevli");
    const ok = await siparisDisaAktarUcu(
      post({ kapsam: { tur: "liste", sorgu: "" }, duzen: "siparis" }, gorevli.cerez),
    );
    expect(ok.status).toBe(200);
    const once = (await vt.select().from(siparisDisaAktarmalari)).length;
    const rolsuz = await kisi("rolsuz");
    const musteri = await kisi("musteri");
    const govde = { kapsam: { tur: "liste", sorgu: "" }, duzen: "siparis" };
    const kimlik = "00000000-0000-4000-8000-000000000000";
    for (const [cerez, kod] of [
      [rolsuz.cerez, "yetki"],
      [musteri.cerez, "oturum-yok"],
      [undefined, "oturum-yok"],
    ] as const) {
      expect((await hata(await siparisDisaAktarUcu(post(govde, cerez))))?.kod).toBe(kod);
      expect(
        (await hata(await siparisDisaAktarmaDurumuUcu(get("siparisler-disa-aktarma", cerez))))?.kod,
      ).toBe(kod);
      expect(
        (
          await hata(
            await siparisDisaAktarmaIndirUcu(
              get(`siparisler-disa-aktarma-indir?kimlik=${kimlik}`, cerez),
            ),
          )
        )?.kod,
      ).toBe(kod);
    }
    expect((await vt.select().from(siparisDisaAktarmalari)).length).toBe(once);
  });
});
