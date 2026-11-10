// Örnek Mağaza'nın teması ve başlangıç düzeni (kart 0114): KURALLAR.md'deki tablonun her durumu, katalog,
// menüler ve düzen boş bir veritabanına kurulduktan sonra çekirdeğin kendi işlevleriyle gerçekten o durumda
// görünür. Düzen bir kez yazılır, ikinci açılışta değişmez.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../cekirdek/izleme/hata-katmani.ts";
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
  expect(await servis.baslangiciKur(vt)).toBe(true);
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
      ["kayan-afis", true],
      ["guven-seridi", false],
      ["kampanya-afisleri", true],
      ["kategori-kutulari", true],
      ["urun-vitrini", false],
      ["urun-vitrini", false],
      ["kampanya-afisleri", true],
      ["sekmeli-vitrin", false],
      ["firsatlar", false],
      ["musteri-yorumlari", false],
      ["genis-afis", true],
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

  it("öne çıkanlar elle seçilmiş beş ürün, sırasıyla", async () => {
    expect(deger((await anaSayfa())[4], "urunler")).toEqual({
      tur: "elle",
      urunler: [
        "kablosuz-kulaklik",
        "kapusonlu-sweatshirt",
        "basic-tisort",
        "keten-masa-ortusu",
        "porselen-kupa",
      ].map((adresAdi) => kimligi("urun", adresAdi)),
    });
  });

  it("sekmeli vitrin üç kategoriye, kategori kutuları üç kategoriye, marka logoları Örnek Ses'e bağlı", async () => {
    const bolumler = await anaSayfa();
    const kategorilerin = ["giyim", "ev-ve-yasam", "elektronik-aksesuar"].map((adresAdi) =>
      kimligi("kategori", adresAdi),
    );
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

  it("vitrinde yalnız görseli gerekmeyen ve işlevi yazılmış bölümler çizilir", async () => {
    expect((await servis.cizilecekBolumler(vt, "ana-sayfa")).map((bolum) => bolum.tur)).toEqual([
      "guven-seridi",
      "urun-vitrini",
      "urun-vitrini",
      "sekmeli-vitrin",
      "firsatlar",
    ]);
    expect((await servis.cizilecekBolumler(vt, "ust-kisim")).map((bolum) => bolum.tur)).toEqual([
      "duyuru-seridi",
      "ust-satir",
      "menu-satiri",
    ]);
  });

  it("fırsatlar yalnız eski fiyatı gösterilen bitişli indirimi alır: kulaklık hiç girmez, sweatshirt indirim süresince", async () => {
    const firsatlar = async (an: Date) =>
      (
        (await kaynaklarinUrunleri(vt, site, [{ tur: "firsat", adet: 2 }], an))[
          urunKaynagiAnahtari({ tur: "firsat", adet: 2 })
        ] ?? []
      ).map((kart) => kart.kimlik);
    // 15 Kasım 00:00 İstanbul'dan önce hiçbir indirim fırsat değildir: sweatshirtin indirimi başlamamıştır,
    // kulaklığın eski fiyatı yoktur.
    expect(await firsatlar(new Date("2026-11-12T09:00:00Z"))).toEqual([]);
    const sure = await firsatlar(new Date("2026-11-20T09:00:00Z"));
    expect(sure).not.toContain(kimligi("urun", "kablosuz-kulaklik"));
    // Sweatshirtin eski fiyatı kataloğun kurulduğu ana bağlıdır (karar 0074): katalog indirimin başlangıcından
    // önce kurulduysa fiyat geçmişinde indirimsiz fiyat vardır ve sweatshirt fırsattır.
    const indirimdenOnceKuruldu = Date.now() < Date.parse("2026-11-14T21:00:00Z");
    expect(sure).toEqual(indirimdenOnceKuruldu ? [kimligi("urun", "kapusonlu-sweatshirt")] : []);
    expect(await firsatlar(new Date("2026-11-30T21:00:00Z"))).toEqual([]);
  });

  it("ikinci açılışta değişmez", async () => {
    const once = await servis.duzenOku(vt);
    expect(await servis.baslangiciKur(vt)).toBe(false);
    expect(await servis.duzenOku(vt)).toEqual(once);
    expect(await vt.select({ sira: duzenSurumleri.sira }).from(duzenSurumleri)).toHaveLength(1);
  });
});
