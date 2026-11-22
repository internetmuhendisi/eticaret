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

// Site ve arka plan kutusunun bellek sınırı (kart 0094, karar 0165): kutular sunucuyu paylaşır, büyük bir görselin
// yeniden kodlanması tek başına yüzlerce MB ister; sınırı aşan süreç yalnız kendi kutusunda durur ve kutu yeniden
// başlar, öteki siteler etkilenmez. Takas alanı verilmez (sınır gerçek bellektir). Değer ölçümle seçildi: karar 0165.
export const siteKutusuBellegi = "1g";
export const siteKutusuBellekSiniri = {
  mem_limit: siteKutusuBellegi,
  memswap_limit: siteKutusuBellegi,
} as const;

// Compose'un bellek yazılışının (512m, 1g) bayt karşılığı; Docker gerçek sınırı bayt olarak verir
// (HostConfig.Memory, sınırsızda 0).
export const bellekBaytlari = (yazilis: string | undefined): number => {
  if (yazilis === undefined) return 0;
  const eslesme = /^(\d+)([kmg])$/.exec(yazilis);
  if (eslesme === null) throw new Error(`Bellek yazılışı tanınmadı: ${yazilis}`);
  const katlar = { k: 1024, m: 1024 ** 2, g: 1024 ** 3 } as const;
  return Number(eslesme[1]) * katlar[eslesme[2] as keyof typeof katlar];
};

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

// Sürüm en az verilen sürüm mü (büyük.orta.küçük)? Bir özelliğin ilk sürümünden eski yayınlar o
// özelliği taşımaz: geri dönüşte ve denetimde beklenmez.
export const surumEnAz = (surum: string, ilk: readonly number[]): boolean => {
  const parcalar = surum.split(".").map(Number);
  for (const [sira, deger] of ilk.entries()) {
    const gercek = parcalar[sira] ?? 0;
    if (gercek !== deger) return gercek > deger;
  }
  return true;
};

// Bu sürümden eski yayınların arka plan kutusu yoktur.
export const arkaPlanKutusuVarMi = (surum: string): boolean => surumEnAz(surum, [0, 9, 0]);

// Bu sürümden eski yayınların dosya klasörü yoktur (kart 0072, karar 0058).
export const dosyaKlasoruVarMi = (surum: string): boolean => surumEnAz(surum, [0, 15, 0]);
