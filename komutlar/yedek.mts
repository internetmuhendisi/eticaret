// Sitelerin yedeği (kart 0024, karar 0037). Komutlar (yedek-kur, yedek-al, yedek-prova,
// yedek-geri-yukle, yedek-kaydi, yedek-denemesi, sunucu-denetle) bu dosyayı kullanır.
//
// - Sunucudaki gece işi sunucu/yedek/gece.sh'tır; ayarı sunucu/yedek/ayar.json'dan üretilir.
// - Her sitenin her ortamda kendi anahtar çifti vardır. Açık anahtar ayarda durur (gizli değildir).
//   Açma anahtarı yalnız bu bilgisayardadır (~/.altyapi/yedek-anahtarlari). Geri yüklemede ssh'ın
//   girdisinden gider, kök kabuğunun değişkeninde kalır, diske ve komut satırına yazılmaz.
// - Depo anahtarı .env'den okunur, sunucuda gizli bilgi klasöründe rclone ayarı olarak durur.
// - Yedeğin içeriği ekrana basılmaz; karşılaştırma yalnız satır sayısı ve özetle yapılır.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import { gizliKok, type Ortam, yedekDeposuGizliBilgisi } from "./gizli-bilgi.mts";
import { kodAdiGecerli, siteKutusuAdi, yayindakiSiteleriOku, yayinKilidiyle } from "./on-kapi.mts";
import { kok, sshKomutu, sunucuTanimi } from "./sunucu.mts";
import {
  guncellemeBetigi,
  postgresGoruntusu,
  sunucudaCalistir,
  veritabaniKutusu,
} from "./sunucu-veritabani.mts";
import { etkinKutuyuYenidenBaslat, gizliyiYenileVeEsitle } from "./yayin.mts";

// --- Ayar (sunucu/yedek/ayar.json) ---

export type SiteYedegi = { acik_anahtar: string; saklama_gun: number };
export type YedekAyari = {
  depo: { konum: string; kova: string };
  rclone_goruntusu: string;
  varsayilan_saklama_gun: number;
  siteler: Partial<Record<Ortam, Record<string, SiteYedegi>>>;
};

export const yedekKlasoru = join(kok, "sunucu", "yedek");
export const ayarDosyasi = join(yedekKlasoru, "ayar.json");
export const yedekKoku = "/srv/altyapi/yedek";
const gunSaniye = 86_400;

// Hetzner'in Almanya'daki Object Storage konumları (karar 0009, 0037). Helsinki yoktur.
const almanKonumlar = ["nbg1", "fsn1"];

// Ayarın kuralları: yedek canlı sunucudan farklı bir Alman veri merkezinde, süre tam gün.
export const yedekAyariHatalari = (ayar: YedekAyari, canliKonum: string): string[] => {
  const hatalar: string[] = [];
  if (!almanKonumlar.includes(ayar.depo.konum))
    hatalar.push(`${ayar.depo.konum}: depo Almanya'da değil`);
  if (ayar.depo.konum === canliKonum)
    hatalar.push(`${ayar.depo.konum}: depo canlı sunucuyla aynı veri merkezinde`);
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(ayar.depo.kova)) hatalar.push("geçersiz kova adı");
  if (!/^rclone\/rclone:\d+\.\d+\.\d+$/.test(ayar.rclone_goruntusu))
    hatalar.push("rclone görüntüsünün sürümü sabit değil");
  const gunGecerli = (gun: unknown) => Number.isInteger(gun) && (gun as number) >= 1;
  if (!gunGecerli(ayar.varsayilan_saklama_gun)) hatalar.push("geçersiz varsayılan saklama süresi");
  for (const [ortam, siteler] of Object.entries(ayar.siteler)) {
    for (const [kodAdi, site] of Object.entries(siteler ?? {})) {
      const ad = `${ortam}/${kodAdi}`;
      if (!kodAdiGecerli(kodAdi)) hatalar.push(`${ad}: geçersiz kod adı`);
      if (!/^age1[0-9a-z]{58}$/.test(site.acik_anahtar))
        hatalar.push(`${ad}: geçersiz açık anahtar`);
      if (!gunGecerli(site.saklama_gun)) hatalar.push(`${ad}: geçersiz saklama süresi`);
    }
  }
  return hatalar;
};

