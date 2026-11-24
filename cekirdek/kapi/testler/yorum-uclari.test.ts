// Panelin yorum uçları gerçek istek ve veritabanıyla (kart 0277, karar 0174): mağaza sahibi listeyi ürünün adıyla ve
// puanla arar, yorumları toplu yayınlar, tek tek reddeder ve ana sayfada gösterir; sekme verilmezse onay bekleyenler
// gelir. Görevli görür ve karar verir (kart 0139). Rolsüz yönetici, müşteri ve girişsiz ziyaretçi dört uçta
// reddedilir, hiçbir yorum değişmez. Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { yorumlar } from "../../moduller/yorum/model.ts";
import { yorumServisi } from "../../moduller/yorum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  yorumAnaSayfaUcu,
  yorumKarariUcu,
  yorumListesiUcu,
  yorumTopluKarariUcu,
} from "../yonetici/yorum.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("yorum-uclari");
  vt = deneme.vt;
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  await baglantiyiKapat();
  await siteninServisi(site).degistir(
    vt,
    { tur: "yonetici", kimlik: randomUUID() },
    { yorumYalnizSatinAlanlar: false },
  );
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
  const eposta = `yorum-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
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
  return { oturum: await oturumCerezi(vt, tur, hesapKimligi), hesapKimligi };
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

// Adında testin etiketi olan ürüne üç yorum: puan 5, 4 ve 2, onay bekliyor.
const hazirla = async () => {
  const etiket = `Yu${randomBytes(3).toString("hex")}`;
  const urun = await urunServisi(() => site.ayarlar.saatDilimi).urunEkle(
    vt,
    { tur: "yonetici", kimlik: randomUUID() },
    { ad: `${etiket} Kulaklık`, vergiSinifi: null, durum: "yayinda" },
  );
  const kimlikler: string[] = [];
  for (const puan of [5, 4, 2]) {
    const musteri = await hesap("musteri");
    kimlikler.push(
      await yorumServisi(site).yorumYaz(vt, musteri.hesapKimligi, {
        urun,
        puan,
        metin: `Deneme ${puan}`,
        ad: "Deneme Müşteri",
      }),
    );
  }
  return { etiket, kimlikler: kimlikler as [string, string, string] };
};

const durumlar = async (kimlikler: readonly string[]) =>
  Object.fromEntries(
    (
      await vt
        .select({ kimlik: yorumlar.kimlik, durum: yorumlar.durum, ana: yorumlar.ana_sayfada })
        .from(yorumlar)
        .where(inArray(yorumlar.kimlik, [...kimlikler]))
    ).map((satir) => [satir.kimlik, `${satir.durum}${satir.ana ? "+ana" : ""}`]),
  );

const listele = async (sorgu: string, oturum: string) => {
  const yanit = await yorumListesiUcu(istek(`yorumlar?${sorgu}`, oturum));
  expect(yanit.status).toBe(200);
  return (
    (await yanit.json()) as {
      veri: { satirlar: { kimlik: string }[]; sekmeSayilari: Record<string, number> };
    }
  ).veri;
};

describe("panelin yorum uçları", () => {
  it("mağaza sahibi arar, puanla süzer, toplu yayınlar, tek tek reddeder ve ana sayfada gösterir", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { etiket, kimlikler } = await hazirla();
    const [bes, dort, iki] = kimlikler;

    const ilk = await listele(`ara=${encodeURIComponent(etiket.toLowerCase())}`, sahip.oturum);
    expect(ilk.satirlar.map((s) => s.kimlik)).toEqual([iki, dort, bes]);
    expect(ilk.sekmeSayilari).toEqual({ "onay-bekliyor": 3, yayinda: 0, reddedildi: 0, "": 3 });
    const puanli = await listele(`ara=${etiket}&puan=5,2&sirala=puan-azalan`, sahip.oturum);
    expect(puanli.satirlar.map((s) => s.kimlik)).toEqual([bes, iki]);

    const toplu = await yorumTopluKarariUcu(
      istek("yorumlar-toplu", sahip.oturum, { islem: "yayinla", yorumlar: [bes, dort] }),
    );
    expect(toplu.status).toBe(200);
    expect(await toplu.json()).toMatchObject({ veri: { islenemeyen: [] } });
    const red = await yorumKarariUcu(
      istek("yorum-karari", sahip.oturum, { yorum: iki, durum: "reddedildi" }),
    );
    expect(red.status).toBe(200);
    const ana = await yorumAnaSayfaUcu(
      istek("yorum-ana-sayfa", sahip.oturum, { yorum: bes, anaSayfada: true }),
    );
    expect(ana.status).toBe(200);
    expect(await durumlar(kimlikler)).toEqual({
      [bes]: "yayinda+ana",
      [dort]: "yayinda",
      [iki]: "reddedildi",
    });
    const yayinda = await listele(`ara=${etiket}&durum=yayinda`, sahip.oturum);
    expect(yayinda.satirlar.map((s) => s.kimlik)).toEqual([dort, bes]);
    // Sekme verilmezse onay bekleyenler: hiç kalmadı.
    expect((await listele(`ara=${etiket}`, sahip.oturum)).satirlar).toEqual([]);
  });

  it("görevli görür ve karar verir; tanımda olmayan değer reddedilir", async () => {
    const gorevli = await hesap("gorevli");
    const { etiket, kimlikler } = await hazirla();
    expect((await listele(`ara=${etiket}`, gorevli.oturum)).satirlar).toHaveLength(3);
    const toplu = await yorumTopluKarariUcu(
      istek("yorumlar-toplu", gorevli.oturum, { islem: "reddet", yorumlar: [kimlikler[0]] }),
    );
    expect(toplu.status).toBe(200);
    expect((await durumlar([kimlikler[0]]))[kimlikler[0]]).toBe("reddedildi");
    for (const sorgu of ["durum=tumu", "puan=6", "sirala=ad-artan"]) {
      expect((await yorumListesiUcu(istek(`yorumlar?${sorgu}`, gorevli.oturum))).status).toBe(400);
    }
    const bos = await yorumTopluKarariUcu(
      istek("yorumlar-toplu", gorevli.oturum, { islem: "yayinla", yorumlar: [] }),
    );
    expect(bos.status).toBe(400);
  });

  it("rolsüz yönetici, müşteri ve girişsiz ziyaretçi dört uçta reddedilir, hiçbir yorum değişmez", async () => {
    const { kimlikler } = await hazirla();
    const kisiler = [
      { oturum: (await hesap("rolsuz")).oturum, kod: 403 },
      { oturum: (await hesap("musteri")).oturum, kod: 401 },
      { oturum: undefined, kod: 401 },
    ];
    for (const { oturum, kod } of kisiler) {
      expect((await yorumListesiUcu(istek("yorumlar", oturum))).status).toBe(kod);
      expect(
        (
          await yorumTopluKarariUcu(
            istek("yorumlar-toplu", oturum, { islem: "yayinla", yorumlar: kimlikler }),
          )
        ).status,
      ).toBe(kod);
      expect(
        (
          await yorumKarariUcu(
            istek("yorum-karari", oturum, { yorum: kimlikler[0], durum: "yayinda" }),
          )
        ).status,
      ).toBe(kod);
      expect(
        (
          await yorumAnaSayfaUcu(
            istek("yorum-ana-sayfa", oturum, { yorum: kimlikler[0], anaSayfada: true }),
          )
        ).status,
      ).toBe(kod);
    }
    expect(Object.values(await durumlar(kimlikler))).toEqual([
      "onay-bekliyor",
      "onay-bekliyor",
      "onay-bekliyor",
    ]);
  });
});
