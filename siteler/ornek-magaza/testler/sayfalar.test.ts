// Örnek Mağaza'nın başlangıç sayfaları (kart 0273): KURALLAR.md'deki tablonun her durumu, sayfalar boş bir veritabanına
// kurulduktan sonra çekirdeğin kendi işlevleriyle gerçekten o durumda görünür.
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { kayitAdresiniCoz } from "../../../cekirdek/moduller/gorunurluk/adres.ts";
import { sabitSayfalariOku, vitrinSabitSayfasi } from "../../../cekirdek/moduller/icerik/sayfa.ts";
import { sayfaBaslangiciniKur } from "../../../cekirdek/moduller/icerik/sayfa-kurulumu.ts";
import type { Veritabani } from "../../../cekirdek/veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../cekirdek/veritabani/testler/deneme-sitesi.ts";

const site = siteKlasorunuOku(join(import.meta.dirname, ".."));

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ornek-sayfalar"));
  expect(await sayfaBaslangiciniKur(vt, site)).toBe(true);
}, 120_000);
afterAll(async () => {
  await sil();
});

describe("Örnek Mağaza'nın sayfaları", () => {
  it("üç sayfa kurulur: Hakkımızda ve İletişim yayında, SSS taslak", async () => {
    expect(
      (await sabitSayfalariOku(vt)).map((sayfa) => [sayfa.baslik, sayfa.adresAdi, sayfa.durum]),
    ).toEqual([
      ["Hakkımızda", "hakkimizda", "yayinda"],
      ["İletişim", "iletisim", "yayinda"],
      ["Sıkça sorulan sorular", "sss", "taslak"],
    ]);
  });

  it("yayındaki sayfalar vitrinde açılır, taslak açılmaz; Hakkımızda'nın kendi açıklaması var", async () => {
    const hakkimizda = await kayitAdresiniCoz(vt, "sayfa", "hakkimizda");
    expect(hakkimizda.sonuc).toBe("kayit");
    if (hakkimizda.sonuc !== "kayit") return;
    expect(hakkimizda.kayit.aciklama).not.toBeNull();
    expect((await vitrinSabitSayfasi(vt, hakkimizda.kayit.kimlik))?.icerik).toContain("<h3>");
    // Paketin yer tutucusuna mağazanın adı kondu (karar 0203).
    const icerik = (await vitrinSabitSayfasi(vt, hakkimizda.kayit.kimlik))?.icerik ?? "";
    expect(icerik).toContain("<p>Örnek Mağaza, 2026'da Ankara'da kuruldu.");
    expect(JSON.stringify(hakkimizda.kayit)).not.toContain("{magazaAdi}");
    expect(icerik).not.toContain("{magazaAdi}");
    const iletisim = await kayitAdresiniCoz(vt, "sayfa", "iletisim");
    expect(iletisim.sonuc === "kayit" && iletisim.kayit.aciklama).toBeNull();
    expect(await kayitAdresiniCoz(vt, "sayfa", "sss")).toEqual({ sonuc: "yok" });
  });
});
