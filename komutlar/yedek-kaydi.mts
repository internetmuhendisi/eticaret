// Yedek işlerinin kaydını gösterir (kart 0024, karar 0037): son 20 satır, en yeni altta.
//
//   pnpm yedek-kaydi
//   pnpm yedek-kaydi --temizlik-onayla=<ortam>/<kod adı>
//
// Temizlik hatası silme işareti demek olabilir, denetimi kırmızı tutar. Bakıldıktan sonra onaylanır.

import { ortamMi } from "./gizli-bilgi.mts";
import { kayitlariOku, sshKomutu } from "./sunucu.mts";
import { sunucudaCalistir } from "./sunucu-veritabani.mts";
import { kaydaYazBetigi, kayitlariCoz, yedekKoku } from "./yedek.mts";

try {
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok.");
  const onay = process.argv.find((a) => a.startsWith("--temizlik-onayla="))?.split("=")[1];
  if (onay !== undefined) {
    const [ortam = "", kodAdi = ""] = onay.split("/");
    if (!ortamMi(ortam) || !/^[a-z0-9-]+$/.test(kodAdi)) throw new Error(`Geçersiz site: ${onay}`);
    sunucudaCalistir(
      sunucu.ipv4,
      kaydaYazBetigi(ortam, kodAdi, "temizlik-onay", "basarili", "", ""),
    );
    console.log(`onaylandı   ${onay}`);
  }
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
