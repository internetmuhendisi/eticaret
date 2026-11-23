// Panelin müşteri uçları gerçek istek ve veritabanıyla (kart 0271, karar 0173): mağaza sahibi listede müşteriyi e-postasıyla
// arar, not ekler ve siler; görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi dört uçta reddedilir, ne liste ne
// not ne bağlantı alır, hiçbir şey yazılmaz. Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { epostaKayitlari } from "../../moduller/eposta/model.ts";
import { musteriNotlari } from "../../moduller/musteri/model.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  musteriListesiUcu,
  musteriNotuSilUcu,
  musteriNotuUcu,
  musteriSifreSifirlamaUcu,
} from "../yonetici/musteri.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("musteri-uclari");
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
  const eposta = `musteri-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
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
  return { oturum: await oturumCerezi(vt, tur, hesapKimligi), hesapKimligi, eposta };
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

const notlar = (musteri: string) =>
  vt
    .select({ kimlik: musteriNotlari.kimlik })
    .from(musteriNotlari)
    .where(eq(musteriNotlari.musteri_kimligi, musteri));

describe("panelin müşteri uçları", () => {
  it("mağaza sahibi müşteriyi e-postasıyla arar, not ekler ve siler", async () => {
    const sahip = await hesap("magaza-sahibi");
    const musteri = await hesap("musteri");
    const liste = await musteriListesiUcu(
      istek(`musteriler?ara=${encodeURIComponent(musteri.eposta.toUpperCase())}`, sahip.oturum),
    );
    expect(liste.status).toBe(200);
    expect(await liste.json()).toMatchObject({
      basarili: true,
      veri: { toplam: 1, satirlar: [{ kimlik: musteri.hesapKimligi, eposta: musteri.eposta }] },
    });
    const eklendi = await musteriNotuUcu(
      istek("musteri-notu", sahip.oturum, {
        musteri: musteri.hesapKimligi,
        metin: "Kapıda bırakılsın.",
      }),
    );
    expect(eklendi.status).toBe(200);
    const [not] = await notlar(musteri.hesapKimligi);
    if (not === undefined) throw new Error("Not yazılmadı.");
    // Başka müşterinin kimliğiyle not silinmez.
    const baska = await hesap("musteri");
    const yanlis = await musteriNotuSilUcu(
      istek("musteri-notu-sil", sahip.oturum, { musteri: baska.hesapKimligi, not: not.kimlik }),
    );
    expect(yanlis.status).toBe(404);
    expect(await notlar(musteri.hesapKimligi)).toHaveLength(1);
    const silindi = await musteriNotuSilUcu(
      istek("musteri-notu-sil", sahip.oturum, { musteri: musteri.hesapKimligi, not: not.kimlik }),
    );
    expect(await silindi.json()).toEqual({ basarili: true, veri: { silindi: true } });
    expect(await notlar(musteri.hesapKimligi)).toHaveLength(0);
  });

  it.each([
    ["görevli", "gorevli", 403, "yetki"],
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s dört uçta reddedilir, hiçbir şey yazılmaz", async (_ad, kisi, kod, hata) => {
    const sahip = await hesap("magaza-sahibi");
    const musteri = await hesap("musteri");
    await musteriNotuUcu(
      istek("musteri-notu", sahip.oturum, { musteri: musteri.hesapKimligi, metin: "İlk not." }),
    );
    const [not] = await notlar(musteri.hesapKimligi);
    if (not === undefined) throw new Error("Not yazılmadı.");
    const oturum = kisi === "girissiz" ? undefined : (await hesap(kisi)).oturum;
    for (const yanit of [
      await musteriListesiUcu(istek("musteriler", oturum)),
      await musteriNotuUcu(
        istek("musteri-notu", oturum, { musteri: musteri.hesapKimligi, metin: "Yetkisiz not." }),
      ),
      await musteriNotuSilUcu(
        istek("musteri-notu-sil", oturum, { musteri: musteri.hesapKimligi, not: not.kimlik }),
      ),
      await musteriSifreSifirlamaUcu(
        istek("musteri-sifre-sifirlama", oturum, { musteri: musteri.hesapKimligi }),
      ),
    ]) {
      expect(yanit.status).toBe(kod);
      expect(await yanit.json()).toMatchObject({ basarili: false, hata: { kod: hata } });
    }
    expect(await notlar(musteri.hesapKimligi)).toEqual([not]);
    expect(
      await vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, musteri.eposta)),
    ).toEqual([]);
  });
});
