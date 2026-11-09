import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const calismaAlaniKoku = join(import.meta.dirname, "../..");

// Yerelde bağlantı bilgisi kökteki .env dosyasındadır (karar 0022). Sunucuda bu dosya yoktur,
// değişkenler kutunun ortamından gelir. Ortamda zaten olan değişkenin üzerine yazılmaz.
const gizliBilgiDosyasi = join(calismaAlaniKoku, ".env");
if (existsSync(gizliBilgiDosyasi)) process.loadEnvFile(gizliBilgiDosyasi);

// Geliştirmeye özel sayfalar (kart 0103): adı page.deneme.tsx ile biten sayfa yalnız geliştirme
// sunucusunda (next dev) vardır. Koşul ortam değişkeni değil Next.js'in evresidir: next build hangi
// NODE_ENV ile çalışırsa çalışsın bu uzantıyı tanımaz, sayfa derlenmez ve adresi 404 verir; bunu yerel
// ortam denemesi gerçek görüntüde ölçer. Dosyalar görüntüye de girmez (Dockerfile.dockerignore).
// Bileşen deneme sahnesi bu yolla açılır.
const ayar = (evre: string): NextConfig => ({
  pageExtensions: evre === PHASE_DEVELOPMENT_SERVER ? ["tsx", "ts", "deneme.tsx"] : ["tsx", "ts"],
  // Uygulama çekirdeğin öteki klasörlerinden (metinler/, moduller/...) dosya alır,
  // bu yüzden kök, çalışma alanının köküdür.
  turbopack: { root: calismaAlaniKoku },
  // Docker görüntüsü için derleme, çalışmaya gereken dosyaları tek klasörde toplar
  // (.next/standalone, kart 0015, karar 0027). İz, çalışma alanının kökünden sürülür.
  output: "standalone",
  outputFileTracingRoot: calismaAlaniKoku,
});

export default ayar;
