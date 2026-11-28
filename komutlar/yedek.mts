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
import { dosyaTemizligiAyari, kayitliDosyaTurleri } from "../cekirdek/kayitlar/dosya.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import { gizliKok, kutuKullanicisi, type Ortam, yedekDeposuGizliBilgisi } from "./gizli-bilgi.mts";
import { arkaPlanKutuAdi } from "./kutu-kurali.mts";
import {
  kodAdiGecerli,
  siteKutusuAdi,
  yayindakiSiteleriOku,
  yayinKilidiyle,
  yayinOrtami,
} from "./on-kapi.mts";
import { guvenliOturum, ustBilgiKapatmaSql } from "./site-ust-bilgi.mts";
import { kok, sshKomutu, sunucuTanimi } from "./sunucu.mts";
import {
  guncellemeBetigi,
  postgresGoruntusu,
  sifreyiEsitle,
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

// Ayarın kuralları: yedek canlı sunucudan farklı bir Alman veri merkezinde, süre tam gün ve dosyaların kalıcı
// silinme süresinden uzun değil.
export const yedekAyariHatalari = (ayar: YedekAyari, canliKonum: string): string[] => {
  const hatalar: string[] = [];
  if (!almanKonumlar.includes(ayar.depo.konum))
    hatalar.push(`${ayar.depo.konum}: depo Almanya'da değil`);
  if (ayar.depo.konum === canliKonum)
    hatalar.push(`${ayar.depo.konum}: depo canlı sunucuyla aynı veri merkezinde`);
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(ayar.depo.kova)) hatalar.push("geçersiz kova adı");
  if (!/^rclone\/rclone:\d+\.\d+\.\d+$/.test(ayar.rclone_goruntusu))
    hatalar.push("rclone görüntüsünün sürümü sabit değil");
  // Saklama süresi sitenin silinmiş dosyayı diskten silme süresinden uzun olamaz (kart 0093, karar 0207): o süre
  // içindeki bir veritabanı yedeği dosyayı silinmemiş gösterebilir, kopyası depoda durmalıdır.
  const gunGecerli = (gun: unknown) =>
    Number.isInteger(gun) &&
    (gun as number) >= 1 &&
    (gun as number) <= dosyaTemizligiAyari.kaliciSilmeGun;
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
access_key_id = ${erisim}
secret_access_key = ${gizli}
`;
};

export const depoAnahtarlari = (): { erisim: string; gizli: string } => {
  const env = parseEnv(readFileSync(join(kok, ".env"), "utf8")) as Record<
    string,
    string | undefined
  >;
  const { YEDEK_DEPO_ERISIM_ANAHTARI: erisim, YEDEK_DEPO_GIZLI_ANAHTARI: gizli } = env;
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
  `# adim:yedek\nset -eu\nsudo YEDEK_KILIT_SN=${yedekKilitSn} ${yedekKoku}/gece.sh ${ortam} ${kodAdi} ${tur}\n`;

// Sitenin dosyalarının yedeği (kart 0093, karar 0207): yalnız yeni ve kilidi bitmeye yaklaşan dosyalar gider. Her
// zaman güvenlidir, veriye dokunmaz: kurulumda ve elle yedekte veritabanı yedeğinin yanında çalışır.
export const dosyaYedegiBetigi = (ortam: Ortam, kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  return `# adim:dosya\nset -eu\nsudo YEDEK_KILIT_SN=${yedekKilitSn} ${yedekKoku}/gece.sh --dosya ${ortam} ${kodAdi}\n`;
};

export const sonYedegiBulBetigi = (ortam: Ortam, kodAdi: string): string =>
  kokBetigi(`rc ${ortam} lsf --files-only "depo:$KOVA/${ortam}/${kodAdi}" | sort | tail -1`);

const dosyaAdiGecerli = (ad: string): boolean => /^\d{8}T\d{6}Z(-[a-z-]+)?\.dump\.age$/.test(ad);

// Geri yüklemede dosya kendiliğinden seçilmez: en yeni dosya boş sunucunun ya da bozuk hâlin yedeği
// olabilir. Bu liste kişinin seçmesi içindir: tarih, boyut, ad.
export const yedekListesiBetigi = (ortam: Ortam, kodAdi: string): string =>
  kokBetigi(
    `rc ${ortam} lsf --files-only --format tsp --separator '  ' "depo:$KOVA/${ortam}/${kodAdi}" | sort`,
  );

// Depoda bu sitenin dosyası var mı? Sunucu yeniden kurulurken boş veritabanının "ilk yedeği" gerçek
// yedeklerin yanına karışmasın.
export const depodaYedekVarBetigi = (ortam: Ortam, kodAdi: string): string =>
  kokBetigi(`rc ${ortam} lsf --files-only "depo:$KOVA/${ortam}/${kodAdi}" | head -1`);

// --- Karşılaştırma ---

const ozetSql = `\\set ON_ERROR_STOP on
SELECT format('SELECT %L, count(*), md5(coalesce(string_agg(t::text, %L ORDER BY t::text), %L)) FROM %I.%I t', table_schema || '.' || table_name, '|', '', table_schema, table_name)
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE'
ORDER BY 1 \\gexec`;

// Sitenin içeriğine (tablo satırı, tür dönüşümü, kısıtlama, işlev) dokunan her komut sitenin kendi
// kullanıcısıyla, kutunun yerel soketinden çalışır (karar 0206). Yönetici oturumu bu kodu çalıştırırsa
// kod oturumun asıl kullanıcısını devralır: SET ROLE ya da --role yetmez, RESET ROLE ile geri alınır.
// Yönetici yalnız sitenin kodunu çalıştırmayan işleri yapar: veritabanı açma, adlandırma, düzen dökümü
// (pg_dump), sistem kayıtları.
const siteKullanicisi = (ad: string): string => {
  if (!/^site_[a-z0-9_]+$/.test(ad)) throw new Error(`Geçersiz site kullanıcısı: ${ad}`);
  return ad;
};

// Tabloların özeti, sitenin kullanıcısıyla: ad, satır sayısı, içerik özeti. Satır başına bir tablo.
// "boru" çıktının gideceği komuttur (heredoc'un ilk satırına yazılır).
export const tabloOzetiKomutu = (
  kutu: string,
  kullanici: string,
  veritabani: string,
  boru = "",
): string =>
  `docker exec -i ${kutu} psql -U ${siteKullanicisi(kullanici)} -d ${veritabani} -At -f - <<'OZET_SONU'${boru ? ` | ${boru}` : ""}
${ozetSql}
OZET_SONU`;

// Yedeği sitenin kullanıcısıyla yükler; nesneler onun olur. Yedekteki kısıtlama ve ifadeler yüklenirken
// onun yetkisiyle çalışır.
export const siteYuklemeKomutu = (kutu: string, kullanici: string, veritabani: string): string =>
  `docker exec -i ${kutu} pg_restore -U ${siteKullanicisi(kullanici)} --no-owner --no-acl --exit-on-error -d ${veritabani}`;

// Veritabanındaki silinmemiş dosyalar, sitenin kullanıcısıyla (kart 0093, karar 0207): satır başına "<ad> <özet>",
// ad diskteki adıdır (kimlik ve türün uzantısı, karar 0058). Tablo yoksa (dosya deposundan önceki yedek) liste
// boştur; türü kayıtta olmayan satır "?" adıyla gelir ve onu okuyan betik durur. Silinmiş işaretli dosya
// listede yoktur: diskte olması gerekmez, site onu bir süre sonra siler (dosyaTemizligiAyari).
const dosyaListesiSql = (): string => {
  const turler = Object.entries(kayitliDosyaTurleri)
    .map(([tur, { uzanti }]) => `('${tur}', '${uzanti}')`)
    .join(", ");
  return `\\set ON_ERROR_STOP on
SELECT to_regclass('public.dosyalar') IS NOT NULL AS dosya_tablosu \\gset
\\if :dosya_tablosu
SELECT coalesce(d.kimlik::text || '.' || u.uzanti, '?'), d.icerik_ozeti
FROM public.dosyalar d LEFT JOIN (VALUES ${turler}) AS u (tur, uzanti) ON u.tur = d.tur
WHERE d.silinme_zamani IS NULL ORDER BY 1;
\\endif`;
};

// "hedef" çıktının yazılacağı dosyadır (heredoc'un ilk satırına yazılır, bitiş satırı yalnız kalır).
export const dosyaListesiKomutu = (
  kutu: string,
  kullanici: string,
  veritabani: string,
  hedef: string,
): string =>
  `docker exec -i ${kutu} psql -U ${siteKullanicisi(kullanici)} -d ${veritabani} -At -F ' ' -f - >${hedef} <<'DOSYA_LISTESI_SONU'
${dosyaListesiSql()}
DOSYA_LISTESI_SONU`;

// Veritabanının özet satırları: her tablo için ad, satır sayısı, içerik özeti ve bir de düzen özeti.
// Düzen dökümü yöneticiyle alınır: pg_dump sitenin kodunu çalıştırmaz (kart 0068'de ölçüldü).
const ozetKomutu = (kutu: string, kullanici: string, veritabani: string, onek: string): string => `
printf '${onek} sema %s\\n' "$(docker exec ${guvenliOturum} ${kutu} pg_dump -U postgres -s --no-owner --no-acl -d ${veritabani} </dev/null | grep -v -E '^.(un)?restrict' | sha256sum | cut -d' ' -f1)"
${tabloOzetiKomutu(kutu, kullanici, veritabani, `sed 's/^/${onek} tablo /'`)}
`;

export type DosyaOzeti = { toplam: number; bulunan: number; tutan: number };
export type Ozet = {
  sema: string;
  tablolar: Map<string, { satir: number; icerik: string }>;
  dosya?: DosyaOzeti;
};

export const ozetiOku = (cikti: string, onek: string): Ozet => {
  const ozet: Ozet = { sema: "", tablolar: new Map() };
  for (const satir of cikti.split("\n")) {
    if (satir.startsWith(`${onek} sema `)) ozet.sema = satir.slice(`${onek} sema `.length).trim();
    if (satir.startsWith(`${onek} dosya `)) {
      const [toplam = Number.NaN, bulunan = Number.NaN, tutan = Number.NaN] = satir
        .slice(`${onek} dosya `.length)
        .trim()
        .split(" ")
        .map(Number);
      ozet.dosya = { toplam, bulunan, tutan };
    }
    if (satir.startsWith(`${onek} tablo `)) {
      const [ad = "", sayi = "", icerik = ""] = satir.slice(`${onek} tablo `.length).split("|");
      ozet.tablolar.set(ad, { satir: Number(sayi), icerik });
    }
  }
  return ozet;
};

// Provanın dosya farkları (kart 0093): yedekte depodaki kopyalar, canlıda disk. Sayılar okunamazsa da farktır.
// Canlı ile yedeğin kayıt sayısının farkı tablo özetinde görünür (dosyalar tablosu).
export const dosyaFarklari = (canli: Ozet, yedek: Ozet): string[] => {
  const farklar: string[] = [];
  for (const [yer, ozet, bulunamadi, tutmadi] of [
    ["yedek", yedek.dosya, "depoda kopyası yok", "kopyası açılınca kayıtla tutmuyor"],
    ["canlı", canli.dosya, "diskte yok", "diskteki içeriği kayıtla tutmuyor"],
  ] as const) {
    if (!ozet || ![ozet.toplam, ozet.bulunan, ozet.tutan].every(Number.isInteger)) {
      farklar.push(`dosyalar (${yer}): özet okunamadı`);
      continue;
    }
    if (ozet.bulunan < ozet.toplam)
      farklar.push(`dosyalar (${yer}): ${ozet.toplam - ozet.bulunan} dosyanın ${bulunamadi}`);
    if (ozet.tutan < ozet.bulunan)
      farklar.push(`dosyalar (${yer}): ${ozet.bulunan - ozet.tutan} dosyanın ${tutmadi}`);
  }
  return farklar;
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
  const ad = siteKullanicisi(siteVeritabaniAdi(kodAdi));
  return kokBetigi(`${acmaAnahtariSatiri(anahtar)}
prova="yedek-prova-$$"
g="$(mktemp -d -p "$K/gecici")"
trap 'docker rm -f "$prova" >/dev/null 2>&1 || true; rm -rf "$g"' EXIT
docker run --rm -d --name "$prova" --network none --memory 1g --user 70:70 --read-only --cap-drop ALL --security-opt no-new-privileges:true --tmpfs /var/lib/postgresql:uid=70,gid=70,mode=0700 --tmpfs /var/run/postgresql:uid=70,gid=70 --tmpfs /tmp -e POSTGRES_HOST_AUTH_METHOD=trust ${postgresGoruntusu} >/dev/null </dev/null
hazir=hayir
for _ in $(seq 1 90); do
  if docker exec "$prova" pg_isready -q -h 127.0.0.1 -U postgres </dev/null; then hazir=evet; break; fi
  sleep 1
done
[ "$hazir" = evet ] || { echo "geçici veritabanı açılmadı" >&2; exit 1; }
# Geçici kutuda da yedek sitenin adındaki yetkisiz kullanıcıyla açılır: kutu ağsız olsa da yönetici olarak
# çalışan kod özeti değiştirebilirdi (karar 0206).
docker exec "$prova" psql -U postgres -q -v ON_ERROR_STOP=1 -c 'CREATE ROLE "${ad}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS' -c 'CREATE DATABASE prova OWNER "${ad}"' </dev/null >/dev/null
${yedekAcmaBoru(ortam, kodAdi, dosya)} | ${siteYuklemeKomutu(kutu, ad, "prova")} 2>/dev/null
${ozetKomutu(kutu, ad, "prova", "YEDEK")}
${ozetKomutu(veritabaniKutusu(ortam), ad, ad, "CANLI")}
${dosyaProvasi(ortam, kodAdi, kutu, ad)}`);
};

// Provanın dosya kısmı (kart 0093, karar 0207). Yedeğin gösterdiği her silinmemiş dosyanın depoda kopyası olmalı ve
// en yeni kopya açılınca özeti kayıtla tutmalı; canlıda kaydı olan her silinmemiş dosya diskte olmalı ve özeti
// tutmalı. Satırlar: "<önek> dosya <kayıt sayısı> <bulunan> <özeti tutan>". Dosya içeriği ekrana basılmaz.
export const dosyaProvasi = (
  ortam: Ortam,
  kodAdi: string,
  kutu: string,
  ad: string,
  yedekVeritabani = "prova",
): string => `
${dosyaListesiKomutu(kutu, ad, yedekVeritabani, '"$g/yedek"')}
${dosyaListesiKomutu(veritabaniKutusu(ortam), ad, ad, '"$g/canli"')}
depodaki_dosyalar ${ortam} ${kodAdi} >"$g/depoda"
declare -A en=()
while read -r a z; do [ -n "$a" ] && en["$a"]="$z"; done <"$g/depoda"
: >"$g/liste"
while read -r a o; do
  [[ -n "$a" && "$a" =~ $DOSYA_ADI && -n "\${en[$a]:-}" ]] && printf '%s\n' "$a.\${en[$a]}.age" >>"$g/liste"
done <"$g/yedek"
mkdir "$g/indir"
if [ -s "$g/liste" ]; then
  RC_BAGLA="$g:/g" rc ${ortam} copy "depo:$KOVA/${ortam}/${kodAdi}/dosyalar" /g/indir --files-from /g/liste --no-traverse
fi
toplam=0 bulunan=0 tutan=0
while read -r a o; do
  [ -n "$a" ] || continue
  toplam=$((toplam + 1))
  [[ "$a" =~ $DOSYA_ADI && -n "\${en[$a]:-}" && -f "$g/indir/$a.\${en[$a]}.age" ]] || continue
  bulunan=$((bulunan + 1))
  if [ "$(age -d -i <(printf '%s\n' "$anahtar") <"$g/indir/$a.\${en[$a]}.age" 2>/dev/null | sha256sum | cut -d' ' -f1)" = "$o" ]; then
    tutan=$((tutan + 1))
  fi
done <"$g/yedek"
printf 'YEDEK dosya %s %s %s\n' "$toplam" "$bulunan" "$tutan"
toplam=0 bulunan=0 tutan=0
while read -r a o; do
  [ -n "$a" ] || continue
  toplam=$((toplam + 1))
  [[ "$a" =~ $DOSYA_ADI && -f "$D/${ortam}/${kodAdi}/$a" ]] || continue
  bulunan=$((bulunan + 1))
  [ "$(sha256sum <"$D/${ortam}/${kodAdi}/$a" | cut -d' ' -f1)" = "$o" ] && tutan=$((tutan + 1))
done <"$g/canli"
printf 'CANLI dosya %s %s %s\n' "$toplam" "$bulunan" "$tutan"
`;

export const kaydaYazBetigi = (
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
): { farklar: string[]; dosyalar: number; tablolar: number; satirlar: number } => {
  let cikti: string;
  try {
    cikti = sunucudaCalistir(ipv4, provaBetigi(ortam, kodAdi, dosya, anahtar), 900_000);
  } catch (hata) {
    sunucudaCalistir(ipv4, kaydaYazBetigi(ortam, kodAdi, "prova", "basarisiz", "acilamadi", dosya));
    throw hata;
  }
  const yedek = ozetiOku(cikti, "YEDEK");
  const canli = ozetiOku(cikti, "CANLI");
  const farklar = [...ozetFarklari(canli, yedek), ...dosyaFarklari(canli, yedek)];
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
    dosyalar: yedek.dosya?.toplam ?? 0,
    tablolar: yedek.tablolar.size,
    satirlar: [...yedek.tablolar.values()].reduce((toplam, tablo) => toplam + tablo.satir, 0),
  };
};

