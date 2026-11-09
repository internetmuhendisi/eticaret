import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const calismaAlaniKoku = join(import.meta.dirname, "../..");

// Yerelde bağlantı bilgisi kökteki .env dosyasındadır (karar 0022). Sunucuda bu dosya yoktur,
// değişkenler kutunun ortamından gelir. Ortamda zaten olan değişkenin üzerine yazılmaz.
const gizliBilgiDosyasi = join(calismaAlaniKoku, ".env");
if (existsSync(gizliBilgiDosyasi)) process.loadEnvFile(gizliBilgiDosyasi);

// Bileşen kataloğu (kart 0104, karar 0078) canlı derlemeye girer, açık olup olmadığına istekte karar verilir
// (cekirdek/katalog/acik-mi.ts).
const ayar: NextConfig = {
  // Uygulama çekirdeğin öteki klasörlerinden (metinler/, moduller/...) dosya alır,
  // bu yüzden kök, çalışma alanının köküdür.
  turbopack: { root: calismaAlaniKoku },
  // Docker görüntüsü için derleme, çalışmaya gereken dosyaları tek klasörde toplar
  // (.next/standalone, kart 0015, karar 0027). İz, çalışma alanının kökünden sürülür.
  output: "standalone",
  outputFileTracingRoot: calismaAlaniKoku,
};

export default ayar;
