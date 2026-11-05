// Sunucudaki veritabanı (kart 0039, karar 0034). Komutlar (sunucu-veritabani-ac.mts,
// sunucu-veritabani-denemesi.mts, sunucu-gizli.mts, sunucu-denetle.mts) ve ileride yayın komutu
// (kart 0021) bu dosyayı kullanır.
//
// - Her ortamın kendi PostgreSQL kutusu vardır: veritabani-<ortam>. Görüntüsü ve bağlantı
//   kuralları yerel ortamla aynıdır (sunucu/compose.yaml, sunucu/veritabani/pg_hba.conf).
// - Kutu kök olmayan postgres kullanıcısıyla, salt okunur dosya sistemiyle ve yetkisiz çalışır.
//   Portu dışarıya açılmaz. Verisi /srv/altyapi/veritabani/<ortam>/veri klasöründedir.
// - Her site kendi ağındadır (site-<ortam>-<kod adı>). Veritabanı kutusu her sitenin ağına
//   "veritabani" adıyla bağlanır; bağlantılar elle değil bu tanımla yapılır.
// - Yönetici şifresi sunucuda üretilir ve gizli bilgi klasöründe durur. Sitelerin şifreleri
//   sitenin kendi gizli bilgi dosyasından okunur; değerler sunucudan çıkmaz, hiçbir komut
//   satırında görünmez.
// - Değişiklikleri çekirdeğin görüntüsündeki parça uygular (cekirdek/veritabani/sunucuda-guncelle.ts),
//   sitenin kutu kullanıcısıyla, sitenin ağında ve sitenin gizli bilgi dosyasıyla.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import { goruntuAdi, goruntuyuDenetle } from "./cekirdek-goruntusu-denetle.mts";
import {
  gizliKlasor,
  gizliKok,
  kutuKullanicisi,
  type Ortam,
  sablonParcalari,
  uretmeBetigi,
  yoneticiGizliBilgisi,
} from "./gizli-bilgi.mts";
import { kaliciKutu } from "./kutu-kurali.mts";
import { kodAdiGecerli } from "./on-kapi.mts";
import { veritabaniAcmaBetigi } from "./site-veritabani.mts";
import { girisAnahtari, kok, sshKomutu, sshSecenekleri, sunucuTanimi } from "./sunucu.mts";

// Veritabanı açılmış ortamlar. Canlı ortam alan adı bağlanınca eklenir (kullanıcı kararı).
export const veritabaniOrtamlari = ["deneme"] as const satisfies readonly Ortam[];

// --- Adlar ve yerleşim ---

// PostgreSQL görüntüsü yerel ortamla aynıdır; sürüm yalnız sunucu/compose.yaml'da yazar.
export const postgresGoruntusu = ((): string => {
  const eslesme = readFileSync(join(kok, "sunucu", "compose.yaml"), "utf8").match(
    /^\s+image:\s*(postgres:\S+)\s*$/m,
  );
  if (!eslesme?.[1]) throw new Error("sunucu/compose.yaml'da PostgreSQL görüntüsü bulunamadı.");
  return eslesme[1];
})();
// Görüntüdeki postgres kullanıcısının numarası (ölçüldü: id postgres); yönetici şifresinin
// sahibi de odur.
export const postgresKullanicisi = yoneticiGizliBilgisi.sahip;

export const veritabaniKutusu = (ortam: Ortam): string => `veritabani-${ortam}`;
export const veritabaniKlasoru = (ortam: Ortam): string => `/srv/altyapi/veritabani/${ortam}`;
export const siteAgi = (ortam: Ortam, kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  return `site-${ortam}-${kodAdi}`;
};

// Yönetici şifresinin yeri gizli bilgi kurallarındadır (gizli-bilgi.mts, yoneticiGizliBilgisi).
export const yoneticiKlasoruAdi = yoneticiGizliBilgisi.klasor;
export const yoneticiDosyasiAdi = yoneticiGizliBilgisi.dosya;
export const yoneticiDosyasi = (ortam: Ortam): string =>
  `${gizliKok}/${ortam}/${yoneticiKlasoruAdi}/${yoneticiDosyasiAdi}`;