// --- Geri yükleme adımları ---

const geciciAd = (ad: string): string => `${ad}__geri`;
const eskiAd = (ad: string): string => `${ad}__eski`;
const basarisizAd = (ad: string): string => `${ad}__basarisiz`;

// ssh süresi betiklerin kilit süresinden uzundur: süre dolduğu için hata görülen bir adım sunucuda
// sessizce sürmesin. Gece işi kilidi tutuyor olabilir; geri alma onu daha uzun bekler.
const uzunSure = 900_000;
const yedekKilitSn = 600;
const kisaKilitSn = 60;
const geriAlmaKilitSn = 240;

// Geri yüklemede yazılan sunucu günlüğüne satır içeriği düşmesin (COPY hatası müşteri verisi taşır).
// Yükleme sitenin kullanıcısıyla çalıştığı için bu ayarlar bağlantı seçeneğiyle verilemez (yalnız yönetici
// verebilir): yönetici onları yalnız bu kullanıcı ve yan veritabanı için kaydeder, site değiştiremez
// (ölçüldü, kart 0068). Ayar veritabanına bağlıdır, adı değişince de kalırdı: yüklemeden hemen sonra kalkar.
// Yan veritabanı burada açılır: sitenin kullanıcısına ait, herkese kapalı.
export const sessizYuklemeAc = (kutu: string, ad: string, yeni: string): string =>
  `docker exec ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c 'CREATE DATABASE "${yeni}" OWNER "${siteKullanicisi(ad)}"' -c 'REVOKE ALL ON DATABASE "${yeni}" FROM PUBLIC' -c 'ALTER ROLE "${ad}" IN DATABASE "${yeni}" SET log_min_messages = panic' -c 'ALTER ROLE "${ad}" IN DATABASE "${yeni}" SET log_min_error_statement = panic' </dev/null >/dev/null`;