export const ayariOku = (): YedekAyari => {
  const ayar = JSON.parse(readFileSync(ayarDosyasi, "utf8")) as YedekAyari;
  const hatalar = yedekAyariHatalari(ayar, sunucuTanimi.konum);
  if (hatalar.length > 0)
    throw new Error(`sunucu/yedek/ayar.json bozuk:\n  ${hatalar.join("\n  ")}`);
  return ayar;
};

export const ayariYaz = (ayar: YedekAyari): void => {
  writeFileSync(ayarDosyasi, `${JSON.stringify(ayar, null, 2)}\n`);
};

// --- Anahtarlar ---

export const anahtarKlasoru = join(homedir(), ".altyapi", "yedek-anahtarlari");
export const anahtarDosyasi = (ortam: Ortam, kodAdi: string): string =>
  join(anahtarKlasoru, ortam, `${kodAdi}.txt`);

export const anahtarCiftiUret = (): { acik: string; acma: string; metin: string } => {
  // Anahtar bu bilgisayarda, geçici bir kutuda üretilir; sunucuya hiç uğramaz.
  const sonuc = spawnSync(
    "docker",
    ["run", "--rm", "alpine:3.24", "sh", "-c", "apk add -q age >/dev/null && age-keygen"],
    { encoding: "utf8", timeout: 180_000 },
  );
  const metin = sonuc.stdout;
  const acik = metin.match(/^# public key: (age1[0-9a-z]{58})$/m)?.[1];
  const acma = metin.match(/^AGE-SECRET-KEY-1[0-9A-Z]{58}$/m)?.[0];
  if (sonuc.status !== 0 || !acik || !acma) throw new Error("Yedek anahtarı üretilemedi.");
  return { acik, acma, metin };
};

// Var olan anahtar hiçbir zaman üzerine yazılmaz: eski yedekler onunla açılır.
export const anahtarDosyasiniYaz = (ortam: Ortam, kodAdi: string, metin: string): void => {
  mkdirSync(join(anahtarKlasoru, ortam), { recursive: true, mode: 0o700 });
  writeFileSync(anahtarDosyasi(ortam, kodAdi), metin, { mode: 0o600, flag: "wx" });
};

export const acikAnahtariOku = (ortam: Ortam, kodAdi: string): string | undefined =>
  existsSync(anahtarDosyasi(ortam, kodAdi))
    ? readFileSync(anahtarDosyasi(ortam, kodAdi), "utf8").match(
        /^# public key: (age1[0-9a-z]{58})$/m,
      )?.[1]
    : undefined;

export const acmaAnahtariniOku = (ortam: Ortam, kodAdi: string): string => {
  const yol = anahtarDosyasi(ortam, kodAdi);
  if (!existsSync(yol)) {
    throw new Error(
      `${yol} yok. Bu yedek ancak o dosyayla açılır; şifre yöneticinizdeki kopyayı oraya koyun.`,
    );
  }
  const acma = readFileSync(yol, "utf8").match(/^AGE-SECRET-KEY-1[0-9A-Z]{58}$/m)?.[0];
  if (!acma) throw new Error(`${yol} beklenen biçimde değil.`);
  return acma;
};

// --- Sunucuya kurulum ---

const dosyaOzeti = (ad: string): string =>
  createHash("sha256")
    .update(readFileSync(join(yedekKlasoru, ad)))
    .digest("hex");

export const kuruluDosyalar = ["gece.sh", "ortak.sh"] as const;
export const zamanlayiciDosyalari = ["altyapi-yedek.service", "altyapi-yedek.timer"] as const;

export const siteBilgisiSatiri = (acik: string, saklamaSn: number, marjSn: number): string => {
  if (!/^age1[0-9a-z]{58}$/.test(acik)) throw new Error("Geçersiz açık anahtar.");
  return `${acik} ${saklamaSn} ${marjSn}`;
};

export const depoAyariMetni = (konum: string, erisim: string, gizli: string): string => {
  // Değerler heredoc içine girer: yalnız bu karakterler kabul edilir.
  if (!/^[A-Za-z0-9+/=_-]+$/.test(erisim) || !/^[A-Za-z0-9+/=_-]+$/.test(gizli)) {
    throw new Error("Depo anahtarı beklenen biçimde değil.");
  }
  return `[depo]
type = s3
provider = Hetzner
endpoint = ${konum}.your-objectstorage.com
region = ${konum}
acl = private
no_check_bucket = true
access_key_id = ${erisim}
secret_access_key = ${gizli}
`;
};

export const depoAnahtarlari = (): { erisim: string; gizli: string } => {
  const env = parseEnv(readFileSync(join(kok, ".env"), "utf8")) as Record<
    string,
    string | undefined
  >;
  const erisim = env["YEDEK_DEPO_ERISIM_ANAHTARI"];
  const gizli = env["YEDEK_DEPO_GIZLI_ANAHTARI"];
  if (!erisim || !gizli) throw new Error(".env'de YEDEK_DEPO_* değerleri yok (.env.example).");
  return { erisim, gizli };
};

const heredoc = (
  hedef: string,
  icerik: string,
  izin: string,
  sinir = "YEDEK_DOSYA_SONU",
): string => {
  if (icerik.includes(sinir)) throw new Error(`${hedef} ayrılmış satır içeriyor.`);
  const son = icerik.endsWith("\n") ? "" : "\n";
  return `cat > "${hedef}.yeni" <<'${sinir}'\n${icerik}${son}${sinir}\nchmod ${izin} "${hedef}.yeni"\nmv -f "${hedef}.yeni" "${hedef}"`;
};

// Kurulumun bütünü kök kabuğunda çalışır; betik ssh'ın girdisinden gider, değerler komut satırına
// çıkmaz. Ayarda olmayan site bilgisi silinir.
export const kurmaBetigi = (ayar: YedekAyari, ortam: Ortam, depoAyari: string): string => {
  const klasor = `${gizliKok}/${ortam}/${yedekDeposuGizliBilgisi.klasor}`;
  const siteler = Object.entries(ayar.siteler[ortam] ?? {});
  return `set -eu
sudo bash -s <<'KOK_SONU'
set -euo pipefail
umask 077
command -v age >/dev/null || { apt-get update -qq >/dev/null; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq age >/dev/null; }
install -d -m 0755 -o root -g root /srv/altyapi
install -d -m 0700 -o root -g root ${yedekKoku} ${yedekKoku}/gecici ${yedekKoku}/siteler ${yedekKoku}/siteler/${ortam}
install -d -m 0700 -o root -g root ${gizliKok} ${gizliKok}/${ortam} ${klasor}
${heredoc(`${klasor}/${yedekDeposuGizliBilgisi.dosya}`, depoAyari, "0400")}
${heredoc(`${yedekKoku}/ayar`, `KOVA=${ayar.depo.kova}\nRCLONE_GORUNTUSU=${ayar.rclone_goruntusu}\n`, "0400")}
${kuruluDosyalar.map((ad) => heredoc(`${yedekKoku}/${ad}`, readFileSync(join(yedekKlasoru, ad), "utf8"), ad === "gece.sh" ? "0700" : "0400")).join("\n")}
find ${yedekKoku}/siteler/${ortam} -mindepth 1 -maxdepth 1 -type f -delete
${siteler.map(([kodAdi, site]) => heredoc(`${yedekKoku}/siteler/${ortam}/${kodAdi}`, siteBilgisiSatiri(site.acik_anahtar, site.saklama_gun * gunSaniye, gunSaniye), "0400")).join("\n")}
${zamanlayiciDosyalari.map((ad) => heredoc(`/etc/systemd/system/${ad}`, readFileSync(join(yedekKlasoru, ad), "utf8"), "0644")).join("\n")}
systemctl daemon-reload
systemctl enable --now altyapi-yedek.timer >/dev/null 2>&1
docker pull -q ${ayar.rclone_goruntusu} >/dev/null
echo yedek=kuruldu
KOK_SONU
`;
};

// Kök kabuğunda ortak parçayla çalışan betik. Gövde girdiden gider; anahtar komut satırına çıkmaz.
export const kokBetigi = (govde: string): string => {
  if (govde.includes("KOK_SONU")) throw new Error("Betik ayrılmış satır içeriyor.");
  return `set -eu
sudo bash -s <<'KOK_SONU'
set -euo pipefail
umask 077
. ${yedekKoku}/ortak.sh
${govde}
KOK_SONU
`;
};

export const yedekAlmaBetigi = (ortam: Ortam, kodAdi: string, tur: string): string =>
  `set -eu\nsudo ${yedekKoku}/gece.sh ${ortam} ${kodAdi} ${tur}\n`;

export const sonYedegiBulBetigi = (ortam: Ortam, kodAdi: string): string =>
  kokBetigi(`rc ${ortam} lsf --files-only "depo:$KOVA/${ortam}/${kodAdi}" | sort | tail -1`);

const dosyaAdiGecerli = (ad: string): boolean => /^\d{8}T\d{6}Z(-[a-z]+)?\.dump\.age$/.test(ad);

// --- Karşılaştırma ---

const ozetSql = `\\set ON_ERROR_STOP on
SELECT format('SELECT %L, count(*), md5(coalesce(string_agg(t::text, %L ORDER BY t::text), %L)) FROM %I.%I t', table_schema || '.' || table_name, '|', '', table_schema, table_name)
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'
ORDER BY 1 \\gexec`;

// Veritabanının özet satırları: her tablo için ad, satır sayısı, içerik özeti ve bir de düzen özeti.
const ozetKomutu = (kutu: string, veritabani: string, onek: string): string => `
printf '${onek} sema %s\\n' "$(docker exec ${kutu} pg_dump -U postgres -s --no-owner --no-acl -d ${veritabani} </dev/null | grep -v -E '^.(un)?restrict' | sha256sum | cut -d' ' -f1)"
docker exec -i ${kutu} psql -U postgres -d ${veritabani} -At -f - <<'OZET_SONU' | sed 's/^/${onek} tablo /'
${ozetSql}
OZET_SONU
`;

export type Ozet = { sema: string; tablolar: Map<string, { satir: number; icerik: string }> };

export const ozetiOku = (cikti: string, onek: string): Ozet => {
  const ozet: Ozet = { sema: "", tablolar: new Map() };
  for (const satir of cikti.split("\n")) {
    if (satir.startsWith(`${onek} sema `)) ozet.sema = satir.slice(`${onek} sema `.length).trim();
    if (satir.startsWith(`${onek} tablo `)) {
      const [ad = "", sayi = "", icerik = ""] = satir.slice(`${onek} tablo `.length).split("|");
      ozet.tablolar.set(ad, { satir: Number(sayi), icerik });
    }
  }
  return ozet;
};

// Fark yoksa boş liste. Boş özet (hiç tablo ya da düzen yok) eşit sayılmaz.
export const ozetFarklari = (kaynak: Ozet, yedek: Ozet): string[] => {
  const farklar: string[] = [];
  if (kaynak.tablolar.size === 0) farklar.push("kaynakta tablo yok");
  if (yedek.tablolar.size === 0) farklar.push("yedekte tablo yok");
  if (!kaynak.sema || kaynak.sema !== yedek.sema) farklar.push("tablo düzeni farklı");
  for (const [ad, deger] of kaynak.tablolar) {
    const oteki = yedek.tablolar.get(ad);
    if (!oteki) farklar.push(`${ad}: yedekte yok`);
    else if (oteki.satir !== deger.satir)
      farklar.push(`${ad}: ${deger.satir} satır, yedekte ${oteki.satir}`);
    else if (oteki.icerik !== deger.icerik) farklar.push(`${ad}: içerik farklı`);
  }
  for (const ad of yedek.tablolar.keys())
    if (!kaynak.tablolar.has(ad)) farklar.push(`${ad}: yalnız yedekte var`);
  return farklar;
};

// --- Prova: yedek ayrı, geçici, ağsız bir veritabanı kutusunda açılır, canlıya yazılmaz ---

const yedekAcmaBoru = (ortam: Ortam, kodAdi: string, dosya: string): string =>
  `rc ${ortam} cat "depo:$KOVA/${ortam}/${kodAdi}/${dosya}" | age -d -i <(printf '%s\\n' "$anahtar")`;

const acmaAnahtariSatiri = (anahtar: string): string => {
  if (!/^AGE-SECRET-KEY-1[0-9A-Z]{58}$/.test(anahtar)) throw new Error("Açma anahtarı geçersiz.");
  return `anahtar='${anahtar}'`;
};

export const provaBetigi = (
  ortam: Ortam,
  kodAdi: string,
  dosya: string,
  anahtar: string,
): string => {
  if (!dosyaAdiGecerli(dosya)) throw new Error(`Geçersiz yedek dosyası: ${dosya}`);
  const kutu = '"$prova"';
  return kokBetigi(`${acmaAnahtariSatiri(anahtar)}
prova="yedek-prova-$$"
trap 'docker rm -f "$prova" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$prova" --network none --user 70:70 --read-only --cap-drop ALL --security-opt no-new-privileges:true --tmpfs /var/lib/postgresql:uid=70,gid=70,mode=0700 --tmpfs /var/run/postgresql:uid=70,gid=70 --tmpfs /tmp -e POSTGRES_HOST_AUTH_METHOD=trust ${postgresGoruntusu} >/dev/null </dev/null
hazir=hayir
for _ in $(seq 1 90); do
  if docker exec "$prova" pg_isready -q -h 127.0.0.1 -U postgres </dev/null; then hazir=evet; break; fi
  sleep 1
done
[ "$hazir" = evet ] || { echo "geçici veritabanı açılmadı" >&2; exit 1; }
docker exec "$prova" createdb -U postgres prova </dev/null
${yedekAcmaBoru(ortam, kodAdi, dosya)} | docker exec -i "$prova" pg_restore -U postgres --no-owner --no-acl --exit-on-error -d prova
${ozetKomutu(kutu, "prova", "YEDEK")}
${ozetKomutu(veritabaniKutusu(ortam), siteVeritabaniAdi(kodAdi), "CANLI")}`);
};

const kaydaYazBetigi = (
  ortam: Ortam,
  kodAdi: string,
  tur: string,
  sonuc: "basarili" | "basarisiz",
  sebep: string,
  dosya: string,
): string => kokBetigi(`kayit ${ortam} ${kodAdi} ${tur} ${sonuc} "${sebep}" "${dosya}" 0`);

export const provaYap = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  dosya: string,
  anahtar = acmaAnahtariniOku(ortam, kodAdi),
): { farklar: string[]; tablolar: number; satirlar: number } => {
  let cikti: string;
  try {
    cikti = sunucudaCalistir(ipv4, provaBetigi(ortam, kodAdi, dosya, anahtar), 600_000);
  } catch (hata) {
    sunucudaCalistir(ipv4, kaydaYazBetigi(ortam, kodAdi, "prova", "basarisiz", "acilamadi", dosya));
    throw hata;
  }
  const yedek = ozetiOku(cikti, "YEDEK");
  const farklar = ozetFarklari(ozetiOku(cikti, "CANLI"), yedek);
  sunucudaCalistir(
    ipv4,
    kaydaYazBetigi(
      ortam,
      kodAdi,
      "prova",
      farklar.length === 0 ? "basarili" : "basarisiz",
      farklar.length === 0 ? "" : "fark-var",
      dosya,
    ),
  );
  return {
    farklar,
    tablolar: yedek.tablolar.size,
    satirlar: [...yedek.tablolar.values()].reduce((toplam, tablo) => toplam + tablo.satir, 0),
  };
};

