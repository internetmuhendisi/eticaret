// Sunucudaki ön kapı: Caddy ve deneme adresleri (kart 0020, karar 0032). Kurma komutu
// (sunucu-kur.mts), alan adı komutu (alan-adi.mts) ve denetim (sunucu-denetle.mts) bu dosyayı kullanır.
//
// - Altyapının alan adı ve deneme adreslerinin biçimi yalnız burada tanımlıdır.
// - Caddy sunucuda kök olmayan kendi kullanıcısıyla, yetkisiz ve salt okunur kutuda çalışır.
//   Sertifikaları sunucudaki /srv/altyapi/on-kapi/veri klasöründe tutar, yeniden kurulumda kaybolmaz.
// - Ortak "altyapi" ağında yalnız ön kapı ve yoklama kutusu durur. Her site kendi ağındadır,
//   ön kapı her sitenin ağına ayrıca bağlanır; siteler birbirine ulaşamaz (kart 0021).
// - Ayar dosyaları kutulara klasör olarak bağlanır: tek dosya bağlansaydı, yerine konan yeni
//   dosyayı açık kutu görmezdi.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kimlikSemasi } from "../cekirdek/ayar-semasi/kimlik.ts";
import { kok, sshKomutu } from "./sunucu.mts";

// --- Adresler ---

export const altyapiAlanAdi = "eticaretmagazasi.com";
export const denemeAlani = `deneme.${altyapiAlanAdi}`;

// Kod adının kuralı yalnız kimlik şemasındadır (cekirdek/ayar-semasi/kimlik.ts).
export const kodAdiGecerli = (kodAdi: string): boolean =>
  kimlikSemasi.shape.kodAdi.safeParse(kodAdi).success;

