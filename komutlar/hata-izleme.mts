// Hata izleme aracı: kendi sunucumuzda Bugsink (kart 0022, karar 0036). Komutlar
// (sunucu-hata-izleme.mts, sunucu-kur.mts, hata-izleme-ac.mts, hata-izleme-denemesi.mts),
// yayın komutu (yayin.mts) ve denetim (sunucu-denetle.mts) bu dosyayı kullanır.
//
// - Deneme ortamının kendi kutusu vardır: hata-izleme-deneme. Canlı ortam alan adı bağlanınca
//   kendi kutusuyla eklenir; iki ortamın hataları karışmaz.
// - Kutu görüntünün kendi kök olmayan kullanıcısıyla (bugsink, 14237), salt okunur dosya
//   sistemiyle ve yetkisiz çalışır. Verisi (SQLite) /srv/altyapi/hata-izleme/<ortam>/veri
//   klasöründedir. Portu açılmaz; internete çıkamaz (ağı dışarıya kapalıdır, on-kapi.mts).
// - Dışarıdan yalnız ön kapı üzerinden hata gönderim yoluna ulaşılır (on-kapi.mts,
//   hataIzlemeSatiri). Yönetim ekranı yalnız SSH tüneliyle açılır (pnpm hata-izleme-ac).
// - Her sitenin kutudaki projesi kendi kod adıyla açılır; site hatalarını yalnız kendi projesine
//   gönderebilir. Projenin gönderim adresi yayında site kutusuna verilir (yayin.mts).
// - Gizli bilgiler (imza anahtarı, yönetici şifresi, yönetim anahtarı) sunucuda üretilir ve
//   sunucudan çıkmaz (gizli-bilgi.mts, hataIzlemeGizliBilgisi). İmza anahtarı ve şifre kutuya
//   dosyayla bağlanır, ortam değişkenine kutunun içinde açılışta yazılır; docker inspect
//   çıktısında görünmez. Yönetim anahtarı kutuya bağlanmaz, komutlar onu girdiden verir.

import { gonderimAdresiniCoz, type Olay } from "../cekirdek/izleme/hata-izleme-araci.ts";
import {
  acikBicimler,
  denemeDegerleri,
} from "../cekirdek/izleme/hata-izleme-denemesi-degerleri.ts";
import { gizliKok, hataIzlemeGizliBilgisi, type Ortam } from "./gizli-bilgi.mts";
import { kaliciKutu } from "./kutu-kurali.mts";
import {
  altyapiAlanAdi,
  hataIzlemeAdresi,
  hataIzlemeAgi,
  hataIzlemeKutusu,
  hataIzlemeOrtami,
  hataIzlemePortu,
  kodAdiGecerli,
} from "./on-kapi.mts";
import { sshKomutu } from "./sunucu.mts";

// --- Görüntü ---

// Sürüm ve özet birlikte yazılır: aynı etiketin altına başka bir görüntü konsa da sunucu bu
// görüntüyü çeker. Yükseltme: etiketi ve özeti değiştir, bugsinkKomutu'nu görüntüdekiyle karşılaştır.
export const bugsinkGoruntusu =
  "bugsink/bugsink:2.6.2@sha256:a013fe0da745b753d65f9816020d36f91620e6d1c62ac22d82463b3a6ec2d71e";
// Görüntünün kullanıcısı (ölçüldü: id bugsink). Gizli bilgi dosyalarının sahibi de odur.
export const bugsinkKullanicisi = hataIzlemeGizliBilgisi.dosyalar.gizli_anahtar;
// Görüntünün kendi açılış komutu (docker image inspect .Config.Cmd). Kutu gizli bilgileri
// açtıktan sonra bu komutu aynen çalıştırır. Kurulum, sunucudaki görüntünün komutu bununla aynı
// değilse durur: başka bir komutla açılan kutu gizli bilgileri yanlış okuyabilirdi.
export const bugsinkKomutu = [
  "monofy",
  "bugsink-show-version",
  "&&",
  "bugsink-manage",
  "check",
  "--deploy",
  "--fail-level",
  "WARNING",
  "&&",
  "bugsink-manage",
  "migrate",
  "snappea",
  "--database=snappea",
  "&&",
  "bugsink-manage",
  "migrate",
  "&&",
  "bugsink-manage",
  "prestart",
  "&&",
  "gunicorn",
  "--config",
  "gunicorn.docker.conf.py",
  "--bind=0.0.0.0:$PORT",
  "--access-logfile",
  "-",
  "bugsink.wsgi",
  "|||",
  "bugsink-runsnappea",
];