export const sessizYuklemeKapat = (kutu: string, ad: string, yeni: string): string =>
  `docker exec ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c 'ALTER ROLE "${siteKullanicisi(ad)}" IN DATABASE "${yeni}" RESET ALL' </dev/null >/dev/null`;

export type VeritabaniDurumu = { canli: boolean; eski: boolean; geri: boolean; basarisiz: boolean };

export const durumOkumaBetigi = (ortam: Ortam, kodAdi: string): string => {
  const ad = siteVeritabaniAdi(kodAdi);
  return `# adim:durum
set -eu
docker exec ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -At -c "select datname from pg_database where datname in ('${ad}', '${eskiAd(ad)}', '${geciciAd(ad)}', '${basarisizAd(ad)}')" </dev/null
`;
};

export const veritabaniDurumunuOku = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
): VeritabaniDurumu => {
  const ad = siteVeritabaniAdi(kodAdi);
  const adlar = sunucudaCalistir(ipv4, durumOkumaBetigi(ortam, kodAdi)).split("\n");
  return {
    canli: adlar.includes(ad),
    eski: adlar.includes(eskiAd(ad)),
    geri: adlar.includes(geciciAd(ad)),
    basarisiz: adlar.includes(basarisizAd(ad)),
  };
};

// __eski'nin yedeği var mı? Sitenin son geri yükleme kaydına bakılır. Okunamazsa yedeksiz sayılır: tek
// kopyanın olağan artık sanılıp silinmesi, fazladan bir onaydan pahalıdır.
const oncekiVeriYedeksiz = (ipv4: string, ortam: Ortam, kodAdi: string): boolean => {
  const kayit = sshKomutu(ipv4, `sudo cat ${yedekKoku}/kayit.jsonl`);
  if (kayit.status !== 0) return true;
  const son = kayitlariCoz(kayit.stdout).findLast(
    (k) => k.ortam === ortam && k.site === kodAdi && k.tur === "geri-yukleme",
  );
  return son?.sebep === "son-yedeksiz";
};

// Önceki geri yüklemeden artık kalmışsa durulur: __eski gerçek veri olabilir, üstüne yazılmaz.
const artikDurdur = (ipv4: string, ortam: Ortam, kodAdi: string): void => {
  const durum = veritabaniDurumunuOku(ipv4, ortam, kodAdi);
  if (durum.eski && oncekiVeriYedeksiz(ipv4, ortam, kodAdi)) {
    throw new Error(
      `Önceki geri yükleme --son-yedeksiz ile yapıldı, önceki veri ${eskiAd(siteVeritabaniAdi(kodAdi))} adıyla duruyor ve BU VERİNİN YEDEĞİ YOK. Hiçbir şeye dokunulmadı.\n  Önceki veriye dönmek için: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiye-don\n  İnceleyip silmek için: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiyi-sil --yedeksiz-onay`,
    );
  }
  if (durum.eski) {
    throw new Error(
      `Önceki geri yükleme yarım kalmış, önceki veri ${eskiAd(siteVeritabaniAdi(kodAdi))} adıyla duruyor. Hiçbir şeye dokunulmadı.\n  Önceki veriye dönmek için: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiye-don\n  Şu anki hâli kabul edip önceki veriyi silmek için: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiyi-sil`,
    );
  }
  if (durum.basarisiz) {
    throw new Error(
      `Önceki geri yüklemeden artık kalmış, canlı veritabanı yerinde. Hiçbir şeye dokunulmadı.\n  Artığı silmek için: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiyi-sil`,
    );
  }
};

