// shadcn/ui güncellemesi (kart 0103, karar 0077). Ortak parçalar shadcn/ui'dan uyarlanmıştır; uyarlandıkları
// asıl hâlleri bilesenler/shadcn-kaynagi/ altında dokunulmadan durur. Bu komut her parçanın shadcn'deki
// bugünkü hâlini indirir, saklanan hâlle karşılaştırır ve değişenlerin farkını yazar. Dosyaya dokunmaz.
// Fark varsa: değişiklik Türkçe parçaya elle uyarlanır, ardından --kaydet ile yeni asıl hâl saklanır.
// Çalıştırma: pnpm shadcn-farki [--kaydet]
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const klasor = join(import.meta.dirname, "..", "bilesenler", "shadcn-kaynagi");
const kayit = "https://ui.shadcn.com/r/styles/new-york-v4";
const kaydet = process.argv.includes("--kaydet");

type Parca = { files: { path: string; content: string }[] };

const gecici = mkdtempSync(join(tmpdir(), "shadcn-farki-"));
let degisen = 0;
try {
  for (const dosya of readdirSync(klasor).filter((ad) => ad.endsWith(".json"))) {
    const ad = dosya.replace(/\.json$/, "");
    const yanit = await fetch(`${kayit}/${ad}.json`);
    if (!yanit.ok) {
      console.error(`${ad}: indirilemedi (${yanit.status})`);
      process.exitCode = 1;
      continue;
    }
    const yeniMetin = await yanit.text();
    const eski = JSON.parse(readFileSync(join(klasor, dosya), "utf8")) as Parca;
    const yeni = JSON.parse(yeniMetin) as Parca;
    const icerik = (p: Parca) => p.files.map((f) => f.content).join("\n");
    if (icerik(eski) === icerik(yeni)) {
      console.log(`aynı        ${ad}`);
      continue;
    }
    degisen++;
    console.log(`DEĞİŞMİŞ    ${ad}`);
    const eskiYol = join(gecici, `${ad}.eski.tsx`);
    const yeniYol = join(gecici, `${ad}.yeni.tsx`);
    writeFileSync(eskiYol, icerik(eski));
    writeFileSync(yeniYol, icerik(yeni));
    console.log(spawnSync("diff", ["-u", eskiYol, yeniYol], { encoding: "utf8" }).stdout);
    if (kaydet) writeFileSync(join(klasor, dosya), yeniMetin);
  }
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
console.log(
  degisen === 0
    ? "shadcn/ui'da saklanan hâlden farklı parça yok."
    : `${degisen} parça değişmiş.${kaydet ? " Yeni asıl hâller saklandı." : " Uyarladıktan sonra --kaydet ile saklayın."}`,
);
