// Düzen uçları gerçek istek ve veritabanıyla (kart 0142): mağaza sahibi düzeni okur, slider ekler (en üste),
// değiştirir, gizler, sıralar, siler ve önceki hâline döner; görevli, rolsüz yönetici, müşteri ve girişsiz
// ziyaretçi her uçta reddedilir; paneldeki görsel önizlemesi seçilmemiş görseli de verir, silinmiş görseli ve
// boyut dosyasının kimliğini vermez. Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { dosyaBoyutlari } from "../../moduller/dosya/model.ts";
import { dosyaSil, gorselKaydet } from "../../moduller/dosya/servis.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  bolumDegisikligiUcu,
  bolumEklemeUcu,
  bolumGorunurluguUcu,
  bolumSilmeUcu,
  bolumSiralamaUcu,
  duzenDurumuUcu,
  duzenGeriDonusUcu,
  panelGorseliUcu,
} from "../yonetici/duzen.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const okunan = siteKlasorunuOku(join(ornekler, "gecerli"));
// Kayda başvurmayan başlangıç düzeni: katalog beklenmez.
const site: Site = {
  ...okunan,
  duzenBaslangici: {
    "ust-kisim": [],
    "ana-sayfa": [
      {
        tur: "guven-seridi",
        gizli: false,
        degerler: { maddeler: [{ ikon: "kargo", metin: "Hızlı kargo" }] },
      },
    ],
    "alt-kisim": [],
  },
};

let vt: Veritabani;
let sil: () => Promise<void>;
let klasor: string;
let sayac = 0;

beforeAll(async () => {
  const acilan = await denemeSitesiAc("duzen-uclari");
  vt = acilan.vt;
  sil = acilan.sil;
  klasor = mkdtempSync(join(tmpdir(), "duzen-uclari-"));
  vi.stubEnv("VERITABANI_ADRESI", acilan.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv("DOSYA_KLASORU", klasor);
  ortak[siteAnahtari] = site;
  await baglantiyiKapat();
}, 60_000);
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  rmSync(klasor, { recursive: true, force: true });
  await sil();
});

