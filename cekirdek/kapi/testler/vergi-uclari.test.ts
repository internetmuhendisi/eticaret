// Vergi uçları gerçek istek ve veritabanıyla (kart 0322): mağaza sahibi sınıf ekler, oranını girer ve değiştirir,
// sınıfları sıralar, genel ayarları ve kargonun sınıfını kaydeder, oranı ve sınıfı siler. Hata alanın yolu ve koduyla döner,
// hiçbir şey değişmez. Görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi sekiz uçta da reddedilir, vergi tablosu ve
// ayarlar değişmez. Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  vergiAyarlariUcu,
  vergiOraniDegisikligiUcu,
  vergiOraniEklemeUcu,
  vergiOraniSilmeUcu,
  vergiSinifiDegisikligiUcu,
  vergiSinifiEklemeUcu,
  vergiSinifiSilmeUcu,
  vergiSinifSiralamaUcu,
} from "../yonetici/vergi.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("vergi-uclari");
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

type Kisi = "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri";
const cerez = async (kisi: Kisi) => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `vergi${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
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

type Yanit = {
  durum: number;
  govde: { basarili: boolean; veri?: unknown; hata?: { kod: string; ayrinti?: unknown } };
};
const gonder = async (
  uc: (istek: Request) => Promise<Response>,
  yol: string,
  oturum: string | undefined,
  govde: unknown,
): Promise<Yanit> => {
  const yanit = await uc(
    new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
      method: "POST",
      headers: {
        "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
        ...(oturum === undefined ? {} : { cookie: oturum }),
      },
      body: JSON.stringify(govde),
    }),
  );
  return { durum: yanit.status, govde: await yanit.json() };
};

const tablo = () => siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true });
const ayarlar = () => siteninServisi(site).oku(vt);
const kimligi = (yanit: Yanit) => (yanit.govde.veri as { kimlik: string }).kimlik;

const ayarGirdisi = (kargoSinifi: string | null) => ({
  vergiAcik: true,
  vergiAdi: "Deneme Vergisi",
  fiyatGosterimi: "vergi-haric",
  fiyatEkMetniTuru: "kendi",
  fiyatEkMetni: "vergi hariç fiyat",
  vergiAdresi: "fatura",
  vergiYuvarlama: "ara-toplam",
  kargoSinifi,
});

describe("mağaza sahibi", () => {
  it("sınıf ekler, oranını girip değiştirir, sıralar, ayarları kaydeder, oranı ve sınıfı siler", async () => {
    const oturum = await cerez("magaza-sahibi");
    const a = await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", oturum, {
      sinif: { ad: "Uç A" },
    });
    const b = await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", oturum, {
      sinif: { ad: "Uç B" },
    });
    expect([a.durum, b.durum]).toEqual([200, 200]);
    const [ak, bk] = [kimligi(a), kimligi(b)];

    const oran = await gonder(vergiOraniEklemeUcu, "vergi-orani-ekle", oturum, {
      sinif: ak,
      oran: { ulke: "TR", oran: "7,5", ad: "Özel" },
    });
    expect(oran.durum).toBe(200);
    const ok = kimligi(oran);
    expect(
      (
        await gonder(vergiOraniDegisikligiUcu, "vergi-orani-degistir", oturum, {
          kimlik: ok,
          oran: { oran: "20", il: "TR-06", ad: null },
        })
      ).durum,
    ).toBe(200);
    expect((await tablo()).find((s) => s.kimlik === ak)?.oranlar).toEqual([
      expect.objectContaining({ ulke: "TR", il: "TR-06", oran: 200_000 }),
    ]);
    expect((await tablo()).find((s) => s.kimlik === ak)?.oranlar[0]).not.toHaveProperty("ad");

    expect(
      (
        await gonder(vergiSinifiDegisikligiUcu, "vergi-sinifi-degistir", oturum, {
          kimlik: ak,
          sinif: { ad: "Uç A2" },
        })
      ).durum,
    ).toBe(200);
    const sira = (await tablo()).filter((s) => !s.silindi).map((s) => s.kimlik);
    const yeni = [...sira].reverse();
    expect(
      (await gonder(vergiSinifSiralamaUcu, "vergi-siniflari-sirala", oturum, { kimlikler: yeni }))
        .durum,
    ).toBe(200);
    expect((await tablo()).filter((s) => !s.silindi).map((s) => s.kimlik)).toEqual(yeni);

    const kaydi = await gonder(vergiAyarlariUcu, "vergi-ayarlari", oturum, ayarGirdisi(bk));
    expect(kaydi.durum).toBe(200);
    expect(await ayarlar()).toMatchObject({
      vergiAdi: "Deneme Vergisi",
      fiyatGosterimi: "vergi-haric",
      fiyatEkMetni: "vergi hariç fiyat",
      vergiAdresi: "fatura",
      vergiYuvarlama: "ara-toplam",
    });
    // Fiyat girişi bu uçla değişmez (kart 0326).
    expect((await ayarlar()).fiyatGirisi).toBe("vergi-dahil");
    expect((await tablo()).find((s) => s.kargo)?.kimlik).toBe(bk);
    // "Yok" türü boş metin yazar, "otomatik" ayarı siler.
    await gonder(vergiAyarlariUcu, "vergi-ayarlari", oturum, {
      ...ayarGirdisi(bk),
      fiyatEkMetniTuru: "yok",
    });
    expect((await ayarlar()).fiyatEkMetni).toBe("");
    await gonder(vergiAyarlariUcu, "vergi-ayarlari", oturum, {
      ...ayarGirdisi(null),
      fiyatEkMetniTuru: "otomatik",
    });
    expect((await ayarlar()).fiyatEkMetni).toBeUndefined();
    expect((await tablo()).some((s) => s.kargo)).toBe(false);

    expect(
      (await gonder(vergiOraniSilmeUcu, "vergi-orani-sil", oturum, { kimlik: ok })).durum,
    ).toBe(200);
    expect((await tablo()).find((s) => s.kimlik === ak)?.oranlar).toEqual([]);
    expect(
      (await gonder(vergiSinifiSilmeUcu, "vergi-sinifi-sil", oturum, { kimlik: ak })).durum,
    ).toBe(200);
    expect((await tablo()).find((s) => s.kimlik === ak)?.silindi).toBe(true);
  });

  it("hata alanın yolu ve koduyla döner, hiçbir şey değişmez", async () => {
    const oturum = await cerez("magaza-sahibi");
    const sinif = kimligi(
      await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", oturum, { sinif: { ad: "Uç Hata" } }),
    );
    const once = JSON.stringify(await tablo());
    const ayarOnce = await ayarlar();

    const bosAd = await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", oturum, {
      sinif: { ad: " " },
    });
    expect(bosAd.durum).toBe(400);
    expect(bosAd.govde.hata?.ayrinti).toEqual([{ alan: "ad", kod: "too_small" }]);
    // Anahtar biçimindeki ad kayda giremez: alanın kodu, beklenmeyen hata değil.
    const anahtar = await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", oturum, {
      sinif: { ad: "Bearer abcdefghijklmnopqrstuvwx" },
    });
    expect(anahtar.govde.hata?.ayrinti).toEqual([{ alan: "ad", kod: "ad-bicimi" }]);
    const tekrar = await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", oturum, {
      sinif: { ad: "Uç Hata" },
    });
    expect(tekrar.govde.hata).toEqual({ kod: "is-kurali", ayrinti: { kod: "ad-tekrar" } });
    const bicim = await gonder(vergiOraniEklemeUcu, "vergi-orani-ekle", oturum, {
      sinif,
      oran: { ulke: "TR", oran: "yirmi" },
    });
    expect(bicim.govde.hata?.ayrinti).toEqual([{ alan: "oran", kod: "oran-bicimi" }]);
    const siralama = await gonder(vergiSinifSiralamaUcu, "vergi-siniflari-sirala", oturum, {
      kimlikler: [sinif],
    });
    expect(siralama.durum).toBe(409);
    expect(siralama.govde.hata).toEqual({ kod: "cakisma", ayrinti: { kod: "siralama-gecersiz" } });
    expect(JSON.stringify(await tablo())).toBe(once);

    // Kendi metni boşsa ya da kayda uygun değilse alanın hatası; silinmiş kargo sınıfı alanın hatası. Hiçbir ayar yazılmaz.
    const bosMetin = await gonder(vergiAyarlariUcu, "vergi-ayarlari", oturum, {
      ...ayarGirdisi(null),
      fiyatEkMetni: " ",
    });
    expect(bosMetin.govde.hata?.ayrinti).toEqual([{ alan: "fiyatEkMetni", kod: "too_small" }]);
    const anahtarAdi = await gonder(vergiAyarlariUcu, "vergi-ayarlari", oturum, {
      ...ayarGirdisi(sinif),
      vergiAdi: "Bearer abcdefghijklmnopqrstuvwx",
    });
    expect(anahtarAdi.govde.hata?.ayrinti).toEqual([{ alan: "vergiAdi", kod: "ad-bicimi" }]);
    const silinen = kimligi(
      await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", oturum, {
        sinif: { ad: "Uç Silinen" },
      }),
    );
    await gonder(vergiSinifiSilmeUcu, "vergi-sinifi-sil", oturum, { kimlik: silinen });
    const silinmisKargo = await gonder(
      vergiAyarlariUcu,
      "vergi-ayarlari",
      oturum,
      ayarGirdisi(silinen),
    );
    expect(silinmisKargo.govde.hata?.ayrinti).toEqual([
      { alan: "kargoSinifi", kod: "sinif-silinmis" },
    ]);
    expect(await ayarlar()).toEqual(ayarOnce);
  });
});

describe("izni olmayanlar", () => {
  it("görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi sekiz uçta reddedilir, hiçbir şey değişmez", async () => {
    const sahip = await cerez("magaza-sahibi");
    const sinif = kimligi(
      await gonder(vergiSinifiEklemeUcu, "vergi-sinifi-ekle", sahip, { sinif: { ad: "Uç İzin" } }),
    );
    const oran = kimligi(
      await gonder(vergiOraniEklemeUcu, "vergi-orani-ekle", sahip, {
        sinif,
        oran: { ulke: "TR", oran: "10" },
      }),
    );
    const once = JSON.stringify(await tablo());
    const ayarOnce = await ayarlar();
    const uclar = [
      [vergiAyarlariUcu, "vergi-ayarlari", ayarGirdisi(sinif)],
      [vergiSinifiEklemeUcu, "vergi-sinifi-ekle", { sinif: { ad: "Yetkisiz" } }],
      [
        vergiSinifiDegisikligiUcu,
        "vergi-sinifi-degistir",
        { kimlik: sinif, sinif: { ad: "Yetkisiz" } },
      ],
      [vergiSinifiSilmeUcu, "vergi-sinifi-sil", { kimlik: sinif }],
      [vergiSinifSiralamaUcu, "vergi-siniflari-sirala", { kimlikler: [sinif] }],
      [vergiOraniEklemeUcu, "vergi-orani-ekle", { sinif, oran: { ulke: "TR", oran: "1" } }],
      [vergiOraniDegisikligiUcu, "vergi-orani-degistir", { kimlik: oran, oran: { oran: "1" } }],
      [vergiOraniSilmeUcu, "vergi-orani-sil", { kimlik: oran }],
    ] as const;
    const kisiler = [
      ["görevli", await cerez("gorevli"), "yetki"],
      ["rolsüz yönetici", await cerez("rolsuz"), "yetki"],
      ["müşteri", await cerez("musteri"), "oturum-yok"],
      ["girişsiz", undefined, "oturum-yok"],
    ] as const;
    for (const [uc, yol, govde] of uclar) {
      for (const [ad, oturum, kod] of kisiler) {
        const yanit = await gonder(uc, yol, oturum, govde);
        expect(yanit.govde.hata?.kod, `${yol} ${ad}`).toBe(kod);
      }
    }
    expect(JSON.stringify(await tablo())).toBe(once);
    expect(await ayarlar()).toEqual(ayarOnce);
  });
});
