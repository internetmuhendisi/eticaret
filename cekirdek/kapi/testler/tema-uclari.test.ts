// Tema uçları gerçek istek ve veritabanıyla (kart 0113): mağaza sahibi temayı düzen yoluyla değiştirip geri
// döner; görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir; "Mağaza sahibi temayı
// değiştirebilir" kapalıyken değişiklik ve geri dönüş reddedilir, tema okunabilir. Her rolün her uçtaki
// erişimini ayrıca rol-uc-erisimi.test.ts dener. Çalışan site sürecin ortak alanına konarak verilir.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { temaDurumuUcu, temaGeriDonusUcu, temaYayiniUcu } from "../yonetici/tema.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const okunan = siteKlasorunuOku(join(ornekler, "tema-ozel-ve-hazir"));
const acik: Site = { ...okunan, ayarlar: { ...okunan.ayarlar, temaDegistirilebilir: true } };
const kapali: Site = { ...okunan, ayarlar: { ...okunan.ayarlar, temaDegistirilebilir: false } };
const calistir = (site: Site) => {
  ortak[siteAnahtari] = site;
};

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const site = await denemeSitesiAc("tema-uclari");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  await baglantiyiKapat();
}, 60_000);
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

// Rolü verilmiş yöneticinin ya da müşterinin oturum çerezi; girişsiz için boş.
const cerez = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri" | "girissiz") => {
  if (kisi === "girissiz") return undefined;
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `tema${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
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

const ozelTemaya = { tema: "ozel-tema", ayarlar: {}, duzen: "uygula" };

describe("tema uçları", () => {
  it("mağaza sahibi temayı okur, düzen yoluyla değiştirir ve geri döner", async () => {
    calistir(acik);
    const sahip = await cerez("magaza-sahibi");
    const durum = await temaDurumuUcu(istek("tema", sahip));
    expect(durum.status).toBe(200);
    expect(await durum.json()).toMatchObject({
      basarili: true,
      veri: {
        surum: { sira: 1, tema: "canli-carsi" },
        temalar: [{ kod: "canli-carsi" }, { kod: "ozel-tema" }],
        degistirilebilir: true,
      },
    });

    const yolsuz = await temaYayiniUcu(istek("tema", sahip, { tema: "ozel-tema", ayarlar: {} }));
    expect(yolsuz.status).toBe(400);
    expect(await yolsuz.json()).toEqual({
      basarili: false,
      hata: { kod: "dogrulama", ayrinti: [{ alan: "duzen", kod: "duzen-yolu-gerekli" }] },
    });

    const yayin = await temaYayiniUcu(istek("tema", sahip, ozelTemaya));
    expect(yayin.status).toBe(200);
    expect(await yayin.json()).toMatchObject({
      basarili: true,
      veri: { sira: 2, tema: "ozel-tema", geriDonulenSira: null },
    });

    const donus = await temaGeriDonusUcu(istek("tema-geri-don", sahip, {}));
    expect(donus.status).toBe(200);
    expect(await donus.json()).toMatchObject({
      basarili: true,
      veri: { sira: 3, tema: "canli-carsi", geriDonulenSira: 1 },
    });
  });

  it.each([
    ["görevli", "gorevli", 403, "yetki"],
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s temayı ne okur ne değiştirir", async (_ad, kisi, durum, kod) => {
    calistir(acik);
    const oturum = await cerez(kisi);
    for (const yanit of [
      await temaDurumuUcu(istek("tema", oturum)),
      await temaYayiniUcu(istek("tema", oturum, ozelTemaya)),
      await temaGeriDonusUcu(istek("tema-geri-don", oturum, {})),
    ]) {
      expect(yanit.status).toBe(durum);
      expect(await yanit.json()).toMatchObject({ basarili: false, hata: { kod } });
    }
  });

  it('"Mağaza sahibi temayı değiştirebilir" kapalıyken değişiklik ve geri dönüş reddedilir', async () => {
    calistir(kapali);
    const sahip = await cerez("magaza-sahibi");
    const once = await (await temaDurumuUcu(istek("tema", sahip))).json();
    expect(once).toMatchObject({ basarili: true, veri: { degistirilebilir: false } });
    for (const yanit of [
      await temaYayiniUcu(istek("tema", sahip, ozelTemaya)),
      await temaGeriDonusUcu(istek("tema-geri-don", sahip, {})),
    ]) {
      expect(yanit.status).toBe(422);
      expect(await yanit.json()).toEqual({
        basarili: false,
        hata: { kod: "is-kurali", ayrinti: [{ alan: "tema", kod: "tema-degistirilemez" }] },
      });
    }
    expect(await (await temaDurumuUcu(istek("tema", sahip))).json()).toEqual(once);
  });
});
