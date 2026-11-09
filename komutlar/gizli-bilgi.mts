// Gizli bilgilerin sunucuda saklanması (kart 0019, karar 0031). Komutlar (sunucu-gizli.mts,
// sunucu-gizli-denemesi.mts, sunucu-denetle.mts) ve ileride yayın komutu bu dosyayı kullanır.
//
// - Değer sunucuda üretilir, dosyada durur ve bilgisayara gelmez. Bu dosyadaki betikler değer
//   taşımaz; değeri sunucudaki kök kabuğu üretir ve doğrudan dosyaya yazar.
// - Yerleşim: /srv/altyapi/gizli/<ortam>/<kod adı>/<dosya>. Klasörler kök kullanıcıya aittir ve
//   yalnız ona açıktır (0700). Dosya, sitenin o ortamdaki kutu kullanıcısına aittir, yalnız o
//   okuyabilir (0400).
// - Kutuya Docker gizli bilgisi olarak salt okunur bağlanır (/run/secrets/<dosya>); uygulama
//   yolu <AD>_DOSYASI ortam değişkeninden öğrenir. Kutu yalnız kendi dosyalarını görür.
// - Her site her ortamda kendi kullanıcı numarasıyla çalışır. Yanlış bağlanmış bir dosyayı
//   bile başka sitenin kutusu okuyamaz.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dosyaEki, type GizliBilgi, gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import type { SiteOrtami } from "../cekirdek/kayitlar/site.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";

const kok = join(import.meta.dirname, "..");
export const siteKullanicilariDosyasi = join(kok, "sunucu", "site-kullanicilari.json");
export const gizliKok = "/srv/altyapi/gizli";

// Sunucudaki ortamlar ve kutu kullanıcı numaralarının tabanı. Geliştirme ortamı bilgisayardaki
// .env'dir, sunucuda yeri yoktur. Bir sitenin kullanıcı numarası: taban + sitenin numarası. Ortamların
// adları cekirdek/kayitlar/site.ts'tedir; eksik ya da fazla ad tür kontrolünde hatadır.
export const ortamlar = { deneme: 30000, canli: 20000 } as const satisfies Record<
  SiteOrtami,
  number
>;
export type Ortam = keyof typeof ortamlar;
const siteNumarasiSiniri = 9999;

export const ortamMi = (deger: string): deger is Ortam => Object.hasOwn(ortamlar, deger);

// Ortamın veritabanı yönetici şifresi (kart 0039, karar 0034): sitenin değil altyapının gizli
// bilgisidir, ortamın klasöründe ayrı bir klasörde durur. Klasörün adında iki tire yan yana
// geçer; hiçbir kod adı böyle olamaz (kimlik şeması). Dosya veritabanı kutusunun postgres
// kullanıcısına (70) aittir. Kutu tanımı: sunucu-veritabani.mts.
export const yoneticiGizliBilgisi = {
  klasor: "altyapi--veritabani",
  dosya: "yonetici_sifresi",
  sahip: 70,
} as const;

// Hata izleme aracının (Bugsink) gizli bilgileri (kart 0022, karar 0036): altyapınındır, ortamın
// klasöründe ayrı bir klasörde durur. İmza anahtarı ve yönetici şifresi kutunun bugsink
// kullanıcısına (14237, görüntüde ölçüldü: id bugsink) aittir; kutuya Docker gizli bilgisi
// olarak bağlanır. Yönetim anahtarı kök kullanıcıya aittir, kutuya bağlanmaz: komutlar onu
// sunucuda okuyup kutuya girdiden verir. Kutu tanımı: hata-izleme.mts.
export const hataIzlemeGizliBilgisi = {
  klasor: "altyapi--hata-izleme",
  dosyalar: { gizli_anahtar: 14237, yonetici_sifresi: 14237, yonetim_anahtari: 0 },
} as const;