// --- Adlar ve yerleşim ---

// Hata izleme kutusu açılmış ortamlar. Canlı ortam alan adı bağlanınca eklenir (kullanıcı kararı).
export const hataIzlemeOrtamlari = [hataIzlemeOrtami] as const satisfies readonly Ortam[];

export const hataIzlemeKlasoru = (ortam: Ortam): string => `/srv/altyapi/hata-izleme/${ortam}`;
const gizliKlasoru = (ortam: Ortam): string =>
  `${gizliKok}/${ortam}/${hataIzlemeGizliBilgisi.klasor}`;
// Yönetim ekranının kullanıcısı. Adres gerçek bir posta kutusu değildir, yalnız giriş adıdır.
export const yoneticiAdi = `yonetici@${altyapiAlanAdi}`;
// Bir sitenin projesinin tuttuğu en çok olay (Bugsink'in varsayılanı 10.000).
const projeBasinaOlay = 10_000;

const kutuGizlileri = ["gizli_anahtar", "yonetici_sifresi"] as const;

// Kutu açılırken gizli bilgiler dosyadan ortam değişkenine yazılır ve görüntünün komutu çalışır.
// Değer kutunun içindeki sürecin ortamında kalır, kutunun tanımında ve docker inspect'te yoktur.
const baslatma = [
  "set -e",
  'a=$(cat /run/secrets/gizli_anahtar) && export SECRET_KEY="$a"',
  `s=$(cat /run/secrets/yonetici_sifresi) && export CREATE_SUPERUSER="${yoneticiAdi}:$s"`,
  "unset a s",
  'exec "$@"',
].join("\n");

// --- Kutu tanımı ---

export const hataIzlemeTanimi = (ortam: Ortam) => {
  const klasor = hataIzlemeKlasoru(ortam);
  return {
    name: `altyapi-hata-izleme-${ortam}`,
    services: {
      bugsink: {
        image: bugsinkGoruntusu,
        container_name: hataIzlemeKutusu,
        ...kaliciKutu,
        user: `${bugsinkKullanicisi}:${bugsinkKullanicisi}`,
        // Compose tanımdaki $ işaretini kendi değişkeni sayar ve boşaltır (ölçüldü: imza anahtarı
        // ve port boş gitti); $$ kutuya $ olarak geçer.
        command: ["sh", "-c", baslatma, "bugsink-baslat", ...bugsinkKomutu].map((parca) =>
          parca.replaceAll("$", () => "$$"),
        ),
        environment: {
          PORT: String(hataIzlemePortu),
          BASE_URL: `https://${hataIzlemeAdresi}`,
          // Yönetim ekranı tünelle localhost'tan, komutlar kutunun içinden 127.0.0.1'den gelir.
          ALLOWED_HOSTS: [hataIzlemeAdresi, "localhost", "127.0.0.1"].join(","),
          SITE_TITLE: `Hata izleme (${ortam})`,
          TIME_ZONE: "Europe/Istanbul",
          // Tek kullanıcı (altyapı sahibi); kimse kendi kaydını açamaz.
          SINGLE_USER: "true",
          USER_REGISTRATION: "CB_NOBODY",
          // Bugsink'e kurulum bilgisi gönderilmez; kutu zaten internete çıkamaz.
          PHONEHOME: "false",
          MINIMIZE_INFORMATION_EXPOSURE: "true",
          MAX_RETENTION_PER_PROJECT_EVENT_COUNT: String(projeBasinaOlay),
        },
        secrets: kutuGizlileri.map((ad) => ({ source: ad, target: ad })),
        cap_drop: ["ALL"],
        cap_add: [] as string[],
        security_opt: ["no-new-privileges:true"],
        read_only: true,
        // Bugsink'in iş kuyruğu kutunun /tmp klasöründedir (görüntünün kendi ayarı).
        tmpfs: ["/tmp"],
        volumes: [`${klasor}/veri:/data`],
        networks: [hataIzlemeAgi],
        healthcheck: {
          test: [
            "CMD",
            "python",
            "-c",
            `import urllib.request; urllib.request.urlopen("http://127.0.0.1:${hataIzlemePortu}/health/ready", timeout=4)`,
          ],
          interval: "30s",
          timeout: "5s",
          retries: 3,
          start_period: "120s",
          start_interval: "2s",
        },
      },
    },
    secrets: Object.fromEntries(
      kutuGizlileri.map((ad) => [ad, { file: `${gizliKlasoru(ortam)}/${ad}` }]),
    ),
    networks: { [hataIzlemeAgi]: { name: hataIzlemeAgi, external: true } },
  };
};