// --- Geri yükleme adımları ---

const geciciAd = (ad: string): string => `${ad}__geri`;
const eskiAd = (ad: string): string => `${ad}__eski`;

// Yedek yanına, ayrı bir veritabanına açılır; canlı veritabanına dokunulmaz. Hata olursa ayrı
// veritabanı silinir, site etkilenmez.
export const yanaAcmaBetigi = (
  ortam: Ortam,
  kodAdi: string,
  dosya: string,
  anahtar: string,
): string => {
  if (!dosyaAdiGecerli(dosya)) throw new Error(`Geçersiz yedek dosyası: ${dosya}`);
  const kutu = veritabaniKutusu(ortam);
  const ad = siteVeritabaniAdi(kodAdi);
  const yeni = geciciAd(ad);
  return kokBetigi(`${acmaAnahtariSatiri(anahtar)}
exec 9>"$K/.kilit"
flock -w 3600 9
sil() { docker exec ${kutu} psql -U postgres -d postgres -q -c 'DROP DATABASE IF EXISTS "${yeni}" WITH (FORCE)' </dev/null >/dev/null; }
sil
docker exec ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c 'CREATE DATABASE "${yeni}" OWNER "${ad}"' -c 'REVOKE ALL ON DATABASE "${yeni}" FROM PUBLIC' </dev/null >/dev/null
if ! ${yedekAcmaBoru(ortam, kodAdi, dosya)} | docker exec -i ${kutu} pg_restore -U postgres --no-owner --no-acl --role="${ad}" --exit-on-error -d "${yeni}"; then
  sil
  echo "yedek açılamadı, canlı veritabanına dokunulmadı" >&2
  exit 1
fi
printf 'tablo=%s\\n' "$(docker exec ${kutu} psql -U postgres -d "${yeni}" -Atc "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')" </dev/null)"`);
};

