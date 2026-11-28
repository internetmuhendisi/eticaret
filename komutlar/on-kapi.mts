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
import { hostname } from "node:os";
import { join } from "node:path";
import { kimlikSemasi } from "../cekirdek/ayar-semasi/kimlik.ts";
import { dosyaSinirlari } from "../cekirdek/kayitlar/dosya.ts";
import type { HataKodu } from "../cekirdek/kayitlar/kapi.ts";
import { type Dil, diller, metinOkuyucu } from "../cekirdek/metinler/metin.ts";
import { bellekBaytlari, kaliciKutu, kutuKuraliDogru, yenidenBaslama } from "./kutu-kurali.mts";
import { kok, sshKomutu, kayitlariOku as sunuculariOku } from "./sunucu.mts";

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

// Sitenin kimliğindeki deneme adresi bu adres olmalı (kart 0023): kimlikte belge olarak durur,
// trafiği ön kapının kod adından ürettiği adres alır. Her sitenin deneme adresi vardır.
export const kimlikAdresiHatasi = (kimlik: {
  kodAdi: string;
  adresler: { deneme?: string | undefined; canli?: string | undefined };
}): string | undefined => {
  const beklenen = `https://${denemeAdresi(kimlik.kodAdi)}`;
  if (kimlik.adresler.deneme === undefined)
    return `kimlikte deneme adresi yok, beklenen ${beklenen}`;
  if (kimlik.adresler.deneme !== beklenen) {
    return `kimlikteki deneme adresi ${kimlik.adresler.deneme}, beklenen ${beklenen}`;
  }
  // Asıl adres (karar 0202) varsa ön kapının karşılayabileceği biçimde olmalı.
  if (kimlik.adresler.canli !== undefined) {
    const asil = asilAdresiCoz(kimlik.adresler.canli);
    if ("hata" in asil) return `kimlikteki asıl adres: ${asil.hata}`;
  }
  return undefined;
};

// --- Asıl adres (karar 0202) ---

// Hiçbir siteye alt adres olarak verilemeyen adlar: altyapının işlerine ve e-postaya ayrılır.
export const ayrilmisAltAdlar = [
  "deneme",
  "www",
  "panel",
  "yonetim",
  "sahip",
  "admin",
  "api",
  "kapi",
  "posta",
  "mail",
  "smtp",
  "imap",
  "altyapi",
  "destek",
  "durum",
  "yardim",
  "cdn",
  "statik",
  "ns1",
  "ns2",
] as const;

// Alt adresin adı kod adının kuralına uyar ve ayrılmış değildir.
export const altAdHatasi = (ad: string): string | undefined => {
  if (!kodAdiGecerli(ad)) return `alt adres adı geçersiz: ${ad} (küçük harf, rakam ve tek tire)`;
  if ((ayrilmisAltAdlar as readonly string[]).includes(ad)) return `alt adres adı ayrılmış: ${ad}`;
  return undefined;
};

export const altAdres = (ad: string): string => {
  const hata = altAdHatasi(ad);
  if (hata) throw new Error(hata);
  return `${ad}.${altyapiAlanAdi}`;
};

export type AsilAdres = { tur: "alt"; ad: string } | { tur: "kendi"; ad: string };

// Kimlikteki asıl adres (adresler.canli): https, yalnız ad (yol, port, kullanıcı yok), küçük harf.
// eticaretmagazasi.com altında tek düzeyli alt adres; başka bir ad mağazanın kendi alan adıdır ve www'suz
// yazılır (www. hâli ona yönlenir).
export const asilAdresiCoz = (adres: string): AsilAdres | { hata: string } => {
  const bicimHatasi = { hata: `asıl adres yalnız https://<ad> biçiminde olmalı: ${adres}` };
  if (!URL.canParse(adres)) return bicimHatasi;
  const adresMi = new URL(adres);
  if (
    adresMi.protocol !== "https:" ||
    adresMi.username ||
    adresMi.password ||
    adresMi.port ||
    adresMi.search ||
    adresMi.hash ||
    !["", "/"].includes(adresMi.pathname) ||
    adres.replace(/\/$/, "") !== `https://${adresMi.hostname}`
  ) {
    return bicimHatasi;
  }
  const ad = adresMi.hostname;
  // Türkçe harfli alan adı punycode biçiminde yazılır (çiçek.com → xn--iek-qna.com; URL bunu kendiliğinden çevirir).
  if (!/^((xn--)?[a-z0-9]+(-[a-z0-9]+)*\.)+([a-z]{2,}|xn--[a-z0-9]+)$/.test(ad))
    return { hata: `asıl adres geçersiz: ${ad}` };
  if (ad === altyapiAlanAdi) return { hata: `asıl adres altyapının kendi adı olamaz: ${ad}` };
  if (ad.endsWith(`.${altyapiAlanAdi}`)) {
    const etiket = ad.slice(0, -altyapiAlanAdi.length - 1);
    // Noktalı etiket (iki düzeyli alt adres) kod adının kuralına takılır.
    const hata = altAdHatasi(etiket);
    return hata ? { hata } : { tur: "alt", ad };
  }
  if (ad.startsWith("www.")) return { hata: `kendi alan adı www'suz yazılır: ${ad}` };
  return { tur: "kendi", ad };
};

// Asıl adresin ön kapıda karşılanan adları: kendi alan adında www. hâli de (ona yönlenir).
export const asilAdresAdlari = (asil: AsilAdres): string[] =>
  asil.tur === "kendi" ? [asil.ad, `www.${asil.ad}`] : [asil.ad];

// Altyapının kendi adresi: iki tire taşır, hiçbir sitenin adı olamaz (kimlik şeması). Ön kapının asıl adres
// satırını gerçek sunucuda deneyen komut bu adı kullanır (alan-adi-denemesi.mts).
export const altyapiAdresiMi = (ad: string): boolean =>
  new RegExp(`^[a-z0-9]+--[a-z0-9]+(-[a-z0-9]+)*\\.${altyapiAlanAdi.replaceAll(".", "\\.")}$`).test(
    ad,
  );