// Yedek yana, ayrı bir veritabanına açılır; canlı veritabanına dokunulmaz. pg_restore'un hata
// çıktısı müşteri verisi taşıyabilir (COPY satırı), gösterilmez ve sunucu günlüğüne yazılmaz.
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
  return kokBetigi(`# adim:yana
${acmaAnahtariSatiri(anahtar)}
exec 9>"$K/.kilit"
flock -w ${kisaKilitSn} 9
sil() { docker exec ${kutu} psql -U postgres -d postgres -q -c 'DROP DATABASE IF EXISTS "${yeni}" WITH (FORCE)' </dev/null >/dev/null; }
sil
if ! ${sessizYuklemeAc(kutu, ad, yeni)}; then
  sil
  echo "yan veritabanı açılamadı, canlı veritabanına dokunulmadı" >&2
  exit 1
fi
# Yüklemenin hatası gösterilmez; sitenin kullanıcısı kutunun içinden bağlanamıyorsa nedeni ayrıca söylenir.
if ! docker exec ${kutu} psql -U ${ad} -d "${yeni}" -Atqc 'SELECT 1' </dev/null >/dev/null 2>&1; then
  sil
  echo "sitenin kullanıcısı kutunun içinden bağlanamadı: bağlantı kuralı yeni değil mi? (pnpm sunucu-veritabani, karar 0206); canlı veritabanına dokunulmadı" >&2
  exit 1
fi
if ! ${yedekAcmaBoru(ortam, kodAdi, dosya)} | ${siteYuklemeKomutu(kutu, ad, yeni)} 2>/dev/null; then
  sil
  echo "yedek açılamadı (ayrıntı müşteri verisi taşıyabilir, gösterilmez), canlı veritabanına dokunulmadı" >&2
  exit 1
fi
if ! ${sessizYuklemeKapat(kutu, ad, yeni)}; then
  sil
  echo "yükleme ayarı kaldırılamadı, canlı veritabanına dokunulmadı" >&2
  exit 1
fi
# Üst bilgi izinleri sitenin veritabanındaki sistem kayıtlarındadır, yedekten gelmez (karar 0053).
if ! docker exec -i ${guvenliOturum} ${kutu} psql -U postgres -d "${yeni}" -q -v ON_ERROR_STOP=1 -f - >/dev/null <<'UST_BILGI_SONU'
${ustBilgiKapatmaSql()}
UST_BILGI_SONU
then
  sil
  echo "üst bilgi izinleri kapatılamadı, canlı veritabanına dokunulmadı" >&2
  exit 1
fi
printf 'tablo=%s\\n' "$(docker exec ${guvenliOturum} ${kutu} psql -U postgres -d "${yeni}" -Atc "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')" </dev/null)"`);
};

// Geri yüklemede dosyalar (kart 0093, karar 0207). Yan veritabanının gösterdiği her silinmemiş dosya diskte
// olmalı: yoksa depodaki en yeni kopyası indirilir, açılır, özeti kayıtla karşılaştırılır ve sitenin
// kullanıcısına ait olarak yerine konur. Diskteki hiçbir dosya silinmez ve üzerine yazılmaz (dosya adı kaydın
// kimliğidir, içerik değişmez): yarıda kalan geri yükleme siteyi bozmaz, fazladan dosya kayıtsız kalır ve sitenin
// dosya temizliği onu bildirir. Diskteki dosyanın özeti tutmuyorsa, depoda kopyası yoksa ya da liste beklenmeyen
// bir satır taşıyorsa hiçbir şey yapılmadan durulur.
export const dosyaGetirmeBetigi = (
  ortam: Ortam,
  site: { kodAdi: string; numara: number },
  veritabani: string,
  anahtar: string,
): string => {
  const kutu = veritabaniKutusu(ortam);
  const ad = siteKullanicisi(siteVeritabaniAdi(site.kodAdi));
  const u = kutuKullanicisi(ortam, site.numara);
  return kokBetigi(`# adim:dosyalar
${acmaAnahtariSatiri(anahtar)}
klasor="$D/${ortam}/${site.kodAdi}"
g="$(mktemp -d -p "$K/gecici")"
trap 'rm -rf "$g"' EXIT
[ -d "$klasor" ] || install -d -m 0700 -o ${u} -g ${u} "$klasor"
${dosyaListesiKomutu(kutu, ad, veritabani, '"$g/gerekli"')}
depodaki_dosyalar ${ortam} ${site.kodAdi} >"$g/depoda"
declare -A en=() ozet=()
while read -r a z; do [ -n "$a" ] && en["$a"]="$z"; done <"$g/depoda"
toplam=0 yerinde=0 eksik=0 bozuk=0 gecersiz=0 indirilen=0
: >"$g/liste"
while read -r a o; do
  [ -n "$a" ] || continue
  toplam=$((toplam + 1))
  if ! [[ "$a" =~ $DOSYA_ADI && "$o" =~ ^[0-9a-f]{64}$ ]]; then gecersiz=$((gecersiz + 1)); continue; fi
  if [ -e "$klasor/$a" ]; then
    if [ "$(sha256sum <"$klasor/$a" | cut -d' ' -f1)" = "$o" ]; then yerinde=$((yerinde + 1)); else bozuk=$((bozuk + 1)); fi
    continue
  fi
  if [ -z "\${en[$a]:-}" ]; then eksik=$((eksik + 1)); continue; fi
  ozet["$a"]="$o"
  printf '%s\\n' "$a.\${en[$a]}.age" >>"$g/liste"
done <"$g/gerekli"
if [ "$gecersiz" -gt 0 ] || [ "$eksik" -gt 0 ] || [ "$bozuk" -gt 0 ]; then
  echo "dosyalar geri getirilemez: $eksik dosyanın depoda kopyası yok, $bozuk dosyanın diskteki içeriği kayıtla tutmuyor, $gecersiz satır tanınmadı; hiçbir şeye dokunulmadı" >&2
  exit 1
fi
if [ -s "$g/liste" ]; then
  mkdir "$g/indir"
  RC_BAGLA="$g:/g" rc ${ortam} copy "depo:$KOVA/${ortam}/${site.kodAdi}/dosyalar" /g/indir --files-from /g/liste --no-traverse
  for a in "\${!ozet[@]}"; do
    age -d -i <(printf '%s\\n' "$anahtar") <"$g/indir/$a.\${en[$a]}.age" >"$g/acik"
    if [ "$(sha256sum <"$g/acik" | cut -d' ' -f1)" != "\${ozet[$a]}" ]; then
      echo "dosyanın yedeği kayıtla tutmuyor: $a; indirilenlerden yerine konanlar kalır, veritabanına dokunulmadı" >&2
      exit 1
    fi
    install -m 0600 -o ${u} -g ${u} "$g/acik" "$klasor/$a.geri-yukleniyor"
    mv -f "$klasor/$a.geri-yukleniyor" "$klasor/$a"
    indirilen=$((indirilen + 1))
  done
fi
printf 'dosya=%s yerinde=%s indirilen=%s\\n' "$toplam" "$yerinde" "$indirilen"`);
};

export const yaniSilmeBetigi = (ortam: Ortam, kodAdi: string): string =>
  `# adim:yanisil\nset -eu\ndocker exec ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "${geciciAd(siteVeritabaniAdi(kodAdi))}" WITH (FORCE)' </dev/null >/dev/null\n`;

// Arka plan kutusu da durur: veritabanı yer değiştirirken kuyruğa yazmamalı. Önce site durur: arada
// kesilirse site kapalı görünür ve yeniden açma ikisini birden açar.
export const kutuyuDurdurmaBetigi = (kutuAdi: string): string =>
  `# adim:durdur\nset -eu\ndocker stop --timeout 20 ${kutuAdi} >/dev/null\nif docker inspect ${arkaPlanKutuAdi(kutuAdi)} >/dev/null 2>&1; then docker stop --timeout 20 ${arkaPlanKutuAdi(kutuAdi)} >/dev/null; fi\n`;

// Veritabanları tek işlemde yer değiştirir: ya ikisi de olur ya hiçbiri. Hiçbir şey silinmez.
export const degistirmeBetigi = (ortam: Ortam, kodAdi: string): string => {
  const kutu = veritabaniKutusu(ortam);
  const ad = siteVeritabaniAdi(kodAdi);
  return kokBetigi(`# adim:degistir
exec 9>"$K/.kilit"
flock -w ${kisaKilitSn} 9
docker exec -i ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 >/dev/null <<'DEGISTIR_SONU'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${ad}' AND pid <> pg_backend_pid();
BEGIN;
ALTER DATABASE "${ad}" RENAME TO "${eskiAd(ad)}";
ALTER DATABASE "${geciciAd(ad)}" RENAME TO "${ad}";
COMMIT;
DEGISTIR_SONU
echo degisti`);
};

