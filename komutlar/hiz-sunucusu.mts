// Hız ölçümünün sunucusu (kart 0146): çekirdeği canlıdaki gibi derler (next build) ve Next.js'in canlı sunucusuyla
// açar (next start). Önüne, canlıdaki ön kapı gibi şifreli HTTP/2 konuşan bir vekil koyar (sunucu/on-kapi/Caddyfile:
// protocols h1 h2). Geliştirme sunucusu hızı ölçmeye uygun değildir: kodu sıkıştırmaz, her isteği yeniden derler.
// Şifresiz bağlantıda tarayıcı HTTP/1.1 ile aynı anda en çok altı istek açar; görseller koddan sonra iniyordu
// (ölçüldü), canlıda öyle değildir.
// - Kutu aynı derlemeyi standalone klasöründen çalıştırır (sunucu/cekirdek/Dockerfile); tarayıcıya giden kod ve
//   sayfalar aynıdır. Standalone klasörü çalışma kopyasında (pnpm bağlantılarıyla) eksik toplanıyor, sunucu modülü
//   yüklenemiyordu (ölçüldü): next start uyarı verir ama aynı derlemeyi sunar.
// - Vekilin sertifikası her çalışmada geçici klasörde kendinden imzalı üretilir (openssl); tarayıcı ona güvenmeyi
//   ayardan alır (playwright.hiz.config.ts).
// Ortam (site klasörü, dosya klasörü, veritabanı adresi) Playwright ayarından ve kökteki .env'den gelir. Vekil
// HIZ_PORTU'nda (varsayılan 3410), Next.js bir sonraki portta yalnız yerel adreste dinler.
// Çalıştırma: node komutlar/hiz-sunucusu.mts (kendi başına da çalışır, Ctrl+C ile kapanır)

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import http2 from "node:http2";
import { tmpdir } from "node:os";
import { join } from "node:path";

const kok = join(import.meta.dirname, "..");
if (existsSync(join(kok, ".env"))) process.loadEnvFile(join(kok, ".env"));
const { HIZ_PORTU: dis = "3410" } = process.env;
const ic = String(Number(dis) + 1);

const derleme = spawnSync("pnpm", ["--filter", "cekirdek-uygulama", "derle"], {
  cwd: kok,
  stdio: "inherit",
});
if (derleme.status !== 0) {
  console.error("Hız ölçümü: çekirdek derlenemedi.");
  process.exit(1);
}

const sunucu = spawn(
  "pnpm",
  ["--filter", "cekirdek-uygulama", "baslat", "--port", ic, "--hostname", "127.0.0.1"],
  { cwd: kok, stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } },
);

const sertifikaKlasoru = mkdtempSync(join(tmpdir(), "hiz-olcumu-"));
const anahtar = join(sertifikaKlasoru, "anahtar.pem");
const sertifika = join(sertifikaKlasoru, "sertifika.pem");
const uretim = spawnSync(
  "openssl",
  [
    "req",
    "-x509",
    ...["-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes"],
    ...["-keyout", anahtar, "-out", sertifika, "-days", "1"],
    ...["-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"],
  ],
  { stdio: "ignore" },
);
if (uretim.status !== 0) {
  console.error("Hız ölçümü: vekilin sertifikası üretilemedi (openssl).");
  sunucu.kill("SIGTERM");
  process.exit(1);
}

// Bağlantıya özgü başlıklar vekilden geçmez; HTTP/2 bunları taşımaz.
const gecmeyenler = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
  "http2-settings",
  "host",
]);
const basliklariSuz = (basliklar: http.IncomingHttpHeaders) =>
  Object.fromEntries(
    Object.entries(basliklar).filter(([ad]) => !ad.startsWith(":") && !gecmeyenler.has(ad)),
  );

const vekil = http2.createSecureServer(
  { key: readFileSync(anahtar), cert: readFileSync(sertifika), allowHTTP1: true },
  (istek, yanit) => {
    const ileri = http.request(
      {
        host: "127.0.0.1",
        port: ic,
        method: istek.method,
        path: istek.url,
        headers: { ...basliklariSuz(istek.headers), host: `127.0.0.1:${dis}` },
      },
      (cevap) => {
        yanit.writeHead(cevap.statusCode ?? 502, basliklariSuz(cevap.headers));
        cevap.pipe(yanit);
      },
    );
    ileri.on("error", () => {
      if (!yanit.headersSent) yanit.writeHead(502);
      yanit.end();
    });
    istek.pipe(ileri);
  },
);
vekil.listen(Number(dis), "127.0.0.1");

const kapat = (sinyal: NodeJS.Signals) => {
  vekil.close();
  sunucu.kill(sinyal);
  rmSync(sertifikaKlasoru, { recursive: true, force: true });
};
for (const sinyal of ["SIGINT", "SIGTERM"] as const) process.on(sinyal, () => kapat(sinyal));
sunucu.on("exit", (kod) => {
  vekil.close();
  rmSync(sertifikaKlasoru, { recursive: true, force: true });
  process.exit(kod ?? 0);
});
