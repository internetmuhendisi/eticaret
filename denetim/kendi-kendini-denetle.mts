// Kendi kendini denetleme (.claude/rules/kurallari-koruyan-kontroller.md).
// Her bozuk örneğin denetimi beklenen kuralla kırmızıya düşürdüğünü gösterir.
// Bozuk örnekler normal denetimin dışındadır; bu betik onları geçici bir klasöre kopyalayıp
// orada denetler, iş bitince klasörü siler.
// Çalıştırma: pnpm denetim-kendi-testi

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

type Beklenen = { kategori: string; mesajBasi?: string };

// Her bozuk örnek ve onu yakalaması gereken kural.
const beklenenler: Record<string, Beklenen> = {
  "ham-renk.ts": { kategori: "plugin", mesajBasi: "Ham renk" },
  "gomulu-metin.tsx": { kategori: "plugin", mesajBasi: "Ekran metni" },
  "gomulu-oge-metni.tsx": { kategori: "lint/style/noJsxLiterals" },
  "guvensiz-sorgu.ts": { kategori: "plugin", mesajBasi: "Güvensiz sorgu" },
  "guvensiz-ham-sql.ts": { kategori: "plugin", mesajBasi: "Güvensiz sorgu: sql.raw()" },
  "guvensiz-execute.ts": { kategori: "plugin", mesajBasi: "Güvensiz sorgu: execute()" },
  "elle-bicimlendirme.ts": { kategori: "plugin", mesajBasi: "Elle biçimlendirme" },
  "any-turu.ts": { kategori: "lint/suspicious/noExplicitAny" },
  "konsol.ts": { kategori: "lint/suspicious/noConsole" },
  "bicimsiz.ts": { kategori: "format" },
};

type Bulgu = { category: string; message: string; location?: { path?: string } };

const kaynak = join("denetim", "bozuk-ornekler");
const gecici = join("denetim", ".kendi-testi");

const ornekler = readdirSync(kaynak);
const eksikler = ornekler.filter((ad) => !(ad in beklenenler));
const kayiplar = Object.keys(beklenenler).filter((ad) => !ornekler.includes(ad));
let hataVar = false;

if (eksikler.length > 0) {
  console.error(`Beklenen kuralı yazılmamış örnek: ${eksikler.join(", ")}`);
  hataVar = true;
}
if (kayiplar.length > 0) {
  console.error(`Listede olup klasörde olmayan örnek: ${kayiplar.join(", ")}`);
  hataVar = true;
}

if (existsSync(gecici)) {
  console.error(
    `${gecici} klasörü zaten var. Önceki çalıştırmadan kalmış olabilir, silip tekrar deneyin.`,
  );
  process.exit(1);
}

try {
  cpSync(kaynak, gecici, { recursive: true });
  const sonuc = spawnSync("biome", ["check", "--error-on-warnings", "--reporter=json", gecici], {
    encoding: "utf8",
  });
  const rapor = JSON.parse(sonuc.stdout) as { diagnostics: Bulgu[] };

  for (const [ad, beklenen] of Object.entries(beklenenler)) {
    if (!ornekler.includes(ad)) continue;
    const bulgular = rapor.diagnostics.filter((b) => b.location?.path === join(gecici, ad));
    const yakalandi = bulgular.some(
      (b) =>
        b.category === beklenen.kategori &&
        (beklenen.mesajBasi === undefined || b.message.startsWith(beklenen.mesajBasi)),
    );
    const kural = beklenen.mesajBasi ?? beklenen.kategori;
    if (yakalandi) {
      console.log(`yakalandı   ${ad}  (${kural})`);
    } else {
      console.error(`YAKALANMADI ${ad}  (beklenen: ${kural})`);
      hataVar = true;
    }
  }
} finally {
  rmSync(gecici, { recursive: true, force: true });
}

if (hataVar) {
  console.error("Kendi kendini denetleme kırmızı: en az bir kontrol bozuk örneğini yakalamadı.");
  process.exit(1);
}
console.log("Kendi kendini denetleme yeşil: her bozuk örnek yakalandı.");
