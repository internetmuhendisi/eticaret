// Bir sitenin kuruluş tarifi (kart 0343). Bir site neyden oluşur, hangi adımla ve hangi sırayla
// kurulur: tek tanım burasıdır. "Yeni site kur" komutu (kart 0350) adımları buradan okur, sunucu
// denetimi yayındaki her sitenin sunucu kayıtlarını buradan ölçer. Tarifin metni
// planlar/komutlar.md "Yeni site kurmak" bölümündedir.
//
// Tarif girdisiz hiçbir değer üretmez. Siteden siteye değişen her değer (kod adı, görünen ad, tür,
// çekirdek sürümü, altyapı sahibinin ayarları) girdidir; girdi kimlik ve ayar şemasından geçer.
// Kurallardan türeyen adlar (deneme adresi, veritabanı, ağ, gizli klasör) var olan işlevlerden gelir.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import type { z } from "zod";
import { ayarSemasi } from "../cekirdek/ayar-semasi/ayarlar.ts";
import { type Kimlik, kimlikSemasi } from "../cekirdek/ayar-semasi/kimlik.ts";
import { gizliBilgiler } from "../cekirdek/kayitlar/gizli-bilgiler.ts";
import type { SiteTuru } from "../cekirdek/kayitlar/site.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";
import {
  gizliKlasor,
  kutuKullanicisi,
  type Ortam,
  siteKullanicilariDosyasi,
  siteNumaralariHatalari,
  yeniSiteNumarasi,
} from "./gizli-bilgi.mts";
import {
  denemeAdresi,
  kodAdiGecerli,
  onKapiKlasoru,
  onKapiSatirDosyasi,
  siteAgiAdi,
} from "./on-kapi.mts";
import { kok } from "./sunucu.mts";
import { veritabaniKutusu } from "./sunucu-veritabani.mts";
import { sunucuDosyaKlasoru, yayinKlasoru } from "./yayin.mts";
import { anahtarDosyasi, yedekKoku } from "./yedek.mts";

// --- Girdi ---

export type KurulusGirdisi = {
  kodAdi: string;
  gorunenAd: string;
  tur: SiteTuru;
  // Yayınlanmış en yeni sürüm (komut seçer, sürüm notu olan sürüm).
  cekirdekSurumu: string;
  // Yalnız varsayılandan farklı olan altyapı sahibi ayarları (ayarlar.json'a aynen yazılır).
  ayarlar: Record<string, unknown>;
  // Başlanacak demonun kodu (kart 0345). Tarif yalnız taşır; paketin doğrulaması ve kurulumu orada.
  demo?: string;
};

// Türün teslim adımları: demo site teslim edilmez (planlar/komutlar.md, "Teslim").
const teslimDurumu = (tur: SiteTuru): Kimlik["teslimDurumu"] =>
  tur === "demo"
    ? { magazaSahibiHesabi: "gerekmez", yurtDisiAktarimBelgeleri: "gerekmez" }
    : { magazaSahibiHesabi: "bekliyor", yurtDisiAktarimBelgeleri: "bekliyor" };

export const girdiHatalari = (girdi: KurulusGirdisi): string[] => {
  const kimlik = kimlikSemasi.safeParse(kimlikDosyasi(girdi));
  const ayarlar = ayarSemasi.safeParse(girdi.ayarlar);
  // Varsayılanıyla aynı değer yazılmaz: varsayılan sonradan değişince site eski değerde kalırdı.
  const varsayilanlar = Object.entries(girdi.ayarlar).flatMap(([ad, deger]) => {
    const alan = (ayarSemasi.shape as Record<string, z.ZodType>)[ad];
    const varsayilan = alan?.safeParse(undefined);
    return varsayilan?.success && JSON.stringify(varsayilan.data) === JSON.stringify(deger)
      ? [`ayarlar: ${ad}: varsayılanıyla aynı, yazılmaz`]
      : [];
  });
  return [
    ...varsayilanlar,
    ...(kimlik.success
      ? []
      : kimlik.error.issues.map((s) => `kimlik: ${s.path.join(".")}: ${s.message}`)),
    ...(ayarlar.success
      ? []
      : ayarlar.error.issues.map((s) => `ayarlar: ${s.path.join(".")}: ${s.message}`)),
  ];
};