// Veritabanları yer değiştirir. Site kutusu bu sırada kapalıdır.
export const degistirmeBetigi = (ortam: Ortam, kodAdi: string, kutuAdi?: string): string => {
  const kutu = veritabaniKutusu(ortam);
  const ad = siteVeritabaniAdi(kodAdi);
  return kokBetigi(`exec 9>"$K/.kilit"
flock -w 3600 9
${kutuAdi ? `docker stop --timeout 20 ${kutuAdi} >/dev/null` : ""}
docker exec -i ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 >/dev/null <<'DEGISTIR_SONU'
DROP DATABASE IF EXISTS "${eskiAd(ad)}" WITH (FORCE);
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${ad}' AND pid <> pg_backend_pid();
ALTER DATABASE "${ad}" RENAME TO "${eskiAd(ad)}";
ALTER DATABASE "${geciciAd(ad)}" RENAME TO "${ad}";
DEGISTIR_SONU
echo degisti`);
};

// Bir şey ters giderse canlı veritabanı yerine döner.
export const geriAlmaBetigi = (ortam: Ortam, kodAdi: string, kutuAdi?: string): string => {
  const kutu = veritabaniKutusu(ortam);
  const ad = siteVeritabaniAdi(kodAdi);
  return kokBetigi(`${kutuAdi ? `docker stop --timeout 20 ${kutuAdi} >/dev/null 2>&1 || true` : ""}
docker exec -i ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 >/dev/null <<'GERI_AL_SONU'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('${ad}', '${eskiAd(ad)}') AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${ad}" WITH (FORCE);
ALTER DATABASE "${eskiAd(ad)}" RENAME TO "${ad}";
GERI_AL_SONU
echo geri-alindi`);
};