// Eski veritabanı yerine döner. Önce varlığına bakılır, yoksa hiçbir şeye dokunulmaz: tek kopya
// silinmesin. Yerinden çıkan veritabanı silinmez, adı değişir; silme en son adımdır.
export const geriAlmaBetigi = (ortam: Ortam, kodAdi: string): string => {
  const kutu = veritabaniKutusu(ortam);
  const ad = siteVeritabaniAdi(kodAdi);
  return kokBetigi(`# adim:gerial
exec 9>"$K/.kilit"
flock -w ${geriAlmaKilitSn} 9
say() { docker exec ${kutu} psql -U postgres -d postgres -At -c "select count(*) from pg_database where datname = '$1'" </dev/null; }
if [ "$(say '${eskiAd(ad)}')" != 1 ]; then
  echo "${eskiAd(ad)} yok, geri alınacak veritabanı bulunamadı; hiçbir şeye dokunulmadı" >&2
  exit 1
fi
if [ "$(say '${ad}')" = 1 ]; then
  docker exec -i ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 >/dev/null <<'GERI_AL_SONU'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('${ad}', '${eskiAd(ad)}') AND pid <> pg_backend_pid();
BEGIN;
ALTER DATABASE "${ad}" RENAME TO "${basarisizAd(ad)}";
ALTER DATABASE "${eskiAd(ad)}" RENAME TO "${ad}";
COMMIT;
DROP DATABASE "${basarisizAd(ad)}" WITH (FORCE);
GERI_AL_SONU
else
  docker exec ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c 'ALTER DATABASE "${eskiAd(ad)}" RENAME TO "${ad}"' </dev/null >/dev/null
fi
echo geri-alindi`);
};

// Silinecek ara veritabanları. eski: true yalnız yeni hâl sağlıklı çalışıyorsa verilir.
export const eskiyiSilmeBetigi = (ortam: Ortam, kodAdi: string, { eski = true } = {}): string => {
  const ad = siteVeritabaniAdi(kodAdi);
  const adlar = [...(eski ? [eskiAd(ad)] : []), basarisizAd(ad), geciciAd(ad)];
  return kokBetigi(`# adim:${eski ? "eskisil" : "artiksil"}
for db in ${adlar.map((x) => `"${x}"`).join(" ")}; do
  docker exec ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \\"$db\\" WITH (FORCE)" </dev/null >/dev/null
done`);
};

// Arka plan kutusu varsa ve çalışmıyorsa site de kapalı sayılır: açma ikisini birden açar.
export const kutuCalismaBetigi = (kutuAdi: string): string =>
  `# adim:calisiyor\nset -eu\nd=$(docker inspect -f '{{.State.Running}}' ${kutuAdi})\nif a=$(docker inspect -f '{{.State.Running}}' ${arkaPlanKutuAdi(kutuAdi)} 2>/dev/null) && [ "$a" != true ]; then d=false; fi\necho "$d"\n`;

export const saglikBeklemeBetigi = (kutuAdi: string): string => `# adim:saglik
set -eu
for _ in $(seq 1 60); do
  d=$(docker inspect -f '{{.State.Health.Status}}' ${kutuAdi})
  a=$(docker inspect -f '{{.State.Health.Status}}' ${arkaPlanKutuAdi(kutuAdi)} 2>/dev/null || echo healthy)
  if [ "$d" = healthy ] && [ "$a" = healthy ]; then echo saglikli; exit 0; fi
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

const hataMetni = (hata: unknown): string => (hata as Error).message;

// Yayın komutu yalnız deneme ortamını bilir (karar 0035): canlıda kutu adı bulunamaz, site kutusu
// durmadan veritabanı değişirdi. Canlı ortam açılınca bu sınır kaldırılır.
const ortamiDenetle = (ortam: Ortam, baslik = "Geri yükleme"): void => {
  if (ortam !== yayinOrtami) {
    throw new Error(`${baslik} şimdilik yalnız ${yayinOrtami} ortamında çalışır (karar 0037).`);
  }
};

// Kutuyu yeniden açar ve sağlığı bekler. Kutu yoksa (yayında olmayan site) iş yoktur.
const kutuyuAc = (ipv4: string, ortam: Ortam, kodAdi: string, kutu: string | undefined): void => {
  if (!kutu) return;
  etkinKutuyuYenidenBaslat(ipv4, ortam, kodAdi);
  sunucudaCalistir(ipv4, saglikBeklemeBetigi(kutu), 180_000);
};

// Yer değiştirdikten sonra yeni hâli çalışır duruma getirir: şifre, eksik değişiklikler, kutu, sağlık.
const yeniHaliTamamla = (
  ipv4: string,
  ortam: Ortam,
  site: { kodAdi: string; numara: number },
  kutu: string | undefined,
  yaz: (satir: string) => void,
): void => {
  const { kodAdi, numara } = site;
  gizliyiYenileVeEsitle(ipv4, ortam, kodAdi, numara, yaz);
  if (kutu) {
    const etiket = yayinKutusuGoruntusu(ipv4, kutu);
    yaz(sunucudaCalistir(ipv4, guncellemeBetigi(ortam, kodAdi, numara, etiket)).trim());
  }
  kutuyuAc(ipv4, ortam, kodAdi, kutu);
  if (kutu) yaz(`sağlıklı    ${kutu}`);
};

// Eski veritabanını yerine koyar, şifreyi dosyadaki değere eşitler, kutuyu açar. Dönen liste tutmayan
// adımlardır. Veritabanı dönmediyse site açılmaz: yanlış veriye sipariş yazılmasın. Komut hata verse
// de durum okunur: işlem bitmiş, yalnız bağlantı kopmuş olabilir.
const eskiyeDonAdimlari = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  kutu: string | undefined,
): string[] => {
  let durdu = true;
  if (kutu) {
    try {
      sunucudaCalistir(ipv4, kutuyuDurdurmaBetigi(kutu));
    } catch {
      // Bağlantı kopmuş olabilir: kutunun durduğu bilinmiyor, mesaj bunu söyler.
      durdu = false;
    }
  }
  try {
    sunucudaCalistir(ipv4, geriAlmaBetigi(ortam, kodAdi));
  } catch (hata) {
    let dondu = false;
    try {
      const durum = veritabaniDurumunuOku(ipv4, ortam, kodAdi);
      dondu = durum.canli && !durum.eski;
    } catch {
      dondu = false;
    }
    if (!dondu) {
      const site = durdu
        ? "site kapalı bırakıldı"
        : "sitenin durumu bilinmiyor, açık olabilir ve yanlış veriyle çalışıyor olabilir";
      return [`eski veritabanı yerine konamadı, ${site}: ${hataMetni(hata)}`];
    }
  }
  const sorunlar: string[] = [];
  try {
    sifreyiEsitle(ipv4, ortam, kodAdi);
  } catch (hata) {
    sorunlar.push(`şifre eşitlenemedi: ${hataMetni(hata)}`);
  }
  try {
    kutuyuAc(ipv4, ortam, kodAdi, kutu);
  } catch (hata) {
    sorunlar.push(`site açılamadı: ${hataMetni(hata)}`);
  }
  return sorunlar;
};

// Akış yayın kilidinin içindedir. Yedek önce yana açılır (site bu sırada çalışır), sonra kutu durur
// ve son yazmaları da içeren yedek alınır, sonra veritabanları tek işlemde yer değiştirir. Yer
// değiştirme hata verirse durum okunur: işlem bitmişse sonraki dala geçilir, durum okunamazsa site
// açılmaz. Yer değiştirmeden sonra bir adım tutmazsa eski veritabanı yerine döner. Sağlık geçtikten
// sonra kayıt ya da silme tutmazsa geri dönülmez: yeni hâl çalışıyordur, artık denetimde kırmızı
// görünür. Eski veritabanı silinmeden önce kopyası kutu dururken alınan yedektedir.
export const geriYukle = (
  ipv4: string,
  ortam: Ortam,
  site: { kodAdi: string; numara: number },
  dosya: string,
  anahtar = acmaAnahtariniOku(ortam, site.kodAdi),
  yaz: (satir: string) => void = () => {},
  // Veritabanı bozuksa o anki durumun yedeği alınamaz. Bu seçenekte önceki veri kendiliğinden
  // silinmez, yedeği yoktur: incelenince --eskiyi-sil ile silinir.
  { sonYedeksiz = false } = {},
): Promise<void> =>
  yerDegistir(
    ipv4,
    ortam,
    site,
    {
      ad: "Geri yükleme",
      tur: "geri-yukleme",
      dosya,
      sonYedeksiz,
      yanaAc: () => {
        const acilan = sunucudaCalistir(
          ipv4,
          yanaAcmaBetigi(ortam, site.kodAdi, dosya, anahtar),
          uzunSure,
        );
        if (!/tablo=[1-9]/.test(acilan)) throw new Error("Yedekten tablo çıkmadı.");
        yaz(`açıldı      ${dosya} yan veritabanında`);
        // Dosyalar veritabanından önce yerine konur: yer değiştirdiğinde kaydı olan her dosya yerindedir.
        const dosyalar = sunucudaCalistir(
          ipv4,
          dosyaGetirmeBetigi(ortam, site, geciciAd(siteVeritabaniAdi(site.kodAdi)), anahtar),
          uzunSure,
        );
        const sayilar = /dosya=(\d+) yerinde=(\d+) indirilen=(\d+)/.exec(dosyalar);
        if (!sayilar) throw new Error(`Dosyalar geri getirilemedi: ${dosyalar.trim()}`);
        yaz(
          `dosyalar    ${sayilar[1]} dosya: ${sayilar[2]} yerinde, ${sayilar[3]} depodan getirildi`,
        );
      },
    },
    yaz,
  );

// Boş yan veritabanı: sitenin kullanıcısına ait, herkese kapalı, üst bilgi izinleri kapalı. Tablo yok;
// değişiklikleri yer değiştirdikten sonra yayındaki görüntü uygular (kart 0128).
export const bosYanaAcmaBetigi = (ortam: Ortam, kodAdi: string): string => {
  const kutu = veritabaniKutusu(ortam);
  const ad = siteVeritabaniAdi(kodAdi);
  const yeni = geciciAd(ad);
  return kokBetigi(`# adim:bosyana