const kimlikDosyasi = (girdi: KurulusGirdisi) => ({
  kodAdi: girdi.kodAdi,
  gorunenAd: girdi.gorunenAd,
  tur: girdi.tur,
  // Adres yalnız kod adı geçerliyse kurulur; geçersiz ad şemanın hatasıyla döner.
  adresler: kodAdiGecerli(girdi.kodAdi) ? { deneme: `https://${denemeAdresi(girdi.kodAdi)}` } : {},
  cekirdekSurumu: girdi.cekirdekSurumu,
  teslimDurumu: teslimDurumu(girdi.tur),
});

// --- Site klasörü ---

// Site klasörünün parçaları ve her birinin kaynağı. "girdi": tarif girdiden üretir; "demo": başlanacak
// demonun paketinden gelir (kart 0345); "elle": siteye özeldir, komut iskeletini yazar, içeriği
// kurulumdan sonra elle yazılır.
export const siteKlasoruParcalari = [
  { yol: "kimlik.json", kaynak: "girdi", zorunlu: true },
  { yol: "ayarlar.json", kaynak: "girdi", zorunlu: true },
  { yol: "KURALLAR.md", kaynak: "elle", zorunlu: true },
  { yol: "baslangic", kaynak: "demo", zorunlu: false },
  { yol: "marka", kaynak: "elle", zorunlu: false },
  { yol: "testler", kaynak: "elle", zorunlu: false },
  { yol: "tema", kaynak: "elle", zorunlu: false },
] as const satisfies readonly {
  yol: string;
  kaynak: "girdi" | "demo" | "elle";
  zorunlu: boolean;
}[];

// ayarlar.json girdinin aynısıdır (varsayılanlar yazılmaz). Girdiyi kuruCalistir denetler.
const siteDosyalari = (girdi: KurulusGirdisi): Record<string, unknown> => ({
  "kimlik.json": kimlikDosyasi(girdi),
  "ayarlar.json": girdi.ayarlar,
});

// --- Kod adı ve site numarası ---

// Kod adı iki yerde kullanılmış sayılır: siteler/ klasöründe ve site numaraları dosyasında. İkisine birlikte
// bakılır: numarası olup klasörü silinmiş site de adı tutar (sunucuda gizli bilgisi ve veritabanı olabilir).
export const kodAdiKullanimHatalari = (
  kodAdi: string,
  { siteler, numaralar }: { siteler: string[]; numaralar: Record<string, number> },
): string[] => {
  if (!kodAdiGecerli(kodAdi)) return [`geçersiz kod adı: ${kodAdi}`];
  return [
    ...(siteler.includes(kodAdi) ? [`siteler/${kodAdi} klasörü var`] : []),
    ...(Object.hasOwn(numaralar, kodAdi)
      ? [`${kodAdi} site numaraları dosyasında var (numara ${numaralar[kodAdi]})`]
      : []),
  ];
};

export const projedekiKodAdlari = (): { siteler: string[]; numaralar: Record<string, number> } => {
  const numaralar: unknown = JSON.parse(readFileSync(siteKullanicilariDosyasi, "utf8"));
  const hatalar = siteNumaralariHatalari(numaralar);
  if (hatalar.length > 0) throw new Error(`sunucu/site-kullanicilari.json bozuk: ${hatalar[0]}`);
  const klasor = join(kok, "siteler");
  return {
    siteler: existsSync(klasor)
      ? readdirSync(klasor, { withFileTypes: true })
          .filter((g) => g.isDirectory() && !g.name.startsWith("."))
          .map((g) => g.name)
      : [],
    numaralar: numaralar as Record<string, number>,
  };
};

// Yeni sitenin numarası yeniSiteNumarasi'dır (gizli-bilgi.mts). Numara site klasörüyle aynı kayıtta yazılır
// (adım "numara"), yayın sırasında değil: yayın kaydedilmemiş değişiklikte durur.

// --- Sunucu kayıtları ---

export type SunucuKaydi =
  | { tur: "klasor" | "dosya"; yol: string; sahip: number; izin: string; kuran: AdimKodu }
  | { tur: "veritabani" | "rol" | "ag"; ad: string; kuran: AdimKodu };

