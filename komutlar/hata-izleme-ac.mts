// Hata izleme aracının yönetim ekranını bu bilgisayarda açar (kart 0022, karar 0036). Ekran
// dışarıya kapalıdır; komut sunucuya bir SSH tüneli kurar ve tünel açık kaldıkça ekran
// http://localhost:<port> adresindedir. Kapatmak için Ctrl+C.
//
//   pnpm hata-izleme-ac           tüneli açar
//   pnpm hata-izleme-ac --sifre   yönetim ekranının şifresini belirler (ilk girişten önce bir kez)
//
// Kullanıcı adı yoneticiAdi'dır (hata-izleme.mts). Kurulumda üretilen şifreyi kimse bilmez,
// sunucudan çıkmaz; ilk girişten önce --sifre ile yeni bir şifre belirlenir.

import { spawnSync } from "node:child_process";
import { yoneticiAdi } from "./hata-izleme.mts";
import { hataIzlemeAgi, hataIzlemeKutusu, hataIzlemePortu } from "./on-kapi.mts";
import { girisAnahtari, kayitlariOku, sshKomutu, sshSecenekleri, sunucuTanimi } from "./sunucu.mts";

// Bu bilgisayardaki tünel portu.
const yerelPort = 9000;

try {
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  const hedef = `${sunucuTanimi.kullanici}@${sunucu.ipv4}`;
  const ssh = [...sshSecenekleri, "-i", girisAnahtari, "-o", "IdentitiesOnly=yes"];
  if (process.argv.includes("--sifre")) {
    // Şifre yalnız bu terminalden kutudaki komuta gider; hiçbir dosyaya ve kayda yazılmaz.
    const sonuc = spawnSync(
      "ssh",
      [
        ...ssh,
        "-t",
        hedef,
        `docker exec -it ${hataIzlemeKutusu} bugsink-manage changepassword ${yoneticiAdi}`,
      ],
      { stdio: "inherit" },
    );
    process.exitCode = sonuc.status ?? 1;
  } else {
    // Kutunun ağdaki adresi: ağ dışarıya kapalıdır ama sunucunun kendisi kutuya ulaşır.
    const adres = sshKomutu(
      sunucu.ipv4,
      `docker inspect -f '{{(index .NetworkSettings.Networks "${hataIzlemeAgi}").IPAddress}}' ${hataIzlemeKutusu}`,
    ).stdout.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(adres)) {
      throw new Error(`Hata izleme kutusu bulunamadı. Önce: pnpm sunucu-hata-izleme`);
    }
    console.log(`Yönetim ekranı: http://localhost:${yerelPort} (kullanıcı ${yoneticiAdi})`);
    console.log("Kapatmak için Ctrl+C.");
    const sonuc = spawnSync(
      "ssh",
      [...ssh, "-N", "-L", `127.0.0.1:${yerelPort}:${adres}:${hataIzlemePortu}`, hedef],
      { stdio: "inherit" },
    );
    process.exitCode = sonuc.status ?? 1;
  }
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