const pgHba = (): string => readFileSync(join(kok, "sunucu", "veritabani", "pg_hba.conf"), "utf8");

// --- Kutu tanımı ---

export const veritabaniTanimi = (ortam: Ortam, siteler: string[]) => {
  const klasor = veritabaniKlasoru(ortam);
  const aglar = [...new Set(siteler)].sort().map((kodAdi) => siteAgi(ortam, kodAdi));
  return {
    name: `altyapi-veritabani-${ortam}`,
    services: {
      veritabani: {
        image: postgresGoruntusu,
        container_name: veritabaniKutusu(ortam),
        ...kaliciKutu,
        user: `${postgresKullanicisi}:${postgresKullanicisi}`,
        command: ["postgres", "-c", "hba_file=/etc/postgresql/pg_hba.conf"],
        environment: { POSTGRES_PASSWORD_FILE: `/run/secrets/${yoneticiDosyasiAdi}` },
        secrets: [{ source: "yonetici", target: yoneticiDosyasiAdi }],
        cap_drop: ["ALL"],
        cap_add: [] as string[],
        security_opt: ["no-new-privileges:true"],
        read_only: true,
        tmpfs: ["/var/run/postgresql", "/tmp"],
        volumes: [`${klasor}/veri:/var/lib/postgresql`, `${klasor}/ayar:/etc/postgresql:ro`],
        healthcheck: {
          test: ["CMD", "pg_isready", "-U", "postgres"],
          interval: "10s",
          timeout: "5s",
          retries: 5,
          start_period: "60s",
          start_interval: "1s",
        },
        // Site yoksa Docker'ın kendi ağı kullanılır; site varsa yalnız sitelerin ağları.
        ...(aglar.length > 0
          ? { networks: Object.fromEntries(aglar.map((ag) => [ag, { aliases: ["veritabani"] }])) }
          : {}),
      },
    },
    secrets: { yonetici: { file: yoneticiDosyasi(ortam) } },
    ...(aglar.length > 0
      ? { networks: Object.fromEntries(aglar.map((ag) => [ag, { name: ag }])) }
      : {}),
  };
};

// --- Sunucuda çalışan betikler (değer taşımaz) ---

const kabukKodAdi = (kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  return kodAdi;
};

// Ortamdaki sitelerin listesi: gizli bilgi klasörü olan siteler. Çıktı her satırda bir kod adı.
// Klasör yoksa liste boştur; okunamazsa komut hata verir (boş liste veritabanını bütün
// sitelerin ağlarından koparırdı).
export const siteListesiKomutu = (ortam: Ortam): string =>
  `if sudo test -d ${gizliKok}/${ortam}; then sudo find ${gizliKok}/${ortam} -mindepth 1 -maxdepth 1 -type d -printf '%f\\n'; fi`;

export const siteListesiniOku = (ipv4: string, ortam: Ortam): string[] => {
  const sonuc = sshKomutu(ipv4, siteListesiKomutu(ortam));
  if (sonuc.status !== 0) throw new Error(`Site listesi okunamadı: ${sonuc.stderr.trim()}`);
  return sonuc.stdout
    .split("\n")
    .map((satir) => satir.trim())
    .filter((ad) => ad && ad !== yoneticiKlasoruAdi && !ad.startsWith("."))
    .filter(kodAdiGecerli);
};