// Bir sitenin bir ortamda sunucuda sahip olduğu kayıtlar (2026-11-28 Örnek Mağaza'da ölçülen düzen).
// Kutular yayına göre değişir (site-<ortam>-<kod>-<no>), bu yüzden burada değil yayın kaydındadır. Dosya
// klasörü 0.15.0'dan eski yayında yoktur (dosyaKlasoruVarMi): denetim onu yayındaki sürüme göre ister.
export const sunucuKayitlari = (
  ortam: Ortam,
  kodAdi: string,
  numara: number,
  { dosyaKlasoru = true }: { dosyaKlasoru?: boolean } = {},
): SunucuKaydi[] => {
  const kullanici = kutuKullanicisi(ortam, numara);
  const gizli = gizliKlasor(ortam, kodAdi);
  const yayin = yayinKlasoru(ortam, kodAdi);
  return [
    { tur: "klasor", yol: gizli, sahip: 0, izin: "700", kuran: "yayin" },
    ...Object.values(gizliBilgiler).map(
      ({ dosya }): SunucuKaydi => ({
        tur: "dosya",
        yol: `${gizli}/${dosya}`,
        sahip: kullanici,
        izin: "400",
        kuran: "yayin",
      }),
    ),
    { tur: "veritabani", ad: siteVeritabaniAdi(kodAdi), kuran: "yayin" },
    { tur: "rol", ad: siteVeritabaniAdi(kodAdi), kuran: "yayin" },
    { tur: "ag", ad: siteAgiAdi(ortam, kodAdi), kuran: "yayin" },
    { tur: "klasor", yol: yayin, sahip: 0, izin: "755", kuran: "yayin" },
    { tur: "dosya", yol: `${yayin}/kayit.jsonl`, sahip: 0, izin: "644", kuran: "yayin" },
    // Trafiği alan yayının numarası; ön kapının site listesi buradan kurulur.
    { tur: "dosya", yol: `${yayin}/etkin`, sahip: 0, izin: "644", kuran: "yayin" },
    ...(dosyaKlasoru
      ? [
          {
            tur: "klasor",
            yol: sunucuDosyaKlasoru(ortam, kodAdi),
            sahip: kullanici,
            izin: "700",
            kuran: "yayin",
          } as const,
        ]
      : []),
    {
      tur: "dosya",
      yol: `${onKapiKlasoru}/${onKapiSatirDosyasi(kodAdi)}`,
      sahip: 0,
      izin: "644",
      kuran: "yayin",
    },
    // Gece yedeğinin site bilgisi: açık anahtar ve saklama süresi (pnpm yedek-kur).
    {
      tur: "dosya",
      yol: `${yedekKoku}/siteler/${ortam}/${kodAdi}`,
      sahip: 0,
      izin: "400",
      kuran: "yedek",
    },
  ];
};

// Sunucu kayıtlarının betikle ölçülmeyen öteki kayıtları: bilgisayarda ve hata izleme aracında. Her birinin
// ölçüldüğü yer yazılıdır.
export const digerKayitlar = (ortam: Ortam, kodAdi: string) =>
  [
    {
      yer: "bilgisayar",
      ne: `sunucu/site-kullanicilari.json: ${kodAdi} satırı`,
      kuran: "numara",
      olcum: "siteNumaralariHatalari (birim testleri)",
    },
    {
      yer: "bilgisayar",
      ne: `sunucu/yedek/ayar.json: siteler.${ortam}.${kodAdi}`,
      kuran: "yedek",
      olcum: "sunucu denetimi: sunucudaki ve bilgisayardaki anahtar ayarla aynı",
    },
    {
      yer: "bilgisayar",
      ne: `~/${relative(homedir(), anahtarDosyasi(ortam, kodAdi))} (açma anahtarı, 0600; kopyası şifre yöneticisinde)`,
      kuran: "yedek",
      olcum: "sunucu denetimi: sunucudaki ve bilgisayardaki anahtar ayarla aynı",
    },
    {
      yer: "hata izleme",
      ne: `${kodAdi} projesi (gönderim adresi kutunun ortamında)`,
      kuran: "yayin",
      olcum: "pnpm hata-izleme-denemesi",
    },
  ] as const satisfies readonly { yer: string; ne: string; kuran: AdimKodu; olcum: string }[];

