// Müşterinin adres defteri gerçek veritabanıyla (kart 0237, karar 0149):
// - Ekleme, değiştirme, kalıcı silme; liste önce varsayılan teslimat adresi, sonra en yeni.
// - Varsayılan: varsayılanı olmayan türde ilk adres varsayılan olur, yeni varsayılan öncekini bırakır, silinen
//   varsayılanın yerine kalanların en yenisi geçer; işaret düzenlemede kaldırılabilir. Veritabanı her türde ikinci
//   varsayılanı reddeder.
// - Sınır kayıttadır; aynı anda gelen eklemeler ve açık duran bir eklemenin arkasındaki ekleme sınırı aşamaz.
// - Telefonun zorunluluğu ve teslimat ülkesi ödemeyle aynı kuralla; il ve ilçe tutarsızlığını şema reddeder.
// - Başka müşterinin adresi olmayan adresle aynı cevabı alır; iki site birbirini görmez; değişiklik kaydına girmez.
// - Ödemeden kaydetme sınır doluysa ya da aynı adres varsa yazmaz.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { musteriAdresiSinirlari } from "../../../kayitlar/musteri-adresleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { adresServisi } from "../adres.ts";
import { type AdresFormu, adresFormuSemasi } from "../adres-semalari.ts";
import { musteriAdresleri, musteriler } from "../model.ts";

vi.setConfig({ testTimeout: 60_000 });

const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
const servis = adresServisi(site);

let vt: Veritabani;
let sil: () => Promise<void>;
let vtB: Veritabani;
let silB: () => Promise<void>;
beforeAll(async () => {
  [{ vt, sil }, { vt: vtB, sil: silB }] = await Promise.all([
    denemeSitesiAc("adres"),
    denemeSitesiAc("adres-b"),
  ]);
});
afterAll(async () => {
  await Promise.all([sil(), silB()]);
});

const musteriAc = async (veritabani: Veritabani = vt) =>
  (
    await hesapAc(veritabani, "musteri", {
      eposta: `m-${randomUUID().slice(0, 8)}@ornek.test`,
      sifre: "uzun-bir-deneme-sifresi",
    })
  ).hesapKimligi;

// Formdan geçmiş girdi (şemadan geçer, telefon çevrilir).
const form = (
  ad: string,
  ek: Partial<{
    varsayilanTeslimat: boolean;
    varsayilanFatura: boolean;
    telefon: string;
    ulke: string;
  }> = {},
): AdresFormu =>
  adresFormuSemasi.parse({
    baslik: `Adres ${ad}`,
    teslimat: {
      ad,
      soyad: "Müşteri",
      telefon: ek.telefon ?? "0555 000 00 00",
      adres:
        ek.ulke === undefined
          ? {
              ulke: "TR",
              il: "TR-06",
              ilce: "TR-06-007",
              adres: "Deneme No: 1",
              postaKodu: "06420",
            }
          : { ulke: ek.ulke, adres: "Deneme Straße 1" },
    },
    varsayilanTeslimat: ek.varsayilanTeslimat ?? false,
    varsayilanFatura: ek.varsayilanFatura ?? false,
  });

const hatasi = (vaat: Promise<unknown>) =>
  vaat.then(
    () => undefined,
    (hata: { kod?: string; ayrinti?: unknown }) => ({ kod: hata.kod, ayrinti: hata.ayrinti }),
  );

// Listenin özeti: ad ve varsayılan işaretleri, sırasıyla.
const ozet = async (musteri: string, veritabani: Veritabani = vt) =>
  (await servis.adresListesi(veritabani, musteri)).map((adres) => ({
    ad: adres.teslimat.ad,
    t: adres.varsayilanTeslimat,
    f: adres.varsayilanFatura,
  }));

const kimlikleri = async (musteri: string) =>
  Object.fromEntries(
    (await servis.adresListesi(vt, musteri)).map((adres) => [adres.teslimat.ad, adres.kimlik]),
  );

