// Sunucuyu dışarıdan denetler (kart 0018, karar 0030). Her ölçüm gerçek bağlantıyla yapılır.
//
//   pnpm sunucu-denetle           sunucu/sunucular.json'daki her sunucuyu denetler
//   pnpm sunucu-denetle --hizli   kapı taramasını bütün kapılar yerine bilinen kapılarla yapar
//
// Ölçülenler:
// - Sunucu Hetzner'de Almanya'da çalışıyor ve dıştaki duvar ona bağlı.
// - Sunucu şifreyle girişi hiç önermiyor, yalnız anahtar kabul ediyor; kökle anahtarlı giriş reddediliyor.
// - Yönetici anahtarla girebiliyor; sshd'nin geçerli ayarı şifreyi ve kökü kapatıyor.
// - Dışarıdan bakınca 22, 80 ve 443 dışında her TCP kapısı yanıtsız.
// - Docker çalışıyor ve bir kutu açabiliyor; güvenlik güncellemeleri ve içerideki duvar açık.
// Bir ölçüm tutmazsa komut kırmızı biter.

import { spawnSync } from "node:child_process";
import { Socket } from "node:net";
import {
  acikKapilar,
  girisAnahtari,
  girisYontemleri,
  hetzner,
  type KapiDurumu,
  kapiHatalari,
  kayitlariOku,
  type SunucuKaydi,
  sshKomutu,
  sshSecenekleri,
  sunucuTanimi as t,
  yalnizAnahtarla,
} from "./sunucu.mts";

// Hızlı taramada bakılan kapılar: gerekenler ve yanlışlıkla açılması en olası olanlar.
const bilinenKapilar = [
  ...acikKapilar,
  21,
  23,
  25,
  53,
  111,
  2375,
  2376,
  2377,
  3000,
  3306,
  5432,
  6379,
  7946,
  8000,
  8080,
  8443,
  9000,
  9090,
  55432,
  58080,
];

const kapiyaBak = (adres: string, kapi: number, sure = 2500): Promise<KapiDurumu> =>
  new Promise((bitti) => {
    const soket = new Socket();
    const sonuc = (durum: KapiDurumu) => {
      soket.destroy();
      bitti(durum);
    };
    soket.setTimeout(sure, () => sonuc("yanitsiz"));
    soket.once("connect", () => sonuc("acik"));
    soket.once("error", (hata: NodeJS.ErrnoException) =>
      sonuc(hata.code === "ECONNREFUSED" ? "reddetti" : "yanitsiz"),
    );
    soket.connect(kapi, adres);
  });

const kapilariTara = async (adres: string, kapilar: number[]): Promise<Map<number, KapiDurumu>> => {
  const durumlar = new Map<number, KapiDurumu>();
  let sira = 0;
  const isci = async () => {
    while (sira < kapilar.length) {
      const kapi = kapilar[sira++] as number;
      durumlar.set(kapi, await kapiyaBak(adres, kapi));
    }
  };
  await Promise.all(Array.from({ length: 500 }, isci));
  return durumlar;
};

// Sunucunun önerdiği giriş yöntemleri: hiçbir yöntem denenmeden sorulur.
const onerilenYontemler = (adres: string, kullanici: string) => {
  const sonuc = spawnSync(
    "ssh",
    [
      ...sshSecenekleri,
      "-v",
      "-o",
      "PreferredAuthentications=none",
      "-o",
      "PubkeyAuthentication=no",
      `${kullanici}@${adres}`,
      "true",
    ],
    { encoding: "utf8", timeout: 30_000 },
  );
  return girisYontemleri(sonuc.stderr);
};