// Kayıtları sunucuda ölçen betik: her kayıt için bir satır, "K<sıra> <sonuç>". Dosya ve klasörde sonuç
// "<sahip> <izin> <tür>", ötekilerde "var" ya da "yok". Betik değer taşımaz; adlar kod adından türer.
export const kayitOlcumBetigi = (ortam: Ortam, kayitlar: SunucuKaydi[]): string => {
  const guvenli = /^[A-Za-z0-9_./-]+$/;
  const psql = (sorgu: string) =>
    `docker exec ${veritabaniKutusu(ortam)} psql -U postgres -d postgres -Atc "${sorgu}"`;
  return kayitlar
    .map((kayit, sira) => {
      const ad = "yol" in kayit ? kayit.yol : kayit.ad;
      if (!guvenli.test(ad)) throw new Error(`Betiğe girmeyecek ad: ${ad}`);
      const olcum =
        kayit.tur === "klasor" || kayit.tur === "dosya"
          ? `sudo stat -c '%u %a %F' ${ad} 2>/dev/null || echo yok`
          : kayit.tur === "ag"
            ? `docker network inspect ${ad} >/dev/null 2>&1 && echo var || echo yok`
            : // Veritabanı kutusu yanıt vermezse "yok" değil "olculemedi" yazılır.
              `v=$(${psql(
                kayit.tur === "veritabani"
                  ? `select 1 from pg_database where datname = '${ad}'`
                  : `select 1 from pg_roles where rolname = '${ad}'`,
              )} 2>/dev/null) || v=olculemedi; [ "$v" = 1 ] && echo var || { [ "$v" = olculemedi ] && echo olculemedi || echo yok; }`;
      return `echo "K${sira} $(${olcum})"`;
    })
    .join("\n");
};

// Ölçümün sonucu: tarifin beklediğinden farklı her kayıt bir hata. Satırı gelmeyen kayıt ölçülmemiş sayılır.
export const kayitHatalari = (kayitlar: SunucuKaydi[], cikti: string): string[] => {
  const sonuclar = new Map(
    cikti
      .split("\n")
      .map((satir) => satir.match(/^K(\d+) (.*)$/))
      .filter((e) => e !== null)
      .map((e) => [Number(e[1]), (e[2] ?? "").trim()]),
  );
  return kayitlar.flatMap((kayit, sira) => {
    const ad = "yol" in kayit ? kayit.yol : kayit.ad;
    const sonuc = sonuclar.get(sira);
    const beklenen =
      kayit.tur === "klasor"
        ? `${kayit.sahip} ${kayit.izin} directory`
        : kayit.tur === "dosya"
          ? `${kayit.sahip} ${kayit.izin} regular file`
          : "var";
    if (sonuc === undefined || sonuc === "olculemedi") return [`${ad}: ölçülemedi`];
    if (sonuc === beklenen) return [];
    if (sonuc === "yok") return [`${ad} yok`];
    // stat boş dosyayı ayrı türle yazar ("regular empty file"): gizli bilgi ya da ön kapı satırı boş olmamalı.
    if (sonuc === beklenen.replace("regular file", "regular empty file")) return [`${ad} boş`];
    return [`${ad}: ${sonuc}, beklenen ${beklenen}`];
  });
};

// --- Adımlar ---

export type AdimKodu =
  | "kod-adi"
  | "numara"
  | "site-klasoru"
  | "dogrulama"
  | "kayit-ve-hat"
  | "yayin"
  | "yedek"
  | "hata-izleme"
  | "denetim"
  | "yedek-prova"
  | "ana-dal";

export type Adim = {
  kod: AdimKodu;
  ad: string;
  // Adımı yapan komut; komutu olmayan adım elle yapılır (nedeni "elle" alanında).
  komut?: string;
  elle?: string;
  yer: "bilgisayar" | "sunucu" | "github";
  // Geri alınamaz adımdan hemen önce ayrıca onay alınır (planlar/komutlar.md, ortak kurallar).
  geriAlinamaz: boolean;
  oncekiler: AdimKodu[];
  denetim: string;
  geriAlis: string;
};