describe("ekleme ve liste", () => {
  it("ilk adres iki türde varsayılan olur, sonraki olmaz; alanlar ve telefon çevrilmiş saklanır", async () => {
    const musteri = await musteriAc();
    const [ilk] = await servis.adresEkle(vt, musteri, form("Bir"));
    expect(ilk).toEqual({
      kimlik: expect.any(String),
      baslik: "Adres Bir",
      teslimat: {
        ad: "Bir",
        soyad: "Müşteri",
        telefon: "+90 555 000 00 00",
        adres: {
          ulke: "TR",
          il: "TR-06",
          ilce: "TR-06-007",
          adres: "Deneme No: 1",
          postaKodu: "06420",
        },
      },
      varsayilanTeslimat: true,
      varsayilanFatura: true,
    });
    await servis.adresEkle(vt, musteri, form("İki"));
    expect(await ozet(musteri)).toEqual([
      { ad: "Bir", t: true, f: true },
      { ad: "İki", t: false, f: false },
    ]);
  });

  it("varsayılan teslimat adresi önce, sonra en yeni önce", async () => {
    const musteri = await musteriAc();
    for (const ad of ["Bir", "İki", "Üç"]) await servis.adresEkle(vt, musteri, form(ad));
    expect((await ozet(musteri)).map(({ ad }) => ad)).toEqual(["Bir", "Üç", "İki"]);
  });

  it("işaretlenen yeni adres o türde öncekini bırakır, öteki tür değişmez", async () => {
    const musteri = await musteriAc();
    await servis.adresEkle(vt, musteri, form("Bir"));
    await servis.adresEkle(vt, musteri, form("İki", { varsayilanTeslimat: true }));
    expect(await ozet(musteri)).toEqual([
      { ad: "İki", t: true, f: false },
      { ad: "Bir", t: false, f: true },
    ]);
  });

  it("değişiklik kaydına girmez", async () => {
    const musteri = await musteriAc();
    const [{ sayi = 0 } = {}] = await vt
      .select({ sayi: sql<number>`count(*)::int` })
      .from(degisiklikKayitlari);
    await servis.adresEkle(vt, musteri, form("Bir"));
    const [{ sonra = 0 } = {}] = await vt
      .select({ sonra: sql<number>`count(*)::int` })
      .from(degisiklikKayitlari);
    expect(sonra).toBe(sayi);
  });
});

describe("kurallar", () => {
  it("telefon zorunluyken telefonsuz adres reddedilir, ayar kapalıyken geçer", async () => {
    const musteri = await musteriAc();
    const telefonsuz = form("Bir", { telefon: "" });
    expect(await hatasi(servis.adresEkle(vt, musteri, telefonsuz))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "teslimat.telefon", kod: "telefon-gerekli" }],
    });
    await siteninServisi(site).degistir(
      vt,
      { tur: "yonetici", kimlik: randomUUID() },
      {
        telefonZorunlu: false,
      },
    );
    try {
      expect(await hatasi(servis.adresEkle(vt, musteri, telefonsuz))).toBeUndefined();
      expect((await servis.adresListesi(vt, musteri))[0]?.teslimat.telefon).toBeUndefined();
    } finally {
      await siteninServisi(site).degistir(
        vt,
        { tur: "yonetici", kimlik: randomUUID() },
        {
          telefonZorunlu: true,
        },
      );
    }
  });

  it("sitenin teslimat ülkesinde olmayan adres reddedilir", async () => {
    const musteri = await musteriAc();
    expect(
      await hatasi(
        servis.adresEkle(vt, musteri, form("Bir", { ulke: "DE", telefon: "+49 30 1234567" })),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "teslimat.adres.ulke", kod: "ulke-teslimat-disi" }],
    });
    expect(await ozet(musteri)).toEqual([]);
  });

  it("şema il ile ilçe tutarsızlığını ve eksik ilçeyi reddeder, adın sınırını tutar", () => {
    const girdi = (adres: object, baslik = "Ev") => ({
      baslik,
      teslimat: { ad: "A", soyad: "B", telefon: "05550000000", adres },
      varsayilanTeslimat: false,
      varsayilanFatura: false,
    });
    const yollar = (sonuc: ReturnType<typeof adresFormuSemasi.safeParse>) =>
      sonuc.success ? [] : sonuc.error.issues.map((sorun) => sorun.path.join("."));
    // Ankara'nın ilçesi İstanbul'la verilmiş.
    expect(
      yollar(
        adresFormuSemasi.safeParse(
          girdi({ ulke: "TR", il: "TR-34", ilce: "TR-06-007", adres: "x", postaKodu: "06420" }),
        ),
      ),
    ).toEqual(["teslimat.adres.ilce"]);
    expect(
      yollar(
        adresFormuSemasi.safeParse(
          girdi({ ulke: "TR", il: "TR-06", adres: "x", postaKodu: "06420" }),
        ),
      ),
    ).toEqual(["teslimat.adres.ilce"]);
    const uzun = "x".repeat(musteriAdresiSinirlari.baslikEnCok + 1);
    expect(
      yollar(
        adresFormuSemasi.safeParse(
          girdi(
            { ulke: "TR", il: "TR-06", ilce: "TR-06-007", adres: "x", postaKodu: "06420" },
            uzun,
          ),
        ),
      ),
    ).toEqual(["baslik"]);
  });
});

