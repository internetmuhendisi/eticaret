// Sunucudaki ön kapı: Caddy ve deneme adresleri (kart 0020, karar 0032). Kurma komutu
// (sunucu-kur.mts), alan adı komutu (alan-adi.mts) ve denetim (sunucu-denetle.mts) bu dosyayı kullanır.
//
// - Altyapının alan adı ve deneme adreslerinin biçimi yalnız burada tanımlıdır.
// - Caddy sunucuda kök olmayan kendi kullanıcısıyla, yetkisiz ve salt okunur kutuda çalışır.
//   Sertifikaları sunucudaki /srv/altyapi/on-kapi/veri klasöründe tutar, yeniden kurulumda kaybolmaz.
// - Site kutuları ön kapıya "altyapi" ağından bağlanır (yayın komutu, kart 0021).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kok, sshKomutu } from "./sunucu.mts";

// --- Adresler ---

export const altyapiAlanAdi = "eticaretmagazasi.com";
export const denemeAlani = `deneme.${altyapiAlanAdi}`;

// Kod adı kalıbı kimlik şemasıyla aynıdır (cekirdek/ayar-semasi/kimlik.ts).
const kodAdiKalibi = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const denemeAdresi = (kodAdi: string): string => {
  if (!kodAdiKalibi.test(kodAdi) || kodAdi.length > 40) {
    throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  }
  return `${kodAdi}.${denemeAlani}`;
};

// Yoklama kutusunun adresi. İki tire yan yana hiçbir kod adında geçemez (kimlik şeması),
// bu yüzden bu adres hiçbir sitenin deneme adresiyle çakışmaz.
export const yoklamaAdi = "kapi--yoklama";
export const yoklamaAdresi = `${yoklamaAdi}.${denemeAlani}`;

// Alan adında deneme adreslerini sunucuya bağlayan kayıtlar: tek joker kayıt her deneme
// adresini karşılar, yeni site için alan adına dokunulmaz. Vekil kapalıdır: ziyaretçi doğrudan
// Almanya'daki sunucuya bağlanır (karar 0009), sertifikayı Caddy alır.
export const alanAdiKayitlari = (ipv4: string, ipv6: string) => [
  { type: "A", name: `*.${denemeAlani}`, content: ipv4, proxied: false },
  { type: "AAAA", name: `*.${denemeAlani}`, content: ipv6, proxied: false },
];

// --- Sunucudaki yerleşim ---

export const caddyGoruntusu = "caddy:2.10.2-alpine";
export const onKapiKlasoru = "/srv/altyapi/on-kapi";
export const agAdi = "altyapi";
const proje = "altyapi-on-kapi";
// Caddy'nin kutu kullanıcısı. Sitelerin numaraları 20000 ve 30000'den başlar (karar 0031).
export const caddyKullanicisi = 10080;
const yoklamaKullanicisi = 10081;
const yoklamaHedefi = "on-kapi-yoklama:3000";

const kaynakKlasoru = join(kok, "sunucu", "on-kapi");

// Bir deneme adresinin Caddy satırı. Hedef, sitenin kutusunun "altyapi" ağındaki adıdır.
export const denemeSatiri = (adres: string, hedef: string): string => {
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(adres) || !adres.endsWith(`.${denemeAlani}`)) {
    throw new Error(`Deneme adresi değil: ${adres}`);
  }
  if (!/^[a-z0-9-]+:\d+$/.test(hedef)) throw new Error(`Geçersiz kutu hedefi: ${hedef}`);
  return `${adres} {\n\timport deneme\n\treverse_proxy ${hedef}\n}\n`;
};

// Kutuların ortak güvenlik ayarı: dosya sistemi salt okunur, yetki yükseltme kapalı, tek yetki
// düşük kapıları açmak. Görüntüdeki caddy programı bu yetkiyi dosyasında taşır; yetki kutuda
// yoksa program hiç çalışmaz (ölçüldü).
const kisitli = {
  cap_drop: ["ALL"],
  cap_add: ["NET_BIND_SERVICE"],
  security_opt: ["no-new-privileges:true"],
  read_only: true,
};

export const onKapiTanimi = () => ({
  name: proje,
  services: {
    caddy: {
      image: caddyGoruntusu,
      container_name: "on-kapi",
      user: `${caddyKullanicisi}:${caddyKullanicisi}`,
      ports: ["80:80/tcp", "443:443/tcp"],
      ...kisitli,
      tmpfs: ["/tmp"],
      volumes: [
        `${onKapiKlasoru}/Caddyfile:/etc/caddy/Caddyfile:ro`,
        `${onKapiKlasoru}/siteler:/etc/caddy/siteler:ro`,
        `${onKapiKlasoru}/veri:/data`,
        `${onKapiKlasoru}/ayar:/config`,
      ],
      networks: [agAdi],
    },
    yoklama: {
      image: caddyGoruntusu,
      container_name: "on-kapi-yoklama",
      user: `${yoklamaKullanicisi}:${yoklamaKullanicisi}`,
      command: ["caddy", "run", "--adapter", "caddyfile", "--config", "/etc/caddy/Caddyfile"],
      environment: { XDG_DATA_HOME: "/tmp/veri", XDG_CONFIG_HOME: "/tmp/ayar" },
      ...kisitli,
      tmpfs: ["/tmp"],
      volumes: [`${onKapiKlasoru}/yoklama.Caddyfile:/etc/caddy/Caddyfile:ro`],
      networks: [agAdi],
    },
  },
  // IPv6 açık ağ: IPv6 ziyaretçinin adresi kutuya olduğu gibi ulaşır. Ağ IPv6'sız olsaydı
  // Docker IPv6 isteklerini kendi aracı üzerinden geçirir, ziyaretçi adresi kaybolurdu.
  networks: {
    [agAdi]: {
      name: agAdi,
      enable_ipv6: true,
      // IPv4 alt ağını Docker seçer; IPv6 için özel (dışarıya yönlenmeyen) bir alt ağ verilir.
      ipam: { config: [{ subnet: "fd00:a17a:0:1::/64" }] },
    },
  },
});

