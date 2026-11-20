// Elle sipariş uçları gerçek istek ve veritabanıyla (kart 0236, karar 0148): mağaza sahibi ve görevli havaleyle
// sipariş girer; "ödeme alındı" (elden) yalnız mağaza sahibinde, görevliye yetki hatası ve hiçbir şey yazılmaz;
// rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir; tarayıcıdan gelen tutar alanı doğrulamada düşer; özet ucu
// sunucunun toplamını verir. Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  elleSiparisHesabiUcu,
  elleSiparisMusterileriUcu,
  elleSiparisUcu,
  elleSiparisUrunleriUcu,
} from "../yonetici/siparis.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;
const yapan = sistemIslemi("test");

beforeAll(async () => {
  const site = await denemeSitesiAc("elle-siparis-uclari");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
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
  await sil();
});

const cerez = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri" | "girissiz") => {
  if (kisi === "girissiz") return undefined;
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `elle${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
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

const birimAc = async () => {
  const srv = urunServisi(() => "Europe/Istanbul");
  const urun = await srv.urunEkle(vt, yapan, {
    ad: `Elle uç ${randomBytes(4).toString("hex")}`,
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
  return birim;
};

const govde = (birim: string, yontem: object = { yontem: "havale" }, ek: object = {}) => ({
  musteri: { tur: "misafir", eposta: "telefon@ornek.test" },
  kalemler: [{ birim, adet: 2 }],
  bilgiler: {
    odemeYontemi: yontem,
    teslimat: {
      ad: "Deniz",
      soyad: "Yılmaz",
      telefon: "0555 000 00 00",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Deneme No: 1",
        postaKodu: "06420",
      },
    },
    fatura: { tur: "bireysel", adresAyni: true },
    metinlerIletildi: true,
  },
  musteriyeEposta: true,
  ...ek,
});

const siparisSayisi = async () => (await vt.select().from(siparisler)).length;

describe("elle sipariş uçları", () => {
  it("mağaza sahibi havaleyle ve elden sipariş girer; özet ucu sunucunun toplamını verir", async () => {
    const sahip = await cerez("magaza-sahibi");
    const birim = await birimAc();
    const ozet = await elleSiparisHesabiUcu(
      istek("elle-siparis-hesabi", sahip, { kalemler: [{ birim, adet: 2 }] }),
    );
    expect(ozet.status).toBe(200);
    const { veri: gorunum } = (await ozet.json()) as { veri: { toplam: number } };
    const yanit = await elleSiparisUcu(
      istek(
        "elle-siparis",
        sahip,
        govde(birim, { yontem: "havale" }, { gorulenToplam: gorunum.toplam }),
      ),
    );
    expect(yanit.status).toBe(200);
    const { veri } = (await yanit.json()) as { veri: { numara: string } };
    const [kayit] = await vt.select().from(siparisler).where(eq(siparisler.numara, veri.numara));
    expect(kayit).toMatchObject({ toplam: gorunum.toplam, durum: "odeme-bekleniyor" });
    const elden = await elleSiparisUcu(
      istek("elle-siparis", sahip, govde(birim, { yontem: "elden" })),
    );
    expect(elden.status).toBe(200);
  });

  it("görevli havaleyle girer; elden ile yetki hatası alır, hiçbir şey yazılmaz", async () => {
    const gorevli = await cerez("gorevli");
    const birim = await birimAc();
    expect((await elleSiparisUcu(istek("elle-siparis", gorevli, govde(birim)))).status).toBe(200);
    const once = await siparisSayisi();
    const elden = await elleSiparisUcu(
      istek("elle-siparis", gorevli, govde(birim, { yontem: "elden" })),
    );
    expect(elden.status).toBe(403);
    expect(((await elden.json()) as { hata: { kod: string } }).hata.kod).toBe("yetki");
    expect(await siparisSayisi()).toBe(once);
  });

  it("rolsüz yönetici, müşteri ve girişsiz ziyaretçi dört uçta reddedilir", async () => {
    const birim = await birimAc();
    for (const [kisi, durum] of [
      ["rolsuz", 403],
      ["musteri", 401],
      ["girissiz", 401],
    ] as const) {
      const oturum = await cerez(kisi);
      const once = await siparisSayisi();
      expect((await elleSiparisUcu(istek("elle-siparis", oturum, govde(birim)))).status, kisi).toBe(
        durum,
      );
      expect(
        (await elleSiparisUrunleriUcu(istek("elle-siparis-urunleri?ara=Elle", oturum))).status,
        kisi,
      ).toBe(durum);
      expect(
        (await elleSiparisMusterileriUcu(istek("elle-siparis-musterileri?ara=elle", oturum)))
          .status,
        kisi,
      ).toBe(durum);
      expect(
        (
          await elleSiparisHesabiUcu(
            istek("elle-siparis-hesabi", oturum, { kalemler: [{ birim, adet: 1 }] }),
          )
        ).status,
        kisi,
      ).toBe(durum);
      expect(await siparisSayisi()).toBe(once);
    }
  });

  it("tarayıcıdan gelen tutar alanı doğrulamada düşer, sipariş yazılmaz", async () => {
    const sahip = await cerez("magaza-sahibi");
    const birim = await birimAc();
    const once = await siparisSayisi();
    for (const bozuk of [
      govde(birim, { yontem: "havale" }, { toplam: 1 }),
      { ...govde(birim), kalemler: [{ birim, adet: 2, tutar: 1 }] },
      govde(birim, { yontem: "kart" }),
    ]) {
      const yanit = await elleSiparisUcu(istek("elle-siparis", sahip, bozuk));
      expect(yanit.status).toBe(400);
    }
    expect(await siparisSayisi()).toBe(once);
  });

  it("müşteri araması en az 3 harf ister", async () => {
    const sahip = await cerez("magaza-sahibi");
    expect(
      (await elleSiparisMusterileriUcu(istek("elle-siparis-musterileri?ara=el", sahip))).status,
    ).toBe(400);
    expect(
      (await elleSiparisMusterileriUcu(istek("elle-siparis-musterileri?ara=ell", sahip))).status,
    ).toBe(200);
  });

  it("ürün araması birimleri fiyatıyla verir", async () => {
    const sahip = await cerez("magaza-sahibi");
    const birim = await birimAc();
    const yanit = await elleSiparisUrunleriUcu(
      istek("elle-siparis-urunleri?ara=Elle%20u%C3%A7", sahip),
    );
    expect(yanit.status).toBe(200);
    const { veri } = (await yanit.json()) as {
      veri: { birimler: { birim: string; satilabilir: boolean }[] };
    };
    expect(veri.birimler).toContainEqual(expect.objectContaining({ birim, satilabilir: true }));
  });
});