export const eskiyiSilmeBetigi = (ortam: Ortam, kodAdi: string): string =>
  kokBetigi(
    `docker exec ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "${eskiAd(siteVeritabaniAdi(kodAdi))}" WITH (FORCE)' </dev/null >/dev/null`,
  );

export const saglikBeklemeBetigi = (kutuAdi: string): string => `set -eu
for _ in $(seq 1 60); do
  d=$(docker inspect -f '{{.State.Health.Status}}' ${kutuAdi})
  if [ "$d" = healthy ]; then echo saglikli; exit 0; fi
  sleep 2
done
echo "${kutuAdi} sağlıklı açılmadı" >&2
exit 1
`;

export const yayinKutusuGoruntusu = (ipv4: string, kutuAdi: string): string => {
  const sonuc = sshKomutu(ipv4, `docker inspect -f '{{.Config.Image}}' ${kutuAdi}`);
  if (sonuc.status !== 0) throw new Error(`${kutuAdi} okunamadı: ${sonuc.stderr.trim()}`);
  return sonuc.stdout.trim();
};

export const etkinKutuAdi = (ipv4: string, ortam: Ortam, kodAdi: string): string | undefined => {
  const no = yayindakiSiteleriOku(ipv4)[kodAdi];
  return no === undefined ? undefined : siteKutusuAdi(ortam, kodAdi, no);
};

