// Yayından önceki kilitler ve hazırlık (kart 0021, karar 0035). Yayın komutu ve yayın denemesi
// kullanır; ikisi de aynı kilitlerden geçer.
//
// - Kontrol hattı bu kayıt için yeşil olmalı, çalışma kopyasında kaydedilmemiş değişiklik
//   olmamalı (pnpm hat-sonucu, karar 0029).
// - Kayıttaki hat dosyası, hattın çağırdığı betiklerin tanımları ve denetim ile test ayarları
//   ana daldakiyle (origin/main) aynı olmalı: hattı zayıflatan bir kaydın kendi hattı yeşil biter
//   (karar 0029, Sonuçları).
// - Site klasörü çalışma klasöründen değil kayıttan alınır; görüntü bu kayıttan üretilmiş olmalı.

import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cekirdekSurumu } from "../cekirdek/surum.ts";
import { kayitEtiketi } from "./cekirdek-goruntusu-denetle.mts";
import { hatDosyasi, hatSonucunuOku } from "./hat-sonucu.mts";
import { kok } from "./sunucu.mts";
import { surumEtiketi } from "./sunucu-veritabani.mts";

const git = (argumanlar: string[]) => {
  const sonuc = spawnSync("git", argumanlar, { cwd: kok, encoding: "utf8" });
  return {
    tamam: sonuc.status === 0,
    cikti: (sonuc.stdout ?? "").trim(),
    hata: (sonuc.stderr ?? "").trim(),
  };
};

// Hattın kendisi, hattın çağırdığı betiklerin tanımları, alt paketlerin betikleri ve projedeki
// bütün denetim ve test ayarları: bir kayıt bunları zayıflatırsa kendi hattı yeşil biter. Test ve
// komut dosyalarının kendisi bu korumanın dışındadır (yalnız disiplin, karar 0035).
export const hatAyarKalibi =
  /^(\.github\/workflows\/kontrol-hatti\.yml|denetim\/.+|(.+\/)?(biome\.jsonc?|tsconfig[^/]*\.json|vitest\.config\.[cm]?[jt]s|playwright\.config\.[cm]?[jt]s|vitest\.workspace\.[cm]?[jt]s))$/;
const altPaketKalibi = /^.+\/package\.json$/;

// Bir kayıttaki hat korumasının özeti; hat dosyası ya da kök paket okunamazsa undefined.
export const hatKorumasi = (kayit: string): string | undefined => {
  const agac = git(["ls-tree", "-r", kayit]);
  if (!agac.tamam) return undefined;
  const nesneler = agac.cikti
    .split("\n")
    .map((satir) => satir.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/))
    .filter((e): e is RegExpMatchArray => e !== null)
    .map((e) => [e[2] ?? "", e[1] ?? ""] as [string, string]);
  if (!nesneler.some(([yol]) => yol === hatDosyasi)) return undefined;
  const hat = git(["show", `${kayit}:${hatDosyasi}`]).cikti;
  const paket = git(["show", `${kayit}:package.json`]);
  if (!paket.tamam) return undefined;
  const altPaketler = Object.fromEntries(
    nesneler
      .filter(([yol]) => altPaketKalibi.test(yol))
      .map(([yol]) => [yol, git(["show", `${kayit}:${yol}`]).cikti]),
  );
  return korumaOzeti(
    hat,
    paket.cikti,
    altPaketler,
    nesneler.filter(([yol]) => hatAyarKalibi.test(yol)),
  );
};

// Hattın çağırdığı kök betiklerin (pnpm <ad>) tanımları, alt paketlerin bütün betikleri ve ayar
// dosyalarının içerik özetleri. Hattın çağırmadığı bir kök betiğin değişmesi özeti değiştirmez.
export const korumaOzeti = (
  hat: string,
  paket: string,
  altPaketler: Record<string, string>,
  dosyalar: [string, string][],
): string => {
  const betikler = (metin: string) =>
    (JSON.parse(metin) as { scripts?: Record<string, string> }).scripts ?? {};
  const kok = betikler(paket);
  const cagrilanlar = [...new Set([...hat.matchAll(/pnpm ([a-z0-9-]+)/g)].map((e) => e[1] ?? ""))]
    .sort()
    .map((ad) => [ad, kok[ad] ?? "yok"]);
  const alt = Object.keys(altPaketler)
    .sort()
    .map((yol) => [yol, betikler(altPaketler[yol] ?? "{}")]);
  const sirali = [...dosyalar].sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({ cagrilanlar, alt, dosyalar: sirali });
};

