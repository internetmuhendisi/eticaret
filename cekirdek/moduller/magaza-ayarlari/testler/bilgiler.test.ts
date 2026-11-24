// Mağaza bilgileri gerçek veritabanıyla (kart 0278, karar 0175):
// - Bütün alanlar birlikte yazılır, ayarlardan aynen okunur; telefon ülke içi yazılışla da girilir (+90'a çevrilir),
//   sosyal hesapta boş alan atılır ve baştaki "@" kullanıcı adına girmez.
// - Boş yazı ayarı boşaltır: e-posta, telefon; adresin ve satıcı bilgilerinin bütün alanları boşsa ayar silinir.
// - Her kural alanın yoluyla ve şemanın koduyla reddedilir, hiçbir ayar değişmez: boş mağaza adı, e-posta, telefon,
//   eksik ve tutarsız il ve ilçe, posta kodu, sosyal hesap kalıbı (formun sırasıyla) ve tekrarı, satıcıda boş unvan,
//   vergi ve kimlik numarasının biçimi ve kontrol hanesi, MERSİS, KEP alan adı.
// - Telefon, e-posta, adres ve satıcı bilgileri değişiklik kaydına değeri yazılmadan girer; mağaza adı ve sosyal
//   hesaplar değeriyle girer.
// - Bağımsız kontrolün bulgularıyla: gizli anahtara benzeyen ad ve sosyal hesap (kayda değeriyle giren alanlar)
//   "kayda-uygun-degil", "@"lı ad kendi koduyla, denetim karakteri "metin-gecersiz" (adreste satır sonu serbest), satış
//   ülkesi dışı ülke "ulke-satis-disi", sınırı aşan sosyal hesaplar "too_big"; aynı sosyal hesaplar başka sırayla
//   gönderilince kayda girmez.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { magazaBilgileriniDegistir } from "../bilgiler.ts";
import type { MagazaBilgileriGirdisi } from "../semalar.ts";
import { siteninServisi } from "../servis.ts";

const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
const servis = siteninServisi(site);
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("magaza-bilgileri"));
});
afterAll(async () => {
  await sil();
});

// Ankara / Çankaya (il ve ilçe kodları ülkenin veri dosyasından).
const dolu = (): MagazaBilgileriGirdisi => ({
  magazaAdi: "Deneme Dükkânı",
  iletisimEpostasi: "iletisim@deneme.test",
  iletisimTelefonu: "0312 000 00 00",
  magazaAdresi: {
    ulke: "TR",
    il: "TR-06",
    ilce: "TR-06-007",
    adres: "Deneme Sokak No: 1",
    postaKodu: "06420",
  },
  sosyalHesaplar: [
    { site: "instagram", hesap: "@deneme.dukkan" },
    { site: "facebook", hesap: "" },
    { site: "youtube", hesap: " denemetv " },
  ],
  saticiBilgileri: {
    ulke: "TR",
    isletmeTuru: "sirket",
    unvan: "Deneme Ticaret A.Ş.",
    vergiDairesi: "Kavaklıdere",
    vergiNumarasi: "1111111114",
    mersisNumarasi: "0111111111400015",
    ticaretSicilNumarasi: "",
    kepAdresi: "",
  },
});

const reddi = async (girdi: MagazaBilgileriGirdisi) =>
  magazaBilgileriniDegistir(vt, site, yonetici(), girdi).then(
    () => undefined,
    (hata: { kod?: string; ayrinti?: unknown }) => ({ kod: hata.kod, ayrinti: hata.ayrinti }),
  );

beforeEach(async () => {
  await magazaBilgileriniDegistir(vt, site, yonetici(), dolu());
});