describe("değiştirme, silme ve varsayılan", () => {
  it("değiştirme bütün alanları yazar; işareti kaldırılan tür boş kalır", async () => {
    const musteri = await musteriAc();
    await servis.adresEkle(vt, musteri, form("Bir"));
    const { Bir } = await kimlikleri(musteri);
    if (Bir === undefined) throw new Error("Adres yok.");
    const yeni = form("Yeni", { varsayilanTeslimat: true, varsayilanFatura: false });
    await servis.adresDegistir(vt, musteri, Bir, yeni);
    expect(await ozet(musteri)).toEqual([{ ad: "Yeni", t: true, f: false }]);
  });

  it("yeni varsayılan öncekini bırakır (değiştirme ve 'Varsayılan yap')", async () => {
    const musteri = await musteriAc();
    for (const ad of ["Bir", "İki", "Üç"]) await servis.adresEkle(vt, musteri, form(ad));
    const { İki, Üç } = await kimlikleri(musteri);
    if (İki === undefined || Üç === undefined) throw new Error("Adres yok.");
    await servis.adresDegistir(vt, musteri, İki, form("İki", { varsayilanFatura: true }));
    expect(await ozet(musteri)).toEqual([
      { ad: "Bir", t: true, f: false },
      { ad: "Üç", t: false, f: false },
      { ad: "İki", t: false, f: true },
    ]);
    await servis.varsayilanYap(vt, musteri, Üç, ["teslimat", "fatura"]);
    expect(await ozet(musteri)).toEqual([
      { ad: "Üç", t: true, f: true },
      { ad: "İki", t: false, f: false },
      { ad: "Bir", t: false, f: false },
    ]);
    await servis.varsayilanYap(vt, musteri, İki, ["fatura"]);
    expect(await ozet(musteri)).toEqual([
      { ad: "Üç", t: true, f: false },
      { ad: "İki", t: false, f: true },
      { ad: "Bir", t: false, f: false },
    ]);
  });

  it("silme kalıcıdır; silinen varsayılanın yerine kalanların en yenisi geçer", async () => {
    const musteri = await musteriAc();
    for (const ad of ["Bir", "İki", "Üç"]) await servis.adresEkle(vt, musteri, form(ad));
    const { Bir, İki } = await kimlikleri(musteri);
    if (Bir === undefined || İki === undefined) throw new Error("Adres yok.");
    await servis.adresSil(vt, musteri, Bir);
    expect(await ozet(musteri)).toEqual([
      { ad: "Üç", t: true, f: true },
      { ad: "İki", t: false, f: false },
    ]);
    expect(
      await vt.select().from(musteriAdresleri).where(eq(musteriAdresleri.kimlik, Bir)),
    ).toEqual([]);
    // Varsayılan olmayan silinince varsayılan değişmez.
    await servis.adresSil(vt, musteri, İki);
    expect(await ozet(musteri)).toEqual([{ ad: "Üç", t: true, f: true }]);
  });

  it("başka müşterinin ve olmayan adres 'adres-yok' alır, adres değişmez", async () => {
    const a = await musteriAc();
    const b = await musteriAc();
    await servis.adresEkle(vt, b, form("Bninki"));
    const { Bninki } = await kimlikleri(b);
    if (Bninki === undefined) throw new Error("Adres yok.");
    const yok = { kod: "bulunamadi", ayrinti: [{ alan: "kimlik", kod: "adres-yok" }] };
    for (const kimlik of [Bninki, randomUUID()]) {
      expect(await hatasi(servis.adresDegistir(vt, a, kimlik, form("A")))).toEqual(yok);
      expect(await hatasi(servis.adresSil(vt, a, kimlik))).toEqual(yok);
      expect(await hatasi(servis.varsayilanYap(vt, a, kimlik, ["teslimat"]))).toEqual(yok);
    }
    expect(await ozet(b)).toEqual([{ ad: "Bninki", t: true, f: true }]);
    expect(await ozet(a)).toEqual([]);
  });

  it("veritabanı bir müşteride iki varsayılan teslimat ya da fatura adresini reddeder", async () => {
    const musteri = await musteriAc();
    await servis.adresEkle(vt, musteri, form("Bir"));
    await servis.adresEkle(vt, musteri, form("İki"));
    const { İki } = await kimlikleri(musteri);
    if (İki === undefined) throw new Error("Adres yok.");
    for (const alan of [{ varsayilan_teslimat: true }, { varsayilan_fatura: true }]) {
      await expect(
        vt.update(musteriAdresleri).set(alan).where(eq(musteriAdresleri.kimlik, İki)),
      ).rejects.toThrow();
    }
  });
});

