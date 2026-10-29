import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const calismaAlaniKoku = join(import.meta.dirname, "../..");

// Yerelde bağlantı bilgisi kökteki .env dosyasındadır (karar 0022). Sunucuda bu dosya yoktur,
// değişkenler kutunun ortamından gelir. Ortamda zaten olan değişkenin üzerine yazılmaz.
const gizliBilgiDosyasi = join(calismaAlaniKoku, ".env");
if (existsSync(gizliBilgiDosyasi)) process.loadEnvFile(gizliBilgiDosyasi);

const ayar: NextConfig = {
  // Uygulama çekirdeğin öteki klasörlerinden (metinler/, moduller/...) dosya alır,
  // bu yüzden kök, çalışma alanının köküdür.
  turbopack: { root: calismaAlaniKoku },
};

export default ayar;