// Bütün akış yayın kilidinin içindedir: önce o anki durumun yedeği, sonra yana açma; buraya kadar
// site hiç etkilenmez. Yer değiştirmeden sonra bir adım tutmazsa canlı veritabanı yerine döner.
// Şifre yenilenir (karar 0031); yedek etkin yayından eskiyse eksik değişiklikler uygulanır.
export const geriYukle = (
  ipv4: string,
  ortam: Ortam,
  site: { kodAdi: string; numara: number },
  dosya: string,
  anahtar = acmaAnahtariniOku(ortam, site.kodAdi),
  yaz: (satir: string) => void = () => {},
): Promise<void> =>
  yayinKilidiyle(ipv4, () => {
    const { kodAdi, numara } = site;
    const kaydet = (sonuc: "basarili" | "basarisiz", sebep: string) =>
      sunucudaCalistir(ipv4, kaydaYazBetigi(ortam, kodAdi, "geri-yukleme", sonuc, sebep, dosya));
    try {
      yaz(sunucudaCalistir(ipv4, yedekAlmaBetigi(ortam, kodAdi, "geri-yukleme-oncesi")).trim());
      const acilan = sunucudaCalistir(ipv4, yanaAcmaBetigi(ortam, kodAdi, dosya, anahtar), 600_000);
      if (!/tablo=[1-9]/.test(acilan))
        throw new Error("Yedekten tablo çıkmadı, siteye dokunulmadı.");
      yaz(`açıldı      ${dosya} yan veritabanında`);
    } catch (hata) {
      kaydet("basarisiz", "site-etkilenmedi");
      throw hata;
    }
    const kutu = etkinKutuAdi(ipv4, ortam, kodAdi);
    sunucudaCalistir(ipv4, degistirmeBetigi(ortam, kodAdi, kutu));
    try {
      gizliyiYenileVeEsitle(ipv4, ortam, kodAdi, numara, yaz);
      if (kutu) {
        const etiket = yayinKutusuGoruntusu(ipv4, kutu);
        yaz(sunucudaCalistir(ipv4, guncellemeBetigi(ortam, kodAdi, numara, etiket)).trim());
        etkinKutuyuYenidenBaslat(ipv4, ortam, kodAdi);
        sunucudaCalistir(ipv4, saglikBeklemeBetigi(kutu), 180_000);
        yaz(`sağlıklı    ${kutu}`);
      }
      sunucudaCalistir(ipv4, eskiyiSilmeBetigi(ortam, kodAdi));
      kaydet("basarili", "");
    } catch (hata) {
      sunucudaCalistir(ipv4, geriAlmaBetigi(ortam, kodAdi, kutu));
      if (kutu) etkinKutuyuYenidenBaslat(ipv4, ortam, kodAdi);
      kaydet("basarisiz", "eski-veritabani-yerinde");
      throw new Error(
        `Geri yükleme tutmadı, eski veritabanı yerine kondu: ${(hata as Error).message}`,
      );
    }
  });