// --- Sunucuda çalışan betikler (değer taşımaz) ---

const sunucudaCalistir = (ipv4: string, betik: string, sure = 300_000): string => {
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik, sure });
  if (sonuc.status !== 0) throw new Error(sonuc.stderr.trim() || "sunucudaki betik hatayla bitti");
  return sonuc.stdout;
};

// Görüntüyü çeker ve açılış komutunu okur.
export const goruntuKomutuBetigi = (): string =>
  `set -eu
docker pull -q ${bugsinkGoruntusu} >/dev/null
docker image inspect -f '{{json .Config.Cmd}}' ${bugsinkGoruntusu}
`;

// Klasörleri ve gizli bilgileri kurar, kutuyu tanıma göre açar, yönetim anahtarı yoksa üretir.
// Var olan değere dokunmaz. Değerler kök kabuğunun değişkeninde kalır, ekrana basılmaz.
export const kurmaBetigi = (ortam: Ortam): string => {
  const k = hataIzlemeKlasoru(ortam);
  const g = gizliKlasoru(ortam);
  const u = bugsinkKullanicisi;
  const icerik = `${JSON.stringify(hataIzlemeTanimi(ortam), null, 2)}\n`;
  if (icerik.includes("HATA_IZLEME_DOSYA_SONU")) throw new Error("Tanım ayrılmış satır içeriyor.");
  const uret = kutuGizlileri.map(
    (ad) => `if ! sudo test -s ${g}/${ad}; then
  sudo sh -c 'umask 077 && openssl rand -hex 32 > ${g}/.${ad}.yeni && chown ${u}:${u} ${g}/.${ad}.yeni && chmod 0400 ${g}/.${ad}.yeni && mv -f ${g}/.${ad}.yeni ${g}/${ad}'
  echo "üretildi    ${ortam}/${hataIzlemeGizliBilgisi.klasor}/${ad}"
fi
sudo chown ${u}:${u} ${g}/${ad}
sudo chmod 0400 ${g}/${ad}`,
  );
  const anahtar = `${g}/yonetim_anahtari`;
  return `set -eu
sudo install -d -m 0755 -o root -g root /srv/altyapi /srv/altyapi/hata-izleme ${k}
sudo install -d -m 0700 -o ${u} -g ${u} ${k}/veri
sudo install -d -m 0700 -o root -g root ${gizliKok} ${gizliKok}/${ortam} ${g}
${uret.join("\n")}
docker network inspect ${hataIzlemeAgi} >/dev/null 2>&1 || { echo "HATA ${hataIzlemeAgi} ağı yok; önce ön kapı kurulmalı (pnpm sunucu-hata-izleme ön kapıyı da kurar)" >&2; exit 1; }
sudo tee ${k}/compose.json.yeni >/dev/null <<'HATA_IZLEME_DOSYA_SONU'
${icerik}HATA_IZLEME_DOSYA_SONU
sudo chmod 0644 ${k}/compose.json.yeni
sudo mv -f ${k}/compose.json.yeni ${k}/compose.json
h=$(mktemp)
trap 'rm -f "$h"' EXIT
docker compose -f ${k}/compose.json up -d --wait --wait-timeout 240 --remove-orphans --quiet-pull </dev/null >/dev/null 2>"$h" || { echo "HATA hata izleme kutusu açılamadı:" >&2; tail -5 "$h" >&2; docker logs --tail 10 ${hataIzlemeKutusu} >&2 2>&1 || true; exit 1; }
# Yönetim anahtarı yalnız yoksa üretilir: Bugsink anahtarı ekrana basar, çıktı doğrudan dosyaya gider.
if ! sudo test -s ${anahtar}; then
  sudo sh -c 'umask 077; t=$(docker exec ${hataIzlemeKutusu} bugsink-manage create_auth_token 2>/dev/null | tail -n 1); case "$t" in *[!0-9a-f]*|"") echo "HATA yönetim anahtarı üretilemedi" >&2; exit 1 ;; esac; printf "%s" "$t" > ${g}/.yonetim_anahtari.yeni && chmod 0400 ${g}/.yonetim_anahtari.yeni && mv -f ${g}/.yonetim_anahtari.yeni ${anahtar}'
  echo "üretildi    ${ortam}/${hataIzlemeGizliBilgisi.klasor}/yonetim_anahtari"
fi
sudo chown root:root ${anahtar}
sudo chmod 0400 ${anahtar}
echo hata-izleme=hazir
`;
};