describe("kayıt", () => {
  it("bütün alanlar yazılır; telefon uluslararası biçime çevrilir, boş ve @'li sosyal hesap düzelir", async () => {
    const ayarlar = await servis.oku(vt);
    expect(ayarlar).toMatchObject({
      magazaAdi: "Deneme Dükkânı",
      iletisimEpostasi: "iletisim@deneme.test",
      iletisimTelefonu: "+90 312 000 00 00",
      magazaAdresi: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Deneme Sokak No: 1",
        postaKodu: "06420",
      },
      sosyalHesaplar: [
        { site: "instagram", hesap: "deneme.dukkan" },
        { site: "youtube", hesap: "denemetv" },
      ],
      saticiBilgileri: {
        ulke: "TR",
        isletmeTuru: "sirket",
        unvan: "Deneme Ticaret A.Ş.",
        vergiDairesi: "Kavaklıdere",
        vergiNumarasi: "1111111114",
        mersisNumarasi: "0111111111400015",
      },
    });
    expect(ayarlar.saticiBilgileri).not.toHaveProperty("kepAdresi");
  });

  it("boş yazı ayarı boşaltır; adresin ve satıcının bütün alanları boşsa ayar silinir", async () => {
    const girdi = dolu();
    await magazaBilgileriniDegistir(vt, site, yonetici(), {
      ...girdi,
      iletisimEpostasi: " ",
      iletisimTelefonu: "",
      magazaAdresi: { ulke: "TR", il: "", ilce: "", adres: "", postaKodu: "" },
      sosyalHesaplar: [],
      saticiBilgileri: {
        ...girdi.saticiBilgileri,
        unvan: "",
        vergiDairesi: "",
        vergiNumarasi: "",
        mersisNumarasi: "",
      },
    });
    const ayarlar = await servis.oku(vt);
    expect(ayarlar.iletisimEpostasi).toBeUndefined();
    expect(ayarlar.iletisimTelefonu).toBeUndefined();
    expect(ayarlar.magazaAdresi).toBeUndefined();
    expect(ayarlar.saticiBilgileri).toBeUndefined();
    expect(ayarlar.sosyalHesaplar).toEqual([]);
    expect(ayarlar.magazaAdi).toBe("Deneme Dükkânı");
  });

  it("şahıs işletmesinde kimlik numarası; ülke koduyla yazılan telefon olduğu gibi", async () => {
    const girdi = dolu();
    await magazaBilgileriniDegistir(vt, site, yonetici(), {
      ...girdi,
      iletisimTelefonu: "+90 532 000 00 00",
      saticiBilgileri: {
        ...girdi.saticiBilgileri,
        isletmeTuru: "sahis",
        unvan: "Ayşe Deneme",
        vergiNumarasi: "10000000146",
        mersisNumarasi: "",
      },
    });
    const ayarlar = await servis.oku(vt);
    expect(ayarlar.iletisimTelefonu).toBe("+90 532 000 00 00");
    expect(ayarlar.saticiBilgileri).toMatchObject({
      isletmeTuru: "sahis",
      vergiNumarasi: "10000000146",
    });
  });
});

