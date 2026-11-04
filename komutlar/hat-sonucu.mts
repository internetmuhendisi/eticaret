// Bir kaydın kontrol hattı sonucunu GitHub'dan okur (kart 0017, karar 0029).
// Yeşil yalnız şu durumdadır: hat tam bu kayıt için çalışmış, son çalışması bitmiş ve başarılı.
// Hat hiç çalışmamışsa, sürüyorsa, kırmızıysa, sonuç okunamıyorsa ya da çalışma kopyasında
// kaydedilmemiş değişiklik varsa cevap "yeşil değil"dir. Yayın komutu (kart 0021) önce buna sorar.
// Çalıştırma: pnpm hat-sonucu [kayıt]   (kayıt verilmezse HEAD)

import { spawnSync } from "node:child_process";
import { basename, join } from "node:path";

// Hattın dosyası. GitHub hattı bu dosyanın adıyla tanır.
export const hatDosyasi = join(".github", "workflows", "kontrol-hatti.yml");

export type HatCalismasi = {
  head_sha: string;
  run_number: number;
  run_attempt?: number;
  status: string;
  conclusion: string | null;
  html_url: string;
};

export type HatSonucu = { yesil: boolean; neden: string };

export const hatSonucunuYorumla = (calismalar: HatCalismasi[], kayit: string): HatSonucu => {
  const buKayit = calismalar.filter((calisma) => calisma.head_sha === kayit);
  if (buKayit.length === 0) {
    return { yesil: false, neden: `hat ${kayit.slice(0, 7)} kaydı için hiç çalışmamış` };
  }
  // En son çalışma ve onun en son denemesi geçerlidir; eski yeşil yeni kırmızıyı örtmez.
  const [son] = buKayit.toSorted(
    (a, b) => b.run_number - a.run_number || (b.run_attempt ?? 1) - (a.run_attempt ?? 1),
  );
  if (!son) return { yesil: false, neden: "hat çalışması okunamadı" };
  if (son.status !== "completed") {
    return { yesil: false, neden: `hat hâlâ sürüyor (${son.status}): ${son.html_url}` };
  }
  if (son.conclusion !== "success") {
    return {
      yesil: false,
      neden: `hat yeşil değil (${son.conclusion ?? "sonuç yok"}): ${son.html_url}`,
    };
  }
  return { yesil: true, neden: `hat yeşil: ${son.html_url}` };
};

// Kaydın GitHub adresinden "sahip/depo" adını çıkarır. GitHub adresi değilse undefined döner.
// Depo gh'nin varsayılanından (GH_REPO, gh repo set-default) değil bu kayıttan okunur.
export const githubDeposu = (adres: string): string | undefined =>
  adres
    .trim()
    .match(/^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/)?.[1];

// Komutu çalıştırır; komut yoksa ya da çalışmazsa hata fırlatmaz, "tamam değil" döner.
const calistir = (komut: string, argumanlar: string[]) => {
  const sonuc = spawnSync(komut, argumanlar, { encoding: "utf8" });
  return {
    tamam: !sonuc.error && sonuc.status === 0,
    cikti: (sonuc.stdout ?? "").trim(),
    hata: (sonuc.error?.message ?? sonuc.stderr ?? "").trim(),
  };
};

// Kaydı ve çalışma kopyasını denetler, hattın çalışmalarını GitHub'dan okur. Hiçbir durumda
// hata fırlatmaz: beklenmeyen her durum "yeşil değil"dir.
export const hatSonucunuOku = (kayitAdi = "HEAD"): HatSonucu => {
  try {
    const kayit = calistir("git", ["rev-parse", "--verify", `${kayitAdi}^{commit}`]);
    if (!kayit.tamam) return { yesil: false, neden: `kayıt bulunamadı: ${kayitAdi}` };
    const durum = calistir("git", ["status", "--porcelain"]);
    if (!durum.tamam || durum.cikti !== "") {
      return { yesil: false, neden: "çalışma kopyasında kaydedilmemiş değişiklik var" };
    }
    const uzak = calistir("git", ["remote", "get-url", "origin"]);
    const depo = uzak.tamam ? githubDeposu(uzak.cikti) : undefined;
    if (!depo) return { yesil: false, neden: "kaydın GitHub deposu bulunamadı (origin)" };
    const yanit = calistir("gh", [
      "api",
      `repos/${depo}/actions/workflows/${basename(hatDosyasi)}/runs?head_sha=${kayit.cikti}&per_page=100`,
    ]);
    if (!yanit.tamam) {
      return { yesil: false, neden: `hat sonucu GitHub'dan okunamadı (${depo}): ${yanit.hata}` };
    }
    const { workflow_runs } = JSON.parse(yanit.cikti) as { workflow_runs: HatCalismasi[] };
    const sonuc = hatSonucunuYorumla(workflow_runs, kayit.cikti);
    return { ...sonuc, neden: `${depo}: ${sonuc.neden}` };
  } catch (hata) {
    return { yesil: false, neden: `hat sonucu okunamadı: ${(hata as Error).message}` };
  }
};

if (import.meta.main) {
  const sonuc = hatSonucunuOku(process.argv[2]);
  console.log(`${sonuc.yesil ? "yeşil      " : "YEŞİL DEĞİL"} ${sonuc.neden}`);
  if (!sonuc.yesil) process.exit(1);
}