// Veritabanı kutusunu kurar ya da tanıma göre günceller; yönetici şifresi yoksa üretir.
// Tanım değişirse (ör. yeni sitenin ağı) kutu yeniden kurulur ve birkaç saniye kapalı kalır.
export const kurmaBetigi = (ortam: Ortam, siteler: string[]): string => {
  const klasor = veritabaniKlasoru(ortam);
  const yonetici = yoneticiDosyasi(ortam);
  const yoneticiKlasoru = `${gizliKok}/${ortam}/${yoneticiKlasoruAdi}`;
  const u = postgresKullanicisi;
  const dosyalar = {
    "compose.json": `${JSON.stringify(veritabaniTanimi(ortam, siteler), null, 2)}\n`,
    "ayar/pg_hba.conf": pgHba(),
  };
  const yazma = Object.entries(dosyalar).map(([yol, icerik]) => {
    if (icerik.includes("VERITABANI_DOSYA_SONU"))
      throw new Error(`${yol} ayrılmış satır içeriyor.`);
    return `sudo tee "$k/${yol}.yeni" >/dev/null <<'VERITABANI_DOSYA_SONU'\n${icerik}VERITABANI_DOSYA_SONU\nsudo chmod 0644 "$k/${yol}.yeni"\nsudo mv -f "$k/${yol}.yeni" "$k/${yol}"`;
  });
  return `set -eu
k=${klasor}
sudo install -d -m 0755 -o root -g root /srv/altyapi /srv/altyapi/veritabani "$k" "$k/ayar"
sudo install -d -m 0700 -o ${u} -g ${u} "$k/veri"
sudo install -d -m 0700 -o root -g root ${gizliKok} ${gizliKok}/${ortam} ${yoneticiKlasoru}
# Yönetici şifresi yalnız yoksa üretilir; değer kök kabuğunda kalır, ekrana basılmaz.
if ! sudo test -s ${yonetici}; then
  sudo sh -c 'umask 077 && openssl rand -hex 32 > ${yonetici}.yeni && chown ${u}:${u} ${yonetici}.yeni && chmod 0400 ${yonetici}.yeni && mv -f ${yonetici}.yeni ${yonetici}'
  echo "üretildi    yönetici şifresi (${ortam})"
fi
sudo chown ${u}:${u} ${yonetici}
sudo chmod 0400 ${yonetici}
${yazma.join("\n")}
h=$(mktemp)
trap 'rm -f "$h"' EXIT
docker compose -f "$k/compose.json" up -d --wait --remove-orphans --quiet-pull </dev/null >/dev/null 2>"$h" || { echo "HATA veritabanı kutusu açılamadı:" >&2; tail -5 "$h" >&2; docker logs --tail 5 ${veritabaniKutusu(ortam)} >&2 || true; exit 1; }
echo veritabani=hazir
`;
};

// Sitenin veritabanını ve kullanıcısını açar ya da şifresini sitenin gizli bilgi dosyasındaki
// değere eşitler. Şifre kök kabuğunun değişkeninde kalır; psql'e girdiden gider.
export const siteAcmaBetigi = (ortam: Ortam, kodAdi: string): string => {
  const ad = siteVeritabaniAdi(kabukKodAdi(kodAdi));
  const dosya = `${gizliKlasor(ortam, kodAdi)}/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  const [on, son] = sablonParcalari("VERITABANI_ADRESI", kodAdi);
  const sql = veritabaniAcmaBetigi();
  if (sql.includes("VERITABANI_SQL_SONU")) throw new Error("SQL betiği ayrılmış satır içeriyor.");
  return `set -eu
sudo bash -s <<'KOK_SONU'
set -eu
f=${dosya}
[ -s "$f" ] || { echo "HATA ${ortam}/${kodAdi} gizli bilgisi yok. Önce: pnpm sunucu-gizli" >&2; exit 1; }
d=$(cat "$f")
# Değer şablona uymalı: ${on}<64 hane>${son}
case "$d" in '${on}'*'${son}') ;; *) echo "HATA ${ortam}/${kodAdi} gizli bilgisi beklenen biçimde değil" >&2; exit 1 ;; esac
s=\${d#'${on}'}; s=\${s%'${son}'}
# Değerin bütünü 64 küçük onaltılık hane olmalı (satır sonu da kabul edilmez): psql'e giden
# satıra başka bir şey karışamaz.
[[ "$s" =~ ^[0-9a-f]{64}$ ]] || { echo "HATA ${ortam}/${kodAdi} şifresi beklenen biçimde değil" >&2; exit 1; }
# psql'in hata çıktısı değeri taşıyan satırlardan arındırılarak gösterilir.
e=$(mktemp)
trap 'rm -f "$e"' EXIT
if ! { printf '\\\\set sifre %s\\n' "'$s'"; cat <<'VERITABANI_SQL_SONU'
${sql}
VERITABANI_SQL_SONU
} | docker exec -i ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -q -v ad=${ad} -f - >/dev/null 2>"$e"; then
  echo "HATA ${ortam}/${ad} veritabanı açılamadı:" >&2
  grep -vF -- "$s" "$e" | tail -5 >&2 || true
  exit 1
fi
echo "açıldı      ${ortam}/${ad}"
KOK_SONU
`;
};

// Sitenin veritabanına değişiklikleri uygulayan geçici kutu. Çıktı: "guncellendi <ad> yeni=N toplam=M".
export const guncellemeBetigi = (
  ortam: Ortam,
  kodAdi: string,
  siteNumarasi: number,
  etiket: string,
): string => {
  const kullanici = kutuKullanicisi(ortam, siteNumarasi);
  const dosya = `${gizliKlasor(ortam, kabukKodAdi(kodAdi))}/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  const ic = `/run/secrets/${gizliBilgiler.VERITABANI_ADRESI.dosya}`;
  return `set -eu
docker run --rm --network ${siteAgi(ortam, kodAdi)} --user ${kullanici}:${kullanici} --read-only --cap-drop ALL --security-opt no-new-privileges:true -v ${dosya}:${ic}:ro -e VERITABANI_ADRESI_DOSYASI=${ic} ${etiket} node veritabani/guncelle.mjs ${kodAdi}
`;
};

