// Örnek Mağaza'nın başlangıç menüleri (kart 0107): KURALLAR.md'deki tablonun her durumu, katalog ve menüler
// boş bir veritabanına kurulduktan sonra çekirdeğin kendi işlevleriyle gerçekten o durumda görünür. Zaman
// sabit verilir: zamanlanmış ürünün öğesi takvimden bağımsız denenir.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { sayfaBaslangiciniKur } from "../../../cekirdek/moduller/icerik/sayfa-kurulumu.ts";
import { kategoriler } from "../../../cekirdek/moduller/kategori/model.ts";
import { kategoriDegistir } from "../../../cekirdek/moduller/kategori/servis.ts";
import { menuBaslangiciniKur } from "../../../cekirdek/moduller/menu/baslangic.ts";
import {
  type MenuDali,
  menuleriOku,
  panelMenusu,
  vitrinMenusu,
} from "../../../cekirdek/moduller/menu/servis.ts";
import { katalogBaslangiciniKur } from "../../../cekirdek/moduller/urun/baslangic.ts";
import type { Veritabani } from "../../../cekirdek/veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../cekirdek/veritabani/testler/deneme-sitesi.ts";

const site = siteKlasorunuOku(join(import.meta.dirname, ".."));

// 1 Aralık 00:00 İstanbul: Yılbaşı Kupa Seti yayına girdiği an.
const aralik = new Date("2026-11-30T21:00:00Z");
const birOnce = new Date(aralik.getTime() - 1);

let vt: Veritabani;
let sil: () => Promise<void>;
const klasor = mkdtempSync(join(tmpdir(), "ornek-menuler-"));
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ornek-menuler"));
  // Galeri görselleri geçici bir dosya klasörüne kaydedilir (kart 0087).
  expect(await katalogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
  // Başlangıç sayfaları menülerden önce kurulur (kart 0273): alt bilginin "Kurumsal" sütunu onlara bağlanır.
  expect(await sayfaBaslangiciniKur(vt, site)).toBe(true);
  expect(await menuBaslangiciniKur(vt, site)).toBe(true);
}, 120_000);
afterAll(async () => {
  await sil();
  rmSync(klasor, { recursive: true, force: true });
});

const metinler = (dallar: MenuDali[] | undefined): unknown[] =>
  (dallar ?? []).map((dal) =>
    dal.altlar.length === 0 ? dal.metin : [dal.metin, metinler(dal.altlar)],
  );

describe("Örnek Mağaza'nın menüleri", () => {
  it("üç menü kurulur", async () => {
    expect((await menuleriOku(vt)).map((menu) => [menu.kod, menu.tur])).toEqual([
      ["alt-bilgi", "elle"],
      ["ana-menu", "elle"],
      ["kategori-menusu", "kategori-agaci"],
    ]);
  });

  it("ana menü: kategoriler, açılır ürün, başlık altında marka; Yılbaşı yayına girince görünür", async () => {
    const once = await vitrinMenusu(vt, "ana-menu", { an: birOnce });
    expect(metinler(once)).toEqual([
      "Giyim",
      "Ev ve Yaşam",
      ["Elektronik Aksesuar", ["Kablosuz Kulaklık"]],
      "Spor ve Outdoor",
      "Kişisel Bakım",
      ["Markalar", ["Örnek Ses"]],
    ]);
    expect(once?.[2]?.hedef).toEqual({ tur: "kategori", adresAdi: "elektronik-aksesuar" });
    expect(once?.[5]?.altlar[0]?.hedef).toEqual({ tur: "marka", adresAdi: "ornek-ses" });
    const sonra = await vitrinMenusu(vt, "ana-menu", { an: aralik });
    expect(metinler(sonra).at(-1)).toBe("Yılbaşı");
    expect(sonra?.at(-1)?.hedef).toEqual({ tur: "urun", adresAdi: "yilbasi-kupa-seti" });
    // Panel görünmeyen öğeyi işaretler.
    const [anaMenu] = (await menuleriOku(vt)).filter((menu) => menu.kod === "ana-menu");
    if (anaMenu === undefined) throw new Error("Ana menü yok.");
    const panel = await panelMenusu(vt, anaMenu.kimlik, { an: birOnce });
    expect("ogeler" in panel && panel.ogeler.at(-1)?.durum).toBe("hedef-gorunmuyor");
  });

  it("kategori menüsü ağaçtan gelir, ad değişince değişir", async () => {
    expect(metinler(await vitrinMenusu(vt, "kategori-menusu"))).toEqual([
      "Giyim",
      "Ev ve Yaşam",
      "Elektronik Aksesuar",
      "Spor ve Outdoor",
      "Kişisel Bakım",
    ]);
    const [giyim] = await vt
      .select({ kimlik: kategoriler.kimlik })
      .from(kategoriler)
      .where(eq(kategoriler.adres_adi, "giyim"));
    if (giyim === undefined) throw new Error("Giyim yok.");
    await kategoriDegistir(vt, { tur: "sistem", ad: "deneme" }, giyim.kimlik, { ad: "Giysi" });
    expect(metinler(await vitrinMenusu(vt, "kategori-menusu"))[0]).toBe("Giysi");
    expect(metinler(await vitrinMenusu(vt, "ana-menu", { an: birOnce }))[0]).toBe("Giysi");
    await kategoriDegistir(vt, { tur: "sistem", ad: "deneme" }, giyim.kimlik, { ad: "Giyim" });
  });

  it("alt bilgi: üç sütun; gizli ürün, sabit sayfalar ve sitenin kendi adresleri görünür", async () => {
    const altBilgi = await vitrinMenusu(vt, "alt-bilgi");
    expect(metinler(altBilgi)).toEqual([
      [
        "Alışveriş",
        [
          "Giyim",
          "Ev ve Yaşam",
          "Elektronik Aksesuar",
          "Spor ve Outdoor",
          "Kişisel Bakım",
          "Hediye Paketleme",
        ],
      ],
      ["Kurumsal", ["Hakkımızda", "İletişim"]],
      ["Sözleşmeler", ["Üyelik sözleşmesi", "KVKK aydınlatma metni"]],
    ]);
    // Kart 0273: başlangıç sayfalarına bağlı öğeler, sayfanın başlığıyla ve adres adıyla.
    expect(altBilgi?.[1]?.altlar.map((dal) => dal.hedef)).toEqual([
      { tur: "sayfa", adresAdi: "hakkimizda" },
      { tur: "sayfa", adresAdi: "iletisim" },
    ]);
    expect(altBilgi?.[2]?.altlar.map((dal) => dal.hedef)).toEqual([
      { tur: "adres", adres: "/yasal/uyelik-sozlesmesi", yeniSekme: false },
      { tur: "adres", adres: "/yasal/kvkk-aydinlatma", yeniSekme: false },
    ]);
  });
});
