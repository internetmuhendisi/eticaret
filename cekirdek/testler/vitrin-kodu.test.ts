// Vitrinin tarayıcı koduna panelin kodu sızmaz (kart 0295, karar 0172). Derleyici (Turbopack) bir modülü,
// uygulamanın bütün tarayıcı dosyalarının o modülden kullandığı her şeyle birlikte paketler: panel ya da katalog bir
// ortak modülden bir şey kullanınca vitrin de onu indirir (ölçüldü: katalog örneğinin kullandığı hazır tema tabloları
// ve panele eklenen ikonlar vitrinin her sayfasına gidiyordu).
// - Panelin ikon sözlüğü (bilesenler/ikonlar/panel-sozlugu.ts) ayrı modüldür: panel ve katalog dışındaki hiçbir
//   çekirdek dosyasından (sunucu dosyaları da: vitrinin sunucu bileşeni kütüphanenin tarayıcı parçasını çizebilir)
//   ona içe aktarma zinciri varmaz. Yalnız panelde kullanılan kütüphane parçası (biçimli metin alanı, dosya yükleme)
//   panel sözlüğünü kullanabilir; vitrin o parçayı kullanırsa zincir onun üzerinden varır.
// - Hazır temaların değer tabloları (degerler.ts) yalnız sunucuda okunur: hiçbir tarayıcı dosyasından (panel ve katalog
//   dahil) varılan dosya onları içe aktarmaz.
// Bozuk örnekler iki denetimin doğrudan, dolaylı, toplu (`* as`) ve sonradan (`import()`) içe aktarmayı ve yalnız panelde
// kullanılan parça üzerinden varmayı yakaladığını, yalnız türü alanı yakalamadığını gösterir.
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  coz,
  diskten,
  iceAktarmalar,
  istemciDosyalari,
  kaynakDosyalari,
  kok,
  type Okuyucu,
  panelVeKatalogMu,
  yasakZincir,
  zinciriYaz,
  zincirler,
} from "./ice-aktarma-zinciri.ts";

const panelSozlugu = "bilesenler/ikonlar/panel-sozlugu.ts";
const degerlerDosyasi = "bilesenler/tasarim-degerleri/degerler.ts";
// Hazır temaların değer tabloları: tarayıcı kodunda içe aktarılmaz.
const temaTablolari = ["varsayilanTemaDegerleri", "yumusakMevsimDegerleri", "keskinCizgiDegerleri"];

// Başlangıçtan varılan dosyalardan biri degerler.ts'ten bir tema tablosunu (ya da hepsini) içe aktarıyorsa zincir.
const temaTablosuZinciri = (baslangic: string, oku: Okuyucu = diskten): string[] => {
  const onceki = zincirler(baslangic, oku);
  for (const yol of onceki.keys()) {
    if (!/\.(ts|tsx)$/.test(yol)) continue;
    for (const { adres, adlar } of iceAktarmalar(oku(yol))) {
      const hedef = coz(yol, adres);
      if (hedef === undefined || relative(kok, hedef) !== degerlerDosyasi) continue;
      const alinan = adlar === "hepsi" ? ["*"] : adlar.filter((ad) => temaTablolari.includes(ad));
      if (alinan.length > 0)
        return [...zinciriYaz(onceki, yol), `${degerlerDosyasi} (${alinan.join(", ")})`];
    }
  }
  return [];
};

