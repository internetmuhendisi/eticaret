// Mağaza bilgileri ucu gerçek istek ve veritabanıyla (kart 0278, karar 0175): mağaza sahibi bütün bilgileri kaydeder;
// yeni bilgiler vitrinin bağlamında (alt kısmın iletişim ve sosyal hesap bölümleri, mağaza adı) ve sipariş fişinin
// mağaza bilgisinde hemen görünür. Hatalı alan alanın yolu ve koduyla 400 alır, hiçbir şey yazılmaz. Görevli, rolsüz
// yönetici, müşteri ve girişsiz ziyaretçi reddedilir, ayarlar değişmez. Her rolün erişimini ayrıca
// rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import type { MagazaBilgileriGirdisi } from "../../moduller/magaza-ayarlari/semalar.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { vitrinBaglaminiOku } from "../../vitrin/baglam-oku.ts";
import { bolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import { siparisFisleriVerisi } from "../../yonetim-paneli/siparisler/fis-verisi.ts";
import { magazaBilgileriUcu } from "../yonetici/magaza-bilgileri.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("magaza-bilgileri-uclari");
  vt = deneme.vt;
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  await baglantiyiKapat();
}, 60_000);
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const hesap = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri") => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const eposta = `magaza-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: "uzun-bir-deneme-sifresi" });
  if (kisi === "magaza-sahibi" || kisi === "gorevli") {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi));
    if (rol === undefined) throw new Error(`${kisi} rolü yok.`);
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return oturumCerezi(vt, tur, hesapKimligi);
};

const istek = (oturum: string | undefined, govde: unknown) =>
  new Request("http://magaza.ornek.test/kapi/yonetici/magaza-bilgileri", {
    method: "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    body: JSON.stringify(govde),
  });

const girdi = (ek: Partial<MagazaBilgileriGirdisi> = {}): MagazaBilgileriGirdisi => ({
  magazaAdi: "Uç Dükkânı",
  iletisimEpostasi: "uc@deneme.test",
  iletisimTelefonu: "0312 222 22 22",
  magazaAdresi: {
    ulke: "TR",
    il: "TR-06",
    ilce: "TR-06-007",
    adres: "Uç Sokak No: 5",
    postaKodu: "06420",
  },
  sosyalHesaplar: [{ site: "instagram", hesap: "ucdukkan" }],
  saticiBilgileri: {
    ulke: "TR",
    isletmeTuru: "sirket",
    unvan: "Uç Ticaret A.Ş.",
    vergiDairesi: "Kavaklıdere",
    vergiNumarasi: "1111111114",
    mersisNumarasi: "",
    ticaretSicilNumarasi: "",
    kepAdresi: "",
  },
  ...ek,
});

describe("mağaza bilgileri ucu", () => {
  it("mağaza sahibi kaydeder; vitrinin bağlamında ve sipariş fişinde hemen görünür", async () => {
    const sahip = await hesap("magaza-sahibi");
    const yanit = await magazaBilgileriUcu(istek(sahip, girdi()));
    expect(yanit.status).toBe(200);
    const baglam = await vitrinBaglaminiOku(vt, site, [], bolumKutuphanesi);
    expect(baglam.magazaAdi).toBe("Uç Dükkânı");
    expect(baglam.iletisim).toMatchObject({
      telefon: { metin: "+90 312 222 22 22", adres: "tel:+903122222222" },
      eposta: { metin: "uc@deneme.test", adres: "mailto:uc@deneme.test" },
    });
    expect(JSON.stringify(baglam.iletisim)).toContain("Uç Sokak No: 5");
    expect(JSON.stringify(baglam)).toContain("https://www.instagram.com/ucdukkan");
    const fis = await siparisFisleriVerisi([]);
    expect(fis.magaza).toMatchObject({
      ad: "Uç Dükkânı",
      unvan: "Uç Ticaret A.Ş.",
      telefon: "+90 312 222 22 22",
      eposta: "uc@deneme.test",
      vergiDairesi: "Kavaklıdere",
      vergiNumarasi: "1111111114",
      mersisNumarasi: null,
    });
    expect(fis.magaza.adres).toContain("Uç Sokak No: 5");
  });

  it("hatalı alan yolu ve koduyla 400 alır, hiçbir şey yazılmaz", async () => {
    const sahip = await hesap("magaza-sahibi");
    const once = await siteninServisi(site).oku(vt);
    const yanit = await magazaBilgileriUcu(
      istek(
        sahip,
        girdi({
          magazaAdi: "Değişmemeli",
          iletisimTelefonu: "12",
          sosyalHesaplar: [
            { site: "x", hesap: "" },
            { site: "tiktok", hesap: "boş luk" },
          ],
        }),
      ),
    );
    expect(yanit.status).toBe(400);
    expect(await yanit.json()).toMatchObject({
      basarili: false,
      hata: {
        kod: "dogrulama",
        ayrinti: [
          { alan: "iletisimTelefonu", kod: "telefon-bicimi" },
          { alan: "sosyalHesaplar.1.hesap", kod: "invalid_format" },
        ],
      },
    });
    expect(await siteninServisi(site).oku(vt)).toEqual(once);
    // Bilinmeyen alan ve tanımsız site şemada reddedilir.
    expect((await magazaBilgileriUcu(istek(sahip, { ...girdi(), fazla: 1 }))).status).toBe(400);
    expect(
      (
        await magazaBilgileriUcu(
          istek(sahip, girdi({ sosyalHesaplar: [{ site: "myspace" as "x", hesap: "a" }] })),
        )
      ).status,
    ).toBe(400);
  });

  it("görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir, ayarlar değişmez", async () => {
    const once = await siteninServisi(site).oku(vt);
    const kisiler = [
      { oturum: await hesap("gorevli"), kod: 403 },
      { oturum: await hesap("rolsuz"), kod: 403 },
      { oturum: await hesap("musteri"), kod: 401 },
      { oturum: undefined, kod: 401 },
    ];
    for (const { oturum, kod } of kisiler) {
      const yanit = await magazaBilgileriUcu(istek(oturum, girdi({ magazaAdi: "Yetkisiz Ad" })));
      expect(yanit.status).toBe(kod);
    }
    expect(await siteninServisi(site).oku(vt)).toEqual(once);
  });
});
