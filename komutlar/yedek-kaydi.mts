// Yedek işlerinin kaydını gösterir (kart 0024, karar 0037): son 20 satır, en yeni altta.
//
//   pnpm yedek-kaydi

import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { kayitlariCoz, yedekKoku } from "./yedek.mts";

try {
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok.");
  const sonuc = sshKomutu(sunucu.ipv4, `sudo cat ${yedekKoku}/kayit.jsonl`);
  if (sonuc.status !== 0) throw new Error(`Kayıt okunamadı: ${sonuc.stderr.trim()}`);
  for (const k of kayitlariCoz(sonuc.stdout).slice(-20)) {
    console.log(
      [k.zaman, `${k.ortam}/${k.site}`, k.tur, k.sonuc, k.sebep, k.dosya, k.boyut || ""]
        .filter(Boolean)
        .join("  "),
    );
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