// Ön kapının asıl adres olarak karşılayabileceği ad: geçerli asıl adres ya da altyapının kendi adresi.
const karsilanabilir = (ad: string): boolean =>
  altyapiAdresiMi(ad) || !("hata" in asilAdresiCoz(`https://${ad}`));

// İki site aynı asıl adresi taşıyamaz.
export const asilAdresCakismalari = (
  kimlikler: { kodAdi: string; adresler: { canli?: string | undefined } }[],
): string[] => {
  const gorulen = new Map<string, string>();
  const hatalar: string[] = [];
  for (const { kodAdi, adresler } of kimlikler) {
    if (adresler.canli === undefined) continue;
    const asil = asilAdresiCoz(adresler.canli);
    if ("hata" in asil) continue;
    const oteki = gorulen.get(asil.ad);
    if (oteki) hatalar.push(`${kodAdi} ile ${oteki} aynı asıl adresi taşıyor: ${asil.ad}`);
    gorulen.set(asil.ad, kodAdi);
  }
  return hatalar;
};

// Bir adın sunucunun ad çözücüsündeki cevabı sunucunun kendi adresleri olmalı: IPv4 tek adres ve aynı,
// IPv6 tek adres ve aynı. Vekil açık ya da kayıt eksikse ad ön kapıya girmez (karar 0202).
export const cozulmeHatasi = (
  v4: string[],
  v6: string[],
  ipv4: string,
  ipv6: string,
): string | undefined => {
  if (v4.length === 0 && v6.length === 0) return "çözülmüyor";
  if (v4.length !== 1 || v4[0] !== ipv4) return `IPv4 ${v4.join(", ") || "yok"}, beklenen ${ipv4}`;
  if (v6.length !== 1 || !ayniAdres(v6[0], ipv6)) {
    return `IPv6 ${v6.join(", ") || "yok"}, beklenen ${ipv6}`;
  }
  return undefined;
};

// Yoklama kutusunun adresi. İki tire yan yana hiçbir kod adında geçemez (kimlik şeması),
// bu yüzden bu adres hiçbir sitenin deneme adresiyle çakışmaz.
export const yoklamaAdi = "kapi--yoklama";
export const yoklamaAdresi = `${yoklamaAdi}.${denemeAlani}`;

// Hata izleme aracının adresi (kart 0022, karar 0036). Bu da iki tire taşır, hiçbir sitenin
// adresiyle çakışmaz. Dışarıya yalnız hata gönderim yolu açıktır; yönetim ekranı ve okuma ucu
// ön kapıdan geçmez (komutlar/hata-izleme.mts).
export const hataIzlemeAdi = "altyapi--hata";
export const hataIzlemeAdresi = `${hataIzlemeAdi}.${denemeAlani}`;
// Hata izleme kutusunun ağı. Ağı ön kapı kurar, içinde yalnız ön kapı ve hata izleme kutusu
// durur; ağ dışarıya kapalıdır (internal), hata izleme kutusu internete çıkamaz.
export const hataIzlemeOrtami = "deneme";
export const hataIzlemeAgi = `altyapi-hata-izleme-${hataIzlemeOrtami}`;
export const hataIzlemeKutusu = `hata-izleme-${hataIzlemeOrtami}`;
export const hataIzlemePortu = 8000;
// Bir olayın en büyük boyutu (Bugsink'in de sınırı 1 MiB'dir).
const hataGonderimSiniri = "1MB";

// Dosya yükleme adreslerinin gövde sınırı (kart 0094, karar 0165): dosya sınırı ve küçük bir pay. Sınırı aşan istek
// kutuya ulaşmadan 413 alır; kapı aynı sınırı ikinci katman olarak uygular (cekirdek/kapi/uc.ts). Yükleme uçlarının
// adı "-yukle" ile biter (uç belgesi).
export const yuklemeGovdeSiniri = dosyaSinirlari.enCokBayt + 64 * 1024;
export const yuklemeYoluKalibi = "^/kapi/yonetici/[a-z-]+-yukle$";

// Alan adında deneme adreslerini sunucuya bağlayan kayıtlar: tek joker kayıt her deneme
// adresini karşılar, yeni site için alan adına dokunulmaz. Vekil kapalıdır: ziyaretçi doğrudan
// Almanya'daki sunucuya bağlanır (karar 0009), sertifikayı Caddy alır.
export const alanAdiKayitlari = (ipv4: string, ipv6: string) => [
  { type: "A", name: `*.${denemeAlani}`, content: ipv4, proxied: false },
  { type: "AAAA", name: `*.${denemeAlani}`, content: ipv6, proxied: false },
];

// --- Sunucudaki yerleşim ---

export const caddyGoruntusu = "caddy:2.10.2-alpine";
export const onKapiKutusu = "on-kapi";
export const onKapiKlasoru = "/srv/altyapi/on-kapi";
export const agAdi = "altyapi";
const proje = "altyapi-on-kapi";
// Caddy'nin kutu kullanıcısı. Sitelerin numaraları 20000 ve 30000'den başlar (karar 0031).
export const caddyKullanicisi = 10080;
const yoklamaKullanicisi = 10081;
export const yoklamaHedefi = "on-kapi-yoklama:3000";

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

// --- Bakım sayfası (kart 0043, karar 0038) ---

export const saglikYolu = "/kapi/herkese-acik/saglik";
export const bakimDamgasi = "data-bakim-sayfasi";
const bakimSiniri = "BAKIM_SAYFASI_SONU";
// Uygulama düşünce kapıya gelen istek de kapının kendi zarfıyla cevap alır (karar 0024).
const bakimHataKodu: HataKodu = "hizmet-kullanilamiyor";

