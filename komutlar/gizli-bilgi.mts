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
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";

const kok = join(import.meta.dirname, "..");
export const siteKullanicilariDosyasi = join(kok, "sunucu", "site-kullanicilari.json");
export const gizliKok = "/srv/altyapi/gizli";

// Sunucudaki ortamlar ve kutu kullanıcı numaralarının tabanı. Geliştirme ortamı bilgisayardaki
// .env'dir, sunucuda yeri yoktur. Bir sitenin kullanıcı numarası: taban + sitenin numarası.
export const ortamlar = { deneme: 30000, canli: 20000 } as const;
export type Ortam = keyof typeof ortamlar;
const siteNumarasiSiniri = 9999;

export const ortamMi = (deger: string): deger is Ortam => Object.hasOwn(ortamlar, deger);

const kodAdiKalibi = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const kodAdiniDenetle = (kodAdi: string): void => {
  if (!kodAdiKalibi.test(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
};

// --- Sitelerin numaraları (sunucu/site-kullanicilari.json) ---

type SiteNumaralari = Record<string, number>;

export const siteNumaralariniOku = (): SiteNumaralari =>
  JSON.parse(readFileSync(siteKullanicilariDosyasi, "utf8")) as SiteNumaralari;

// Sitenin numarası yoksa bir sonrakini verir ve dosyaya yazar. Numara bir kez verilir, değişmez.
export const siteNumarasiAl = (kodAdi: string): number => {
  kodAdiniDenetle(kodAdi);
  const numaralar = siteNumaralariniOku();
  const var_ = numaralar[kodAdi];
  if (var_ !== undefined) return var_;
  const yeni = Math.max(0, ...Object.values(numaralar)) + 1;
  if (yeni > siteNumarasiSiniri) throw new Error("Site numaraları tükendi.");
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

// Şablonu sitenin adlarıyla doldurur ve {rastgele}'nin önünü ve arkasını ayırır. Parçalar gizli
// değildir; betiğe yalnız izin verilen karakterlerle girer.
export const sablonParcalari = (ad: GizliBilgi, kodAdi: string): [string, string] => {
  kodAdiniDenetle(kodAdi);
  const dolu = gizliBilgiler[ad].sablon.replaceAll("{veritabani}", siteVeritabaniAdi(kodAdi));
  const parcalar = dolu.split("{rastgele}");
  if (parcalar.length !== 2) throw new Error(`${ad} şablonunda {rastgele} tam bir kez geçmeli.`);
  for (const parca of parcalar) {
    if (!/^[A-Za-z0-9:/@._-]*$/.test(parca)) throw new Error(`${ad} şablonunda izinsiz karakter.`);
  }
  return parcalar as [string, string];
};

// --- Sunucuda çalışan betikler (değer taşımaz) ---

// Sitenin o ortamdaki gizli bilgilerini kurar. Var olan değere dokunmaz; yenile ile hepsini
// yeniler. Her durumda dosyanın sahibini ve iznini düzeltir. Çıktı yalnız dosya adlarıdır.
export const uretmeBetigi = (
  ortam: Ortam,
  kodAdi: string,
  siteNumarasi: number,
  { yenile = false } = {},
): string => {
  const klasor = gizliKlasor(ortam, kodAdi);
  const kullanici = kutuKullanicisi(ortam, siteNumarasi);
  const satirlar = [
    "set -eu",
    `sudo install -d -m 0755 -o root -g root /srv/altyapi`,
    `sudo install -d -m 0700 -o root -g root ${gizliKok} ${gizliKok}/${ortam} ${klasor}`,
  ];
  for (const ad of adlar) {
    const dosya = `${klasor}/${gizliBilgiler[ad].dosya}`;
    const gecici = `${klasor}/.${gizliBilgiler[ad].dosya}.yeni`;
    const [on, son] = sablonParcalari(ad, kodAdi);
    // Değer kök kabuğunun değişkeninde üretilir; printf kabuğun kendi komutudur, değer hiçbir
    // sürecin komut satırında görünmez. Önce geçici dosyaya yazılır, sonra tek adımda yerine konur.
    const yaz = [
      "umask 077",
      "r=$(openssl rand -hex 32)",
      `printf '%s%s%s' '${on}' "$r" '${son}' > ${gecici}`,
      `chown ${kullanici}:${kullanici} ${gecici}`,
      `chmod 0400 ${gecici}`,
      `mv -f ${gecici} ${dosya}`,
    ].join(" && ");
    satirlar.push(
      `if sudo test -s ${dosya} && [ ${yenile ? "evet" : "hayir"} = hayir ]; then`,
      `  echo "zaten var   ${ortam}/${kodAdi}/${gizliBilgiler[ad].dosya}"`,
      "else",
      `  sudo sh -c "${yaz.replaceAll('"', '\\"').replaceAll("$", "\\$")}"`,
      `  echo "${yenile ? "yenilendi  " : "üretildi   "} ${ortam}/${kodAdi}/${gizliBilgiler[ad].dosya}"`,
      "fi",
      `sudo chown ${kullanici}:${kullanici} ${dosya}`,
      `sudo chmod 0400 ${dosya}`,
    );
  }
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
    const [tur, izin, sahip, yol] = satir.split(" ");
    if (!yol?.startsWith(gizliKok)) {
      hatalar.push(`beklenmeyen satır: ${satir}`);
      continue;
    }
    const parcalar = yol.slice(gizliKok.length).split("/").filter(Boolean);
    if (tur === "d") {
      if (izin !== "700" || sahip !== "0")
        hatalar.push(`${yol}: klasör ${izin} ${sahip}, beklenen 700 0`);
      if (parcalar.length >= 1 && !ortamMi(parcalar[0] as string))
        hatalar.push(`${yol}: bilinmeyen ortam`);
      if (parcalar.length === 2 && numaralar[parcalar[1] as string] === undefined) {
        hatalar.push(`${yol}: numarası olmayan site`);
      }
      if (parcalar.length > 2) hatalar.push(`${yol}: beklenmeyen klasör`);
      continue;
    }
    const [ortam, kodAdi, dosya] = parcalar;
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

// Sunucudaki bütün rastgele değerleri desen yapıp girdide arar; çıktı yalnız sayılardır.
// Girdi: projenin bütün kayıt geçmişi ve izlenen dosyaları (sunucu-denetle.mts).
export const kayittaArama = `sudo sh -c 'p=$(mktemp) && find ${gizliKok} -type f -exec grep -ohE "[0-9a-f]{64}" {} + > "$p"; n=$(wc -l < "$p"); if [ "$n" -gt 0 ]; then c=$(grep -c -F -f "$p" || true); else c=0; fi; rm -f "$p"; echo "desen=$n eslesme=$c"'`;
