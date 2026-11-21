// Panelin ürün listesi uçları gerçek istek ve veritabanıyla (kart 0262, karar 0161): mağaza sahibi listeyi süzgeç ve
// sıralamayla okur; satırın fiyatı vitrindeki kartın fiyatıyla (fiyatAraliklari) birebir aynı, stok durumu vitrinin
// kuralıyla, sayfası açılmayan üründe "vitrinde" yok; toplu işlemle yayınlar ve siler. Görevli okur, yayınlar,
// silemez (urun.sil); rolsüz yönetici, müşteri ve girişsiz ziyaretçi iki uçta da reddedilir, hiçbir şey değişmez. Her
// rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { kategoriEkle } from "../../moduller/kategori/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import type { UrunGirdisi } from "../../moduller/urun/semalar.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import type { UrunListesiVerisi } from "../../yonetim-paneli/urunler/veri.ts";
import { urunListesiUcu, urunTopluIslemiUcu } from "../yonetici/urun-listesi.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(
  join(resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler"), "gecerli"),
);
const kim = { tur: "yonetici" as const, kimlik: randomUUID() };
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const acilan = await denemeSitesiAc("urun-listesi-uclari");
  vt = acilan.vt;
  sil = acilan.sil;
  vi.stubEnv("VERITABANI_ADRESI", acilan.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  ortak[siteAnahtari] = site;
  await baglantiyiKapat();
}, 60_000);
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

