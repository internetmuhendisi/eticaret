// Yerel PostgreSQL kutusunda bir siteye ayrı veritabanı ve ayrı kullanıcı açar (kart 0011).
// Şifre VERITABANI_ADRESI'nden alınır ve psql'e ortam değişkeniyle geçer, komut satırında görünmez.
// Çalıştırma: pnpm site-veritabani-ac siteler/<kod-adi>   (önce pnpm veritabani-baslat)

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteVeAdres } from "./site-veritabani.mts";

const { ad, adres } = siteVeAdres("site-veritabani-ac");

const sonuc = spawnSync(
  "docker",
  [
    ...["compose", "-f", "sunucu/compose.yaml", "--env-file", ".env", "exec", "-T"],
    ...["-e", "SITE_VERITABANI_SIFRESI", "veritabani"],
    ...["psql", "-U", "postgres", "-d", "postgres", "-q", "-v", `ad=${ad}`, "-f", "-"],
  ],
  {
    input: readFileSync(join(import.meta.dirname, "site-veritabani-ac.sql"), "utf8"),
    env: { ...process.env, SITE_VERITABANI_SIFRESI: decodeURIComponent(adres.password) },
    stdio: ["pipe", "inherit", "inherit"],
  },
);

if (sonuc.status !== 0) {
  console.error(`${ad} açılamadı. Veritabanı kutusu açık mı? (pnpm veritabani-baslat)`);
  process.exit(1);
}
console.log(`açıldı      ${ad} (veritabanı ve kullanıcı)`);