describe("vitrinin tarayıcı kodu", () => {
  const istemciler = istemciDosyalari();

  it("panel ve katalog dışındaki çekirdek dosyaları panelin ikon sözlüğüne varmaz", () => {
    const vitrin = kaynakDosyalari(join(kok, "cekirdek")).filter((yol) => {
      const goreli = relative(kok, yol);
      return (
        !panelVeKatalogMu(goreli) &&
        !goreli.startsWith("cekirdek/uygulama/app/yonetim/") &&
        !goreli.startsWith("cekirdek/uygulama/app/gelistirme/")
      );
    });
    expect(vitrin.length).toBeGreaterThan(300);
    const sorunlar = vitrin
      .map((yol) => yasakZincir(yol, [panelSozlugu]))
      .filter((zincir) => zincir.length > 0)
      .map((zincir) => zincir.join(" → "));
    expect(sorunlar).toEqual([]);
  });

  it("hiçbir tarayıcı dosyası (panel ve katalog dahil) hazır tema tablolarını içe aktarmaz", () => {
    expect(istemciler.some((yol) => panelVeKatalogMu(relative(kok, yol)))).toBe(true);
    const sorunlar = istemciler
      .map((yol) => temaTablosuZinciri(yol))
      .filter((zincir) => zincir.length > 0)
      .map((zincir) => zincir.join(" → "));
    expect(sorunlar).toEqual([]);
  });

  it("bozuk örnekler: doğrudan, dolaylı, toplu ve sonradan içe aktarma yakalanır; yalnız tür alan yakalanmaz", () => {
    const sahte = (dosyalar: Record<string, string>) => (yol: string) =>
      dosyalar[relative(kok, yol)] ?? readFileSync(yol, "utf8");
    const bas = join(kok, "cekirdek/vitrin/ornek-istemci.tsx");
    const dosya = (icerik: string) =>
      sahte({ "cekirdek/vitrin/ornek-istemci.tsx": `"use client";\n${icerik}\n` });

    // Panel sözlüğü: doğrudan ve panelin ikonu üzerinden.
    expect(
      yasakZincir(
        bas,
        [panelSozlugu],
        dosya(`import { panelIkonlari } from "../../bilesenler/ikonlar/panel-sozlugu";`),
      ),
    ).toEqual(["cekirdek/vitrin/ornek-istemci.tsx", panelSozlugu]);
    expect(
      yasakZincir(
        bas,
        [panelSozlugu],
        dosya(`import { PanelIkon } from "../yonetim-paneli/panel-ikon";`),
      ),
    ).toEqual([
      "cekirdek/vitrin/ornek-istemci.tsx",
      "cekirdek/yonetim-paneli/panel-ikon.tsx",
      panelSozlugu,
    ]);
    expect(
      yasakZincir(
        bas,
        [panelSozlugu],
        dosya(`import type { PanelIkonAdi } from "../../bilesenler/ikonlar/panel-sozlugu";`),
      ),
    ).toEqual([]);

    // Sonradan yükleme ve yalnız panelde kullanılan kütüphane parçası üzerinden (bağımsız kontrolün bulgusu).
    expect(
      yasakZincir(
        bas,
        [panelSozlugu],
        dosya(`const yukle = () => import("../yonetim-paneli/panel-ikon");`),
      ).at(-1),
    ).toBe(panelSozlugu);
    expect(
      yasakZincir(
        bas,
        [panelSozlugu],
        dosya(`import { DosyaYukleme } from "../../bilesenler/parcalar/dosya-yukleme";`),
      ),
    ).toEqual([
      "cekirdek/vitrin/ornek-istemci.tsx",
      "bilesenler/parcalar/dosya-yukleme.tsx",
      panelSozlugu,
    ]);
    expect(
      temaTablosuZinciri(
        bas,
        dosya(`const d = await import("../../bilesenler/tasarim-degerleri/degerler");`),
      ).at(-1),
    ).toBe(`${degerlerDosyasi} (*)`);

    // Tema tabloları: doğrudan, takma adla, toplu ve dolaylı (temaların birleşimi tabloları içe aktarır).
    expect(
      temaTablosuZinciri(
        bas,
        dosya(
          `import { varsayilanTemaDegerleri } from "../../bilesenler/tasarim-degerleri/degerler";`,
        ),
      ),
    ).toEqual([
      "cekirdek/vitrin/ornek-istemci.tsx",
      `${degerlerDosyasi} (varsayilanTemaDegerleri)`,
    ]);
    expect(
      temaTablosuZinciri(
        bas,
        dosya(
          `import { sabitDegerler, keskinCizgiDegerleri as k } from "../../bilesenler/tasarim-degerleri/degerler";`,
        ),
      ).at(-1),
    ).toBe(`${degerlerDosyasi} (keskinCizgiDegerleri)`);
    expect(
      temaTablosuZinciri(
        bas,
        dosya(`import * as d from "../../bilesenler/tasarim-degerleri/degerler";`),
      ).at(-1),
    ).toBe(`${degerlerDosyasi} (*)`);
    const dolayli = temaTablosuZinciri(
      bas,
      dosya(`import { siteninTasarimCss } from "../temalar/birlesim";`),
    );
    expect(dolayli[0]).toBe("cekirdek/vitrin/ornek-istemci.tsx");
    expect(dolayli.at(-1)).toMatch(/^bilesenler\/tasarim-degerleri\/degerler\.ts \(/);
    // Vitrinin bugün kullandığı değerler ve yalnız tür alan içe aktarma sayılmaz.
    expect(
      temaTablosuZinciri(
        bas,
        dosya(`import { sabitDegerler } from "../../bilesenler/tasarim-degerleri/degerler";`),
      ),
    ).toEqual([]);
    expect(
      temaTablosuZinciri(
        bas,
        dosya(`import type { TemaDegerleri } from "../../bilesenler/tasarim-degerleri/degerler";`),
      ),
    ).toEqual([]);
  });
});