// Yedek deposunun anahtarı (kart 0024, karar 0037): altyapınındır, kök kullanıcıya aittir, yedek işinin
// geçici kutusuna salt okunur bağlanır. Kurulum yeri: yedek.mts.
export const yedekDeposuGizliBilgisi = {
  klasor: "altyapi--yedek-deposu",
  dosya: "rclone.conf",
  sahip: 0,
} as const;

// Altyapının gizli bilgi klasörleri: klasör adı → dosya adı → sahibin numarası.
const altyapiGizliKlasorleri: Record<string, Record<string, number>> = {
  [yoneticiGizliBilgisi.klasor]: { [yoneticiGizliBilgisi.dosya]: yoneticiGizliBilgisi.sahip },
  [hataIzlemeGizliBilgisi.klasor]: hataIzlemeGizliBilgisi.dosyalar,
  [yedekDeposuGizliBilgisi.klasor]: {
    [yedekDeposuGizliBilgisi.dosya]: yedekDeposuGizliBilgisi.sahip,
  },
};

const kodAdiKalibi = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const kodAdiniDenetle = (kodAdi: string): void => {
  if (!kodAdiKalibi.test(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
};

// --- Sitelerin numaraları (sunucu/site-kullanicilari.json) ---

type SiteNumaralari = Record<string, number>;

// Deneme komutlarının geçici siteleri bu numaraları kullanır; gerçek bir siteye verilmez.
// İkinci numara iki geçici siteyle çalışan yayın denemesi içindir (kart 0021).
export const denemeSiteNumarasi = siteNumarasiSiniri;
export const ikinciDenemeSiteNumarasi = siteNumarasiSiniri - 1;

// Numara dosyasının kuralları: geçerli kod adı, 1 ile 9997 arası tam sayı, her numara bir kez.
// İki dalda aynı numarayı alan iki site birleşince bu denetim durdurur (aynı kullanıcıyla
// çalışan iki site ikinci koruma katını kaybeder).
export const siteNumaralariHatalari = (numaralar: unknown): string[] => {
  if (typeof numaralar !== "object" || numaralar === null || Array.isArray(numaralar)) {
    return ["site numaraları bir nesne olmalı"];
  }
  const hatalar: string[] = [];
  const gorulen = new Map<unknown, string>();
  for (const [kodAdi, numara] of Object.entries(numaralar)) {
    if (!kodAdiKalibi.test(kodAdi)) hatalar.push(`geçersiz kod adı: ${kodAdi}`);
    if (!Number.isInteger(numara) || numara < 1 || numara >= ikinciDenemeSiteNumarasi) {
      hatalar.push(`${kodAdi}: geçersiz numara ${String(numara)}`);
    }
    const oteki = gorulen.get(numara);
    if (oteki) hatalar.push(`${kodAdi} ile ${oteki} aynı numarayı taşıyor: ${String(numara)}`);
    gorulen.set(numara, kodAdi);
  }
  return hatalar;
};

export const siteNumaralariniOku = (): SiteNumaralari => {
  const numaralar: unknown = JSON.parse(readFileSync(siteKullanicilariDosyasi, "utf8"));
  const hatalar = siteNumaralariHatalari(numaralar);
  if (hatalar.length > 0) {
    throw new Error(`sunucu/site-kullanicilari.json bozuk:\n  ${hatalar.join("\n  ")}`);
  }
  return numaralar as SiteNumaralari;
};

// Sitenin numarası yoksa bir sonrakini verir ve dosyaya yazar. Numara bir kez verilir, değişmez.
export const siteNumarasiAl = (kodAdi: string): number => {
  kodAdiniDenetle(kodAdi);
  const numaralar = siteNumaralariniOku();
  const var_ = numaralar[kodAdi];
  if (var_ !== undefined) return var_;
  const yeni = Math.max(0, ...Object.values(numaralar)) + 1;
  if (yeni >= ikinciDenemeSiteNumarasi) throw new Error("Site numaraları tükendi.");
  writeFileSync(
    siteKullanicilariDosyasi,
    `${JSON.stringify({ ...numaralar, [kodAdi]: yeni }, null, 2)}\n`,
  );
  return yeni;
};

export const kutuKullanicisi = (ortam: Ortam, siteNumarasi: number): number => {
  if (!Number.isInteger(siteNumarasi) || siteNumarasi < 1 || siteNumarasi > siteNumarasiSiniri) {
    throw new Error(`Geçersiz site numarası: ${siteNumarasi}`);
  }
  return ortamlar[ortam] + siteNumarasi;
};

export const gizliKlasor = (ortam: Ortam, kodAdi: string): string => {
  kodAdiniDenetle(kodAdi);
  return `${gizliKok}/${ortam}/${kodAdi}`;
};

const adlar = Object.keys(gizliBilgiler) as GizliBilgi[];

// Ön ve son parçayı sitenin adlarıyla doldurur. Parçalar gizli değildir; betiğe yalnız izin
// verilen karakterlerle girer.
export const sablonParcalari = (ad: GizliBilgi, kodAdi: string): [string, string] => {
  kodAdiniDenetle(kodAdi);
  const doldur = (parca: string) => parca.replaceAll("{veritabani}", siteVeritabaniAdi(kodAdi));
  const parcalar = [doldur(gizliBilgiler[ad].on), doldur(gizliBilgiler[ad].son)];
  for (const parca of parcalar) {
    if (!/^[A-Za-z0-9:/@._-]*$/.test(parca)) throw new Error(`${ad} şablonunda izinsiz karakter.`);
  }
  return parcalar as [string, string];
};

// --- Sunucuda çalışan betikler (değer taşımaz) ---

// Sitenin o ortamdaki gizli bilgilerini kurar. Var olan değere dokunmaz; yenile ile yenilenebilir
// olanları yeniler (gizli-bilgiler.ts). Her durumda dosyanın sahibini ve iznini düzeltir. Çıktı yalnız dosya adlarıdır.
// Üç aşama: (1) her dosyanın var olup olmadığı okunur, okunamazsa betik durur ve hiçbir şeye
// dokunmaz; (2) kurulacak bütün değerler geçici dosyalara yazılır; (3) hepsi yerine konur.
// Böylece yarıda kalan bir yenilemede değerlerin bir kısmı yeni, bir kısmı eski kalmaz.
export const uretmeBetigi = (
  ortam: Ortam,
  kodAdi: string,
  siteNumarasi: number,
  { yenile = false } = {},
): string => {
  const klasor = gizliKlasor(ortam, kodAdi);
  const kullanici = kutuKullanicisi(ortam, siteNumarasi);
  const kur = (i: number) => `kur_${i}`;
  const satirlar = [
    "set -eu",
    `sudo install -d -m 0755 -o root -g root /srv/altyapi`,
    `sudo install -d -m 0700 -o root -g root ${gizliKok} ${gizliKok}/${ortam} ${klasor}`,
  ];
  adlar.forEach((ad, i) => {
    const dosya = `${klasor}/${gizliBilgiler[ad].dosya}`;
    satirlar.push(
      `durum=$(sudo sh -c 'if [ -s ${dosya} ]; then echo var; else echo yok; fi')`,
      `case "$durum" in var|yok) ;; *) echo "durum okunamadı: ${dosya}" >&2; exit 1 ;; esac`,
      `if [ "$durum" = yok ] || [ ${yenile && gizliBilgiler[ad].yenilenir ? "evet" : "hayir"} = evet ]; then ${kur(i)}=evet; else ${kur(i)}=hayir; fi`,
    );
  });
  adlar.forEach((ad, i) => {
    const gecici = `${klasor}/.${gizliBilgiler[ad].dosya}.yeni`;
    const [on, son] = sablonParcalari(ad, kodAdi);
    // Değer kök kabuğunun değişkeninde üretilir; printf kabuğun kendi komutudur, değer hiçbir
    // sürecin komut satırında görünmez.
    const yaz = [
      "umask 077",
      "r=$(openssl rand -hex 32)",
      `printf '%s%s%s' '${on}' "$r" '${son}' > ${gecici}`,
      `chown ${kullanici}:${kullanici} ${gecici}`,
      `chmod 0400 ${gecici}`,
    ].join(" && ");
    satirlar.push(
      `if [ "$${kur(i)}" = evet ]; then sudo sh -c "${yaz.replaceAll('"', '\\"').replaceAll("$", "\\$")}"; fi`,
    );
  });
  adlar.forEach((ad, i) => {
    const dosya = `${klasor}/${gizliBilgiler[ad].dosya}`;
    const gecici = `${klasor}/.${gizliBilgiler[ad].dosya}.yeni`;
    const ad_ = `${ortam}/${kodAdi}/${gizliBilgiler[ad].dosya}`;
    satirlar.push(
      `if [ "$${kur(i)}" = evet ]; then`,
      `  sudo mv -f ${gecici} ${dosya}`,
      `  echo "${yenile && gizliBilgiler[ad].yenilenir ? "yenilendi  " : "üretildi   "} ${ad_}"`,
      "else",
      `  echo "zaten var   ${ad_}"`,
      "fi",
      `sudo chown ${kullanici}:${kullanici} ${dosya}`,
      `sudo chmod 0400 ${dosya}`,
    );
  });
  return `${satirlar.join("\n")}\n`;
};

export const silmeBetigi = (ortam: Ortam, kodAdi: string): string => {
  const klasor = gizliKlasor(ortam, kodAdi);
  const satirlar = ["set -eu"];
  for (const ad of adlar) satirlar.push(`sudo rm -f ${klasor}/${gizliBilgiler[ad].dosya}`);
  satirlar.push(
    `sudo rmdir ${klasor} 2>/dev/null || true`,
    `echo "silindi     ${ortam}/${kodAdi}"`,
  );
  return `${satirlar.join("\n")}\n`;
};

// --- Sitenin kutusunun compose tanımındaki gizli bilgi parçası ---

// Yayın komutu (kart 0021) site kutusunu bu parçayla kurar; deneme komutu da aynısını kullanır.
export const kutuGizliTanimi = (ortam: Ortam, kodAdi: string, siteNumarasi: number) => {
  const klasor = gizliKlasor(ortam, kodAdi);
  const kullanici = kutuKullanicisi(ortam, siteNumarasi);
  const gizliAdi = (ad: GizliBilgi) => `${ortam}-${kodAdi}-${gizliBilgiler[ad].dosya}`;
  return {
    servis: {
      user: `${kullanici}:${kullanici}`,
      secrets: adlar.map((ad) => ({ source: gizliAdi(ad), target: gizliBilgiler[ad].dosya })),
      environment: Object.fromEntries(
        adlar.map((ad) => [`${ad}${dosyaEki}`, `/run/secrets/${gizliBilgiler[ad].dosya}`]),
      ),
    },
    gizliler: Object.fromEntries(
      adlar.map((ad) => [gizliAdi(ad), { file: `${klasor}/${gizliBilgiler[ad].dosya}` }]),
    ),
  };
};

// --- Denetim: sunucudaki yerleşimin kuralları (testleri: komutlar/testler/gizli-bilgi.test.ts) ---

// Satır biçimi: find -printf '%y %m %U %p' → "d 700 0 /srv/altyapi/gizli/canli".
export const yerlesimHatalari = (satirlar: string[], numaralar: SiteNumaralari): string[] => {
  const hatalar: string[] = [];
  const dosyaAdlari = new Set<string>(adlar.map((ad) => gizliBilgiler[ad].dosya));
  for (const satir of satirlar.filter(Boolean)) {
    // Yol boşluk içerebilir: ilk üç alandan sonrası yoldur.
    const [tur, izin, sahip, ...yolParcalari] = satir.split(" ");
    const yol = yolParcalari.join(" ");
    if (!yol.startsWith(gizliKok)) {
      hatalar.push(`beklenmeyen satır: ${satir}`);
      continue;
    }
    const parcalar = yol.slice(gizliKok.length).split("/").filter(Boolean);
    if (tur === "d") {
      if (izin !== "700" || sahip !== "0")
        hatalar.push(`${yol}: klasör ${izin} ${sahip}, beklenen 700 0`);
      if (parcalar.length >= 1 && !ortamMi(parcalar[0] as string))
        hatalar.push(`${yol}: bilinmeyen ortam`);
      if (
        parcalar.length === 2 &&
        !Object.hasOwn(altyapiGizliKlasorleri, parcalar[1] as string) &&
        numaralar[parcalar[1] as string] === undefined
      ) {
        hatalar.push(`${yol}: numarası olmayan site`);
      }
      if (parcalar.length > 2) hatalar.push(`${yol}: beklenmeyen klasör`);
      continue;
    }
    const [ortam, kodAdi, dosya] = parcalar;
    const altyapiDosyalari = Object.hasOwn(altyapiGizliKlasorleri, kodAdi ?? "")
      ? altyapiGizliKlasorleri[kodAdi ?? ""]
      : undefined;
    if (parcalar.length === 3 && altyapiDosyalari !== undefined) {
      const beklenenSahip = Object.hasOwn(altyapiDosyalari, dosya ?? "")
        ? altyapiDosyalari[dosya ?? ""]
        : undefined;
      if (tur !== "f" || !ortam || !ortamMi(ortam) || beklenenSahip === undefined) {
        hatalar.push(`${yol}: beklenmeyen dosya`);
      } else if (izin !== "400" || sahip !== String(beklenenSahip)) {
        hatalar.push(`${yol}: dosya ${izin} ${sahip}, beklenen 400 ${beklenenSahip}`);
      }
      continue;
    }
    const numara = numaralar[kodAdi ?? ""];
    if (tur !== "f" || parcalar.length !== 3 || !ortam || !ortamMi(ortam) || numara === undefined) {
      hatalar.push(`${yol}: beklenmeyen dosya`);
      continue;
    }
    if (!dosyaAdlari.has(dosya ?? "")) hatalar.push(`${yol}: kayıtta olmayan gizli bilgi`);
    const beklenen = String(kutuKullanicisi(ortam, numara));
    if (izin !== "400" || sahip !== beklenen) {
      hatalar.push(`${yol}: dosya ${izin} ${sahip}, beklenen 400 ${beklenen}`);
    }
  }
  return hatalar;
};

// Sunucudaki bütün rastgele değerleri girdide arar; çıktı yalnız sayılardır.
// Her 64 haneli değerin içindeki bütün 16 haneli diziler (kayan pencere, değer başına 49)
// büyük-küçük harf ayırmadan aranır: değerden 16 hane ya da daha uzun bir parça, nereden
// kesilmiş olursa olsun yakalanır. Kodlanmış (ör. base64) değer yakalanmaz.
// Girdi: projenin kayıt geçmişi ve dosyaları (sunucu-denetle.mts).
export const aramaParcaUzunlugu = 16;
export const degerBasinaParca = 64 - aramaParcaUzunlugu + 1;
// Kök ve önek testte değişir (komutlar/testler/gizli-bilgi.test.ts aynı komutu yerelde çalıştırır).
export const kayittaAramaKomutu = (kok = gizliKok, onek = "sudo ") =>
  `${onek}sh -c 'p=$(mktemp) && trap "rm -f \\"$p\\"" EXIT && find ${kok} -type f -exec grep -ohE "[0-9a-f]{64}" {} + | awk "{ for (i = 1; i <= length(\\$0) - ${aramaParcaUzunlugu - 1}; i++) print substr(\\$0, i, ${aramaParcaUzunlugu}) }" > "$p"; n=$(wc -l < "$p"); if [ "$n" -gt 0 ]; then c=$(grep -c -i -F -f "$p" || true); else c=0; fi; echo "deger=$((n / ${degerBasinaParca})) parca=$n eslesme=$c"'`;
export const kayittaArama = kayittaAramaKomutu();
