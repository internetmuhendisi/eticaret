// Menü uçları gerçek istek ve veritabanıyla (kart 0143): mağaza sahibi menü açar, adını değiştirir, kayıt arayarak
// öğe ekler, başlığın altına öğe koyar, alt öğenin altına koyamaz (derinlik), taşır, sıralar, siler, menüyü siler;
// menünün kodları (metin-gerekli, derinlik) uçtan da korunur. Görevli, rolsüz yönetici, müşteri ve girişsiz
// ziyaretçi menü uçlarında reddedilir; görevli kayıt arayabilir (urun.gor), rolsüz yönetici arayamaz. Her rolün her
// uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { kategoriEkle } from "../../moduller/kategori/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { kayitAramaUcu } from "../yonetici/kayit-ara.ts";
import {
  menuDegisikligiUcu,
  menuEklemeUcu,
  menulerUcu,
  menuOkumaUcu,
  menuSilmeUcu,
  ogeDegisikligiUcu,
  ogeEklemeUcu,
  ogeSilmeUcu,
  ogeSiralamaUcu,
} from "../yonetici/menu.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(
  join(resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler"), "gecerli"),
);

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const acilan = await denemeSitesiAc("menu-uclari");
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
    eposta: `menu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
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

type Oge = { kimlik: string; gorunenMetin: string; kayit?: { ad: string }; altlar: Oge[] };
const ogeleriOku = async (oturum: string | undefined, menu: string) =>
  (await veri<{ ogeler: Oge[] }>(await menuOkumaUcu(istek(`menu?kimlik=${menu}`, oturum)))).ogeler;

describe("menü uçları", () => {
  it("mağaza sahibi menü açar, kayıt arayarak öğe ekler, taşır, sıralar, siler; derinlik uçta da tutar", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kategori = await kategoriEkle(vt, sistemIslemi("test"), { ad: "Gömlekler" });

    const { kimlik: menu } = await veri<{ kimlik: string }>(
      await menuEklemeUcu(istek("menu-ekle", sahip, { kod: "ust-menu", ad: "Üst", tur: "elle" })),
    );
    expect(
      (
        await veri<{ menuler: { kod: string }[] }>(await menulerUcu(istek("menuler", sahip)))
      ).menuler.map((m) => m.kod),
    ).toContain("ust-menu");

    // Kayıt arayarak: Türkçe harfsiz.
    const bulunan = await veri<{ kayitlar: { kimlik: string; ad: string }[] }>(
      await kayitAramaUcu(istek("kayit-ara?tur=kategori&ara=gomlek", sahip)),
    );
    expect(bulunan.kayitlar).toEqual([{ kimlik: kategori, ad: "Gömlekler" }]);

    const ekle = async (oge: unknown) =>
      (
        await veri<{ kimlik: string }>(
          await ogeEklemeUcu(istek("menu-ogesi-ekle", sahip, { menu, oge })),
        )
      ).kimlik;
    const gomlek = await ekle({ hedef: { tur: "kategori", kimlik: kategori } });
    const baslik = await ekle({ metin: "Kurumsal", hedef: { tur: "baslik" } });
    const hakkimizda = await ekle({
      metin: "Hakkımızda",
      hedef: { tur: "adres", adres: "/hakkimizda" },
      ust: baslik,
    });

    // Menünün kodları uçtan da gelir.
    const metinsiz = await ogeEklemeUcu(
      istek("menu-ogesi-ekle", sahip, { menu, oge: { hedef: { tur: "baslik" } } }),
    );
    expect(metinsiz.status).toBe(400);
    expect(await metinsiz.json()).toMatchObject({
      hata: { kod: "dogrulama", ayrinti: [{ alan: "metin", kod: "metin-gerekli" }] },
    });
    const derin = await ogeEklemeUcu(
      istek("menu-ogesi-ekle", sahip, {
        menu,
        oge: { metin: "Çok derin", hedef: { tur: "baslik" }, ust: hakkimizda },
      }),
    );
    expect(await derin.json()).toMatchObject({ hata: { ayrinti: [{ kod: "derinlik" }] } });

    let ogeler = await ogeleriOku(sahip, menu);
    expect(ogeler.map((o) => o.kimlik)).toEqual([gomlek, baslik]);
    expect(ogeler[0]).toMatchObject({ gorunenMetin: "Gömlekler", kayit: { ad: "Gömlekler" } });
    expect(ogeler[1]?.altlar.map((o) => o.kimlik)).toEqual([hakkimizda]);

    // Taşıma: alt öğe en üst düzeye çıkar, kardeşlerin sonuna gelir; sonra sıralanır.
    expect(
      (
        await ogeDegisikligiUcu(
          istek("menu-ogesi-degistir", sahip, { kimlik: hakkimizda, oge: { ust: null } }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await ogeSiralamaUcu(
          istek("menu-sirala", sahip, { menu, ust: null, kimlikler: [hakkimizda, gomlek, baslik] }),
        )
      ).status,
    ).toBe(200);
    ogeler = await ogeleriOku(sahip, menu);
    expect(ogeler.map((o) => o.kimlik)).toEqual([hakkimizda, gomlek, baslik]);

    expect((await ogeSilmeUcu(istek("menu-ogesi-sil", sahip, { kimlik: gomlek }))).status).toBe(
      200,
    );
    expect((await ogeleriOku(sahip, menu)).map((o) => o.kimlik)).toEqual([hakkimizda, baslik]);

    expect(
      (await menuDegisikligiUcu(istek("menu-degistir", sahip, { kimlik: menu, ad: "Ana" }))).status,
    ).toBe(200);
    expect((await menuSilmeUcu(istek("menu-sil", sahip, { kimlik: menu }))).status).toBe(200);
    expect((await menuOkumaUcu(istek(`menu?kimlik=${menu}`, sahip))).status).toBe(404);
  });

  it.each([
    ["görevli", "gorevli", 403, "yetki"],
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s menüleri ne okur ne değiştirir", async (_ad, kisi, durum, kod) => {
    const sahip = await cerez("magaza-sahibi");
    const { kimlik: menu } = await veri<{ kimlik: string }>(
      await menuEklemeUcu(
        istek("menu-ekle", sahip, {
          kod: `m-${randomBytes(3).toString("hex")}`,
          ad: "Deneme",
          tur: "elle",
        }),
      ),
    );
    const { kimlik: oge } = await veri<{ kimlik: string }>(
      await ogeEklemeUcu(
        istek("menu-ogesi-ekle", sahip, {
          menu,
          oge: { metin: "Başlık", hedef: { tur: "baslik" } },
        }),
      ),
    );
    const oturum = await cerez(kisi);
    for (const yanit of [
      await menulerUcu(istek("menuler", oturum)),
      await menuOkumaUcu(istek(`menu?kimlik=${menu}`, oturum)),
      await menuEklemeUcu(istek("menu-ekle", oturum, { kod: "x", ad: "X", tur: "elle" })),
      await menuDegisikligiUcu(istek("menu-degistir", oturum, { kimlik: menu, ad: "Y" })),
      await menuSilmeUcu(istek("menu-sil", oturum, { kimlik: menu })),
      await ogeEklemeUcu(
        istek("menu-ogesi-ekle", oturum, { menu, oge: { metin: "Z", hedef: { tur: "baslik" } } }),
      ),
      await ogeDegisikligiUcu(istek("menu-ogesi-degistir", oturum, { kimlik: oge, oge: {} })),
      await ogeSiralamaUcu(istek("menu-sirala", oturum, { menu, ust: null, kimlikler: [oge] })),
      await ogeSilmeUcu(istek("menu-ogesi-sil", oturum, { kimlik: oge })),
    ]) {
      expect(yanit.status).toBe(durum);
      expect(await yanit.json()).toMatchObject({ basarili: false, hata: { kod } });
    }
    expect((await ogeleriOku(sahip, menu)).map((o) => o.kimlik)).toEqual([oge]);
    // Kayıt arama ürünleri görme iznidir: görevli arar, rolsüz yönetici, müşteri ve girişsiz aramaz.
    const arama = await kayitAramaUcu(istek("kayit-ara?tur=marka", oturum));
    expect(arama.status).toBe(kisi === "gorevli" ? 200 : durum);
  });
});
