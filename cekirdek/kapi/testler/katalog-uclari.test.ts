// Kategori, marka, etiket ve özellik uçları gerçek istek ve veritabanıyla (kart 0261): mağaza sahibi kategori ekler,
// değiştirir, başka kategorinin altına taşır, sıralar ve siler; döngü kuran taşıma uçtan da reddedilir, alanın hatası
// alanın adıyla döner. Marka ve etiket eklenir, değiştirilir, silinir. Özellik seçenekleriyle eklenir, tek kayıtla
// değiştirilir, sıralanır, silinir. Görevli görür ve değiştirir, silemez; rolsüz yönetici, müşteri ve girişsiz
// ziyaretçi hiçbir uçta geçmez ve hiçbir şey değişmez. Her rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts
// dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { etiketServisi } from "../../moduller/etiket/servis.ts";
import { kategorileriOku, kategoriyiOku } from "../../moduller/kategori/servis.ts";
import { markaServisi } from "../../moduller/marka/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { ozellikServisi } from "../../moduller/ozellik/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  kategoriDegisikligiUcu,
  kategoriEklemeUcu,
  kategoriSilmeUcu,
  kategoriSiralamaUcu,
} from "../yonetici/kategori.ts";
import { etiketUclari, markaUclari } from "../yonetici/marka-etiket.ts";
import {
  ozellikEklemeUcu,
  ozellikKaydiUcu,
  ozellikSilmeUcu,
  ozellikSiralamaUcu,
} from "../yonetici/ozellik.ts";
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
  const acilan = await denemeSitesiAc("katalog-uclari");
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
    eposta: `katalog${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
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

const istek = (yol: string, oturum: string | undefined, govde: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    body: JSON.stringify(govde),
  });

const veri = async <T>(yanit: Response): Promise<T> => {
  const zarf = (await yanit.json()) as { basarili: boolean; veri: T };
  expect(zarf.basarili, JSON.stringify(zarf)).toBe(true);
  return zarf.veri;
};
const hata = async (yanit: Response) =>
  ((await yanit.json()) as { hata: { kod: string; ayrinti?: unknown } }).hata;
const benzersiz = () => randomBytes(3).toString("hex");

describe("kategori uçları", () => {
  it("mağaza sahibi ekler, değiştirir, taşır, sıralar ve siler; döngü ve ad tekrarı alanın adıyla döner", async () => {
    const sahip = await cerez("magaza-sahibi");
    const ekle = async (ad: string, ust: string | null = null) =>
      (
        await veri<{ kimlik: string }>(
          await kategoriEklemeUcu(istek("kategori-ekle", sahip, { kategori: { ad, ust } })),
        )
      ).kimlik;
    const ust = await ekle(`Üst ${benzersiz()}`);
    const a = await ekle("A", ust);
    const b = await ekle("B", ust);
    await veri(
      await kategoriDegisikligiUcu(
        istek("kategori-degistir", sahip, {
          kimlik: a,
          kategori: { ad: "A2", aciklama: "Açıklama", gorsel: null },
        }),
      ),
    );
    expect(await kategoriyiOku(a, vt)).toMatchObject({ ad: "A2", aciklama: "Açıklama", ust });
    await veri(
      await kategoriSiralamaUcu(istek("kategori-sirala", sahip, { ust, kimlikler: [b, a] })),
    );
    expect((await kategorileriOku(vt)).filter((k) => k.ust === ust).map((k) => k.kimlik)).toEqual([
      b,
      a,
    ]);
    // B'yi A'nın altına taşı; A'yı B'nin altına taşımak döngüdür.
    await veri(
      await kategoriDegisikligiUcu(
        istek("kategori-degistir", sahip, { kimlik: b, kategori: { ust: a } }),
      ),
    );
    const dongu = await kategoriDegisikligiUcu(
      istek("kategori-degistir", sahip, { kimlik: a, kategori: { ust: b } }),
    );
    expect(dongu.status).toBe(422);
    expect(await hata(dongu)).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ alan: "ust", kod: "dongu" }],
    });
    const tekrar = await kategoriEklemeUcu(
      istek("kategori-ekle", sahip, { kategori: { ad: "a2", ust } }),
    );
    expect(await hata(tekrar)).toMatchObject({
      kod: "cakisma",
      ayrinti: [{ alan: "ad", kod: "ad-tekrar" }],
    });
    // Silinen A'nın altı (B) A'nın üstüne çıkar.
    await veri(await kategoriSilmeUcu(istek("kategori-sil", sahip, { kimlik: a })));
    expect(await kategoriyiOku(b, vt)).toMatchObject({ ust });
  });
});

describe.each([
  { ad: "marka", uclar: markaUclari, servis: markaServisi, ek: { aciklama: "Üretici" } },
  { ad: "etiket", uclar: etiketUclari, servis: etiketServisi, ek: {} },
])("$ad uçları", ({ ad, uclar, servis, ek }) => {
  it("mağaza sahibi ekler, değiştirir, siler; ad tekrarı alanın adıyla döner", async () => {
    const sahip = await cerez("magaza-sahibi");
    const adi = `Grup ${benzersiz()}`;
    const { kimlik } = await veri<{ kimlik: string }>(
      await uclar.ekle(istek(`${ad}-ekle`, sahip, { grup: { ad: adi, ...ek } })),
    );
    await veri(
      await uclar.degistir(
        istek(`${ad}-degistir`, sahip, { kimlik, grup: { adresAdi: `grup-${benzersiz()}` } }),
      ),
    );
    expect(await servis.oku(kimlik, vt)).toMatchObject({ ad: adi, ...ek, silindi: false });
    expect(
      await hata(await uclar.ekle(istek(`${ad}-ekle`, sahip, { grup: { ad: adi.toUpperCase() } }))),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ alan: "ad", kod: "ad-tekrar" }] });
    await veri(await uclar.sil(istek(`${ad}-sil`, sahip, { kimlik })));
    expect(await servis.oku(kimlik, vt)).toMatchObject({ silindi: true });
  });
});

describe("özellik uçları", () => {
  it("mağaza sahibi seçenekleriyle ekler, tek kayıtla değiştirir, sıralar ve siler", async () => {
    const sahip = await cerez("magaza-sahibi");
    const { kimlik } = await veri<{ kimlik: string }>(
      await ozellikEklemeUcu(
        istek("ozellik-ekle", sahip, {
          ozellik: { ad: `Kumaş ${benzersiz()}`, tur: "liste", secenekler: ["Pamuk", "Keten"] },
        }),
      ),
    );
    const [pamuk] = (await ozellikServisi.oku(kimlik, vt))?.secenekler ?? [];
    await veri(
      await ozellikKaydiUcu(
        istek("ozellik-kaydet", sahip, {
          kimlik,
          ozellik: {
            ad: `Malzeme ${benzersiz()}`,
            tur: "liste",
            birim: null,
            filtrede: true,
            secenekler: [{ ad: "İpek" }, { kimlik: pamuk?.kimlik, ad: "Pamuk" }],
          },
        }),
      ),
    );
    expect((await ozellikServisi.oku(kimlik, vt))?.secenekler.map((s) => s.ad)).toEqual([
      "İpek",
      "Pamuk",
    ]);
    // Girdi içindeki aynı seçenek adı seçeneğin yeriyle döner.
    expect(
      await hata(
        await ozellikEklemeUcu(
          istek("ozellik-ekle", sahip, {
            ozellik: { ad: `Renk ${benzersiz()}`, tur: "liste", secenekler: ["Mavi", "mavi"] },
          }),
        ),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ alan: "secenekler.1" }] });
    const sira = (await ozellikServisi.hepsiniOku(vt)).map((o) => o.kimlik).toReversed();
    await veri(await ozellikSiralamaUcu(istek("ozellik-sirala", sahip, { kimlikler: sira })));
    expect((await ozellikServisi.hepsiniOku(vt)).map((o) => o.kimlik)).toEqual(sira);
    await veri(await ozellikSilmeUcu(istek("ozellik-sil", sahip, { kimlik })));
    expect(await ozellikServisi.oku(kimlik, vt)).toMatchObject({ silindi: true });
  });
});

describe("erişim", () => {
  it("görevli değiştirir ama silemez", async () => {
    const gorevli = await cerez("gorevli");
    const { kimlik: kategori } = await veri<{ kimlik: string }>(
      await kategoriEklemeUcu(
        istek("kategori-ekle", gorevli, { kategori: { ad: `G ${benzersiz()}` } }),
      ),
    );
    const { kimlik: marka } = await veri<{ kimlik: string }>(
      await markaUclari.ekle(istek("marka-ekle", gorevli, { grup: { ad: `G ${benzersiz()}` } })),
    );
    const { kimlik: ozellik } = await veri<{ kimlik: string }>(
      await ozellikEklemeUcu(
        istek("ozellik-ekle", gorevli, { ozellik: { ad: `G ${benzersiz()}`, tur: "metin" } }),
      ),
    );
    for (const yanit of [
      await kategoriSilmeUcu(istek("kategori-sil", gorevli, { kimlik: kategori })),
      await markaUclari.sil(istek("marka-sil", gorevli, { kimlik: marka })),
      await ozellikSilmeUcu(istek("ozellik-sil", gorevli, { kimlik: ozellik })),
    ]) {
      expect(yanit.status).toBe(403);
      expect(await hata(yanit)).toMatchObject({ kod: "yetki" });
    }
    expect(await kategoriyiOku(kategori, vt)).toMatchObject({ silindi: false });

    // Marka ve etiketi değiştirir, etiketi silemez (bağımsız kontrolün bulgusu: testte yoktu).
    const { kimlik: etiket } = await veri<{ kimlik: string }>(
      await etiketUclari.ekle(istek("etiket-ekle", gorevli, { grup: { ad: `G ${benzersiz()}` } })),
    );
    await veri(
      await markaUclari.degistir(
        istek("marka-degistir", gorevli, { kimlik: marka, grup: { aciklama: "Üretici" } }),
      ),
    );
    await veri(
      await etiketUclari.degistir(
        istek("etiket-degistir", gorevli, {
          kimlik: etiket,
          grup: { adresAdi: `g-${benzersiz()}` },
        }),
      ),
    );
    const etiketSilme = await etiketUclari.sil(istek("etiket-sil", gorevli, { kimlik: etiket }));
    expect(etiketSilme.status).toBe(403);
    expect(await etiketServisi.oku(etiket, vt)).toMatchObject({ silindi: false });

    // Seçenek çıkarmak silmedir: görevli seçenek ekler ve adını değiştirir, çıkaramaz; hiçbir şey değişmez.
    const { kimlik: liste } = await veri<{ kimlik: string }>(
      await ozellikEklemeUcu(
        istek("ozellik-ekle", gorevli, {
          ozellik: { ad: `L ${benzersiz()}`, tur: "liste", secenekler: ["A", "B"] },
        }),
      ),
    );
    const [a, b] = (await ozellikServisi.oku(liste, vt))?.secenekler ?? [];
    const kaydet = (secenekler: unknown[]) =>
      ozellikKaydiUcu(
        istek("ozellik-kaydet", gorevli, {
          kimlik: liste,
          ozellik: { ad: "Liste", tur: "liste", birim: null, filtrede: false, secenekler },
        }),
      );
    const cikarma = await kaydet([{ kimlik: a?.kimlik, ad: "A" }]);
    expect(cikarma.status).toBe(403);
    expect(await hata(cikarma)).toMatchObject({
      kod: "yetki",
      ayrinti: [{ alan: "secenekler", kod: "secenek-silme-yetkisi" }],
    });
    expect((await ozellikServisi.oku(liste, vt))?.secenekler).toHaveLength(2);
    await veri(
      await kaydet([{ kimlik: a?.kimlik, ad: "A2" }, { kimlik: b?.kimlik, ad: "B" }, { ad: "C" }]),
    );
    expect((await ozellikServisi.oku(liste, vt))?.secenekler.map((s) => s.ad)).toEqual([
      "A2",
      "B",
      "C",
    ]);
  });

  it.each([
    ["rolsüz yönetici", "rolsuz", 403, "yetki"],
    ["müşteri", "musteri", 401, "oturum-yok"],
    ["girişsiz ziyaretçi", "girissiz", 401, "oturum-yok"],
  ] as const)("%s hiçbir uçta geçmez, hiçbir şey değişmez", async (_ad, kisi, durum, kod) => {
    const sahip = await cerez("magaza-sahibi");
    const { kimlik: kategori } = await veri<{ kimlik: string }>(
      await kategoriEklemeUcu(
        istek("kategori-ekle", sahip, { kategori: { ad: `K ${benzersiz()}` } }),
      ),
    );
    const { kimlik: marka } = await veri<{ kimlik: string }>(
      await markaUclari.ekle(istek("marka-ekle", sahip, { grup: { ad: `M ${benzersiz()}` } })),
    );
    const { kimlik: etiket } = await veri<{ kimlik: string }>(
      await etiketUclari.ekle(istek("etiket-ekle", sahip, { grup: { ad: `E ${benzersiz()}` } })),
    );
    const { kimlik: ozellik } = await veri<{ kimlik: string }>(
      await ozellikEklemeUcu(
        istek("ozellik-ekle", sahip, { ozellik: { ad: `Ö ${benzersiz()}`, tur: "metin" } }),
      ),
    );
    const oturum = await cerez(kisi);
    const kategoriOnce = await kategoriyiOku(kategori, vt);
    for (const yanit of [
      await kategoriEklemeUcu(istek("kategori-ekle", oturum, { kategori: { ad: "X" } })),
      await kategoriDegisikligiUcu(
        istek("kategori-degistir", oturum, { kimlik: kategori, kategori: { ad: "Y" } }),
      ),
      await kategoriSiralamaUcu(
        istek("kategori-sirala", oturum, { ust: null, kimlikler: [kategori] }),
      ),
      await kategoriSilmeUcu(istek("kategori-sil", oturum, { kimlik: kategori })),
      await markaUclari.ekle(istek("marka-ekle", oturum, { grup: { ad: "X" } })),
      await markaUclari.degistir(istek("marka-degistir", oturum, { kimlik: marka, grup: {} })),
      await markaUclari.sil(istek("marka-sil", oturum, { kimlik: marka })),
      await etiketUclari.ekle(istek("etiket-ekle", oturum, { grup: { ad: "X" } })),
      await etiketUclari.degistir(istek("etiket-degistir", oturum, { kimlik: etiket, grup: {} })),
      await etiketUclari.sil(istek("etiket-sil", oturum, { kimlik: etiket })),
      await ozellikEklemeUcu(istek("ozellik-ekle", oturum, { ozellik: { ad: "X", tur: "metin" } })),
      await ozellikKaydiUcu(
        istek("ozellik-kaydet", oturum, {
          kimlik: ozellik,
          ozellik: { ad: "Y", tur: "metin", birim: null, filtrede: false, secenekler: [] },
        }),
      ),
      await ozellikSiralamaUcu(istek("ozellik-sirala", oturum, { kimlikler: [ozellik] })),
      await ozellikSilmeUcu(istek("ozellik-sil", oturum, { kimlik: ozellik })),
    ]) {
      expect(yanit.status).toBe(durum);
      expect(await hata(yanit)).toMatchObject({ kod });
    }
    expect(await kategoriyiOku(kategori, vt)).toEqual(kategoriOnce);
    expect(await markaServisi.oku(marka, vt)).toMatchObject({ silindi: false });
    expect(await etiketServisi.oku(etiket, vt)).toMatchObject({ silindi: false });
    expect(await ozellikServisi.oku(ozellik, vt)).toMatchObject({ silindi: false });
  });
});
