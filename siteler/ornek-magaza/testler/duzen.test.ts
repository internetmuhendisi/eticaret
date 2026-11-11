// Örnek Mağaza'nın teması ve başlangıç düzeni (kart 0114): KURALLAR.md'deki tablonun her durumu, katalog,
// menüler ve düzen boş bir veritabanına kurulduktan sonra çekirdeğin kendi işlevleriyle gerçekten o durumda
// görünür. Düzen bir kez yazılır, ikinci açılışta değişmez.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../cekirdek/izleme/hata-katmani.ts";
import { gorselHazirMi } from "../../../cekirdek/moduller/dosya/servis.ts";
import { duzenSurumleri } from "../../../cekirdek/moduller/duzen/model.ts";
import { duzenServisi } from "../../../cekirdek/moduller/duzen/servis.ts";
import { kategoriler } from "../../../cekirdek/moduller/kategori/model.ts";
import { markalar } from "../../../cekirdek/moduller/marka/model.ts";
import { menuBaslangiciniKur } from "../../../cekirdek/moduller/menu/baslangic.ts";
import { temaServisi } from "../../../cekirdek/moduller/tema/servis.ts";
import { katalogBaslangiciniKur } from "../../../cekirdek/moduller/urun/baslangic.ts";
import { urunler } from "../../../cekirdek/moduller/urun/model.ts";
import type { Veritabani } from "../../../cekirdek/veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../cekirdek/veritabani/testler/deneme-sitesi.ts";
import type { BolumOrnegi } from "../../../cekirdek/vitrin/bolum-kutuphanesi/duzen.ts";
import { urunKaynagiAnahtari } from "../../../cekirdek/vitrin/bolum-kutuphanesi/urun-kaynagi.ts";
import { kaynaklarinUrunleri } from "../../../cekirdek/vitrin/urun-kaynagi.ts";

const site = siteKlasorunuOku(join(import.meta.dirname, ".."));
const servis = duzenServisi(() => site);

const izlenenler: IzlenenHata[] = [];
hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));

let vt: Veritabani;
let sil: () => Promise<void>;
const klasor = mkdtempSync(join(tmpdir(), "ornek-duzen-"));
// Adres adından kimliğe: düzendeki başvurular bununla çözülür.
const kimlikler = {
  kategori: new Map<string, string>(),
  marka: new Map<string, string>(),
  urun: new Map<string, string>(),
};
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ornek-duzen"));
  expect(await katalogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
  expect(await menuBaslangiciniKur(vt, site)).toBe(true);
  expect(await servis.baslangiciKur(vt, () => klasor)).toBe(true);
  for (const [tur, tablo] of [
    ["kategori", kategoriler],
    ["marka", markalar],
    ["urun", urunler],
  ] as const) {
    for (const satir of await vt
      .select({ kimlik: tablo.kimlik, adresAdi: tablo.adres_adi })
      .from(tablo)) {
      kimlikler[tur].set(satir.adresAdi, satir.kimlik);
    }
  }
}, 120_000);
afterAll(async () => {
  await sil();
  rmSync(klasor, { recursive: true, force: true });
});

const kimligi = (tur: keyof typeof kimlikler, adresAdi: string) => {
  const kimlik = kimlikler[tur].get(adresAdi);
  if (kimlik === undefined) throw new Error(`${tur} ${adresAdi} katalogda yok.`);
  return kimlik;
};
const anaSayfa = async (): Promise<BolumOrnegi[]> => (await servis.duzenOku(vt)).duzen["ana-sayfa"];
// Bölümün bir alanının değeri.
const deger = (bolum: BolumOrnegi | undefined, alan: string): unknown =>
  Object.entries(bolum?.degerler ?? {}).find(([ad]) => ad === alan)?.[1];

describe("Örnek Mağaza'nın teması", () => {
  it("üç hazır temayı kullanır, Canlı Çarşı ile açılır", async () => {
    expect(site.temalar.map((tema) => tema.kod)).toEqual([
      "canli-carsi",
      "yumusak-mevsim",
      "keskin-cizgi",
    ]);
    expect((await temaServisi(() => site).temaDurumu(vt)).tema).toBe("canli-carsi");
  });
});