// --- Görüntünün sunucuya aktarılması ---

const goruntuKimligi = (cikti: string): string => cikti.trim().split("\n")[0]?.trim() ?? "";

// Çekirdeğin görüntüsü bilgisayarda denetlenir ve sunucuda aynı görüntü yoksa aktarılır.
// Ayrı bir görüntü deposu kullanılmaz (karar 0034).
export const goruntuyuGonder = (ipv4: string, surum: string): string => {
  const etiket = `${goruntuAdi}:${surum}`;
  const yerel = spawnSync("docker", ["image", "inspect", "-f", "{{.Id}}", etiket], {
    encoding: "utf8",
  });
  if (yerel.status !== 0) {
    throw new Error(`${etiket} görüntüsü bu bilgisayarda yok. Önce: pnpm cekirdek-goruntusu`);
  }
  const hatalar = goruntuyuDenetle(etiket);
  if (hatalar.length > 0)
    throw new Error(`${etiket} denetimden geçmedi:\n  ${hatalar.join("\n  ")}`);
  const yerelKimlik = goruntuKimligi(yerel.stdout);
  const uzak = sshKomutu(ipv4, `docker image inspect -f '{{.Id}}' ${etiket} 2>/dev/null || true`);
  if (goruntuKimligi(uzak.stdout) === yerelKimlik) return etiket;
  const ssh = [
    "ssh",
    ...sshSecenekleri,
    "-i",
    girisAnahtari,
    "-o",
    "IdentitiesOnly=yes",
    `${sunucuTanimi.kullanici}@${ipv4}`,
    "docker load -q",
  ];
  const aktarim = spawnSync("sh", ["-c", 'docker save "$0" | "$@"', etiket, ...ssh], {
    encoding: "utf8",
    timeout: 900_000,
  });
  if (aktarim.status !== 0)
    throw new Error(`Görüntü sunucuya aktarılamadı: ${aktarim.stderr.trim()}`);
  const sonra = sshKomutu(ipv4, `docker image inspect -f '{{.Id}}' ${etiket}`);
  if (goruntuKimligi(sonra.stdout) !== yerelKimlik) {
    throw new Error(`Sunucudaki ${etiket} bilgisayardakiyle aynı değil (kimlik farklı).`);
  }
  return etiket;
};

// --- Bütün adımlar ---

const sunucudaCalistir = (ipv4: string, betik: string, sure = 300_000): string => {
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik, sure });
  if (sonuc.status !== 0) throw new Error(sonuc.stderr.trim() || "sunucudaki betik hatayla bitti");
  return sonuc.stdout;
};