describe("kuralların reddi", () => {
  const ornekler: [string, (g: MagazaBilgileriGirdisi) => MagazaBilgileriGirdisi, unknown[]][] = [
    [
      "boş mağaza adı",
      (g) => ({ ...g, magazaAdi: "  " }),
      [{ alan: "magazaAdi", kod: "too_small" }],
    ],
    [
      "e-posta",
      (g) => ({ ...g, iletisimEpostasi: "iletisim" }),
      [{ alan: "iletisimEpostasi", kod: "invalid_format" }],
    ],
    [
      "telefon",
      (g) => ({ ...g, iletisimTelefonu: "312 00" }),
      [{ alan: "iletisimTelefonu", kod: "telefon-bicimi" }],
    ],
    [
      "eksik il ve ilçe",
      (g) => ({ ...g, magazaAdresi: { ...g.magazaAdresi, il: "", ilce: "" } }),
      [
        { alan: "magazaAdresi.il", kod: "il-gerekli" },
        { alan: "magazaAdresi.ilce", kod: "ilce-gerekli" },
      ],
    ],
    [
      "başka ilin ilçesi",
      (g) => ({ ...g, magazaAdresi: { ...g.magazaAdresi, ilce: "TR-34-001" } }),
      [{ alan: "magazaAdresi.ilce", kod: "ilce-baska-ilin" }],
    ],
    [
      "posta kodu",
      (g) => ({ ...g, magazaAdresi: { ...g.magazaAdresi, postaKodu: "64" } }),
      [{ alan: "magazaAdresi.postaKodu", kod: "posta-kodu-bicimi" }],
    ],
    [
      "adressiz il",
      (g) => ({ ...g, magazaAdresi: { ...g.magazaAdresi, adres: " " } }),
      [{ alan: "magazaAdresi.adres", kod: "too_small" }],
    ],
    [
      "sosyal hesap kalıbı (formun sırasıyla)",
      (g) => ({
        ...g,
        sosyalHesaplar: [
          { site: "instagram", hesap: "" },
          { site: "x", hesap: "iyi_hesap" },
          { site: "tiktok", hesap: "boşluk var" },
        ],
      }),
      [{ alan: "sosyalHesaplar.2.hesap", kod: "invalid_format" }],
    ],
    [
      "aynı sosyal hesap iki kez",
      (g) => ({
        ...g,
        sosyalHesaplar: [
          { site: "x", hesap: "ayni" },
          { site: "x", hesap: "@ayni" },
        ],
      }),
      [{ alan: "sosyalHesaplar", kod: "sosyal-hesap-tekrar" }],
    ],
    [
      "satıcıda boş unvan",
      (g) => ({ ...g, saticiBilgileri: { ...g.saticiBilgileri, unvan: "" } }),
      [{ alan: "saticiBilgileri.unvan", kod: "too_small" }],
    ],
    [
      "vergi numarasının biçimi",
      (g) => ({ ...g, saticiBilgileri: { ...g.saticiBilgileri, vergiNumarasi: "12345" } }),
      [{ alan: "saticiBilgileri.vergiNumarasi", kod: "vergi-numarasi-bicimi" }],
    ],
    [
      "vergi numarasının kontrol hanesi",
      (g) => ({ ...g, saticiBilgileri: { ...g.saticiBilgileri, vergiNumarasi: "1111111115" } }),
      [{ alan: "saticiBilgileri.vergiNumarasi", kod: "vergi-numarasi-kontrol" }],
    ],
    [
      "şahısta şirketin numarası",
      (g) => ({ ...g, saticiBilgileri: { ...g.saticiBilgileri, isletmeTuru: "sahis" } }),
      [{ alan: "saticiBilgileri.vergiNumarasi", kod: "vergi-numarasi-bicimi" }],
    ],
    [
      "MERSİS",
      (g) => ({ ...g, saticiBilgileri: { ...g.saticiBilgileri, mersisNumarasi: "123" } }),
      [{ alan: "saticiBilgileri.mersisNumarasi", kod: "mersis-numarasi-bicimi" }],
    ],
    [
      "gizli anahtara benzeyen mağaza adı",
      (g) => ({ ...g, magazaAdi: "Bearer Outdoor" }),
      [{ alan: "magazaAdi", kod: "kayda-uygun-degil" }],
    ],
    [
      "@'li mağaza adı",
      (g) => ({ ...g, magazaAdi: "Ali@Moda" }),
      [{ alan: "magazaAdi", kod: "magaza-adi-eposta" }],
    ],
    [
      "gizli anahtara benzeyen sosyal hesap",
      (g) => ({ ...g, sosyalHesaplar: [{ site: "x", hesap: "eyJabc.def.ghi" }] }),
      [{ alan: "sosyalHesaplar.0.hesap", kod: "kayda-uygun-degil" }],
    ],
    [
      "unvanda denetim karakteri",
      (g) => ({ ...g, saticiBilgileri: { ...g.saticiBilgileri, unvan: "Deneme\u0000A.Ş." } }),
      [{ alan: "saticiBilgileri.unvan", kod: "metin-gecersiz" }],
    ],
    [
      "adreste denetim karakteri",
      (g) => ({ ...g, magazaAdresi: { ...g.magazaAdresi, adres: "Deneme\u0007Sokak" } }),
      [{ alan: "magazaAdresi.adres", kod: "metin-gecersiz" }],
    ],
    [
      "satış ülkesi dışı adres ve satıcı",
      (g) => ({
        ...g,
        magazaAdresi: { ...g.magazaAdresi, ulke: "DE" },
        saticiBilgileri: { ...g.saticiBilgileri, ulke: "DE" },
      }),
      [
        { alan: "magazaAdresi.ulke", kod: "ulke-satis-disi" },
        { alan: "saticiBilgileri.ulke", kod: "ulke-satis-disi" },
      ],
    ],
    [
      "sınırı aşan sosyal hesaplar",
      (g) => ({
        ...g,
        sosyalHesaplar: Array.from({ length: 11 }, (_, i) => ({
          site: "x" as const,
          hesap: `hesap${i}`,
        })),
      }),
      [{ alan: "sosyalHesaplar", kod: "too_big" }],
    ],
    [
      "KEP alan adı",
      (g) => ({ ...g, saticiBilgileri: { ...g.saticiBilgileri, kepAdresi: "deneme@ornek.test" } }),
      [{ alan: "saticiBilgileri.kepAdresi", kod: "kep-adresi-bicimi" }],
    ],
  ];
  for (const [ad, boz, beklenen] of ornekler) {
    it(`${ad}: alanın yolu ve koduyla reddedilir, hiçbir ayar değişmez`, async () => {
      const once = await servis.oku(vt);
      const girdi = boz(dolu());
      // Geçerli bir değişiklik de gönderilir: reddedilen kayıtla birlikte o da yazılmamalı.
      expect(
        await reddi({
          ...girdi,
          magazaAdi: girdi.magazaAdi === dolu().magazaAdi ? "Yeni Ad" : girdi.magazaAdi,
        }),
      ).toEqual({
        kod: "dogrulama",
        ayrinti: beklenen,
      });
      expect(await servis.oku(vt)).toEqual(once);
    });
  }
});