// --- Kayıt ve denetim ---

export type YedekKaydi = {
  zaman: string;
  ortam: string;
  site: string;
  tur: string;
  sonuc: string;
  sebep: string;
  dosya: string;
  boyut: number;
};

export const kayitlariCoz = (metin: string): YedekKaydi[] =>
  metin
    .split("\n")
    .filter(Boolean)
    .map((satir) => JSON.parse(satir) as YedekKaydi);

export const gecerlilikSiniri = 26 * 60 * 60 * 1000;

// Her sitenin son gece yedeği başarılı ve 26 saatten yeni olmalı; son gece işinde site dışı hata
// (anahtarsız veritabanı, kilit) da kırmızıdır. Elle alınan yedek gece işinin yerine geçmez.
export const kayitHatalari = (
  kayitlar: YedekKaydi[],
  siteler: { ortam: string; kodAdi: string }[],
  simdi: number,
): string[] => {
  const hatalar: string[] = [];
  for (const { ortam, kodAdi } of siteler) {
    const gece = kayitlar.filter((k) => k.ortam === ortam && k.site === kodAdi && k.tur === "gece");
    const son = gece.at(-1);
    if (!son) hatalar.push(`${ortam}/${kodAdi}: gece yedeği kaydı yok`);
    else if (son.sonuc !== "basarili")
      hatalar.push(`${ortam}/${kodAdi}: son gece yedeği başarısız (${son.sebep})`);
    else if (simdi - Date.parse(son.zaman) > gecerlilikSiniri)
      hatalar.push(`${ortam}/${kodAdi}: son gece yedeği 26 saatten eski (${son.zaman})`);
  }
  const bilinen = new Set(siteler.map((s) => `${s.ortam}/${s.kodAdi}`));
  for (const k of kayitlar) {
    if (k.sonuc === "basarili" || simdi - Date.parse(k.zaman) > gecerlilikSiniri) continue;
    if (k.tur === "temizlik")
      hatalar.push(`${k.ortam}/${k.site}: temizlik yarım kaldı (${k.sebep})`);
    else if (k.tur === "gece" && !bilinen.has(`${k.ortam}/${k.site}`))
      hatalar.push(`${k.ortam}/${k.site}: ${k.sebep}`);
  }
  return hatalar;
};

export const sitelerDuz = (ayar: YedekAyari): { ortam: Ortam; kodAdi: string }[] =>
  Object.entries(ayar.siteler).flatMap(([ortam, siteler]) =>
    Object.keys(siteler ?? {}).map((kodAdi) => ({ ortam: ortam as Ortam, kodAdi })),
  );