// Hat koruması iki kayıtta aynı mı.
export const hatDosyasiAyniMi = (kayit: string, anaDal: string): boolean => {
  const bu = hatKorumasi(kayit);
  return bu !== undefined && bu === hatKorumasi(anaDal);
};

// Kilitler geçerse yayınlanacak kaydı döndürür; geçmezse hiçbir şeye dokunmadan hata verir.
export const yayinKilitleri = (): string => {
  const hat = hatSonucunuOku("HEAD");
  if (!hat.yesil) throw new Error(`Kontrol hattı yeşil değil, yayın yapılmaz: ${hat.neden}`);
  const kayit = git(["rev-parse", "HEAD"]).cikti;
  const getir = git(["fetch", "--quiet", "origin", "main"]);
  if (!getir.tamam) throw new Error(`Ana dal GitHub'dan okunamadı: ${getir.hata}`);
  if (!hatDosyasiAyniMi(kayit, "origin/main")) {
    throw new Error(
      "Bu kayıttaki hat dosyası, hattın çağırdığı betikler, alt paketlerin betikleri ya da denetim ve test ayarları ana daldakiyle aynı değil, yayın yapılmaz.",
    );
  }
  return kayit;
};

// Sitenin klasörü kayıttan geçici bir klasöre çıkarılır; dönen yol site klasörüdür.
export const kayittanSiteKlasoru = (kayit: string, klasor: string): string => {
  const yol = klasor.replace(/\/+$/, "");
  if (!/^siteler\/[a-z0-9-]+$/.test(yol)) {
    throw new Error(`Site klasörü siteler/<kod adı> biçiminde verilmeli: ${klasor}`);
  }
  const gecici = mkdtempSync(join(tmpdir(), "yayin-"));
  const sonuc = spawnSync(
    "sh",
    ["-c", 'git -C "$0" archive "$1" "$2" | tar -x -C "$3"', kok, kayit, yol, gecici],
    {
      encoding: "utf8",
    },
  );
  if (sonuc.status !== 0)
    throw new Error(`Site klasörü kayıttan çıkarılamadı: ${sonuc.stderr.trim()}`);
  return join(gecici, yol);
};

const goruntununKaydi = (etiket: string): string =>
  spawnSync(
    "docker",
    ["image", "inspect", "-f", `{{index .Config.Labels "${kayitEtiketi}"}}`, etiket],
    {
      encoding: "utf8",
    },
  ).stdout?.trim() ?? "";

// Kimlikteki sürümün görüntüsü bu kayıttan üretilmiş olmalı; değilse yeniden üretilir.
// Bu kayıttan yalnız kaydın kendi çekirdek sürümü üretilebilir.
export const yayinGoruntusunuHazirla = (surum: string, kayit: string): string => {
  if (surum !== cekirdekSurumu) {
    throw new Error(
      `Kimlikteki sürüm ${surum}, bu kayıttaki çekirdek ${cekirdekSurumu}. Başka bir sürümün görüntüsü bu kayıttan üretilemez.`,
    );
  }
  const etiket = surumEtiketi(surum);
  if (goruntununKaydi(etiket) !== kayit) {
    const uretim = spawnSync("node", [join(kok, "komutlar", "cekirdek-goruntusu.mts")], {
      stdio: "inherit",
    });
    if (uretim.status !== 0) throw new Error("Görüntü üretilemedi.");
  }
  const sonra = goruntununKaydi(etiket);
  if (sonra !== kayit) {
    throw new Error(`${etiket} bu kayıttan üretilmemiş (görüntüdeki kayıt: ${sonra || "yok"}).`);
  }
  return etiket;
};