// Sayfa ön kapının ayarına gömülür; süslü ayraç Caddy'nin yer tutucusu olurdu, kaçırılır.
const htmlKacir = (metin: string): string =>
  metin.replace(/[&<>"'`{}]/g, (harf) => `&#${harf.charCodeAt(0)};`);

export type BakimBilgisi = {
  ad: string;
  dil?: string | undefined;
  metin?: string | undefined;
  // Sitenin asıl adresi ve arama motoru ayarı (karar 0202); ön kapı aynı dosyalardan okur.
  asil?: AsilAdres | undefined;
  aramaAcik?: boolean | undefined;
};

export const bakimSayfasi = ({ ad, dil, metin }: BakimBilgisi): string => {
  const secilen: Dil = diller.find((d) => d === dil) ?? "tr";
  const oku = metinOkuyucu(secilen);
  const degerler: Record<string, string> = {
    __DAMGA__: bakimDamgasi,
    __AD__: htmlKacir(ad),
    __BASLIK__: htmlKacir(oku("vitrin.bakim.baslik")),
    __METIN__: htmlKacir(metin ?? oku("vitrin.bakim.metin")),
  };
  // Tek geçiş ve işlevle değiştirme: değerdeki "$" ya da yer tutucuya benzeyen metin yorumlanmaz.
  return kaynak("bakim.html")
    .replace('lang="tr"', () => `lang="${secilen}"`)
    .replace(/__[A-Z]+__/g, (yer) => degerler[yer] ?? yer);
};

// Sitenin Caddy satırı. Sağlık ucu her zaman kutuya gider: kontroller gerçek durumu görür. Yalnız
// tam adresle ve GET ile eşleşir: Caddy yolu temizleyerek eşleştirip ham adresle iletir, gevşek
// eşleşme elle bakımda uygulamaya yol açardı (ölçüldü). Ön kapı sağlık ucunu yoklar; Caddy hataları
// üst üste değil biriktirerek sayar (ölçüldü), eşik bu yüzden yüksektir, tepki süresi yaklaşık 30
// saniyedir. Kutu kapalıysa ya da 30 saniye cevap vermezse istek de aynı sayfaya düşer. Elle bakımda
// geri kalan her yol, yönetim paneli dahil, kapanır.
export const siteSatiri = (
  adres: string,
  hedef: string,
  bilgi: BakimBilgisi,
  // Arama motoru kuralı (karar 0202): deneme adresi her zaman kapalı; asıl adres ayara göre.
  { elleBakim = false, aramaAcik = false } = {},
): string => {
  const denemeMi = adres.endsWith(`.${denemeAlani}`);
  if (denemeMi) {
    denemeSatiri(adres, hedef);
    if (aramaAcik) throw new Error(`Deneme adresi arama motorlarına açılamaz: ${adres}`);
  } else if (!karsilanabilir(adres)) {
    throw new Error(`Ne deneme ne asıl adres: ${adres}`);
  } else if (!/^[a-z0-9-]+:\d+$/.test(hedef)) {
    throw new Error(`Geçersiz kutu hedefi: ${hedef}`);
  }
  const sayfa = bakimSayfasi(bilgi);
  if (sayfa.includes(bakimSiniri)) throw new Error("Bakım sayfası ayrılmış satır içeriyor.");
  const zarf = bakimZarfi();
  const ziyaretci = elleBakim
    ? "\t\terror 503\n"
    : `\t\t@yukleme path_regexp ${yuklemeYoluKalibi}
\t\trequest_body @yukleme {
\t\t\tmax_size ${yuklemeGovdeSiniri}
\t\t}
\t\treverse_proxy ${hedef} {
\t\t\thealth_uri ${saglikYolu}
\t\t\thealth_interval 5s
\t\t\thealth_timeout 4s
\t\t\thealth_fails 6
\t\t\ttransport http {
\t\t\t\tresponse_header_timeout 30s
\t\t\t}
\t\t}\n`;
  return `${adres} {
${denemeMi ? "\timport deneme\n" : aramaAcik ? "" : "\timport arama-kapali\n"}\t@saglik {
\t\tmethod GET HEAD
\t\texpression \`{http.request.uri} == "${saglikYolu}"\`
\t}
\thandle @saglik {
\t\treverse_proxy ${hedef} {
\t\t\ttransport http {
\t\t\t\tresponse_header_timeout 30s
\t\t\t}
\t\t}
\t}
\thandle {
${ziyaretci}\t}
\thandle_errors 502 503 504 {
\t\timport bakim-basliklari
\t\t@kapi path /kapi/*
\t\thandle @kapi {
\t\t\theader Content-Type "application/json"
\t\t\trespond \`${zarf}\` 503
\t\t}
\t\thandle {
\t\t\theader Content-Type "text/html; charset=utf-8"
\t\t\trespond <<${bakimSiniri}
${sayfa}${bakimSiniri} 503
\t\t}
\t}
}
`;
};

// Elle açılan bakımın işareti sunucudadır: yayın, geri dönüş ve yeniden kurulum satırları bu listeden
// kurar, bakım kendiliğinden kapanmaz. Dosyanın içeriği açıldığı zamandır.
const bakimKlasoru = () => `${onKapiKlasoru}/bakim-acik`;

export const bakimListesiKomutu = () =>
  `sudo sh -c 'cd ${bakimKlasoru()} 2>/dev/null || exit 0; for f in *; do [ -f "$f" ] && printf "%s %s\\n" "$f" "$(cat "$f")"; done; exit 0'`;

// Adı geçersiz dosya atlanır: elle bırakılmış bir dosya bütün sitelerin yayınını durdurmasın.
export const bakimListesiniCoz = (cikti: string): Map<string, string> => {
  const liste = new Map<string, string>();
  for (const satir of cikti.split("\n").filter((s) => s.trim())) {
    const [kodAdi = "", zaman = ""] = satir.trim().split(" ");
    if (kodAdiGecerli(kodAdi)) liste.set(kodAdi, zaman);
  }
  return liste;
};

export const bakimdakiSiteleriOku = (ipv4: string): Map<string, string> => {
  const sonuc = sshKomutu(ipv4, bakimListesiKomutu());
  if (sonuc.status !== 0) throw new Error(`Bakım listesi okunamadı: ${sonuc.stderr.trim()}`);
  return bakimListesiniCoz(sonuc.stdout);
};

// Elle açık bakım unutulmasın: 24 saatten uzun açık kaldıysa denetim kırmızıdır.
export const bakimSiniriSaat = 24;
export const bakimSuresiHatasi = (zaman: string, simdi: number): string | undefined => {
  const baslangic = Date.parse(zaman);
  if (Number.isNaN(baslangic)) return `bakımın açıldığı zaman okunamadı: ${zaman}`;
  return simdi - baslangic > bakimSiniriSaat * 3_600_000
    ? `elle bakım ${bakimSiniriSaat} saatten uzun süredir açık (${zaman})`
    : undefined;
};

// Geri almada önceki zaman korunur: 24 saat sayacı başa dönmesin, kayıtta da başarısız deneme görünsün.
// Unutulan bakım denetimde kırmızıdır ama yayını durdurmaz: başka sitenin güvenlik yayını engellenmesin.
export const bakimUnutulduMetni = "elle bakım unutulmamış";
// Asıl adresin ölçümleri (karar 0202) öteki sitelerin yayınını durdurmaz: o sitenin adres sorunu (örneğin mağaza
// sahibinin açmadığı kayıt) başka sitenin yayınıyla değişmez.
export const asilAdresOlcumOneki = "asıl adres";
export const yayiniDurdurmayanSatir = (satir: string): boolean =>
  satir.includes(bakimUnutulduMetni) || satir.includes(`: ${asilAdresOlcumOneki}`);

export const bakimIsaretiBetigi = (
  kodAdi: string,
  acik: boolean,
  {
    zaman,
    islem = acik ? "acildi" : "kapandi",
  }: { zaman?: string | undefined; islem?: string } = {},
): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  if (zaman !== undefined && !/^[0-9TZ:.-]+$/.test(zaman))
    throw new Error(`Geçersiz zaman: ${zaman}`);
  const dosya = `${bakimKlasoru()}/${kodAdi}`;
  const yaz =
    zaman === undefined
      ? `[ -f ${dosya} ] || printf '%s\\n' "$z" > ${dosya}`
      : `printf '%s\\n' '${zaman}' > ${dosya}`;
  return `set -eu
sudo bash -s <<'BAKIM_SONU'
set -eu
z=$(date -u +%Y-%m-%dT%H:%M:%SZ)
install -d -m 0755 -o root -g root ${bakimKlasoru()}
${acik ? yaz : `rm -f ${dosya}`}
printf '{"zaman":"%s","site":"${kodAdi}","islem":"${islem}"}\n' "$z" >> ${onKapiKlasoru}/bakim-kaydi.jsonl
BAKIM_SONU
`;
};

// Hata izleme adresinin Caddy satırı: yalnız gönderim yolları (store, envelope) ve tarayıcının
// ön sorusu (OPTIONS) kutuya gider, gövde sınırlıdır; geri kalan her yol 404'tür.
export const hataIzlemeSatiri = (): string =>
  `${hataIzlemeAdresi} {
\timport deneme
\t@gonderim {
\t\tmethod POST OPTIONS
\t\tpath_regexp ^/api/[0-9]+/(store|envelope)/$
\t}
\thandle @gonderim {
\t\trequest_body {
\t\t\tmax_size ${hataGonderimSiniri}
\t\t}
\t\treverse_proxy ${hataIzlemeKutusu}:${hataIzlemePortu}
\t}
\thandle {
\t\trespond 404
\t}
}
`;

// Kutuların ortak güvenlik ayarı: dosya sistemi salt okunur, yetki yükseltme kapalı, tek yetki
// düşük kapıları açmak. Görüntüdeki caddy programı bu yetkiyi dosyasında taşır; yetki kutuda
// yoksa program hiç çalışmaz (ölçüldü). Sunucu yeniden başlayınca kutular kendiliğinden açılır
// (kutu-kurali.mts).
const kisitli = {
  ...kaliciKutu,
  cap_drop: ["ALL"],
  cap_add: ["NET_BIND_SERVICE"],
  security_opt: ["no-new-privileges:true"],
  read_only: true,
};

// --- Yayındaki siteler (kart 0021, karar 0035) ---

// Sitenin yayınları sunucuda /srv/altyapi/yayin/<ortam>/<kod adı>/ klasöründedir; etkin dosyası o an
// trafiği alan yayının numarasını taşır. Ön kapının site satırları ve ağları bu listeden kurulur:
// listenin tek kaynağı sunucudaki etkin dosyalarıdır (yayın komutu yazar, yayin.mts).
// Bir sitenin (ya da altyapı adresinin) ön kapı satırının, ön kapı klasörüne göre yolu.
export const onKapiSatirDosyasi = (ad: string): string => `caddy/siteler/${ad}.caddy`;

export const yayinKoku = "/srv/altyapi/yayin";
// Deneme adresi olan tek ortam; canlı ortam alan adı bağlanınca eklenir.
export const yayinOrtami = "deneme";
export const siteAgiAdi = (ortam: string, kodAdi: string): string => {
  if (!kodAdiGecerli(kodAdi)) throw new Error(`Geçersiz kod adı: ${kodAdi}`);
  return `site-${ortam}-${kodAdi}`;
};
export const siteKutusuAdi = (ortam: string, kodAdi: string, no: number): string => {
  if (!Number.isInteger(no) || no < 1) throw new Error(`Geçersiz yayın numarası: ${no}`);
  return `${siteAgiAdi(ortam, kodAdi)}-${no}`;
};
export type YayindakiSiteler = Record<string, number>;

// Çıktı satırı: "<kod adı> <yayın no>". Klasör yoksa liste boştur; okunamazsa hata.
export const yayindakiSitelerKomutu = `sudo sh -c 'k=${yayinKoku}/${yayinOrtami}; [ -d "$k" ] || exit 0; for d in "$k"/*/; do [ -f "$d/etkin" ] || continue; printf "%s %s\\n" "$(basename "$d")" "$(cat "$d/etkin")"; done'`;

export const yayindakiSiteleriCoz = (cikti: string): YayindakiSiteler => {
  const siteler: YayindakiSiteler = {};
  for (const satir of cikti.split("\n").filter((s) => s.trim())) {
    const [kodAdi = "", no = "", ...fazla] = satir.trim().split(" ");
    if (fazla.length > 0 || !kodAdiGecerli(kodAdi) || !/^[1-9]\d*$/.test(no)) {
      throw new Error(`Yayın listesinde bozuk satır: ${satir}`);
    }
    siteler[kodAdi] = Number(no);
  }
  return siteler;
};

// Yayın kilidi: ön kapıyı ve yayınları değiştiren komutlar (yayın, geri dönüş, sunucu kurulumu,
// gizli bilgi yenileme) sunucuda aynı anda çalışmaz; yoksa biri ötekinin site satırını silebilir.
// Kilit sunucuda bir klasördür (mkdir tek adımdır); kimin aldığı içine yazılır.
export const yayinKilidi = `${yayinKoku}/.kilit`;
const kilitSahibi = (): string => `${hostname().replace(/[^A-Za-z0-9.-]/g, "-")}-${process.pid}`;

export const yayinKilidiyle = async <T,>(ipv4: string, is: () => Promise<T> | T): Promise<T> => {
  // Kilit başkasındaysa 3 ile çıkar; başka her hata (ssh, sudo) kilidin alınamaması demektir.
  const al = sshKomutu(
    ipv4,
    `sudo sh -c 'install -d -m 0755 -o root -g root /srv/altyapi ${yayinKoku} || exit 1; mkdir ${yayinKilidi} 2>/dev/null || exit 3; printf "%s %s\\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" ${kilitSahibi()} > ${yayinKilidi}/sahip'`,
  );
  if (al.status === 3) {
    const sahip = sshKomutu(
      ipv4,
      `sudo cat ${yayinKilidi}/sahip 2>/dev/null || true`,
    ).stdout.trim();
    throw new Error(
      `Sunucuda başka bir yayın işi sürüyor (${sahip || "sahibi okunamadı"}). Takılı kaldıysa sunucuda: sudo rm -r ${yayinKilidi}`,
    );
  }
  if (al.status !== 0) {
    throw new Error(`Yayın kilidi alınamadı (sunucuya ulaşılamadı?): ${al.stderr.trim()}`);
  }
  try {
    return await is();
  } finally {
    const birak = sshKomutu(ipv4, `sudo rm -rf ${yayinKilidi}`);
    if (birak.status !== 0) {
      process.stderr.write(
        `Uyarı: yayın kilidi bırakılamadı. Sunucuda elle: sudo rm -r ${yayinKilidi}\n`,
      );
    }
  }
};

export const yayindakiSiteleriOku = (ipv4: string): YayindakiSiteler => {
  const sonuc = sshKomutu(ipv4, yayindakiSitelerKomutu);
  if (sonuc.status !== 0) throw new Error(`Yayındaki siteler okunamadı: ${sonuc.stderr.trim()}`);
  return yayindakiSiteleriCoz(sonuc.stdout);
};

// Ön kapı her yayındaki sitenin ağına bağlanır; dışarıya çıkış ve IPv6 ortak ağdan kalır.
const siteAglari = (siteler: YayindakiSiteler): string[] =>
  Object.keys(siteler)
    .sort()
    .map((kodAdi) => siteAgiAdi(yayinOrtami, kodAdi));

export const onKapiTanimi = (siteler: YayindakiSiteler = {}) => ({
  name: proje,
  services: {
    caddy: {
      image: caddyGoruntusu,
      container_name: onKapiKutusu,
      user: `${caddyKullanicisi}:${caddyKullanicisi}`,
      ports: ["80:80/tcp", "443:443/tcp"],
      ...kisitli,
      tmpfs: ["/tmp"],
      volumes: [
        `${onKapiKlasoru}/caddy:/etc/caddy:ro`,
        `${onKapiKlasoru}/veri:/data`,
        `${onKapiKlasoru}/ayar:/config`,
      ],
      // Ortak ağ varsayılan çıkıştır (gw_priority); site ağları yalnız sitelere ulaşmak içindir.
      networks: {
        [agAdi]: { gw_priority: 100 },
        [hataIzlemeAgi]: {},
        ...Object.fromEntries(siteAglari(siteler).map((ag) => [ag, {}])),
      },
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
    // Hata izleme kutusunun ağı burada kurulur; hata izleme tanımında dışarıdandır.
    [hataIzlemeAgi]: { name: hataIzlemeAgi, internal: true },
    // Site ağlarını veritabanı kutusunun tanımı kurar (sunucu-veritabani.mts); burada dışarıdandır.
    ...Object.fromEntries(siteAglari(siteler).map((ag) => [ag, { name: ag, external: true }])),
  },
});

// Sunucuda çalışan betik. Dosyalar girdiden yazılır; komut tekrar çalıştırılabilir.
// Caddy zaten açıksa ayarı yeniden okur (bağlantılar kesilmez).
// Site satırlarının adı sitenin kod adıdır (ya da yoklama adı); dosya adı ve betik bundan kurulur.
export const kurmaBetigi = (
  siteSatirlari: Record<string, string>,
  siteler: YayindakiSiteler = {},
): string => {
  for (const ad of Object.keys(siteSatirlari)) {
    // Site satırı kod adıyla, altyapının satırı iki tireli adıyla (yoklama, hata izleme, alan adı denemesi).
    if (!kodAdiGecerli(ad) && !/^[a-z0-9]+--[a-z0-9]+(-[a-z0-9]+)*$/.test(ad)) {
      throw new Error(`Geçersiz site satırı adı: ${ad}`);
    }
  }
  const dosyalar: Record<string, string> = {
    "caddy/Caddyfile": kaynak("Caddyfile"),
    "yoklama/Caddyfile": kaynak("yoklama.Caddyfile"),
    "compose.json": `${JSON.stringify(onKapiTanimi(siteler), null, 2)}\n`,
    ...Object.fromEntries(
      Object.entries(siteSatirlari).map(([ad, satir]) => [onKapiSatirDosyasi(ad), satir]),
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

// Kutu kapalıyken kapıdaki istek bakım zarfıyla 503 alır; süslü ayraçlar Caddy yer tutucusu sanılmasın diye kaçırılır.
const bakimZarfi = (): string =>
  JSON.stringify({ basarili: false, hata: { kod: bakimHataKodu } }).replace(
    /[{}]/g,
    (ayrac) => `\\${ayrac}`,
  );

// Asıl adresi olan sitenin deneme adresi (karar 0202): sağlık ucu ve robots.txt yerinde kalır, geri
// kalan her istek yolu ve sorgusuyla asıl adrese kalıcı olarak yönlenir.
export const denemeYonlendirmeSatiri = (adres: string, asil: string, hedef: string): string => {
  denemeSatiri(adres, hedef);
  if (!karsilanabilir(asil)) throw new Error(`Asıl adres değil: ${asil}`);
  return `${adres} {
\timport deneme
\t@saglik {
\t\tmethod GET HEAD
\t\texpression \`{http.request.uri} == "${saglikYolu}"\`
\t}
\thandle @saglik {
\t\treverse_proxy ${hedef} {
\t\t\ttransport http {
\t\t\t\tresponse_header_timeout 30s
\t\t\t}
\t\t}
\t}
\thandle {
\t\tredir https://${asil}{uri} 308
\t}
\thandle_errors 502 503 504 {
\t\timport bakim-basliklari
\t\theader Content-Type "application/json"
\t\trespond \`${bakimZarfi()}\` 503
\t}
}
`;
};

// Kendi alan adının www. hâli www'suz asıl adrese kalıcı olarak yönlenir (karar 0202).
export const wwwYonlendirmeSatiri = (asil: string): string => {
  const cozulen = asilAdresiCoz(`https://${asil}`);
  if ("hata" in cozulen || cozulen.tur !== "kendi")
    throw new Error(`Kendi alan adı değil: ${asil}`);
  return `www.${asil} {\n\tredir https://${asil}{uri} 308\n}\n`;
};

// Yayındaki sitelerin satırları; her satır sitenin etkin kutusunu gösterir. Asıl adresi olan sitenin
// bütün adları (kendi alan adında www. hâli de) çözülmüşse asıl adres karşılanır ve deneme adresi ona
// yönlenir; çözülmemişse site yalnız deneme adresinde açılır.
export const siteSatirlari = (
  siteler: YayindakiSiteler,
  bilgiler: Record<string, BakimBilgisi> = {},
  bakimdakiler: ReadonlyMap<string, string> = new Map(),
  cozulenler: ReadonlySet<string> = new Set(),
): Record<string, string> => {
  const gorulenAsillar = new Set<string>();
  return Object.fromEntries(
    Object.entries(siteler)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kodAdi, no]) => {
        const hedef = `${siteKutusuAdi(yayinOrtami, kodAdi, no)}:3000`;
        const bilgi = bilgiler[kodAdi] ?? { ad: kodAdi };
        const elleBakim = bakimdakiler.has(kodAdi);
        const { asil } = bilgi;
        // Aynı asıl adresi ikinci kez taşıyan site deneme adresinde kalır: iki tanım bütün ön kapıyı durdururdu.
        const tekrar = asil !== undefined && gorulenAsillar.has(asil.ad);
        if (tekrar)
          process.stderr.write(
            `Uyarı: ${kodAdi} asıl adresi ${asil.ad} başka sitede; kullanılmadı.\n`,
          );
        if (asil !== undefined) gorulenAsillar.add(asil.ad);
        if (
          asil === undefined ||
          tekrar ||
          !asilAdresAdlari(asil).every((ad) => cozulenler.has(ad))
        ) {
          return [kodAdi, siteSatiri(denemeAdresi(kodAdi), hedef, bilgi, { elleBakim })];
        }
        return [
          kodAdi,
          [
            denemeYonlendirmeSatiri(denemeAdresi(kodAdi), asil.ad, hedef),
            siteSatiri(asil.ad, hedef, bilgi, { elleBakim, aramaAcik: bilgi.aramaAcik === true }),
            ...(asil.tur === "kendi" ? [wwwYonlendirmeSatiri(asil.ad)] : []),
          ].join("\n"),
        ];
      }),
  );
};

// Sayfadaki ad ve metin sitenin yayındaki klasöründen okunur: çalışan yayınla aynıdır.
// Okunamayan ya da bozuk bilgi kurulumu durdurmaz: bir sitenin dosyası bütün sitelerin yayınını ve
// acil geri dönüşü engellemesin. Sayfada kod adı görünür, uyarı yazılır.
export const bakimBilgisiCoz = (
  kodAdi: string,
  kimlikMetni: string,
  ayarMetni: string,
): BakimBilgisi => {
  const nesne = (metin: string): Record<string, unknown> => {
    const deger: unknown = metin.trim() ? JSON.parse(metin) : {};
    return typeof deger === "object" && deger !== null ? (deger as Record<string, unknown>) : {};
  };
  const yazi = (deger: unknown) => (typeof deger === "string" && deger.trim() ? deger : undefined);
  const { gorunenAd, adresler } = nesne(kimlikMetni);
  const { dil, bakimMetni, aramaMotorlarinaAcik } = nesne(ayarMetni);
  // Geçersiz asıl adres yok sayılır (site deneme adresinde kalır); yayın komutu ve birim testindeki kimlik denetimi
  // (kimlikAdresiHatasi) onu yayından önce durdurur.
  const canli =
    typeof adresler === "object" && adresler !== null
      ? yazi((adresler as Record<string, unknown>)["canli"])
      : undefined;
  const asil = canli === undefined ? undefined : asilAdresiCoz(canli);
  if (asil !== undefined && "hata" in asil) {
    process.stderr.write(`Uyarı: ${kodAdi} asıl adresi kullanılmadı: ${asil.hata}\n`);
  }
  return {
    ad: yazi(gorunenAd) ?? kodAdi,
    dil: yazi(dil),
    metin: yazi(bakimMetni),
    asil: asil === undefined || "hata" in asil ? undefined : asil,
    aramaAcik: aramaMotorlarinaAcik === true,
  };
};

export const bakimBilgisiOku = (ipv4: string, kodAdi: string, no: number): BakimBilgisi => {
  const klasor = `${yayinKoku}/${yayinOrtami}/${kodAdi}/${no}/site`;
  const oku = (dosya: string) =>
    sshKomutu(ipv4, `sudo sh -c 'cat ${klasor}/${dosya} 2>/dev/null || true'`).stdout;
  try {
    return bakimBilgisiCoz(kodAdi, oku("kimlik.json"), oku("ayarlar.json"));
  } catch (hata) {
    process.stderr.write(
      `Uyarı: ${kodAdi} bakım sayfası bilgisi okunamadı, kod adı kullanılacak: ${(hata as Error).message}\n`,
    );
    return { ad: kodAdi };
  }
};

// Adların sunucunun ad çözücüsündeki cevabı (karar 0202). Çıktı: "<ad> 4 <adres>" ve "<ad> 6 <adres>" satırları;
// ad ön kapının satırlarında zaten karşılanıyorsa ayrıca "<ad> onkapi". Son satır "cozum=bitti": gelmezse
// ölçüm yapılmamış sayılır.
export const adCozumuBetigi = (adlar: string[]): string =>
  [
    ...adlar.map((ad) => {
      if (!/^[a-z0-9.-]+$/.test(ad)) throw new Error(`Betiğe girmeyecek ad: ${ad}`);
      const kalip = ad.replaceAll(".", "\\.");
      return `for t in 4 6; do getent ahostsv$t ${ad} 2>/dev/null | awk -v a=${ad} -v t=$t '$2=="STREAM"{print a, t, $1}'; done
if sudo grep -qs '^${kalip} {' ${onKapiKlasoru}/caddy/siteler/*.caddy; then echo "${ad} onkapi"; fi`;
    }),
    "echo cozum=bitti",
  ].join("\n");

export type AdCozumu = { v4: string[]; v6: string[]; onKapida: boolean };

export const adCozumleri = (cikti: string): Map<string, AdCozumu> => {
  const sonuc = new Map<string, AdCozumu>();
  const kayit = (ad: string) => {
    const var_ = sonuc.get(ad) ?? { v4: [], v6: [], onKapida: false };
    sonuc.set(ad, var_);
    return var_;
  };
  for (const satir of cikti.split("\n")) {
    const [ad, tur, adres] = satir.trim().split(" ");
    if (!ad) continue;
    if (tur === "onkapi" && adres === undefined) {
      kayit(ad).onKapida = true;
      continue;
    }
    // getent ahostsv6, AAAA kaydı olmayan adda IPv4'ü IPv6 biçiminde (::ffff:) döndürür: yok sayılır.
    if (!adres || (tur !== "4" && tur !== "6") || adres.startsWith("::ffff:")) continue;
    const liste = tur === "4" ? kayit(ad).v4 : kayit(ad).v6;
    if (!liste.includes(adres)) liste.push(adres);
  }
  return sonuc;
};

// Ön kapının karşılayacağı asıl adlar (karar 0202). Sunucuya çözülen ad girer. Hiç cevap alınamayan ad yalnız ön
// kapıda zaten karşılanıyorsa kalır (ad çözücünün anlık takılması açık mağazayı düşürmesin); başka bir adrese
// çözülen ad çıkar. Uyarılar ikinci değerdedir.
export const cozulenleriSec = (
  adlar: string[],
  cozumler: ReadonlyMap<string, AdCozumu>,
  ipv4: string,
  ipv6: string,
): { cozulenler: Set<string>; uyarilar: string[] } => {
  const cozulenler = new Set<string>();
  const uyarilar: string[] = [];
  for (const ad of adlar) {
    const { v4 = [], v6 = [], onKapida = false } = cozumler.get(ad) ?? {};
    const hata = cozulmeHatasi(v4, v6, ipv4, ipv6);
    if (hata === undefined) cozulenler.add(ad);
    else if (hata === "çözülmüyor" && onKapida) {
      cozulenler.add(ad);
      uyarilar.push(`${ad} şu an çözülmüyor; ön kapıda zaten olduğu için kaldı.`);
    } else uyarilar.push(`${ad} sunucuya çözülmüyor (${hata}); ön kapıya eklenmedi.`);
  }
  return { cozulenler, uyarilar };
};

// Sitelerin asıl adlarından ön kapının karşılayacakları. Ölçüm yapılamazsa (ssh, betik, sunucu kaydı) kuruluş
// durur: çalışan ön kapıya dokunulmaz, açık mağazanın adresi düşmez.
const cozulenAdlar = (ipv4: string, bilgiler: Record<string, BakimBilgisi>): Set<string> => {
  const adlar = Object.values(bilgiler).flatMap((b) => (b.asil ? asilAdresAdlari(b.asil) : []));
  if (adlar.length === 0) return new Set();
  const sunucu = sunuculariOku().find((s) => s.ipv4 === ipv4);
  if (!sunucu) throw new Error(`${ipv4} sunucu/sunucular.json'da yok; asıl adresler ölçülemedi.`);
  const sonuc = sshKomutu(ipv4, "bash -s", { girdi: adCozumuBetigi(adlar) });
  if (sonuc.status !== 0 || !sonuc.stdout.includes("cozum=bitti")) {
    throw new Error(`Asıl adresler ölçülemedi, ön kapıya dokunulmadı: ${sonuc.stderr.trim()}`);
  }
  const { cozulenler, uyarilar } = cozulenleriSec(
    adlar,
    adCozumleri(sonuc.stdout),
    sunucu.ipv4,
    sunucu.ipv6,
  );
  for (const uyari of uyarilar) process.stderr.write(`Uyarı: ${uyari}\n`);
  return cozulenler;
};

// Ön kapıyı sunucudaki yayın listesine göre kurar. Yayın komutu listeyi değiştirerek
// (yeni kutu ya da geri dönüş) çağırır; değişiklik verilmezse liste sunucudakidir.
export const onKapiyiKur = (
  ipv4: string,
  siteler = yayindakiSiteleriOku(ipv4),
  // Siteye bağlı olmayan ek satırlar (yalnız deneme komutu, alan-adi-denemesi.mts).
  ekSatirlar: Record<string, string> = {},
): void => {
  for (const ad of Object.keys(ekSatirlar)) {
    if (ad === yoklamaAdi || ad === hataIzlemeAdi || Object.hasOwn(siteler, ad)) {
      throw new Error(`Ek satır var olan bir satırın adını taşıyor: ${ad}`);
    }
  }
  const bilgiler = Object.fromEntries(
    Object.entries(siteler).map(([kodAdi, no]) => [kodAdi, bakimBilgisiOku(ipv4, kodAdi, no)]),
  );
  const sonuc = sshKomutu(ipv4, "bash -s", {
    girdi: kurmaBetigi(
      {
        [yoklamaAdi]: denemeSatiri(yoklamaAdresi, yoklamaHedefi),
        [hataIzlemeAdi]: hataIzlemeSatiri(),
        ...ekSatirlar,
        ...siteSatirlari(
          siteler,
          bilgiler,
          bakimdakiSiteleriOku(ipv4),
          cozulenAdlar(ipv4, bilgiler),
        ),
      },
      siteler,
    ),
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

// Asıl adrese yönlenme kalıcıdır (308) ve yolu ve sorguyu korur (karar 0202).
export const asilAdreseYonleniyor = (
  durum: number,
  konum: string | undefined,
  asil: string,
  yol: string,
): boolean => durum === 308 && konum === `https://${asil}${yol}`;

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
  "{{.State.Running}}|{{.HostConfig.Privileged}}|{{.Config.User}}|{{.HostConfig.ReadonlyRootfs}}|{{json .HostConfig.CapAdd}}|{{json .HostConfig.CapDrop}}|{{json .HostConfig.SecurityOpt}}|{{.HostConfig.RestartPolicy.Name}}|{{.HostConfig.Memory}}|{{.HostConfig.MemorySwap}}";

type KutuTanimi = {
  user: string;
  read_only: boolean;
  cap_add: string[];
  cap_drop: string[];
  security_opt: string[];
  restart: string;
  // Bellek ve takasla birlikte bellek sınırı (kart 0094): tanımda yoksa kutu sınırsızdır, gerçek değer 0 beklenir.
  mem_limit?: string;
  memswap_limit?: string;
};

export const kutuKisitHatalari = (satir: string, tanim: KutuTanimi): string[] => {
  const [
    calisiyor,
    yetkili,
    kullanici,
    saltOkunur,
    ekle,
    kaldir,
    guvenlik,
    kural,
    bellek,
    takas,
    ...fazla
  ] = satir.split("|");
  if (fazla.length > 0 || takas === undefined) return [`okunamadı: ${satir}`];
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
  if (tanim.restart !== yenidenBaslama) {
    hatalar.push(`tanımdaki yeniden başlama kuralı ${tanim.restart}, beklenen ${yenidenBaslama}`);
  }
  if (!kutuKuraliDogru(kural ?? "")) {
    hatalar.push(`yeniden başlama kuralı ${kural || "yok"}, beklenen ${yenidenBaslama}`);
  }
  const beklenenBellek = bellekBaytlari(tanim.mem_limit);
  if (bellek !== String(beklenenBellek)) {
    hatalar.push(`bellek sınırı ${bellek || "yok"} bayt, beklenen ${beklenenBellek}`);
  }
  const beklenenTakas = bellekBaytlari(tanim.memswap_limit);
  if (takas !== String(beklenenTakas)) {
    hatalar.push(`takasla bellek sınırı ${takas || "yok"} bayt, beklenen ${beklenenTakas}`);
  }
  return hatalar;
};

// Tanınmayan adrese sertifika verilmediğinde Caddy bağlantıyı TLS uyarısıyla keser (ölçüldü:
// EPROTO, "alert internal error"). Zaman aşımı, ret ya da ad uyuşmazlığı bu sayılmaz.
export const sertifikaReddedildi = (hata: unknown): boolean =>
  hata instanceof Error &&
  (hata as NodeJS.ErrnoException).code === "EPROTO" &&
  /alert/i.test(hata.message);

// Elle bakımı açar ya da kapatır. Yayında olmayan sitenin kalmış bakımı da kapatılabilir: site sonra
// sessizce bakımda açılmasın. Ön kapı kurulamazsa işaret önceki hâline (önceki zamanıyla) döner ve kurulum
// bir kez daha denenir: işaret ile çalışan ayar ayrışmasın. Yayın kilidinin içinde çalışır.
export const bakimDegistir = async (ipv4: string, kodAdi: string, acik: boolean): Promise<void> => {
  if (acik && yayindakiSiteleriOku(ipv4)[kodAdi] === undefined) {
    throw new Error(`${kodAdi} yayında değil.`);
  }
  await yayinKilidiyle(ipv4, () => {
    const onceki = bakimdakiSiteleriOku(ipv4).get(kodAdi);
    const isaret = (betik: string) => {
      const sonuc = sshKomutu(ipv4, "bash -s", { girdi: betik });
      if (sonuc.status !== 0) throw new Error(`Bakım işareti yazılamadı: ${sonuc.stderr.trim()}`);
    };
    isaret(bakimIsaretiBetigi(kodAdi, acik));
    try {
      onKapiyiKur(ipv4);
    } catch (hata) {
      isaret(
        bakimIsaretiBetigi(kodAdi, onceki !== undefined, { zaman: onceki, islem: "geri-alindi" }),
      );
      try {
        onKapiyiKur(ipv4);
      } catch (ikinci) {
        throw new Error(
          `${(hata as Error).message}\n  Ön kapı yeniden de kurulamadı, işaret ile çalışan ayar farklı olabilir: ${(ikinci as Error).message}`,
        );
      }
      throw hata;
    }
  });
};