describe("sınır", () => {
  it("sınırdaki müşteri yeni adres ekleyemez", async () => {
    const musteri = await musteriAc();
    for (let sira = 0; sira < musteriAdresiSinirlari.enCok; sira += 1) {
      await servis.adresEkle(vt, musteri, form(`A${sira}`));
    }
    expect(await hatasi(servis.adresEkle(vt, musteri, form("Fazla")))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "adresler", kod: "adres-siniri" }],
    });
    expect(await ozet(musteri)).toHaveLength(musteriAdresiSinirlari.enCok);
  });

  it("açık duran eklemenin arkasındaki ekleme kilitte bekler ve sınırı aşamaz", async () => {
    const musteri = await musteriAc();
    for (let sira = 0; sira < musteriAdresiSinirlari.enCok - 1; sira += 1) {
      await servis.adresEkle(vt, musteri, form(`A${sira}`));
    }
    let ikinci: Promise<unknown> | undefined;
    await vt.transaction(async (islem) => {
      // Birinci ekleme kaydedilmeden durur: ikincinin sayımı onu kilitten sonra görmelidir.
      await islem
        .select({ kimlik: musteriler.kimlik })
        .from(musteriler)
        .where(eq(musteriler.kimlik, musteri))
        .for("update");
      await islem.insert(musteriAdresleri).values({
        musteri_kimligi: musteri,
        baslik: "Açık",
        ad: "Açık",
        soyad: "M",
        ulke: "TR",
        adres: "x",
      });
      ikinci = hatasi(servis.adresEkle(vt, musteri, form("İkinci")));
      await kilitBekleyeniGor(vt);
    });
    expect(await ikinci).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "adresler", kod: "adres-siniri" }],
    });
    expect(await ozet(musteri)).toHaveLength(musteriAdresiSinirlari.enCok);
  });

  it("aynı anda sekiz ekleme sınırı aşmaz ve tek varsayılan bırakır", async () => {
    const musteri = await musteriAc();
    for (let sira = 0; sira < musteriAdresiSinirlari.enCok - 3; sira += 1) {
      await servis.adresEkle(vt, musteri, form(`A${sira}`));
    }
    const sonuclar = await Promise.all(
      Array.from({ length: 8 }, (_, sira) =>
        hatasi(servis.adresEkle(vt, musteri, form(`B${sira}`, { varsayilanTeslimat: true }))),
      ),
    );
    expect(sonuclar.filter((sonuc) => sonuc === undefined)).toHaveLength(3);
    const liste = await ozet(musteri);
    expect(liste).toHaveLength(musteriAdresiSinirlari.enCok);
    expect(liste.filter(({ t }) => t)).toHaveLength(1);
  });
});

describe("ödemeden kaydetme", () => {
  it("yazar, ilk adresi varsayılan yapar; aynı adresi ikinci kez yazmaz", async () => {
    const musteri = await musteriAc();
    const { teslimat } = form("Ödeme");
    await vt.transaction((islem) =>
      servis.odemedenKaydet(islem, musteri, { baslik: "Ev", teslimat }),
    );
    await vt.transaction((islem) =>
      servis.odemedenKaydet(islem, musteri, { baslik: "Ev", teslimat }),
    );
    expect(await ozet(musteri)).toEqual([{ ad: "Ödeme", t: true, f: true }]);
    // Bir alanı farklı adres ayrı yazılır.
    await vt.transaction((islem) =>
      servis.odemedenKaydet(islem, musteri, {
        baslik: "İş",
        teslimat: { ...teslimat, adres: { ...teslimat.adres, adres: "Başka No: 2" } },
      }),
    );
    expect(await ozet(musteri)).toHaveLength(2);
  });

  it("sınır doluysa hiçbir şey yazmaz, hata vermez", async () => {
    const musteri = await musteriAc();
    for (let sira = 0; sira < musteriAdresiSinirlari.enCok; sira += 1) {
      await servis.adresEkle(vt, musteri, form(`A${sira}`));
    }
    await vt.transaction((islem) =>
      servis.odemedenKaydet(islem, musteri, { baslik: "Ev", teslimat: form("Fazla").teslimat }),
    );
    expect(await ozet(musteri)).toHaveLength(musteriAdresiSinirlari.enCok);
  });
});

describe("iki site", () => {
  it("bir sitenin adresi öteki sitede görünmez", async () => {
    const musteri = await musteriAc();
    await servis.adresEkle(vt, musteri, form("Bir"));
    const bdeki = await musteriAc(vtB);
    expect(await ozet(bdeki, vtB)).toEqual([]);
    expect(await vtB.select().from(musteriAdresleri)).toEqual([]);
  });
});