// Sitenin bir ortamdaki veritabanını hazırlar; her adım tekrar çalıştırılabilir:
// gizli bilgi (yoksa üretilir), görüntü, veritabanı kutusu, sitenin veritabanı ve kullanıcısı,
// değişiklikler. Dönen değer: uygulanan yeni değişiklik sayısı ve toplam.
export const siteVeritabaniniHazirla = (
  ipv4: string,
  ortam: Ortam,
  site: { kodAdi: string; numara: number; surum: string },
  yaz: (satir: string) => void = () => {},
): { yeni: number; toplam: number } => {
  for (const satir of sunucudaCalistir(ipv4, uretmeBetigi(ortam, site.kodAdi, site.numara)).split(
    "\n",
  )) {
    if (satir.trim()) yaz(satir);
  }
  const etiket = goruntuyuGonder(ipv4, site.surum);
  yaz(`hazır       ${etiket} sunucuda`);
  veritabaniKutusunuKur(ipv4, ortam, yaz);
  yaz(sunucudaCalistir(ipv4, siteAcmaBetigi(ortam, site.kodAdi)).trim());
  const cikti = sunucudaCalistir(ipv4, guncellemeBetigi(ortam, site.kodAdi, site.numara, etiket));
  const sayilar = cikti.match(/guncellendi \S+ yeni=(\d+) toplam=(\d+)/);
  if (!sayilar) throw new Error(`Değişiklikler uygulanamadı: ${cikti.trim()}`);
  return { yeni: Number(sayilar[1]), toplam: Number(sayilar[2]) };
};

// Gizli bilgi yenilenince veritabanı kullanıcısının şifresi aynı değere eşitlenir
// (sunucu-gizli.mts). Ortamda veritabanı kutusu hiç yoksa eşitlenecek şifre yoktur. Kutu var ama
// çalışmıyorsa ya da durumu okunamıyorsa hatadır: sonra açılan kutuda eski şifre geçerli kalırdı.
export const sifreyiEsitle = (ipv4: string, ortam: Ortam, kodAdi: string): boolean => {
  const kutu = veritabaniKutusu(ortam);
  const durum = sshKomutu(
    ipv4,
    `if docker inspect ${kutu} >/dev/null 2>&1; then docker inspect -f '{{.State.Running}}' ${kutu}; else echo yok; fi`,
  );
  const deger = durum.stdout.trim();
  if (durum.status === 0 && deger === "yok") return false;
  if (durum.status !== 0 || deger !== "true") {
    throw new Error(
      `${kutu} çalışmıyor (${deger || durum.stderr.trim()}), şifre eşitlenmedi. Kutu açılınca: pnpm sunucu-veritabani <site klasörü> ${ortam}`,
    );
  }
  sunucudaCalistir(ipv4, siteAcmaBetigi(ortam, kodAdi));
  return true;
};

// Veritabanı kutusunu sunucudaki site listesine göre kurar.
export const veritabaniKutusunuKur = (
  ipv4: string,
  ortam: Ortam,
  yaz: (satir: string) => void = () => {},
): void => {
  const cikti = sunucudaCalistir(ipv4, kurmaBetigi(ortam, siteListesiniOku(ipv4, ortam)));
  if (!cikti.includes("veritabani=hazir"))
    throw new Error(`Veritabanı kutusu kurulamadı: ${cikti}`);
  for (const satir of cikti.split("\n"))
    if (satir.trim() && satir !== "veritabani=hazir") yaz(satir);
  yaz(`hazır       ${veritabaniKutusu(ortam)}`);
};

// --- Denetim ---

// Sunucudaki bağlantı kuralı dosyası projedekiyle aynı olmalı: sha256sum çıktısının ilk alanı.
export const pgHbaOzeti = (): string => createHash("sha256").update(pgHba()).digest("hex");

// Veritabanı kutusu yalnız o ortamdaki sitelerin ağlarına bağlı olmalı (ortak ya da başka ortamın
// ağına bağlıysa siteler arasında yol açılırdı). Girdi: kutunun ağ adları.
export const agHatalari = (aglar: string[], ortam: Ortam): string[] =>
  aglar
    .filter(Boolean)
    .filter((ag) => {
      const kodAdi = ag.startsWith(`site-${ortam}-`) ? ag.slice(`site-${ortam}-`.length) : "";
      return !kodAdiGecerli(kodAdi);
    })
    .map((ag) => `beklenmeyen ağ ${ag}`);

// docker inspect çıktısı: {{json .HostConfig.PortBindings}}. Port açılmamış olmalı.
export const portuKapali = (cikti: string): boolean => ["{}", "null"].includes(cikti.trim());
