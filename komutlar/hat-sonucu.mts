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

const calistir = (komut: string, argumanlar: string[]) => {
  const sonuc = spawnSync(komut, argumanlar, { encoding: "utf8" });
  return {
    tamam: sonuc.status === 0,
    cikti: sonuc.stdout.trim(),
    hata: (sonuc.stderr ?? "").trim(),
  };
};

// Kaydı ve çalışma kopyasını denetler, hattın çalışmalarını GitHub'dan okur.
export const hatSonucunuOku = (kayitAdi = "HEAD"): HatSonucu => {
  const kayit = calistir("git", ["rev-parse", "--verify", `${kayitAdi}^{commit}`]);
  if (!kayit.tamam) return { yesil: false, neden: `kayıt bulunamadı: ${kayitAdi}` };
  const durum = calistir("git", ["status", "--porcelain"]);
  if (!durum.tamam || durum.cikti !== "") {
    return { yesil: false, neden: "çalışma kopyasında kaydedilmemiş değişiklik var" };
  }
  const yanit = calistir("gh", [
    "api",
    `repos/{owner}/{repo}/actions/workflows/${basename(hatDosyasi)}/runs?head_sha=${kayit.cikti}&per_page=100`,
  ]);
  if (!yanit.tamam)
    return { yesil: false, neden: `hat sonucu GitHub'dan okunamadı: ${yanit.hata}` };
  try {
    const { workflow_runs } = JSON.parse(yanit.cikti) as { workflow_runs: HatCalismasi[] };
    return hatSonucunuYorumla(workflow_runs, kayit.cikti);
  } catch {
    return { yesil: false, neden: "GitHub'ın cevabı okunamadı" };
  }
};

if (import.meta.main) {
  const sonuc = hatSonucunuOku(process.argv[2]);
  console.log(`${sonuc.yesil ? "yeşil      " : "YEŞİL DEĞİL"} ${sonuc.neden}`);
  if (!sonuc.yesil) process.exit(1);
}