const cerez = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri" | "girissiz") => {
  if (kisi === "girissiz") return undefined;
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `duzen${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
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

const gorselAc = async () => {
  const icerik = await sharp({
    create: { width: 400, height: 200, channels: 3, background: { r: 40, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
  const sonuc = await gorselKaydet(vt, icerik, klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};

type Alanlar = Record<
  string,
  { bolum: { kimlik: string; tur: string; gizli: boolean }; cizilir: boolean }[]
>;
const durumOku = async (oturum: string | undefined) => {
  const yanit = await duzenDurumuUcu(istek("duzen", oturum));
  expect(yanit.status).toBe(200);
  return (
    (await yanit.json()) as {
      veri: { sira: number; alanlar: Alanlar; secenekler: { gorseller: { kimlik: string }[] } };
    }
  ).veri;
};

const slider = (gorsel: string, baslik = "Kış indirimi") => ({
  slaytlar: [{ gorsel, baslik }],
});

describe("düzen uçları", () => {
  it("mağaza sahibi slider'ı en üste ekler, değiştirir, gizler, sıralar, siler ve önceki hâline döner", async () => {
    const sahip = await cerez("magaza-sahibi");
    const gorsel = await gorselAc();
    const ilk = await durumOku(sahip);
    expect(ilk.sira).toBe(1);
    expect(ilk.secenekler.gorseller.map((g) => g.kimlik)).toContain(gorsel);
    const [guven] = ilk.alanlar["ana-sayfa"] ?? [];

    const ekleme = await bolumEklemeUcu(
      istek("duzen-bolum-ekle", sahip, {
        alan: "ana-sayfa",
        tur: "kayan-afis",
        degerler: slider(gorsel),
        sira: 0,
      }),
    );
    expect(ekleme.status).toBe(200);
    const { kimlik } = ((await ekleme.json()) as { veri: { kimlik: string } }).veri;
    expect((await durumOku(sahip)).alanlar["ana-sayfa"]?.map((s) => s.bolum.kimlik)).toEqual([
      kimlik,
      guven?.bolum.kimlik,
    ]);

    // Tarife uymayan değer alanın yoluyla döner.
    const bos = await bolumDegisikligiUcu(
      istek("duzen-bolum-degistir", sahip, { kimlik, degerler: { slaytlar: [{ gorsel }] } }),
    );
    expect(bos.status).toBe(400);
    expect(await bos.json()).toMatchObject({
      hata: { kod: "dogrulama", ayrinti: [{ alan: "degerler.slaytlar.0.baslik" }] },
    });

    for (const [yol, govde] of [
      ["duzen-bolum-degistir", { kimlik, degerler: slider(gorsel, "Yaz indirimi") }],
      ["duzen-bolum-gorunurlugu", { kimlik, gizli: true }],
      ["duzen-sirala", { alan: "ana-sayfa", kimlikler: [guven?.bolum.kimlik, kimlik] }],
    ] as const) {
      const ucu = {
        "duzen-bolum-degistir": bolumDegisikligiUcu,
        "duzen-bolum-gorunurlugu": bolumGorunurluguUcu,
        "duzen-sirala": bolumSiralamaUcu,
      }[yol];
      const yanit = await ucu(istek(yol, sahip, govde));
      expect(yanit.status, yol).toBe(200);
    }
    const sonra = await durumOku(sahip);
    expect(sonra.sira).toBe(5);
    expect(sonra.alanlar["ana-sayfa"]?.[1]).toMatchObject({
      bolum: { kimlik, gizli: true },
      cizilir: false,
      neden: { tur: "gizli" },
    });

    const silme = await bolumSilmeUcu(istek("duzen-bolum-sil", sahip, { kimlik }));
    expect(await silme.json()).toEqual({ basarili: true, veri: { sira: 6 } });
    expect((await durumOku(sahip)).alanlar["ana-sayfa"]).toHaveLength(1);

    // Dönüş ekranın gördüğü son sürümü söyler; eski sürümle istenirse hiçbir şey yazılmaz.
    const eski = await duzenGeriDonusUcu(istek("duzen-geri-don", sahip, { son: 5 }));
    expect(eski.status).toBe(409);
    expect(await eski.json()).toEqual({
      basarili: false,
      hata: { kod: "cakisma", ayrinti: [{ alan: "son", kod: "duzen-degisti" }] },
    });
    const donus = await duzenGeriDonusUcu(istek("duzen-geri-don", sahip, { son: 6 }));
    expect(donus.status).toBe(200);
    expect(await donus.json()).toEqual({ basarili: true, veri: { sira: 7 } });
    expect((await durumOku(sahip)).alanlar["ana-sayfa"]?.[1]?.bolum.kimlik).toBe(kimlik);
  });

  it("paneldeki görsel önizlemesi kayıtlı görseli verir; silinmiş görseli ve boyut dosyasını vermez", async () => {
    const sahip = await cerez("magaza-sahibi");
    const gorsel = await gorselAc();
    const yanit = await panelGorseliUcu(istek(`panel-gorseli?d=${gorsel}&b=kucuk`, sahip));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("content-type")).toBe("image/webp");
    expect(yanit.headers.get("x-content-type-options")).toBe("nosniff");
    // Yetkili ucun dosyası ortak önbelleğe girmez (bağımsız kontrolün bulgusu).
    expect(yanit.headers.get("cache-control")).toMatch(/^private,/);
    const [boyut] = await vt
      .select({ dosya: dosyaBoyutlari.dosya_kimligi })
      .from(dosyaBoyutlari)
      .where(eq(dosyaBoyutlari.kaynak_kimligi, gorsel));
    expect(
      (await panelGorseliUcu(istek(`panel-gorseli?d=${boyut?.dosya}&b=kucuk`, sahip))).status,
    ).toBe(404);
    expect((await panelGorseliUcu(istek(`panel-gorseli?d=${gorsel}&b=ozgun`, sahip))).status).toBe(
      400,
    );
    await dosyaSil(vt, gorsel);
    expect((await panelGorseliUcu(istek(`panel-gorseli?d=${gorsel}&b=kucuk`, sahip))).status).toBe(
      404,
    );
  });

  it.each([
    ["görevli", "gorevli", 403, "yetki"],
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s düzeni ne okur ne değiştirir", async (_ad, kisi, durum, kod) => {
    const sahip = await cerez("magaza-sahibi");
    const once = await durumOku(sahip);
    const [bolum] = once.alanlar["ana-sayfa"] ?? [];
    const kimlik = bolum?.bolum.kimlik;
    const oturum = await cerez(kisi);
    const gorsel = await gorselAc();
    for (const yanit of [
      await duzenDurumuUcu(istek("duzen", oturum)),
      await panelGorseliUcu(istek(`panel-gorseli?d=${gorsel}&b=kucuk`, oturum)),
      await bolumEklemeUcu(
        istek("duzen-bolum-ekle", oturum, {
          alan: "ana-sayfa",
          tur: "kayan-afis",
          degerler: slider(gorsel),
        }),
      ),
      await bolumDegisikligiUcu(istek("duzen-bolum-degistir", oturum, { kimlik, degerler: {} })),
      await bolumGorunurluguUcu(istek("duzen-bolum-gorunurlugu", oturum, { kimlik, gizli: true })),
      await bolumSiralamaUcu(
        istek("duzen-sirala", oturum, { alan: "ana-sayfa", kimlikler: [kimlik] }),
      ),
      await bolumSilmeUcu(istek("duzen-bolum-sil", oturum, { kimlik })),
      await duzenGeriDonusUcu(istek("duzen-geri-don", oturum, { son: once.sira })),
    ]) {
      expect(yanit.status).toBe(durum);
      expect(await yanit.json()).toMatchObject({ basarili: false, hata: { kod } });
    }
    expect((await durumOku(sahip)).sira).toBe(once.sira);
  });
});