export const denemeAdresi = (kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
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
const kaynak = (dosya: string): string => readFileSync(join(kaynakKlasoru, dosya), "utf8");
const ozet = (metin: string): string => createHash("sha256").update(metin).digest("hex");

// Bir deneme adresinin Caddy satırı. Hedef, sitenin kutusunun ağındaki adıdır.
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
        `${onKapiKlasoru}/caddy:/etc/caddy:ro`,
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
      volumes: [`${onKapiKlasoru}/yoklama:/etc/caddy:ro`],
      // Yoklama kutusu ayarı yeniden okuyamaz (yönetim kapısı kapalı); ayar değişince özet
      // değişir ve kutu yeniden kurulur.
      labels: { "altyapi.ayar-ozeti": ozet(kaynak("yoklama.Caddyfile")) },
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
// Caddy zaten açıksa ayarı yeniden okur (bağlantılar kesilmez).
// Site satırlarının adı sitenin kod adıdır (ya da yoklama adı); dosya adı ve betik bundan kurulur.
export const kurmaBetigi = (siteSatirlari: Record<string, string>): string => {
  for (const ad of Object.keys(siteSatirlari)) {
    if (ad !== yoklamaAdi && !kodAdiGecerli(ad)) throw new Error(`Geçersiz site satırı adı: ${ad}`);
  }
  const dosyalar: Record<string, string> = {
    "caddy/Caddyfile": kaynak("Caddyfile"),
    "yoklama/Caddyfile": kaynak("yoklama.Caddyfile"),
    "compose.json": `${JSON.stringify(onKapiTanimi(), null, 2)}\n`,
    ...Object.fromEntries(
      Object.entries(siteSatirlari).map(([ad, satir]) => [`caddy/siteler/${ad}.caddy`, satir]),
    ),
  };
  // Dosyalar önce hazırlık klasörüne yazılır ve Caddy'ye doğrulatılır; ancak hepsi geçerse yerine
  // konur. Bozuk bir ayar çalışan ön kapının dosyalarına hiç dokunmaz.
  const yazma = Object.entries(dosyalar).map(([yol, icerik]) => {
    if (icerik.includes("ON_KAPI_DOSYA_SONU"))
      throw new Error(`${yol} ayrılmış bir satır içeriyor.`);
    return `sudo tee "$t/${yol}" >/dev/null <<'ON_KAPI_DOSYA_SONU'\n${icerik}ON_KAPI_DOSYA_SONU\nsudo chmod 0644 "$t/${yol}"`;
  });
  const yerineKoyma = Object.keys(dosyalar).map((yol) => `sudo mv "$t/${yol}" "$k/${yol}"`);
  const istenenler = Object.keys(siteSatirlari).map((ad) => `${ad}.caddy`);
  // Doğrulama kutusu ön kapının kısıtlarıyla ve ağsız açılır.
  const dogrula = (klasor: string) =>
    `docker run --rm --network none --user ${caddyKullanicisi}:${caddyKullanicisi} --cap-drop ALL --cap-add NET_BIND_SERVICE --security-opt no-new-privileges:true --read-only --tmpfs /tmp -e XDG_DATA_HOME=/tmp/veri -e XDG_CONFIG_HOME=/tmp/ayar -v "$t/${klasor}:/etc/caddy:ro" ${caddyGoruntusu} caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>"$t/dogrulama" || { echo "HATA ${klasor} ayarı doğrulanamadı (ayar geçersiz ya da Caddy görüntüsü yok):" >&2; tail -3 "$t/dogrulama" >&2; exit 1; }`;
  return `set -eu
k=${onKapiKlasoru}
sudo install -d -m 0755 -o root -g root /srv/altyapi "$k" "$k/caddy" "$k/caddy/siteler" "$k/yoklama"
sudo install -d -m 0700 -o ${caddyKullanicisi} -g ${caddyKullanicisi} "$k/veri" "$k/ayar"
t=$(sudo mktemp -d "$k/hazirlik.XXXXXX")
trap 'sudo rm -f "$t"/dogrulama "$t"/caddy/siteler/* "$t"/caddy/Caddyfile "$t"/yoklama/Caddyfile "$t"/compose.json; sudo rmdir "$t"/caddy/siteler "$t"/caddy "$t"/yoklama "$t" 2>/dev/null || true' EXIT
sudo chmod 0755 "$t"
sudo install -d -m 0755 "$t/caddy" "$t/caddy/siteler" "$t/yoklama"
sudo install -m 0600 -o "$(id -u)" /dev/null "$t/dogrulama"
${yazma.join("\n")}
${dogrula("caddy")}
${dogrula("yoklama")}
${yerineKoyma.join("\n")}
# Listede olmayan site satırları silinir: satırların tek kaynağı bu komuttur.
for f in "$k"/caddy/siteler/*.caddy; do
  [ -e "$f" ] || continue
  case " ${istenenler.join(" ")} " in *" $(basename "$f") "*) ;; *) sudo rm -f "$f" ;; esac
done
acilis() { docker inspect -f '{{.State.StartedAt}}' on-kapi 2>/dev/null || true; }
once=$(acilis)
docker compose -f "$k/compose.json" up -d --remove-orphans --quiet-pull </dev/null
# Kutu bu çalışmada yeni açıldıysa ayarı zaten okudu; yeniden okutmak ilk sertifika
# denemesini yarıda keser (ölçüldü). Kutu açık kaldıysa değişen site satırları okutulur.
if [ -n "$once" ] && [ "$once" = "$(acilis)" ]; then
  docker exec on-kapi caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile --force
fi
# Açılan kutu birkaç saniye sonra da çalışıyor olmalı (ayarı okuyamayan Caddy hemen kapanır).
sleep 3
for kutu in on-kapi on-kapi-yoklama; do
  [ "$(docker inspect -f '{{.State.Running}}' "$kutu")" = true ] || { echo "HATA $kutu çalışmıyor" >&2; docker logs --tail 3 "$kutu" >&2; exit 1; }
done
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

// Sunucudaki kutunun gerçek ayarı (docker inspect, kutuOlcumBicimi) kutu tanımıyla aynı olmalı.
// Docker yetki adlarını "CAP_" önekiyle de yazabilir; karşılaştırma öneksiz yapılır.
export const kutuOlcumBicimi =
  "{{.State.Running}}|{{.HostConfig.Privileged}}|{{.Config.User}}|{{.HostConfig.ReadonlyRootfs}}|{{json .HostConfig.CapAdd}}|{{json .HostConfig.CapDrop}}|{{json .HostConfig.SecurityOpt}}";

type KutuTanimi = {
  user: string;
  read_only: boolean;
  cap_add: string[];
  cap_drop: string[];
  security_opt: string[];
};

export const kutuKisitHatalari = (satir: string, tanim: KutuTanimi): string[] => {
  const [calisiyor, yetkili, kullanici, saltOkunur, ekle, kaldir, guvenlik, ...fazla] =
    satir.split("|");
  if (fazla.length > 0 || guvenlik === undefined) return [`okunamadı: ${satir}`];
  const liste = (json: string | undefined): string[] | undefined => {
    try {
      const deger = JSON.parse(json ?? "") as unknown;
      if (deger === null) return [];
      return Array.isArray(deger) ? deger.map(String) : undefined;
    } catch {
      return undefined;
    }
  };
  const yetki = (adlar: string[] | undefined) =>
    adlar
      ?.map((a) => a.toUpperCase().replace(/^CAP_/, ""))
      .sort()
      .join(",");
  const hatalar: string[] = [];
  if (calisiyor !== "true") hatalar.push("çalışmıyor");
  if (yetkili !== "false") hatalar.push("yetkili kipte (privileged)");
  if (kullanici !== tanim.user)
    hatalar.push(`kullanıcı ${kullanici || "kök"}, beklenen ${tanim.user}`);
  if (saltOkunur !== String(tanim.read_only)) hatalar.push("dosya sistemi salt okunur değil");
  if (yetki(liste(ekle)) !== yetki(tanim.cap_add)) hatalar.push(`eklenen yetkiler ${ekle}`);
  if (yetki(liste(kaldir)) !== yetki(tanim.cap_drop)) hatalar.push(`kaldırılan yetkiler ${kaldir}`);
  if ((liste(guvenlik) ?? []).sort().join(",") !== [...tanim.security_opt].sort().join(",")) {
    hatalar.push(`güvenlik seçenekleri ${guvenlik}`);
  }
  return hatalar;
};

// Tanınmayan adrese sertifika verilmediğinde Caddy bağlantıyı TLS uyarısıyla keser (ölçüldü:
// EPROTO, "alert internal error"). Zaman aşımı, ret ya da ad uyuşmazlığı bu sayılmaz.
export const sertifikaReddedildi = (hata: unknown): boolean =>
  hata instanceof Error &&
  (hata as NodeJS.ErrnoException).code === "EPROTO" &&
  /alert/i.test(hata.message);