// Depo yalnız ayardaki veri merkezinden görünmeli; başka konumun ucu kovayı bulamamalı.
export const konumOlcmeBetigi = (ortam: Ortam): string =>
  kokBetigi(`for konum in nbg1 fsn1 hel1; do
  if rc ${ortam} lsf --max-depth 1 --s3-endpoint "$konum.your-objectstorage.com" --s3-region "$konum" "depo:$KOVA" >/dev/null 2>&1; then echo "gorunuyor $konum"; else echo "gorunmuyor $konum"; fi
done`);

export const konumHatalari = (cikti: string, konum: string): string[] => {
  const hatalar: string[] = [];
  if (!cikti.includes(`gorunuyor ${konum}`) || cikti.includes(`gorunmuyor ${konum}`))
    hatalar.push(`kova ${konum} ucundan görünmüyor`);
  for (const oteki of ["nbg1", "fsn1", "hel1"].filter((k) => k !== konum)) {
    if (new RegExp(`(^|\\n)gorunuyor ${oteki}`).test(cikti))
      hatalar.push(`kova ${oteki} ucundan da görünüyor`);
  }
  return hatalar;
};

export const yedekOzetKomutu = `sudo sh -c 'systemctl is-enabled altyapi-yedek.timer; systemctl is-active altyapi-yedek.timer; for f in ${kuruluDosyalar.map((ad) => `${yedekKoku}/${ad}`).join(" ")}; do sha256sum "$f" | cut -d" " -f1; done; stat -c "%a %u" ${yedekKoku}; command -v age >/dev/null && echo age-var'`;

export const kurulumHatalari = (cikti: string): string[] => {
  const [etkin, calisan, ...kalan] = cikti.trim().split("\n");
  const hatalar: string[] = [];
  if (etkin !== "enabled") hatalar.push("zamanlayıcı etkin değil");
  if (calisan !== "active") hatalar.push("zamanlayıcı çalışmıyor");
  kuruluDosyalar.forEach((ad, i) => {
    if (kalan[i] !== dosyaOzeti(ad)) hatalar.push(`${ad} projedekiyle aynı değil`);
  });
  if (kalan[kuruluDosyalar.length] !== "700 0")
    hatalar.push("yedek klasörü yalnız köke açık değil");
  if (kalan[kuruluDosyalar.length + 1] !== "age-var") hatalar.push("age kurulu değil");
  return hatalar;
};

// Depo anahtarı ve açma anahtarları kayıtta geçmemeli. Sunucudaki arama yalnız 64 haneli değerleri
// bulur, bunları bulmaz; bu arama bilgisayarda yapılır, değer ekrana basılmaz.
export const kayittaYedekSizintisi = (metin: string, degerler: string[]): string[] => {
  const hatalar: string[] = [];
  if (degerler.some((deger) => deger && metin.includes(deger)))
    hatalar.push("depo anahtarı kayıtlarda geçiyor");
  if (/AGE-SECRET-KEY-1[0-9A-Z]{58}/.test(metin)) hatalar.push("açma anahtarı kayıtlarda geçiyor");
  return hatalar;
};

// Sunucu denetiminin ölçümü (sunucu-denetle.mts).
export const yedekDenetimi = (ipv4: string, simdi = Date.now()): string[] => {
  const ayar = ayariOku();
  const siteler = sitelerDuz(ayar);
  if (siteler.length === 0) return ["ayarda yedeklenen site yok"];
  const kurulum = sshKomutu(ipv4, yedekOzetKomutu);
  const hatalar = kurulumHatalari(kurulum.stdout);
  const kayit = sshKomutu(ipv4, `sudo cat ${yedekKoku}/kayit.jsonl`);
  if (kayit.status !== 0) hatalar.push("yedek kaydı okunamadı");
  else hatalar.push(...kayitHatalari(kayitlariCoz(kayit.stdout), siteler, simdi));
  for (const ortam of new Set(siteler.map((s) => s.ortam))) {
    const konum = sshKomutu(ipv4, "bash -s", { girdi: konumOlcmeBetigi(ortam) });
    if (konum.status !== 0) hatalar.push("deponun yeri ölçülemedi");
    else hatalar.push(...konumHatalari(konum.stdout, ayar.depo.konum));
  }
  return hatalar;
};