exec 9>"$K/.kilit"
flock -w ${kisaKilitSn} 9
docker exec ${kutu} psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS "${yeni}" WITH (FORCE)' -c 'CREATE DATABASE "${yeni}" OWNER "${ad}"' -c 'REVOKE ALL ON DATABASE "${yeni}" FROM PUBLIC' </dev/null >/dev/null
if ! docker exec -i ${guvenliOturum} ${kutu} psql -U postgres -d "${yeni}" -q -v ON_ERROR_STOP=1 -f - >/dev/null <<'UST_BILGI_SONU'
${ustBilgiKapatmaSql()}
UST_BILGI_SONU
then
  docker exec ${kutu} psql -U postgres -d postgres -q -c 'DROP DATABASE IF EXISTS "${yeni}" WITH (FORCE)' </dev/null >/dev/null
  echo "üst bilgi izinleri kapatılamadı, canlı veritabanına dokunulmadı" >&2
  exit 1
fi
printf 'tablo=%s\\n' "$(docker exec ${guvenliOturum} ${kutu} psql -U postgres -d "${yeni}" -Atc "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')" </dev/null)"`);
};

// Yalnız demo site sıfırlanır (kart 0128): gerçek mağazanın verisi bu yolla silinmez.
export const sifirlamaEngeli = (kimlik: { kodAdi: string; tur: string }): string | undefined =>
  kimlik.tur === "demo"
    ? undefined
    : `${kimlik.kodAdi} demo site değil (tür: ${kimlik.tur}), sıfırlanmaz.`;

// Demo sitenin verisini siler, sitenin yayındaki sürümüyle boş veritabanından açar: arka plan süreci
// açılırken başlangıç verisini (katalog, menüler, düzen) yeniden kurar (kart 0128). Geri yüklemeyle
// aynı yol: önce kutu durur ve yedek alınır, veritabanları yer değiştirir, bir adım tutmazsa eski
// veri yerine döner. Dosya klasörüne dokunulmaz: eski dosyalar kayıtsız kalır (temizliği kart 0093).
export const sifirla = (
  ipv4: string,
  ortam: Ortam,
  site: { kodAdi: string; tur: string; numara: number },
  yaz: (satir: string) => void = () => {},
): Promise<void> => {
  const engel = sifirlamaEngeli(site);
  if (engel) return Promise.reject(new Error(engel));
  return yerDegistir(
    ipv4,
    ortam,
    site,
    {
      ad: "Sıfırlama",
      tur: "sifirlama",
      dosya: "",
      sonYedeksiz: false,
      kutuZorunlu: true,
      yanaAc: () => {
        const acilan = sunucudaCalistir(ipv4, bosYanaAcmaBetigi(ortam, site.kodAdi));
        if (!/tablo=0\b/.test(acilan)) throw new Error("Boş veritabanı açılamadı.");
        yaz("açıldı      boş yan veritabanı");
      },
    },
    yaz,
  );
};