// Kutunun içinde çalışan yönetim istemcisi: Bugsink'in okuma ve yönetim ucunu kutunun içinden
// (127.0.0.1) çağırır. Yönetim anahtarı girdinin ilk satırıdır; komut satırında görünmez.
// İşlemler: "proje <kod adı>" (yoksa açar, gönderim adresini yazar), "olaylar <kod adı> <işaret>"
// (işareti taşıyan olayları yazar).
const yonetimIstemcisi = `import json, sys, urllib.request
anahtar = sys.stdin.readline().strip()
kok = "http://127.0.0.1:${hataIzlemePortu}/api/canonical/0"
def iste(yol, govde=None):
    istek = urllib.request.Request(kok + yol, method="GET" if govde is None else "POST",
        data=None if govde is None else json.dumps(govde).encode(),
        headers={"Authorization": "Bearer " + anahtar, "Content-Type": "application/json"})
    with urllib.request.urlopen(istek, timeout=30) as yanit:
        return json.load(yanit)
def hepsi(yol):
    sonuc = []
    while yol:
        sayfa = iste(yol)
        sonuc += sayfa["results"]
        sonraki = sayfa.get("next")
        yol = sonraki[sonraki.index("/api/canonical/0") + len("/api/canonical/0"):] if sonraki else None
    return sonuc
islem, kod = sys.argv[1], sys.argv[2]
projeler = lambda: [p for p in hepsi("/projects/") if p["name"] == kod]
if islem == "proje":
    if not projeler():
        takimlar = [t for t in hepsi("/teams/") if t["name"] == "siteler"]
        takim = takimlar[0] if takimlar else iste("/teams/", {"name": "siteler"})
        iste("/projects/", {"team": takim["id"], "name": kod, "alert_on_new_issue": False,
            "alert_on_regression": False, "alert_on_unmute": False})
    bulunan = projeler()
    if len(bulunan) != 1:
        sys.exit("proje sayısı %d" % len(bulunan))
    print("adres=" + bulunan[0]["dsn"])
elif islem == "olaylar":
    isaret = sys.argv[3]
    cikti = []
    for p in projeler():
        for s in hepsi("/issues/?project=%d" % p["id"]):
            for o in hepsi("/events/?issue=" + s["id"]):
                veri = iste("/events/%s/" % o["id"])["data"]
                if isaret in json.dumps(veri, ensure_ascii=False):
                    cikti.append(veri)
    print("olaylar=" + json.dumps(cikti, ensure_ascii=False))
else:
    sys.exit("bilinmeyen işlem")
`;

export const yonetimBetigi = (ortam: Ortam, argumanlar: string[]): string => {
  for (const arguman of argumanlar) {
    if (!/^[a-z0-9-]+$/.test(arguman)) throw new Error(`Geçersiz argüman: ${arguman}`);
  }
  if (yonetimIstemcisi.includes("HATA_IZLEME_PY_SONU"))
    throw new Error("İstemci ayrılmış satır içeriyor.");
  return `set -eu
p=$(cat <<'HATA_IZLEME_PY_SONU'
${yonetimIstemcisi}HATA_IZLEME_PY_SONU
)
sudo cat ${gizliKlasoru(ortam)}/yonetim_anahtari | { cat; echo; } | docker exec -i ${hataIzlemeKutusu} python -c "$p" ${argumanlar.join(" ")}
`;
};

// --- Bütün adımlar ---

// Kutuyu kurar ya da tanıma göre günceller. Ön kapı (ağıyla birlikte) önce kurulmuş olmalıdır.
export const hataIzlemeyiKur = (
  ipv4: string,
  ortam: Ortam,
  yaz: (satir: string) => void = () => {},
): void => {
  const komut = JSON.parse(sunucudaCalistir(ipv4, goruntuKomutuBetigi()).trim()) as unknown;
  if (JSON.stringify(komut) !== JSON.stringify(bugsinkKomutu)) {
    throw new Error(
      `Bugsink görüntüsünün açılış komutu beklenenden farklı; kutuya dokunulmadı. Görüntüdeki: ${JSON.stringify(komut)}`,
    );
  }
  const cikti = sunucudaCalistir(ipv4, kurmaBetigi(ortam), 600_000);
  if (!cikti.includes("hata-izleme=hazir")) throw new Error(`Hata izleme kurulamadı: ${cikti}`);
  for (const satir of cikti.split("\n")) {
    if (satir.trim() && satir !== "hata-izleme=hazir") yaz(satir);
  }
  yaz(`hazır       ${hataIzlemeKutusu}`);
};