describe("değişiklik kaydı", () => {
  it("adreste satır sonu serbesttir; aynı sosyal hesaplar başka sırayla gönderilince kayda girmez", async () => {
    const girdi = dolu();
    await magazaBilgileriniDegistir(vt, site, yonetici(), {
      ...girdi,
      magazaAdresi: { ...girdi.magazaAdresi, adres: "Deneme Sokak\nNo: 1" },
    });
    expect((await servis.oku(vt)).magazaAdresi?.adres).toBe("Deneme Sokak\nNo: 1");
    const kim = yonetici();
    await magazaBilgileriniDegistir(vt, site, kim, {
      ...girdi,
      sosyalHesaplar: [...girdi.sosyalHesaplar].reverse(),
      magazaAdresi: { ...girdi.magazaAdresi, adres: "Deneme Sokak\nNo: 1" },
    });
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kim_kimligi, kim.kimlik));
    expect(kayitlar).toEqual([]);
    expect((await servis.oku(vt)).sosyalHesaplar).toEqual([
      { site: "instagram", hesap: "deneme.dukkan" },
      { site: "youtube", hesap: "denemetv" },
    ]);
  });

  it("telefon, e-posta, adres ve satıcı değeri yazılmadan girer; ad ve sosyal hesap değeriyle", async () => {
    const kim = yonetici();
    const girdi = dolu();
    await magazaBilgileriniDegistir(vt, site, kim, {
      ...girdi,
      magazaAdi: "Kayıt Dükkânı",
      iletisimEpostasi: "yeni@deneme.test",
      iletisimTelefonu: "0312 111 11 11",
      magazaAdresi: { ...girdi.magazaAdresi, adres: "Yeni Sokak No: 2" },
      sosyalHesaplar: [{ site: "pinterest", hesap: "kayitpin" }],
      saticiBilgileri: { ...girdi.saticiBilgileri, unvan: "Kayıt Ticaret Ltd." },
    });
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kim_kimligi, kim.kimlik));
    const ayarlari = kayitlar.map((k) => (k.yeni_deger as { ayar: string }).ayar).sort();
    expect(ayarlari).toEqual(
      [
        "iletisimEpostasi",
        "iletisimTelefonu",
        "magazaAdi",
        "magazaAdresi",
        "saticiBilgileri",
        "sosyalHesaplar",
      ].sort(),
    );
    const metin = JSON.stringify(kayitlar);
    expect(metin).not.toMatch(/yeni@deneme|111 11 11|Yeni Sokak|Kayıt Ticaret/);
    expect(metin).toContain("Kayıt Dükkânı");
    expect(metin).toContain("kayitpin");
  });
});
