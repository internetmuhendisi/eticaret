// Kalıcı kutuların yeniden başlama kuralı (kart 0038, karar 0033). Sunucuda ve yerel ortamda
// sürekli çalışan her kutu (veritabanı, Caddy, ön kapı, her site) bu kuralla kurulur: Docker ya
// da sunucu yeniden başlayınca kutu kendiliğinden açılır, elle durdurulan kutu açılmaz.
//
// - Kuralı kullanan tanımlar: on-kapi.mts, yerel-ortam.mts. Kod okuyamayan iki ayar dosyası
//   (sunucu/compose.yaml, sunucu/yerel-ortam.yaml) kuralı aynen yazar; aynı olduğunu
//   komutlar/testler/kutu-kurali.test.ts denetler.
// - Geçici deneme kutuları (sunucu-gizli-denemesi.mts, görüntü denetimi) bu kuralı almaz: geride
//   kalmamaları gerekir.

import { arkaPlanDosyalari, nabizDosyasi, nabizSiniriMs } from "../cekirdek/kayitlar/arka-plan.ts";

export const yenidenBaslama = "unless-stopped";

// Kutu tanımına eklenen parça.
export const kaliciKutu = { restart: yenidenBaslama } as const;

// Bir compose tanımında kuralı eksik ya da farklı olan kutular.
export const yenidenBaslamaHatalari = (tanim: {
  services?: Record<string, { restart?: unknown }>;
}): string[] => {
  const servisler = Object.entries(tanim.services ?? {});
  if (servisler.length === 0) return ["tanımda kutu yok"];
  return servisler
    .filter(([, servis]) => servis.restart !== yenidenBaslama)
    .map(
      ([ad, servis]) =>
        `${ad}: yeniden başlama kuralı ${servis.restart === undefined ? "yok" : String(servis.restart)}, beklenen ${yenidenBaslama}`,
    );
};

// Çalışan kutunun gerçek kuralı: docker inspect --format '{{.HostConfig.RestartPolicy.Name}}'.
export const kutuKuraliDogru = (gercek: string): boolean => gercek.trim() === yenidenBaslama;

// Site kutusunun sağlık yoklaması: yerel ortamda ve sunucuda aynıdır (yerel-ortam.mts, yayin.mts).
// Açılırken sık, açıldıktan sonra seyrek yoklanır.
export const siteSaglikYoklamasi = {
  test: [
    "CMD",
    "node",
    "-e",
    "fetch('http://127.0.0.1:3000/kapi/herkese-acik/saglik').then((y)=>process.exit(y.ok?0:1),()=>process.exit(1))",
  ],
  interval: "15s",
  timeout: "5s",
  retries: 3,
  start_period: "60s",
  start_interval: "1s",
};

// Arka plan kutusu (kart 0031, karar 0049): site kutusuyla aynı görüntü, aynı kısıtlar, aynı gizli
// bilgiler; yalnız adı, komutu ve sağlık yoklaması farklıdır. Yoklama, sürecin yazdığı nabız
// dosyasının yaşına bakar: veritabanı kesintisi kutuyu sağlıksız yapmaz, süreç ayakta kalır.
export const arkaPlanKutuAdi = (siteKutusu: string): string => `${siteKutusu}-arka-plan`;

export const arkaPlanSaglikYoklamasi = {
  test: [
    "CMD",
    "node",
    "-e",
    `process.exit(Date.now()-require('node:fs').statSync('${nabizDosyasi}').mtimeMs<${nabizSiniriMs}?0:1)`,
  ],
  interval: "15s",
  timeout: "5s",
  retries: 3,
  start_period: "30s",
  start_interval: "1s",
};

export const arkaPlanServisi = <Servis extends { container_name: string }>(site: Servis) => ({
  ...site,
  container_name: arkaPlanKutuAdi(site.container_name),
  command: ["node", arkaPlanDosyalari.surec],
  healthcheck: arkaPlanSaglikYoklamasi,
});

// Bu sürümden eski yayınların arka plan kutusu yoktur: geri dönüşte ve denetimde beklenmez.
const arkaPlanIlkSurumu = [0, 9, 0];
export const arkaPlanKutusuVarMi = (surum: string): boolean => {
  const parcalar = surum.split(".").map(Number);
  for (const [sira, ilk] of arkaPlanIlkSurumu.entries()) {
    const deger = parcalar[sira] ?? 0;
    if (deger !== ilk) return deger > ilk;
  }
  return true;
};