const yerDegistir = (
  ipv4: string,
  ortam: Ortam,
  site: { kodAdi: string; numara: number },
  is: {
    ad: string;
    tur: string;
    dosya: string;
    sonYedeksiz: boolean;
    yanaAc: () => void;
    // Yayında kutusu olmayan sitede değişiklikleri uygulayacak görüntü yoktur: boş veritabanı tablosuz
    // kalıp başarılı sayılırdı. Yedekten açılan veritabanında tablolar zaten vardır.
    kutuZorunlu?: boolean;
  },
  yaz: (satir: string) => void,
): Promise<void> =>
  yayinKilidiyle(ipv4, () => {
    const { kodAdi } = site;
    ortamiDenetle(ortam, is.ad);
    const { ad: baslik, tur, dosya, sonYedeksiz } = is;
    const kaydet = (sonuc: "basarili" | "basarisiz", sebep: string) => {
      try {
        sunucudaCalistir(ipv4, kaydaYazBetigi(ortam, kodAdi, tur, sonuc, sebep, dosya));
      } catch (hata) {
        yaz(`uyarı       sonuç kayda yazılamadı: ${hataMetni(hata)}`);
      }
    };
    // Yan veritabanı müşteri verisinin şifresiz kopyasıdır, hata yolunda kalmasın.
    const yaniSil = () => {
      try {
        sunucudaCalistir(ipv4, yaniSilmeBetigi(ortam, kodAdi));
      } catch (hata) {
        yaz(`uyarı       yan veritabanı silinemedi, denetim kırmızı kalır: ${hataMetni(hata)}`);
      }
    };
    const eskiyeDonVeBildir = (hata: unknown): never => {
      const sorunlar = eskiyeDonAdimlari(ipv4, ortam, kodAdi, kutu);
      kaydet("basarisiz", sorunlar.length === 0 ? "eski-veritabani-yerinde" : "elle-mudahale");
      if (sorunlar.length > 0) {
        throw new Error(
          `${baslik} tutmadı ve eski hâle dönüş tamamlanmadı. Gerçek veri ${eskiAd(siteVeritabaniAdi(kodAdi))} veritabanında olabilir, silmeyin.\n  ${sorunlar.join("\n  ")}\n  Asıl hata: ${hataMetni(hata)}`,
        );
      }
      throw new Error(`${baslik} tutmadı, eski veritabanı yerinde, site açık: ${hataMetni(hata)}`);
    };

    artikDurdur(ipv4, ortam, kodAdi);
    const kutu = etkinKutuAdi(ipv4, ortam, kodAdi);
    if (is.kutuZorunlu && !kutu) {
      throw new Error(
        `${ortam}/${kodAdi} yayında değil, hiçbir şeye dokunulmadı. Önce: pnpm yayinla`,
      );
    }
    try {
      is.yanaAc();
    } catch (hata) {
      yaniSil();
      kaydet("basarisiz", "site-etkilenmedi");
      throw hata;
    }
    try {
      if (kutu) sunucudaCalistir(ipv4, kutuyuDurdurmaBetigi(kutu));
      if (sonYedeksiz) {
        yaz("uyarı       son yedek istenerek atlandı, önceki veri silinmeyecek");
      } else {
        yaz(
          sunucudaCalistir(ipv4, yedekAlmaBetigi(ortam, kodAdi, `${tur}-oncesi`), uzunSure).trim(),
        );
      }
      sunucudaCalistir(ipv4, degistirmeBetigi(ortam, kodAdi));
    } catch (hata) {
      let durum: VeritabaniDurumu;
      try {
        durum = veritabaniDurumunuOku(ipv4, ortam, kodAdi);
      } catch (okuma) {
        kaydet("basarisiz", "durum-bilinmiyor");
        throw new Error(
          `${baslik} durdu ve veritabanının durumu okunamadı: ${hataMetni(okuma)}\n  Site kapalı bırakıldı (yanlış veriye sipariş yazılmasın). Sunucuya ulaşınca: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiye-don. Yer değiştirme olduysa önceki veriye döner, olmadıysa siteyi açar.\n  Asıl hata: ${hataMetni(hata)}`,
        );
      }
      if (durum.eski) {
        // Yer değiştirme bitmiş, yalnız bağlantı kopmuş: eski veri yerine döner.
        eskiyeDonVeBildir(hata);
      }
      yaniSil();
      kaydet("basarisiz", "veri-degismedi");
      try {
        kutuyuAc(ipv4, ortam, kodAdi, kutu);
      } catch (acma) {
        throw new Error(
          `${baslik} durdu, veri değişmedi ama site açılamadı: ${hataMetni(acma)}\n  Asıl hata: ${hataMetni(hata)}`,
        );
      }
      throw new Error(`${baslik} durdu, veri değişmedi, site açık: ${hataMetni(hata)}`);
    }
    try {
      yeniHaliTamamla(ipv4, ortam, site, kutu, yaz);
    } catch (hata) {
      eskiyeDonVeBildir(hata);
    }
    // Dönüşü olmayan nokta geçildi: buradan sonraki hata yeni hâli geri almaz.
    kaydet("basarili", sonYedeksiz ? "son-yedeksiz" : "");
    if (sonYedeksiz) {
      yaz(
        `bilgi       önceki veri ${eskiAd(siteVeritabaniAdi(kodAdi))} adıyla duruyor, denetim kırmızı kalır. İnceleyince: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiyi-sil`,
      );
      return;
    }
    try {
      sunucudaCalistir(ipv4, eskiyiSilmeBetigi(ortam, kodAdi));
    } catch (hata) {
      yaz(
        `uyarı       eski veritabanı silinemedi, denetim kırmızı kalır: ${hataMetni(hata)}\n            Silmek için: pnpm yedek-geri-yukle <site klasörü> ${ortam} --eskiyi-sil`,
      );
    }
  });

// Komut satırı: tanınmayan seçenek reddedilir, yanlış yazılmış bir kurtarma seçeneği tam geri
// yüklemeye dönmesin.
export const geriYuklemeSecimi = (
  argumanlar: string[],
): "geri-yukle" | "eskiye-don" | "eskiyi-sil" => {
  const secenekler = argumanlar.filter((a) => a.startsWith("--"));
  for (const secenek of secenekler) {
    if (!/^--(dosya=|onay=|son-yedeksiz$|eskiye-don$|eskiyi-sil$|yedeksiz-onay$)/.test(secenek)) {
      throw new Error(`Bilinmeyen seçenek: ${secenek}`);
    }
  }
  const don = secenekler.includes("--eskiye-don");
  const sil = secenekler.includes("--eskiyi-sil");
  if (don && sil) throw new Error("--eskiye-don ile --eskiyi-sil birlikte verilemez.");
  if ((don || sil) && secenekler.some((s) => /^--(dosya=|son-yedeksiz$)/.test(s))) {
    throw new Error("--dosya ve --son-yedeksiz bu seçenekle birlikte verilemez.");
  }
  if (!sil && secenekler.includes("--yedeksiz-onay")) {
    throw new Error("--yedeksiz-onay yalnız --eskiyi-sil ile verilir.");
  }
  return don ? "eskiye-don" : sil ? "eskiyi-sil" : "geri-yukle";
};

// Önceki veri beklemiyorsa canlı veritabanı doğru olandır. Site kapalı kaldıysa (kurtarma yarım
// kalmış) şifre eşitlenip açılır.
const kapaliysaAc = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  kutu: string | undefined,
  yaz: (satir: string) => void,
): void => {
  if (!kutu || sunucudaCalistir(ipv4, kutuCalismaBetigi(kutu)).trim() === "true") return;
  sifreyiEsitle(ipv4, ortam, kodAdi);
  kutuyuAc(ipv4, ortam, kodAdi, kutu);
  yaz(`açıldı      ${kutu} kapalı kalmıştı`);
};

// Yarım kalmış geri yüklemeden sonra elle: önceki veriye dön. Şu anki hâl sipariş almış olabilir,
// önce yedeği alınır; yedek alınamazsa dönülmez ve kutu önceki durumunda bırakılır: kapalı olan site
// yanlış veriyle açılmaz. Önceki veri beklemiyorsa kapalı kalmış siteyi açar.
export const eskiyeDon = (
  ipv4: string,
  ortam: Ortam,
  kodAdi: string,
  yaz: (satir: string) => void = () => {},
): Promise<boolean> =>
  yayinKilidiyle(ipv4, () => {
    ortamiDenetle(ortam);
    const durum = veritabaniDurumunuOku(ipv4, ortam, kodAdi);
    const kutu = etkinKutuAdi(ipv4, ortam, kodAdi);
    if (!durum.eski) {
      if (!durum.canli) throw new Error("Canlı veritabanı da önceki veri de yok, dokunulmadı.");
      kapaliysaAc(ipv4, ortam, kodAdi, kutu, yaz);
      if (durum.basarisiz || durum.geri) yaz("bilgi       Artıkları silmek için: --eskiyi-sil");
      return false;
    }
    const acikti = kutu ? sunucudaCalistir(ipv4, kutuCalismaBetigi(kutu)).trim() === "true" : false;
    if (kutu && acikti) sunucudaCalistir(ipv4, kutuyuDurdurmaBetigi(kutu));
    if (durum.canli) {
      try {
        yaz(
          sunucudaCalistir(
            ipv4,
            yedekAlmaBetigi(ortam, kodAdi, "eskiye-don-oncesi"),
            uzunSure,
          ).trim(),
        );
      } catch (hata) {
        const mesaj = `Şu anki hâlin yedeği alınamadı, dönülmedi: ${hataMetni(hata)}`;
        if (!acikti) throw new Error(`${mesaj}\n  Site kapalı kaldı.`);
        try {
          kutuyuAc(ipv4, ortam, kodAdi, kutu);
        } catch (acma) {
          throw new Error(`${mesaj}\n  Site de yeniden açılamadı: ${hataMetni(acma)}`);
        }
        throw new Error(mesaj);
      }
    }
    const sorunlar = eskiyeDonAdimlari(ipv4, ortam, kodAdi, kutu);
    if (sorunlar.length > 0) throw new Error(sorunlar.join("\n"));
    sunucudaCalistir(ipv4, eskiyiSilmeBetigi(ortam, kodAdi, { eski: false }));
    return true;
  });