const denetle = async (kayit: SunucuKaydi, hizli: boolean): Promise<string[]> => {
  const hatalar: string[] = [];
  const olcum = (tamam: boolean, metin: string, ayrinti = "") => {
    console.log(`${tamam ? "tamam" : "HATA "}  ${metin}${ayrinti ? `: ${ayrinti}` : ""}`);
    if (!tamam) hatalar.push(metin);
  };
  console.log(`\n${kayit.ad} (${kayit.ipv4})`);

  // Hetzner'deki durum.
  const { server: s } = await hetzner<{
    server: {
      status: string;
      location: { name: string; country: string };
      public_net: { firewalls: { id: number; status: string }[] };
    };
  }>(`/servers/${kayit.hetzner_numarasi}`);
  olcum(s.status === "running", "sunucu çalışıyor", s.status);
  olcum(s.location.country === t.ulke, "sunucu Almanya'da", s.location.name);
  const { firewalls } = await hetzner<{ firewalls: { id: number }[] }>(
    `/firewalls?name=${t.duvarAdi}`,
  );
  const duvar = firewalls[0];
  olcum(
    duvar !== undefined &&
      s.public_net.firewalls.some((f) => f.id === duvar.id && f.status === "applied"),
    "dıştaki duvar sunucuya bağlı",
  );

  // Giriş.
  for (const kullanici of [kayit.kullanici, "root"]) {
    const yontemler = onerilenYontemler(kayit.ipv4, kullanici);
    olcum(
      yalnizAnahtarla(yontemler),
      `${kullanici} için şifreyle giriş önerilmiyor, yalnız anahtar`,
      yontemler?.join(",") ?? "yanıt okunamadı",
    );
  }
  const kokle = sshKomutu(kayit.ipv4, "true", { kullanici: "root" });
  olcum(
    kokle.status !== 0 && /Permission denied/.test(kokle.stderr),
    "kökle anahtarlı giriş reddediliyor",
    kokle.status === 0 ? "girildi" : "",
  );
  const giris = sshKomutu(kayit.ipv4, "id -un");
  olcum(
    giris.status === 0 && giris.stdout.trim() === kayit.kullanici,
    "yönetici anahtarla giriyor",
    giris.stderr.trim(),
  );

  if (giris.status === 0) {
    const ayar = sshKomutu(kayit.ipv4, "sudo sshd -T").stdout;
    for (const satir of [
      "passwordauthentication no",
      "kbdinteractiveauthentication no",
      "permitrootlogin no",
    ]) {
      olcum(ayar.split("\n").includes(satir), `sshd geçerli ayarı: ${satir}`);
    }
    // Deneme görüntüsü ölçümden sonra silinir, sunucuda iz kalmaz.
    const docker = sshKomutu(
      kayit.ipv4,
      "docker run --rm hello-world; durum=$?; docker image rm hello-world >/dev/null; exit $durum",
    );
    const dockerTamam = docker.status === 0 && docker.stdout.includes("Hello from Docker!");
    olcum(
      dockerTamam,
      "Docker bir kutu açıp çalıştırıyor",
      dockerTamam ? "" : docker.stderr.trim(),
    );
    const guncelleme = sshKomutu(
      kayit.ipv4,
      "systemctl is-active unattended-upgrades && apt-config dump APT::Periodic::Unattended-Upgrade",
    );
    olcum(
      guncelleme.status === 0 &&
        guncelleme.stdout.includes('APT::Periodic::Unattended-Upgrade "1"'),
      "güvenlik güncellemeleri kendiliğinden kuruluyor",
    );
    const icDuvar = sshKomutu(kayit.ipv4, "sudo ufw status");
    olcum(icDuvar.stdout.includes("Status: active"), "içerideki duvar açık");
  }

  // Kapılar.
  const kapilar = hizli ? bilinenKapilar : Array.from({ length: 65535 }, (_, i) => i + 1);
  console.log(`tarama  ${kapilar.length} TCP kapısı dışarıdan deneniyor...`);
  const durumlar = await kapilariTara(kayit.ipv4, kapilar);
  const kapiSorunlari = kapiHatalari(durumlar);
  const gorunen = [...durumlar].filter(([, d]) => d !== "yanitsiz").map(([k, d]) => `${k} ${d}`);
  olcum(
    kapiSorunlari.length === 0,
    "dışarıdan yalnız gereken kapılar açık",
    [...kapiSorunlari, `görünen: ${gorunen.join(", ") || "yok"}`].join("; "),
  );

  return hatalar;
};

try {
  const kayitlar = kayitlariOku();
  if (kayitlar.length === 0)
    throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  console.log(`giriş anahtarı ${girisAnahtari}`);
  let hataSayisi = 0;
  for (const kayit of kayitlar)
    hataSayisi += (await denetle(kayit, process.argv.includes("--hizli"))).length;
  console.log(
    hataSayisi === 0 ? "\nDenetim yeşil." : `\nDenetim kırmızı: ${hataSayisi} ölçüm tutmadı.`,
  );
  if (hataSayisi > 0) process.exitCode = 1;
} catch (hata) {
  console.error((hata as Error).message);
  process.exitCode = 1;
}