export const kurulusAdimlari: readonly Adim[] = [
  {
    kod: "kod-adi",
    ad: "Kod adı başka sitece kullanılmıyor",
    komut: "kodAdiKullanimHatalari",
    yer: "bilgisayar",
    geriAlinamaz: false,
    oncekiler: [],
    denetim: "siteler/ klasörü ve sunucu/site-kullanicilari.json birlikte",
    geriAlis: "yok, hiçbir şey yazmaz",
  },
  {
    kod: "numara",
    ad: "Site numarası sunucu/site-kullanicilari.json'a yazılır",
    elle: "bugün yayın komutu ilk yayında yazar ve kayıt dışı değişiklik bırakır (siteNumarasiAl)",
    yer: "bilgisayar",
    geriAlinamaz: false,
    oncekiler: ["kod-adi"],
    denetim: "siteNumaralariHatalari: geçerli ad, tekil numara",
    geriAlis: "kayıttan önce satır silinir; yayından sonra numara değişmez (kutu kullanıcısı)",
  },
  {
    kod: "site-klasoru",
    ad: "Site klasörü yazılır: kimlik, ayarlar, KURALLAR.md, başlangıç, marka, testler",
    komut: "kuruCalistir (kimlik.json, ayarlar.json)",
    elle: "KURALLAR.md, marka/, testler/ siteye özeldir; baslangic/ demodan gelir (kart 0345)",
    yer: "bilgisayar",
    geriAlinamaz: false,
    oncekiler: ["numara"],
    denetim: "siteDosyalari girdiyi kimlik ve ayar şemasından geçirir",
    geriAlis: "klasör silinir",
  },
  {
    kod: "dogrulama",
    ad: "Site klasörü doğrulanır",
    komut: "pnpm site-dogrula",
    yer: "bilgisayar",
    geriAlinamaz: false,
    oncekiler: ["site-klasoru"],
    denetim: "siteKlasorunuDogrula (çalışma kopyasındaki çekirdeğin şemasıyla)",
    geriAlis: "yok",
  },
  {
    kod: "kayit-ve-hat",
    ad: "Kaydedilir, GitHub'a gönderilir, kontrol hattı yeşil beklenir",
    komut: "git push; pnpm hat-sonucu",
    yer: "github",
    geriAlinamaz: true,
    oncekiler: ["dogrulama"],
    denetim: "pnpm hat-sonucu yeşil",
    geriAlis: "gönderilen kayıt geri alınmaz, düzeltme yeni kayıtla gelir",
  },
  {
    kod: "yayin",
    ad: "Deneme adresinde yayın: gizli bilgiler, hata izleme projesi, veritabanı ve kullanıcısı, ağ, dosya klasörü, kutular, ön kapı satırı",
    komut: "pnpm yayinla siteler/<kod adı> deneme",
    yer: "sunucu",
    geriAlinamaz: false,
    oncekiler: ["kayit-ve-hat"],
    denetim: "yayın komutunun kilitleri, içeriden ve dışarıdan sağlık",
    geriAlis:
      "yeni kutu ve yayın silinir; gizli bilgi, veritabanı, ağ ve dosya klasörü kalır (siteyi kaldırma kart 0350)",
  },
  {
    kod: "yedek",
    ad: "Gece yedeği: sitenin anahtar çifti, sunucu/yedek/ayar.json, ilk yedek",
    komut: "pnpm yedek-kur",
    elle: "açma anahtarının kopyası şifre yöneticisine konur; sunucu/yedek/ayar.json kayıt dışı değişiklik bırakır, ayrıca kaydedilir",
    yer: "sunucu",
    // İlk yedek depoya silme kilidiyle yazılır, saklama süresi dolmadan silinemez.
    geriAlinamaz: true,
    oncekiler: ["yayin"],
    denetim: "sunucu denetimi: son gece yedeği, anahtarın ayarla aynılığı",
    geriAlis: "ayardan satır silinir; depodaki yedek süresi dolmadan silinemez (silme kilidi)",
  },
  {
    kod: "hata-izleme",
    ad: "Hata izlemenin çalıştığı denenir",
    komut: "pnpm hata-izleme-denemesi siteler/<kod adı>",
    elle: "ortamın veritabanı kutusunu kısa süre durdurur: aynı ortamdaki bütün siteler o arada veritabanısız kalır",
    yer: "sunucu",
    geriAlinamaz: false,
    oncekiler: ["yayin"],
    denetim: "olay etiketli ve maskeli",
    geriAlis: "yok",
  },
  {
    kod: "denetim",
    ad: "Sunucu denetimi, veri ayrımı ve panel denemesi",
    komut: "pnpm sunucu-denetle; pnpm sunucu-veritabani-denemesi; pnpm panel-denemesi",
    elle: "panel denemesi hesabı kapatmak için sitede başka bir tam yetkili yönetici ister (yeni sitede yok); veritabanı denemesi kimlikteki sürümü uygular, sürüm farkında çalıştırılmaz (kart 0058)",
    yer: "sunucu",
    geriAlinamaz: false,
    oncekiler: ["yedek", "hata-izleme"],
    denetim: "üçü de yeşil",
    geriAlis: "yok",
  },
  {
    kod: "yedek-prova",
    ad: "İlk yedekten geri yükleme denenir",
    komut: "pnpm yedek-prova siteler/<kod adı> deneme --yeni",
    elle: "kart 0068 bitene kadar birden çok mağazalı sunucuda çalıştırılmaz",
    yer: "sunucu",
    geriAlinamaz: false,
    oncekiler: ["denetim"],
    denetim: "prova tutuyor",
    geriAlis: "yok",
  },
  {
    kod: "ana-dal",
    ad: "Site klasörü ana dala alınır, çalışma kopyası kaldırılır, tarihçeye yazılır",
    komut: "/is-bitti <kart numarası>",
    yer: "github",
    geriAlinamaz: false,
    oncekiler: ["yedek-prova"],
    denetim: "ana dalda site klasörü ve numara",
    geriAlis: "yok",
  },
];