// Yarım kalmış geri yüklemeden sonra elle: şu anki hâli kabul et. Önceki veri ancak yeni hâl sağlıklı
// çalışınca silinir. Önceki veri yoksa yalnız artıklar silinir, kapalı kalmış site açılır.
export const eskiyiSil = (
  ipv4: string,
  ortam: Ortam,
  site: { kodAdi: string; numara: number },
  yaz: (satir: string) => void = () => {},
  { yedeksizOnay = false } = {},
): Promise<void> =>
  yayinKilidiyle(ipv4, () => {
    ortamiDenetle(ortam);
    const { kodAdi } = site;
    const durum = veritabaniDurumunuOku(ipv4, ortam, kodAdi);
    const kutu = etkinKutuAdi(ipv4, ortam, kodAdi);
    if (durum.eski) {
      if (!durum.canli)
        throw new Error("Canlı veritabanı yok, önceki veri silinmedi: --eskiye-don");
      if (!yedeksizOnay && oncekiVeriYedeksiz(ipv4, ortam, kodAdi)) {
        throw new Error(
          "Önceki verinin yedeği yok (--son-yedeksiz), silinirse kalıcı gider; silinmedi. İnceledikten sonra: --eskiyi-sil --yedeksiz-onay",
        );
      }
      yeniHaliTamamla(ipv4, ortam, site, kutu, yaz);
    } else if (durum.canli) {
      kapaliysaAc(ipv4, ortam, kodAdi, kutu, yaz);
    }
    sunucudaCalistir(ipv4, eskiyiSilmeBetigi(ortam, kodAdi, { eski: durum.eski }));
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

// Yarım yazılmış satır (disk dolu, kesinti) okumayı düşürmez; son kayıt eksik kalırsa denetim zaten
// eski ya da yok sayar.
export const kayitlariCoz = (metin: string): YedekKaydi[] =>
  metin.split("\n").flatMap((satir) => {
    if (!satir.trim()) return [];
    try {
      return [JSON.parse(satir) as YedekKaydi];
    } catch {
      return [];
    }
  });

export const gecerlilikSiniri = 26 * 60 * 60 * 1000;

// Her sitenin son gece yedeği ve son dosya yedeği başarılı ve 26 saatten yeni olmalı; son gece işinde site dışı hata
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
    // Dosya yedeği (kart 0093, karar 0207): gece işinde ya da elle (--dosya), aynı sınırla.
    const dosya = kayitlar
      .filter((k) => k.ortam === ortam && k.site === kodAdi && k.tur === "dosya")
      .at(-1);
    if (!dosya) hatalar.push(`${ortam}/${kodAdi}: dosya yedeği kaydı yok`);
    else if (dosya.sonuc !== "basarili")
      hatalar.push(`${ortam}/${kodAdi}: son dosya yedeği başarısız (${dosya.sebep})`);
    else if (simdi - Date.parse(dosya.zaman) > gecerlilikSiniri)
      hatalar.push(`${ortam}/${kodAdi}: son dosya yedeği 26 saatten eski (${dosya.zaman})`);
  }
  const bilinen = new Set(siteler.map((s) => `${s.ortam}/${s.kodAdi}`));
  const onaylar = new Map<string, number>();
  kayitlar.forEach((k, sira) => {
    if (k.tur === "temizlik-onay") onaylar.set(`${k.ortam}/${k.site}`, sira);
  });
  const sonBasariliGece = kayitlar.findLastIndex((k) => k.tur === "gece" && k.sonuc === "basarili");
  kayitlar.forEach((k, sira) => {
    const ad = `${k.ortam}/${k.site}`;
    const taze = simdi - Date.parse(k.zaman) <= gecerlilikSiniri;
    if (k.sonuc === "basarili") return;
    // Temizlik hatası silme işareti demek olabilir: bilinen sitede elle onaylanana kadar kırmızı.
    if (k.tur === "temizlik") {
      if (sira > (onaylar.get(ad) ?? -1) && (bilinen.has(ad) || taze))
        hatalar.push(
          `${ad}: temizlik hata verdi (${k.sebep}), bakıp pnpm yedek-kaydi --temizlik-onayla=${ad}`,
        );
    } else if (k.tur === "gece" && taze && !bilinen.has(ad) && sira > sonBasariliGece) {
      // Sonraki gece işi başarıyla çalıştıysa eski hata kapanmıştır; süren durumu veritabanı listesi
      // ölçer (veritabaniHatalari).
      hatalar.push(`${ad}: ${k.sebep}`);
    }
  });
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

// Çalışan veritabanı kutularındaki site veritabanları ("<ortam> <veritabanı>" satırları) ayarla
// karşılaştırılır: anahtarı olmayan site de yarım geri yüklemenin artığı da kırmızıdır.
export const veritabaniHatalari = (satirlar: string[], ayar: YedekAyari): string[] => {
  const hatalar: string[] = [];
  const bilinen = new Set(sitelerDuz(ayar).map((s) => `${s.ortam} ${siteVeritabaniAdi(s.kodAdi)}`));
  for (const satir of satirlar.filter(Boolean)) {
    if (satir.includes("__")) hatalar.push(`${satir}: yarım kalmış geri yüklemenin artığı`);
    else if (!bilinen.has(satir)) hatalar.push(`${satir}: yedek anahtarı yok, önce pnpm yedek-kur`);
  }
  return hatalar;
};

export const veritabaniListesiKomutu = `set -eu
kutular=$(docker ps --format '{{.Names}}' --filter 'name=^veritabani-')
for kutu in $kutular; do
  docker exec "$kutu" psql -U postgres -Atc "select datname from pg_database where datname like 'site\\_%'" </dev/null | sed "s/^/\${kutu#veritabani-} /"
done
`;

// Sunucudaki site bilgisi ve bu bilgisayardaki anahtar ayardaki açık anahtarla aynı olmalı. Yanlış
// anahtarla alınan yedekler günlerce yeşil görünür, ancak geri yüklemede anlaşılırdı.
export const anahtarHatalari = (
  ayar: YedekAyari,
  sunucudaki: Map<string, string>,
  bilgisayardaki: (ortam: Ortam, kodAdi: string) => string | undefined,
): string[] => {
  const hatalar: string[] = [];
  for (const { ortam, kodAdi } of sitelerDuz(ayar)) {
    const acik = ayar.siteler[ortam]?.[kodAdi]?.acik_anahtar;
    const ad = `${ortam}/${kodAdi}`;
    if (sunucudaki.get(ad) !== acik) hatalar.push(`${ad}: sunucudaki anahtar ayarla aynı değil`);
    const yerel = bilgisayardaki(ortam, kodAdi);
    if (!yerel) hatalar.push(`${ad}: açma anahtarı bu bilgisayarda yok`);
    else if (yerel !== acik) hatalar.push(`${ad}: açma anahtarı ayarla eşleşmiyor`);
  }
  return hatalar;
};

export const siteBilgileriKomutu = `sudo sh -c 'cd ${yedekKoku}/siteler && for f in */*; do [ -f "$f" ] && echo "$f $(cut -d" " -f1 "$f")"; done'`;

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
  const liste = sshKomutu(ipv4, "bash -s", { girdi: veritabaniListesiKomutu });
  if (liste.status !== 0) hatalar.push("veritabanı listesi okunamadı");
  else hatalar.push(...veritabaniHatalari(liste.stdout.split("\n"), ayar));
  const bilgiler = sshKomutu(ipv4, siteBilgileriKomutu);
  if (bilgiler.status !== 0) hatalar.push("site bilgileri okunamadı");
  else {
    const sunucudaki = new Map(
      bilgiler.stdout
        .split("\n")
        .filter(Boolean)
        .map((satir) => satir.split(" ") as [string, string]),
    );
    hatalar.push(...anahtarHatalari(ayar, sunucudaki, acikAnahtariOku));
  }
  for (const ortam of new Set(siteler.map((s) => s.ortam))) {
    const konum = sshKomutu(ipv4, "bash -s", { girdi: konumOlcmeBetigi(ortam) });
    if (konum.status !== 0) hatalar.push("deponun yeri ölçülemedi");
    else hatalar.push(...konumHatalari(konum.stdout, ayar.depo.konum));
  }
  return hatalar;
};