// Sitenin projesini (yoksa) açar ve gönderim adresini döndürür. Adres hata izleme adresini
// göstermiyorsa (kutunun adresi yanlış kurulmuşsa) hata verir.
export const projeAdresiniHazirla = (ipv4: string, ortam: Ortam, kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  const cikti = sunucudaCalistir(ipv4, yonetimBetigi(ortam, ["proje", kodAdi]));
  const adres = cikti.match(/^adres=(\S+)$/m)?.[1] ?? "";
  const cozulen = gonderimAdresiniCoz(adres);
  if (!cozulen?.adres.startsWith(`https://${hataIzlemeAdresi}/api/`)) {
    throw new Error(`Hata izleme projesinin adresi beklenen biçimde değil: ${adres || cikti}`);
  }
  return adres;
};

// Sitenin projesinde işareti taşıyan olaylar (deneme komutu kullanır).
export const olaylariOku = (ipv4: string, ortam: Ortam, kodAdi: string, isaret: string): Olay[] => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  const cikti = sunucudaCalistir(ipv4, yonetimBetigi(ortam, ["olaylar", kodAdi, isaret]));
  const satir = cikti.match(/^olaylar=(.*)$/m)?.[1];
  if (satir === undefined) throw new Error(`Olaylar okunamadı: ${cikti}`);
  return JSON.parse(satir) as Olay[];
};

// --- Denetim ---

// Kutu yalnız kendi ağına bağlı olmalı (girdi: docker inspect'teki ağ adları).
export const hataIzlemeAgHatalari = (aglar: string[]): string[] => {
  const fazla = aglar
    .filter((ag) => ag && ag !== hataIzlemeAgi)
    .map((ag) => `beklenmeyen ağ ${ag}`);
  return aglar.includes(hataIzlemeAgi) ? fazla : [...fazla, `${hataIzlemeAgi} ağına bağlı değil`];
};

// Araçtaki kayıtta hiç bulunmaması gereken alanlar: ziyaretçi, istek, çerez, gezinme izi.
const yasakAlanlar = new Set([
  "user",
  "request",
  "contexts",
  "breadcrumbs",
  "ip_address",
  "cookies",
  "headers",
  "server_name",
]);

const alanlar = (deger: unknown): string[] =>
  typeof deger !== "object" || deger === null
    ? []
    : Object.entries(deger).flatMap(([ad, alt]) => [ad, ...alanlar(alt)]);

// Deneme komutunun bir kayda bakışı (hata-izleme-denemesi.mts). Testi: komutlar/testler/hata-izleme.test.ts.
export const olaySorunlari = (
  olay: Olay,
  beklenen: { site: string; surum: string; ortam: string; kaynak: string },
): string[] => {
  const sorunlar: string[] = [];
  const metin = JSON.stringify(olay);
  const etiketler = olay.tags ?? {};
  if (etiketler.site !== beklenen.site) sorunlar.push(`site etiketi ${String(etiketler.site)}`);
  if (etiketler.cekirdek_surumu !== beklenen.surum || olay.release !== beklenen.surum) {
    sorunlar.push(`sürüm etiketi ${String(etiketler.cekirdek_surumu)}/${String(olay.release)}`);
  }
  if (olay.environment !== beklenen.ortam) sorunlar.push(`ortam ${String(olay.environment)}`);
  if (etiketler.kaynak !== beklenen.kaynak) sorunlar.push(`kaynak ${String(etiketler.kaynak)}`);
  for (const deger of acikBicimler) if (metin.includes(deger)) sorunlar.push(`açık: ${deger}`);
  for (const ad of alanlar(olay)) if (yasakAlanlar.has(ad)) sorunlar.push(`yasak alan: ${ad}`);
  if (/\b\d{1,3}(\.\d{1,3}){3}\b/.test(metin)) sorunlar.push("kayıtta IP adresi var");
  // Maske çalıştı mı: e-posta kısaltılmış biçimiyle durmalı (silinmiş değil).
  if (!metin.includes(`${denemeDegerleri.eposta[0]}***@`)) sorunlar.push("kısaltılmış e-posta yok");
  return sorunlar;
};
