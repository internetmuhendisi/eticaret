// Ekip uçları gerçek istek ve veritabanıyla (kartlar 0274 ve 0053, karar 0178):
// - Mağaza sahibi rolleri değiştirir; rolü alınan yöneticinin açık oturumu bir sonraki istekte yetki alır (oturumu
//   açık kalsa da). Son mağaza sahibinin tam yetkisi alınamaz ve kendi rolleri değiştirilemez: alanın koduyla 422.
// - Hesabı kapatılan yöneticinin açık oturumu bir sonraki istekte oturum-yok alır.
// - İki aşamalı girişi sıfırlanan yöneticinin oturumu kapanır, kurulumu ve yedek kodları silinir.
// - Yönetici kendi yedek kodlarını telefonundaki kodla yeniler (görevli de); yanlış kod giris-hatasi.
// - Görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi ekibi değiştiremez, hiçbir şey değişmez.
// Her rolün erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import {
  roller,
  yoneticiIkiAsama,
  yoneticiRolleri,
  yoneticiYedekKodlari,
} from "../../moduller/ekip/model.ts";
import { ekibiOku } from "../../moduller/ekip/servis.ts";
import { kodAdimi, zamanliKod } from "../../moduller/oturum/iki-asama.ts";
import {
  girisAdiminiOku,
  kurulumuHazirla,
  kurulumuOnayla,
  yoneticiSifreAsamasi,
} from "../../moduller/oturum/iki-asamali-giris.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  ekipHesapKapatUcu,
  ekipIkiAsamaSifirlaUcu,
  ekipRolleriUcu,
  yedekKodlariYenileUcu,
} from "../yonetici/ekip.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));
const sifre = "uzun-bir-deneme-sifresi";
let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("ekip-uclari");
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
const hesap = async (kisi: Kisi) => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const eposta = `ekip-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre });
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
  return { kimlik: hesapKimligi, eposta, oturum: await oturumCerezi(vt, tur, hesapKimligi) };
};

const istek = (ad: string, oturum: string | undefined, govde: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${ad}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    body: JSON.stringify(govde),
  });
const rolleriAyarla = (oturum: string | undefined, kimlik: string, rollerListesi: string[]) =>
  ekipRolleriUcu(istek("ekip-rolleri", oturum, { kimlik, roller: rollerListesi }));
const roluOku = async (kimlik: string) => (await ekibiOku(vt, { kimlik }))[0]?.roller;

// Gerçek şifre ve kurulumla iki aşamalı girişi kurar; gizliyi ve kullanılan adımı döner.
const kur = async (eposta: string) => {
  const { anahtar } = await yoneticiSifreAsamasi(vt, { eposta, sifre }, "2001:db8::1");
  const adim = await girisAdiminiOku(vt, anahtar);
  if (adim === null) throw new Error("Ara adım yok.");
  const kurulum = await kurulumuHazirla(vt, anahtar, adim, "Deneme");
  if (kurulum === null) throw new Error("Kurulum hazırlanamadı.");
  const kodAdimiSimdi = kodAdimi();
  await kurulumuOnayla(vt, anahtar, zamanliKod(kurulum.gizli, kodAdimiSimdi), "2001:db8::2", 3600);
  return { gizli: kurulum.gizli, adim: kodAdimiSimdi };
};

describe("rolleri değiştirme", () => {
  it("mağaza sahibi rolleri değiştirir; rolü alınan oturum bir sonraki istekte yetki alır", async () => {
    const sahip = await hesap("magaza-sahibi");
    const ikinci = await hesap("magaza-sahibi");
    const ece = await hesap("gorevli");
    const yanit = await rolleriAyarla(sahip.oturum, ece.kimlik, ["siparis-gorevlisi"]);
    expect(yanit.status).toBe(200);
    expect(await roluOku(ece.kimlik)).toEqual(["siparis-gorevlisi"]);
    // İkinci sahip, oturumu açıkken sahipliğini kaybeder: aynı oturum artık ekibi değiştiremez.
    expect((await rolleriAyarla(ikinci.oturum, ece.kimlik, ["gorevli"])).status).toBe(200);
    expect((await rolleriAyarla(sahip.oturum, ikinci.kimlik, ["gorevli"])).status).toBe(200);
    const yetkisiz = await rolleriAyarla(ikinci.oturum, ece.kimlik, ["icerik-editoru"]);
    expect(yetkisiz.status).toBe(403);
    expect(await yetkisiz.json()).toMatchObject({ hata: { kod: "yetki" } });
    expect(await roluOku(ece.kimlik)).toEqual(["gorevli"]);
  });

  it("son sahibin tam yetkisi ve kendi rolleri değişmez; boş ve bilinmeyen rol alanın koduyla döner", async () => {
    const sahip = await hesap("magaza-sahibi");
    const ece = await hesap("gorevli");
    // Bu deneme sitesindeki öteki sahiplerin rolü alınır: sahip tek kalır.
    for (const uye of await ekibiOku(vt)) {
      if (uye.kimlik !== sahip.kimlik && uye.roller.includes("magaza-sahibi")) {
        await rolleriAyarla(sahip.oturum, uye.kimlik, ["gorevli"]);
      }
    }
    const kendi = await rolleriAyarla(sahip.oturum, sahip.kimlik, ["gorevli"]);
    expect(kendi.status).toBe(422);
    expect(await kendi.json()).toMatchObject({
      hata: { kod: "is-kurali", ayrinti: [{ alan: "yonetici", kod: "kendi-hesabi" }] },
    });
    const kapat = await ekipHesapKapatUcu(
      istek("ekip-hesap-kapat", sahip.oturum, { kimlik: sahip.kimlik }),
    );
    expect(kapat.status).toBe(422);
    expect(await roluOku(sahip.kimlik)).toEqual(["magaza-sahibi"]);
    const bos = await rolleriAyarla(sahip.oturum, ece.kimlik, []);
    expect(bos.status).toBe(400);
    expect(await bos.json()).toMatchObject({
      hata: { kod: "dogrulama", ayrinti: [{ alan: "roller", kod: "rol-gerekli" }] },
    });
    expect((await rolleriAyarla(sahip.oturum, ece.kimlik, ["olmayan"])).status).toBe(400);
    expect((await rolleriAyarla(sahip.oturum, "bozuk", ["gorevli"])).status).toBe(400);
    expect(await roluOku(ece.kimlik)).toEqual(["gorevli"]);
  });
});

describe("hesap kapatma ve iki aşamalı girişi sıfırlama", () => {
  it("kapatılan hesabın açık oturumu bir sonraki istekte düşer", async () => {
    const sahip = await hesap("magaza-sahibi");
    const ece = await hesap("gorevli");
    const yanit = await ekipHesapKapatUcu(
      istek("ekip-hesap-kapat", sahip.oturum, { kimlik: ece.kimlik }),
    );
    expect(yanit.status).toBe(200);
    expect(await roluOku(ece.kimlik)).toBeUndefined();
    const sonraki = await yedekKodlariYenileUcu(
      istek("yedek-kodlari-yenile", ece.oturum, { kod: "123456" }),
    );
    expect(sonraki.status).toBe(401);
  });

  it("sıfırlanan yöneticinin oturumu düşer, kurulumu ve yedek kodları silinir; kurulumsuzda 422", async () => {
    const sahip = await hesap("magaza-sahibi");
    const ece = await hesap("gorevli");
    await kur(ece.eposta);
    const yanit = await ekipIkiAsamaSifirlaUcu(
      istek("ekip-iki-asama-sifirla", sahip.oturum, { kimlik: ece.kimlik }),
    );
    expect(yanit.status).toBe(200);
    for (const tablo of [yoneticiIkiAsama, yoneticiYedekKodlari]) {
      expect(await vt.select().from(tablo).where(eq(tablo.yonetici_kimligi, ece.kimlik))).toEqual(
        [],
      );
    }
    expect(
      (await yedekKodlariYenileUcu(istek("yedek-kodlari-yenile", ece.oturum, { kod: "123456" })))
        .status,
    ).toBe(401);
    const tekrar = await ekipIkiAsamaSifirlaUcu(
      istek("ekip-iki-asama-sifirla", sahip.oturum, { kimlik: ece.kimlik }),
    );
    expect(tekrar.status).toBe(422);
    expect(await tekrar.json()).toMatchObject({
      hata: { ayrinti: [{ alan: "yonetici", kod: "kurulu-degil" }] },
    });
  });
});

describe("yedek kodları yenileme", () => {
  it("görevli kendi kodlarını telefonundaki kodla yeniler; yanlış kod giris-hatasi", async () => {
    const ece = await hesap("gorevli");
    const { gizli, adim } = await kur(ece.eposta);
    const yanlis = await yedekKodlariYenileUcu(
      istek("yedek-kodlari-yenile", ece.oturum, { kod: "000000" }),
    );
    expect(yanlis.status).toBe(401);
    expect(await yanlis.json()).toMatchObject({ hata: { kod: "giris-hatasi" } });
    const yanit = await yedekKodlariYenileUcu(
      istek("yedek-kodlari-yenile", ece.oturum, { kod: zamanliKod(gizli, adim + 1) }),
    );
    expect(yanit.status).toBe(200);
    const { veri } = (await yanit.json()) as { veri: { yedekKodlari: string[] } };
    const kayitli = await vt
      .select()
      .from(yoneticiYedekKodlari)
      .where(eq(yoneticiYedekKodlari.yonetici_kimligi, ece.kimlik));
    expect(kayitli).toHaveLength(veri.yedekKodlari.length);
    expect(JSON.stringify(kayitli)).not.toContain(veri.yedekKodlari[0] ?? "-");
  });
});

describe("yetkisiz kişiler", () => {
  it("görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi ekibi değiştiremez", async () => {
    const hedef = await hesap("gorevli");
    await kur(hedef.eposta);
    const kisiler: { oturum: string | undefined; kod: number }[] = [
      { oturum: (await hesap("gorevli")).oturum, kod: 403 },
      { oturum: (await hesap("rolsuz")).oturum, kod: 403 },
      { oturum: (await hesap("musteri")).oturum, kod: 401 },
      { oturum: undefined, kod: 401 },
    ];
    for (const { oturum, kod } of kisiler) {
      expect((await rolleriAyarla(oturum, hedef.kimlik, ["magaza-sahibi"])).status).toBe(kod);
      expect(
        (await ekipHesapKapatUcu(istek("ekip-hesap-kapat", oturum, { kimlik: hedef.kimlik })))
          .status,
      ).toBe(kod);
      expect(
        (
          await ekipIkiAsamaSifirlaUcu(
            istek("ekip-iki-asama-sifirla", oturum, { kimlik: hedef.kimlik }),
          )
        ).status,
      ).toBe(kod);
    }
    // Rolsüz yönetici kendi yedek kodlarını da yenileyemez (kendi hesabını değiştirme izni rolle gelir).
    const rolsuz = await hesap("rolsuz");
    expect(
      (await yedekKodlariYenileUcu(istek("yedek-kodlari-yenile", rolsuz.oturum, { kod: "123456" })))
        .status,
    ).toBe(403);
    const [uye] = await ekibiOku(vt, { kimlik: hedef.kimlik });
    expect(uye).toMatchObject({ roller: ["gorevli"], ikiAsamaKurulu: true });
  });
});