// Tarifin iç tutarlılığı: tekil kodlar, her önceki kendisinden önce, her kaydın kuranı tarifte, her adımın
// komutu ya da elle nedeni var.
export const tarifHatalari = (adimlar: readonly Adim[] = kurulusAdimlari): string[] => {
  const hatalar: string[] = [];
  const gorulen = new Set<string>();
  for (const adim of adimlar) {
    if (gorulen.has(adim.kod)) hatalar.push(`${adim.kod} iki kez`);
    for (const onceki of adim.oncekiler) {
      if (!gorulen.has(onceki)) hatalar.push(`${adim.kod}: ${onceki} kendisinden önce değil`);
    }
    if (adim.komut === undefined && adim.elle === undefined) {
      hatalar.push(`${adim.kod}: ne komutu ne elle nedeni var`);
    }
    gorulen.add(adim.kod);
  }
  for (const kayit of sunucuKayitlari("deneme", "tarif", 1)) {
    if (!gorulen.has(kayit.kuran)) {
      hatalar.push(
        `kayıt ${"yol" in kayit ? kayit.yol : kayit.ad}: kuran ${kayit.kuran} tarifte yok`,
      );
    }
  }
  for (const kayit of digerKayitlar("deneme", "tarif")) {
    if (!gorulen.has(kayit.kuran))
      hatalar.push(`kayıt ${kayit.ne}: kuran ${kayit.kuran} tarifte yok`);
  }
  return hatalar;
};

// --- Kuru çalıştırma ---

// Hiçbir şey yazmadan tarifin üreteceklerini döndürür: site klasörünün dosyaları, site numarası ve
// sunucu kayıtları. Var olan sitenin numarası numaralar dosyasından, yeni sitenin numarası sıradakidir.
export const kuruCalistir = (
  girdi: KurulusGirdisi,
  ortam: Ortam,
  numaralar: Record<string, number>,
) => {
  const hatalar = girdiHatalari(girdi);
  if (hatalar.length > 0) throw new Error(`Girdi geçersiz:\n  ${hatalar.join("\n  ")}`);
  const numara = numaralar[girdi.kodAdi] ?? yeniSiteNumarasi(numaralar);
  return {
    dosyalar: siteDosyalari(girdi),
    numara,
    kayitlar: sunucuKayitlari(ortam, girdi.kodAdi, numara),
    digerKayitlar: digerKayitlar(ortam, girdi.kodAdi),
    demo: girdi.demo,
    adimlar: kurulusAdimlari.map((adim) => adim.kod),
  };
};