const cerez = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri" | "girissiz") => {
  if (kisi === "girissiz") return undefined;
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `urunler${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
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

const istek = (yol: string, oturum: string | undefined, govde?: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
    method: govde === undefined ? "GET" : "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });

const veri = async <T>(yanit: Response): Promise<T> => {
  const zarf = (await yanit.json()) as { basarili: boolean; veri: T };
  expect(zarf.basarili, JSON.stringify(zarf)).toBe(true);
  return zarf.veri;
};
const hata = async (yanit: Response) => ((await yanit.json()) as { hata: { kod: string } }).hata;

// Ürün: verilen fiyat (indirimliyse ikincisi) ve stok.
const urunAc = async (
  ad: string,
  ek: Partial<UrunGirdisi>,
  { satis, indirimli, miktar }: { satis: number; indirimli?: number; miktar: number },
) => {
  const urun = await urunSrv.urunEkle(vt, kim, { ad, vergiSinifi: null, durum: "yayinda", ...ek });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await fiyat.fiyatYaz(vt, kim, birim, {
    satisFiyati: satis,
    ...(indirimli === undefined ? {} : { indirimliFiyat: indirimli }),
  });
  if (miktar > 0) {
    await stok.stokDuzelt(vt, kim, birim, { yeniMiktar: miktar, gorulenMiktar: 0, sebep: "sayim" });
  }
  return urun;
};

describe("ürün listesi uçları", () => {
  it("mağaza sahibi süzer ve sıralar; fiyat vitrinin kartıyla aynı; toplu işlemle yayınlar ve siler", async () => {
    const sahip = await cerez("magaza-sahibi");
    const ek = randomBytes(3).toString("hex");
    const kategori = await kategoriEkle(vt, kim, { ad: `Kategori ${ek}` });
    const az = await urunAc(
      `Az ${ek}`,
      { kategoriler: [kategori], stokKodu: `AZ-${ek}` },
      { satis: 30_000, indirimli: 20_000, miktar: 2 },
    );
    const taslak = await urunAc(
      `Taslak ${ek}`,
      { durum: "taslak", kategoriler: [kategori] },
      { satis: 10_000, miktar: 50 },
    );
    const okunan = await veri<UrunListesiVerisi>(
      await urunListesiUcu(istek(`urunler?kategori=${kategori}&sirala=fiyat-artan`, sahip)),
    );
    expect(okunan.satirlar.map((satir) => satir.kimlik)).toEqual([taslak, az]);
    const [ilk, ikinci] = okunan.satirlar;
    expect(ilk).toMatchObject({
      durum: "taslak",
      vitrinde: false,
      stok: { durum: "stokta", toplam: 50 },
    });
    expect(ikinci).toMatchObject({
      durum: "yayinda",
      vitrinde: true,
      stokKodu: `AZ-${ek}`,
      birlesim: 0,
      kategoriler: [`Kategori ${ek}`],
      stok: { durum: "dusuk", toplam: 2, tukenenBirlesim: 0 },
    });
    // Satırın fiyatı vitrindeki kartın fiyatıyla aynı (indirimli tutar ve eski fiyat).
    const araliklar = await fiyatGosterimServisi(site).fiyatAraliklari(vt, [az, taslak]);
    expect(ikinci?.fiyat).toEqual({
      yazi: araliklar.get(az)?.enDusuk.yazili.tutar,
      ...(araliklar.get(az)?.enDusuk.yazili.eskiTutar === undefined
        ? {}
        : { eski: araliklar.get(az)?.enDusuk.yazili.eskiTutar }),
    });
    expect(ilk?.fiyat?.yazi).toBe(araliklar.get(taslak)?.enDusuk.yazili.tutar);
    // Stok süzgeci ve arama.
    const dusuk = await veri<UrunListesiVerisi>(
      await urunListesiUcu(istek(`urunler?kategori=${kategori}&stok=dusuk`, sahip)),
    );
    expect(dusuk.satirlar.map((satir) => satir.kimlik)).toEqual([az]);
    const aranan = await veri<UrunListesiVerisi>(
      await urunListesiUcu(istek(`urunler?ara=${encodeURIComponent(`az-${ek}`)}`, sahip)),
    );
    expect(aranan.satirlar.map((satir) => satir.kimlik)).toEqual([az]);
    // Kimlik olmayan kategori uçta reddedilir.
    expect((await urunListesiUcu(istek("urunler?kategori=bozuk", sahip))).status).toBe(400);

    const yayinla = await veri<{ islenen: string[] }>(
      await urunTopluIslemiUcu(
        istek("urunler-toplu", sahip, { islem: "yayinla", urunler: [taslak] }),
      ),
    );
    expect(yayinla.islenen).toEqual([taslak]);
    expect(await urunSrv.urunuOku(vt, taslak)).toMatchObject({ durum: "yayinda" });
    await veri(
      await urunTopluIslemiUcu(istek("urunler-toplu", sahip, { islem: "sil", urunler: [taslak] })),
    );
    expect(await urunSrv.urunuOku(vt, taslak)).toMatchObject({ silindi: true });
  });

  it("görevli okur ve yayınlar, silemez", async () => {
    const gorevli = await cerez("gorevli");
    const urun = await urunAc(
      `Görevli ${randomBytes(3).toString("hex")}`,
      { durum: "taslak" },
      {
        satis: 1000,
        miktar: 1,
      },
    );
    await veri(await urunListesiUcu(istek("urunler", gorevli)));
    await veri(
      await urunTopluIslemiUcu(
        istek("urunler-toplu", gorevli, { islem: "yayinla", urunler: [urun] }),
      ),
    );
    const silme = await urunTopluIslemiUcu(
      istek("urunler-toplu", gorevli, { islem: "sil", urunler: [urun] }),
    );
    expect(silme.status).toBe(403);
    expect(await hata(silme)).toMatchObject({ kod: "yetki" });
    expect(await urunSrv.urunuOku(vt, urun)).toMatchObject({ durum: "yayinda", silindi: false });
  });

  it.each([
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s iki uçta da geçmez, hiçbir şey değişmez", async (_ad, kisi, durum, kod) => {
    const urun = await urunAc(
      `Ret ${randomBytes(3).toString("hex")}`,
      { durum: "taslak" },
      {
        satis: 1000,
        miktar: 1,
      },
    );
    const oturum = await cerez(kisi);
    for (const yanit of [
      await urunListesiUcu(istek("urunler", oturum)),
      await urunTopluIslemiUcu(
        istek("urunler-toplu", oturum, { islem: "yayinla", urunler: [urun] }),
      ),
      await urunTopluIslemiUcu(istek("urunler-toplu", oturum, { islem: "sil", urunler: [urun] })),
    ]) {
      expect(yanit.status).toBe(durum);
      expect(await hata(yanit)).toMatchObject({ kod });
    }
    expect(await urunSrv.urunuOku(vt, urun)).toMatchObject({ durum: "taslak", silindi: false });
  });
});