describe("Örnek Mağaza'nın başlangıç düzeni", () => {
  it("karar 0075'in sırasıyla kurulur, bağlanılan her kayıt bulunur", async () => {
    expect((await anaSayfa()).map((bolum) => [bolum.tur, bolum.gizli])).toEqual([
      ["kayan-afis", false],
      ["guven-seridi", false],
      ["kampanya-afisleri", false],
      ["kategori-kutulari", false],
      ["urun-vitrini", false],
      ["urun-vitrini", false],
      ["kampanya-afisleri", false],
      ["sekmeli-vitrin", false],
      ["firsatlar", false],
      ["musteri-yorumlari", false],
      ["genis-afis", false],
      ["blog-yazilari", false],
      ["marka-logolari", true],
      ["bulten-kaydi", false],
    ]);
    const { duzen } = await servis.duzenOku(vt);
    expect(duzen["ust-kisim"].map((bolum) => bolum.tur)).toEqual([
      "duyuru-seridi",
      "ust-satir",
      "menu-satiri",
    ]);
    expect(duzen["alt-kisim"].map((bolum) => bolum.tur)).toEqual([
      "iletisim-bilgileri",
      "baglanti-sutunlari",
      "sosyal-hesaplar",
      "telif-satiri",
      "odeme-isaretleri",
    ]);
    // Hiçbir öğe düşmedi.
    expect(izlenenler).toEqual([]);
  });

  it("öne çıkanlar elle seçilmiş sekiz ürün, sırasıyla", async () => {
    expect(deger((await anaSayfa())[4], "urunler")).toEqual({
      tur: "elle",
      urunler: [
        "kablosuz-kulaklik",
        "kapusonlu-sweatshirt",
        "basic-tisort",
        "keten-masa-ortusu",
        "porselen-kupa",
        "bluetooth-hoparlor",
        "kosu-ayakkabisi",
        "keten-gomlek",
      ].map((adresAdi) => kimligi("urun", adresAdi)),
    });
  });

  it("sekmeli vitrin beş kategoriye, kategori kutuları beş kategoriye, marka logoları Örnek Ses'e bağlı", async () => {
    const bolumler = await anaSayfa();
    const kategorilerin = [
      "giyim",
      "ev-ve-yasam",
      "elektronik-aksesuar",
      "spor-ve-outdoor",
      "kisisel-bakim",
    ].map((adresAdi) => kimligi("kategori", adresAdi));
    expect(
      ((deger(bolumler[7], "sekmeler") ?? []) as { urunler: { kategori: string } }[]).map(
        (sekme) => sekme.urunler.kategori,
      ),
    ).toEqual(kategorilerin);
    expect(
      ((deger(bolumler[3], "kategoriler") ?? []) as { kategori: string }[]).map(
        (oge) => oge.kategori,
      ),
    ).toEqual(kategorilerin);
    expect(deger(bolumler[12], "markalar")).toEqual([{ marka: kimligi("marka", "ornek-ses") }]);
  });

  it("bölümlerin görselleri dört boyutuyla kaydedilmiş, vitrin görseli ucu onları verir", async () => {
    const bolumler = await anaSayfa();
    const listedekiler = (sira: number, alan: string) =>
      ((deger(bolumler[sira], alan) ?? []) as { gorsel?: string }[]).map((oge) => oge.gorsel);
    const gorseller = [
      ...listedekiler(0, "slaytlar"),
      ...listedekiler(2, "afisler"),
      deger(bolumler[4], "yanGorsel"),
      deger(bolumler[5], "yanGorsel"),
      ...listedekiler(6, "afisler"),
      deger(bolumler[10], "gorsel"),
    ] as string[];
    expect(gorseller).toHaveLength(11);
    expect(new Set(gorseller).size).toBe(11);
    const vitrindekiler = await servis.vitrindekiGorseller(vt);
    for (const gorsel of gorseller) {
      expect(await vt.transaction((islem) => gorselHazirMi(islem, gorsel))).toBe("hazir");
      expect(vitrindekiler.has(gorsel)).toBe(true);
    }
  });

  it("vitrinde marka logoları dışında görseli olan ve işlevi yazılmış bütün bölümler çizilir", async () => {
    expect((await servis.cizilecekBolumler(vt, "ana-sayfa")).map((bolum) => bolum.tur)).toEqual([
      "kayan-afis",
      "guven-seridi",
      "kampanya-afisleri",
      "kategori-kutulari",
      "urun-vitrini",
      "urun-vitrini",
      "kampanya-afisleri",
      "sekmeli-vitrin",
      "firsatlar",
      "genis-afis",
    ]);
    expect((await servis.cizilecekBolumler(vt, "ust-kisim")).map((bolum) => bolum.tur)).toEqual([
      "duyuru-seridi",
      "ust-satir",
      "menu-satiri",
    ]);
  });

  it("fırsatlar yalnız eski fiyatı gösterilen bitişli indirimi alır: kulaklık hiç girmez, dört ürün indirim süresince", async () => {
    const firsatlar = async (an: Date) =>
      (
        (await kaynaklarinUrunleri(vt, site, [{ tur: "firsat", adet: 4 }], an))[
          urunKaynagiAnahtari({ tur: "firsat", adet: 4 })
        ] ?? []
      ).map((kart) => kart.kimlik);
    // 15 Kasım 00:00 İstanbul'dan önce hiçbir indirim fırsat değildir: indirimler başlamamıştır, kulaklığın
    // eski fiyatı yoktur.
    expect(deger((await anaSayfa())[8], "adet")).toBe("dort");
    expect(await firsatlar(new Date("2026-11-12T09:00:00Z"))).toEqual([]);
    const sure = await firsatlar(new Date("2026-11-20T09:00:00Z"));
    expect(sure).not.toContain(kimligi("urun", "kablosuz-kulaklik"));
    // Eski fiyat kataloğun kurulduğu ana bağlıdır (karar 0074): katalog indirimin başlangıcından önce
    // kurulduysa fiyat geçmişinde indirimsiz fiyat vardır ve ürünler fırsattır.
    const indirimdenOnceKuruldu = Date.now() < Date.parse("2026-11-14T21:00:00Z");
    expect(sure.toSorted()).toEqual(
      indirimdenOnceKuruldu
        ? [
            "kapusonlu-sweatshirt",
            "celik-termos-750-ml",
            "zeytinyagli-sabun-seti-3lu",
            "bluetooth-hoparlor",
          ]
            .map((adresAdi) => kimligi("urun", adresAdi))
            .toSorted()
        : [],
    );
    expect(await firsatlar(new Date("2026-11-30T21:00:00Z"))).toEqual([]);
  });

  // Kart 0127: katalog tek işlemde yazılır; "en yeni" sırası dosyanın sırasıdır, son eklenenler önce. Her kurulumda
  // aynı dört ürün aynı sırayla gelir (eskiden rastgele kimlik belirliyordu).
  it("yeni gelenler kataloğa son eklenen dört ürün, son eklenen önce", async () => {
    const yeni = { tur: "yeni", adet: 4 } as const;
    const kartlar =
      (await kaynaklarinUrunleri(vt, site, [yeni], new Date()))[urunKaynagiAnahtari(yeni)] ?? [];
    expect(kartlar.map((kart) => kart.kimlik)).toEqual(
      ["keten-gomlek", "kablosuz-sarj-standi", "bluetooth-hoparlor", "kokulu-mum"].map((adresAdi) =>
        kimligi("urun", adresAdi),
      ),
    );
  });

  it("ikinci açılışta değişmez", async () => {
    const once = await servis.duzenOku(vt);
    expect(await servis.baslangiciKur(vt, () => klasor)).toBe(false);
    expect(await servis.duzenOku(vt)).toEqual(once);
    expect(await vt.select({ sira: duzenSurumleri.sira }).from(duzenSurumleri)).toHaveLength(1);
  });
});