// Sunucuda çalışan betik. Dosyalar girdiden yazılır; komut tekrar çalıştırılabilir.
// Caddy açıksa ayarı yeniden okur (bağlantılar kesilmez).
export const kurmaBetigi = (siteSatirlari: Record<string, string>): string => {
  const dosyalar: Record<string, string> = {
    Caddyfile: readFileSync(join(kaynakKlasoru, "Caddyfile"), "utf8"),
    "yoklama.Caddyfile": readFileSync(join(kaynakKlasoru, "yoklama.Caddyfile"), "utf8"),
    "compose.json": `${JSON.stringify(onKapiTanimi(), null, 2)}\n`,
    ...Object.fromEntries(
      Object.entries(siteSatirlari).map(([ad, satir]) => [`siteler/${ad}.caddy`, satir]),
    ),
  };
  const yazma = Object.entries(dosyalar).map(([yol, icerik]) => {
    if (icerik.includes("ON_KAPI_DOSYA_SONU"))
      throw new Error(`${yol} ayrılmış bir satır içeriyor.`);
    return `sudo tee "$k/${yol}.yeni" >/dev/null <<'ON_KAPI_DOSYA_SONU'\n${icerik}ON_KAPI_DOSYA_SONU\nsudo chmod 0644 "$k/${yol}.yeni"\nsudo mv "$k/${yol}.yeni" "$k/${yol}"`;
  });
  const istenenler = Object.keys(siteSatirlari).map((ad) => `${ad}.caddy`);
  return `set -eu
k=${onKapiKlasoru}
sudo install -d -m 0755 -o root -g root /srv/altyapi "$k" "$k/siteler"
sudo install -d -m 0700 -o ${caddyKullanicisi} -g ${caddyKullanicisi} "$k/veri" "$k/ayar"
${yazma.join("\n")}
# Listede olmayan site satırları silinir: satırların tek kaynağı bu komuttur.
for f in "$k"/siteler/*.caddy; do
  [ -e "$f" ] || continue
  case " ${istenenler.join(" ")} " in *" $(basename "$f") "*) ;; *) sudo rm -f "$f" ;; esac
done
docker compose -f "$k/compose.json" up -d --remove-orphans --quiet-pull </dev/null
docker exec on-kapi caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile --force
echo on-kapi=hazir
`;
};

export const onKapiyiKur = (ipv4: string): void => {
  const sonuc = sshKomutu(ipv4, "bash -s", {
    girdi: kurmaBetigi({ [yoklamaAdi]: denemeSatiri(yoklamaAdresi, yoklamaHedefi) }),
    sure: 300_000,
  });
  if (sonuc.status !== 0 || !sonuc.stdout.includes("on-kapi=hazir")) {
    throw new Error(`Ön kapı kurulamadı: ${sonuc.stderr.trim()}`);
  }
};

// --- Denetimin karar kuralları (testleri: komutlar/testler/on-kapi.test.ts) ---

// Şifresiz istek aynı adresin şifreli hâline kalıcı olarak yönlenmeli.
export const yonlendirmeDogru = (
  durum: number,
  konum: string | undefined,
  adres: string,
  yol: string,
): boolean => [301, 308].includes(durum) && konum === `https://${adres}${yol}`;

export const dizineKapali = (baslik: string | string[] | undefined): boolean => {
  const degerler = (Array.isArray(baslik) ? baslik : [baslik ?? ""]).flatMap((d) =>
    d.split(",").map((p) => p.trim().toLowerCase()),
  );
  return degerler.includes("noindex");
};

export const robotlaraKapali = (govde: string): boolean => {
  const satirlar = govde.split("\n").map((s) => s.trim().toLowerCase());
  return satirlar.includes("user-agent: *") && satirlar.includes("disallow: /");
};

// Sertifikanın kalan günü. Caddy sertifikayı süresinin son üçte birinde yeniler; 14 günden az
// kaldıysa yenileme çalışmıyor demektir.
export const sertifikaSiniri = 14;
export const kalanGun = (bitis: string, simdi = new Date()): number =>
  Math.floor((new Date(bitis).getTime() - simdi.getTime()) / 86_400_000);

// Uygulama istemci adresi başlığının son değerini alır (karar 0024).
export const sonIstemciAdresi = (baslik: string): string | undefined =>
  baslik
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .at(-1);

// IPv6 adresleri farklı yazılabilir (sıfırlar, büyük harf); karşılaştırma açık biçimle yapılır.
export const ayniAdres = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b) return false;
  const ac = (x: string): string => {
    const temiz = x.toLowerCase().replace(/^::ffff:(?=\d+\.)/, "");
    if (!temiz.includes(":")) return temiz;
    const [bas = "", son = ""] = temiz.split("::");
    const parcalar = (s: string) => (s ? s.split(":") : []);
    const eksik = 8 - parcalar(bas).length - parcalar(son).length;
    const hepsi = temiz.includes("::")
      ? [...parcalar(bas), ...Array(eksik).fill("0"), ...parcalar(son)]
      : parcalar(temiz);
    return hepsi.map((p) => p.replace(/^0+(?=.)/, "")).join(":");
  };
  return ac(a) === ac(b);
};
