// Bir site klasörünü okur ve kimlik ile ayar şemasından geçirir (kart 0010).
// Doğrulama komutu (komutlar/site-dogrula.mts), testler ve çalışan uygulama aynı yolu kullanır.
// Komut bu dosyaları Node ile doğrudan çalıştırdığı için ayar-semasi/ ve onun aldığı dosyalar
// birbirini .ts uzantısıyla alır.
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { z } from "zod";
import { type DosyaTuru, dosyaSinirlari } from "../kayitlar/dosya.ts";
import type { VideoSitesi } from "../kayitlar/video-siteleri.ts";
import { icerikTuru, uzantininTuru } from "../moduller/dosya/tur.ts";
import {
  bosKatalog,
  type KatalogBaslangici,
  katalogBaslangicSemasi,
  katalogGorselKlasoru,
  katalogKurallari,
} from "../moduller/urun/baslangic-semasi.ts";
import { type VergiBaslangici, vergiBaslangicSemasi } from "../moduller/vergi/semalar.ts";
import { type TemaAyarlari, temaAyariSorunlari, temaAyarlariSemasi } from "../temalar/ayarlar.ts";
import { kodSemasi, siteTemasiSemasi } from "../temalar/sema.ts";
import { hazirTemaKodlari, hazirTemayiOku, type Tema } from "../temalar/temalar.ts";
import {
  ayarSemasi,
  type MagazaAyarlari,
  magazaAyarSemasi,
  onekTuret,
  type SiteAyarlari,
} from "./ayarlar.ts";
import { type Kimlik, kimlikSemasi } from "./kimlik.ts";

// baslangic: mağaza sahibinin ayarlarının başlangıç değerleri, varsayılanları uygulanmış. Yalnız
// ayar veritabanında ilk kez yokken kullanılır (karar 0010, 0055); asıl değer veritabanındadır.
// markaLogosu: sitenin ilk logosu (marka/logo.<uzantı>, kart 0073). Mağaza sahibi logo yüklemediyse
// görünür; yoksa mağaza adı yazı olarak görünür.
// vergiBaslangici: vergi sınıflarının ve oranlarının başlangıç verisi (baslangic/vergi.json, kart 0074).
// Yalnız sitenin vergi tablosu hiç kurulmamışken kullanılır (karar 0060); dosyası yoksa boştur.
// katalogBaslangici: kategoriler, markalar, etiketler ve ürünler (baslangic/katalog.json, kart 0084).
// Yalnız sitenin kataloğu hiç kurulmamışken kullanılır (urun/baslangic.ts); dosyası yoksa boştur.
// katalogGorselleri: kataloğun galeri görsellerinin dosya adından site klasöründeki tam yola
// (baslangic/gorseller/, kart 0087); katalogda görsel yoksa boştur.
// temalar: sitenin kullanabileceği temalar, şemadan geçmiş (kart 0105); ilki başlangıç temasıdır.
// temaBaslangici: tema ayarlarının başlangıç değeri (baslangic/tema.json). Yalnız sitenin tema sürümü hiç
// yazılmamışken kullanılır; asıl değer veritabanındadır (cekirdek/moduller/tema/).
export type Site = {
  kimlik: Kimlik;
  ayarlar: SiteAyarlari;
  baslangic: MagazaAyarlari;
  vergiBaslangici: VergiBaslangici;
  katalogBaslangici: KatalogBaslangici;
  katalogGorselleri: Record<string, string>;
  markaLogosu?: { yol: string; tur: DosyaTuru };
  temalar: Tema[];
  temaBaslangici: { tema: string; ayarlar: TemaAyarlari };
};

export type DogrulamaSonucu = { gecerli: true; site: Site } | { gecerli: false; hatalar: string[] };

const sorunlariYaz = (dosya: string, sorunlar: z.core.$ZodIssue[]): string[] =>
  sorunlar.map((sorun) => {
    const yer = sorun.path.length > 0 ? sorun.path.join(".") : "(dosyanın tamamı)";
    return `${dosya}: ${yer}: ${sorun.message}`;
  });

const jsonOku = (
  klasor: string,
  dosya: string,
  yoksa?: unknown,
): { deger: unknown } | { hata: string } => {
  const yol = join(klasor, dosya);
  if (!existsSync(yol)) {
    return yoksa === undefined ? { hata: `${dosya}: dosya yok.` } : { deger: yoksa };
  }
  try {
    return { deger: JSON.parse(readFileSync(yol, "utf8")) };
  } catch (hata) {
    return { hata: `${dosya}: geçerli JSON değil (${(hata as Error).message}).` };
  }
};

export const baslangicDosyasi = "baslangic/ayarlar.json";

// Bir ayar öteki sahibin dosyasına yazılmışsa doğru dosyayı söyler; şemanın "tanınmayan alan" hatası
// bunu söylemez.
const yanlisDosyadakiler = (
  dosya: string,
  deger: unknown,
  otekiDosya: string,
  otekiSema: z.ZodObject,
): string[] =>
  typeof deger === "object" && deger !== null && !Array.isArray(deger)
    ? Object.keys(deger)
        .filter((ad) => Object.hasOwn(otekiSema.shape, ad))
        .map(
          (ad) =>
            `${dosya}: ${ad}: bu ayar ${otekiDosya} dosyasına yazılır (ayarın sahibi o dosyanınkidir).`,
        )
    : [];

// Başlangıç dosyası yoksa bütün mağaza ayarları varsayılanla başlar. Şema testlerde değiştirilebilir.
export const baslangicDosyasiniDogrula = <S extends z.ZodObject>(
  klasor: string,
  sema: S,
): { gecerli: true; deger: z.output<S> } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, baslangicDosyasi, {});
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const yanlislar = yanlisDosyadakiler(baslangicDosyasi, ham.deger, "ayarlar.json", ayarSemasi);
  const sonuc = sema.safeParse(ham.deger);
  if (yanlislar.length === 0 && sonuc.success) return { gecerli: true, deger: sonuc.data };
  return {
    gecerli: false,
    hatalar: [
      ...yanlislar,
      ...(sonuc.success ? [] : sorunlariYaz(baslangicDosyasi, sonuc.error.issues)),
    ],
  };
};

export const vergiBaslangicDosyasi = "baslangic/vergi.json";

// Dosyası olmayan site vergi sınıfı olmadan başlar.
export const vergiBaslangiciniDogrula = (
  klasor: string,
): { gecerli: true; deger: VergiBaslangici } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, vergiBaslangicDosyasi, { siniflar: [] });
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = vergiBaslangicSemasi.safeParse(ham.deger);
  if (sonuc.success) return { gecerli: true, deger: sonuc.data };
  return { gecerli: false, hatalar: sorunlariYaz(vergiBaslangicDosyasi, sonuc.error.issues) };
};

export const katalogBaslangicDosyasi = "baslangic/katalog.json";

// Dosyası olmayan site boş katalogla başlar. Sitenin ayarına bağlı kurallar (saat dilimi, vergi
// başlangıcı) yalnız ikisi geçerliyse denetlenir; geçersizse hatası zaten kendi dosyasında yazar.
export const katalogBaslangiciniDogrula = (
  klasor: string,
  site:
    | { saatDilimi: string; vergi: VergiBaslangici; videoSiteleri: readonly VideoSitesi[] }
    | undefined,
): { gecerli: true; deger: KatalogBaslangici } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, katalogBaslangicDosyasi, bosKatalog());
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = katalogBaslangicSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(katalogBaslangicDosyasi, sonuc.error.issues) };
  }
  if (site === undefined) return { gecerli: true, deger: sonuc.data };
  const hatalar = katalogKurallari(sonuc.data, {
    saatDilimi: site.saatDilimi,
    vergiSiniflari: site.vergi.siniflar.map((sinif) => sinif.ad),
    videoSiteleri: site.videoSiteleri,
  }).map(({ yer, kod }) =>
    kod === "vergi-sinifi-tanimsiz"
      ? `${katalogBaslangicDosyasi}: ${yer}: ${kod} (${vergiBaslangicDosyasi} dosyasında bu adlı sınıf yok)`
      : `${katalogBaslangicDosyasi}: ${yer}: ${kod}`,
  );
  return hatalar.length > 0 ? { gecerli: false, hatalar } : { gecerli: true, deger: sonuc.data };
};

// Kataloğun galeri görselleri (kart 0087): her ad baslangic/gorseller/ klasöründe düz bir dosya olmalı;
// tür içerikten okunur ve uzantıyla aynıdır, boyut dosya sınırını aşmaz. Görseller kurulumda dosya
// deposuna yüklenirken ayrıca yeniden kodlanır ve boyutları üretilir; bozuk görsel orada da düşer.
export const katalogGorselleriniDogrula = (
  klasor: string,
  katalog: KatalogBaslangici,
): { gecerli: true; gorseller: Record<string, string> } | { gecerli: false; hatalar: string[] } => {
  const adlar = [
    ...new Set(
      katalog.urunler.flatMap((urun) =>
        urun.galeri.flatMap((oge) => ("gorsel" in oge ? [oge.gorsel] : [])),
      ),
    ),
  ];
  const hatalar: string[] = [];
  const gorseller: Record<string, string> = {};
  // Klasör de site klasörünün içinde gerçek bir klasör olmalı: bağlantıyla dışarıdaki dosyalara
  // gidilmesin (kart 0087 kontrolü).
  const gorselKlasoru = join(klasor, katalogGorselKlasoru);
  if (
    adlar.length > 0 &&
    existsSync(gorselKlasoru) &&
    !realpathSync(gorselKlasoru).startsWith(`${realpathSync(klasor)}${sep}`)
  ) {
    return {
      gecerli: false,
      hatalar: [`${katalogGorselKlasoru}/: site klasörünün içinde gerçek bir klasör olmalı.`],
    };
  }
  for (const ad of adlar) {
    const yer = `${katalogGorselKlasoru}/${ad}`;
    const yol = join(klasor, katalogGorselKlasoru, ad);
    if (!existsSync(yol)) {
      hatalar.push(`${yer}: dosya yok (${katalogBaslangicDosyasi} bu görseli kullanıyor).`);
      continue;
    }
    // Sembolik bağlantı ve klasör kabul edilmez: dosya site klasörünün içinde, düz bir dosya olmalı.
    if (!lstatSync(yol).isFile()) {
      hatalar.push(`${yer}: düz bir dosya olmalı (bağlantı ya da klasör değil).`);
      continue;
    }
    const icerik = readFileSync(yol);
    if (icerik.length === 0 || icerik.length > dosyaSinirlari.enCokBayt) {
      hatalar.push(`${yer}: boş ya da ${dosyaSinirlari.enCokBayt} bayttan büyük.`);
      continue;
    }
    const tur = icerikTuru(icerik);
    if (tur === undefined || tur !== uzantininTuru(ad.slice(ad.lastIndexOf(".") + 1))) {
      hatalar.push(`${yer}: içeriği uzantısıyla uyuşmuyor.`);
      continue;
    }
    gorseller[ad] = yol;
  }
  return hatalar.length > 0 ? { gecerli: false, hatalar } : { gecerli: true, gorseller };
};

export const temaKlasoru = "tema";

// Sitenin kullanabileceği temalar (kart 0105): "temalar" ayarındaki her kod ya hazır bir tema ya da sitenin
// tema/ klasöründeki bir temadır. Siteye özel tema dosyası <kod>.json adlı düz bir dosyadır, kodu hazır
// bir temanınkiyle aynı olamaz ve listede yazılı olmalıdır (kullanılmayan tema dosyası kalmasın). Her tema
// şemadan geçer. Liste verilmezse bütün hazır temalardır.
export const temalariDogrula = (
  klasor: string,
  liste: readonly string[] | undefined,
): { gecerli: true; temalar: Tema[] } | { gecerli: false; hatalar: string[] } => {
  const hatalar: string[] = [];
  const siteTemalari = new Map<string, Tema>();
  const temaYolu = join(klasor, temaKlasoru);
  const hazirlar = new Set(hazirTemaKodlari());
  if (existsSync(temaYolu)) {
    if (!lstatSync(temaYolu).isDirectory()) {
      return { gecerli: false, hatalar: [`${temaKlasoru}/: gerçek bir klasör olmalı.`] };
    }
    // Gizli dosyalar (işletim sisteminin .DS_Store gibi dosyaları) tema sayılmaz.
    for (const ad of readdirSync(temaYolu)
      .filter((ad) => !ad.startsWith("."))
      .sort()) {
      const yer = `${temaKlasoru}/${ad}`;
      const kod = ad.endsWith(".json") ? ad.slice(0, -".json".length) : "";
      if (!kodSemasi.safeParse(kod).success) {
        hatalar.push(`${yer}: ad <tema kodu>.json olmalı (küçük harf, rakam ve tire).`);
        continue;
      }
      if (!lstatSync(join(temaYolu, ad)).isFile()) {
        hatalar.push(`${yer}: düz bir dosya olmalı (bağlantı ya da klasör değil).`);
        continue;
      }
      if (hazirlar.has(kod)) {
        hatalar.push(`${yer}: bu kod hazır bir temanın, siteye özel tema başka bir kod almalı.`);
        continue;
      }
      const ham = jsonOku(temaYolu, ad);
      if ("hata" in ham) {
        hatalar.push(`${temaKlasoru}/${ham.hata}`);
        continue;
      }
      const sonuc = siteTemasiSemasi().safeParse(ham.deger);
      if (!sonuc.success) {
        hatalar.push(...sorunlariYaz(yer, sonuc.error.issues));
        continue;
      }
      const { ad: gorunenAd, ...tanim } = sonuc.data;
      siteTemalari.set(kod, { kod, kaynak: "site", ad: { metin: gorunenAd }, tanim });
    }
  }
  const kodlar = liste ?? [...hazirlar];
  const temalar: Tema[] = [];
  for (const kod of kodlar) {
    const siteninki = siteTemalari.get(kod);
    if (siteninki !== undefined) {
      temalar.push(siteninki);
      continue;
    }
    if (!hazirlar.has(kod)) {
      hatalar.push(
        `ayarlar.json: temalar: "${kod}" diye bir tema yok (hazır temalarda ve ${temaKlasoru}/ klasöründe).`,
      );
      continue;
    }
    const hazir = hazirTemayiOku(kod);
    if (hazir.gecerli) temalar.push(hazir.tema);
    else hatalar.push(...hazir.hatalar);
  }
  for (const kod of siteTemalari.keys()) {
    if (!kodlar.includes(kod)) {
      hatalar.push(`${temaKlasoru}/${kod}.json: ayarlar.json dosyasındaki temalar listesinde yok.`);
    }
  }
  if (hatalar.length === 0 && temalar.length === 0) {
    hatalar.push("ayarlar.json: temalar: sitenin kullanabileceği bir tema yok.");
  }
  return hatalar.length > 0 ? { gecerli: false, hatalar } : { gecerli: true, temalar };
};

export const temaBaslangicDosyasi = "baslangic/tema.json";

const temaBaslangicSemasi = z.strictObject({
  tema: kodSemasi.optional(),
  ayarlar: temaAyarlariSemasi.prefault({}),
});

// Tema ayarlarının başlangıç değeri: tema listede olmalı (verilmezse listenin ilki), ayarlar o temanın
// açtığı değerlerden ve okunur renklerden oluşmalı. Dosyası yoksa ilk tema kendi değerleriyle başlar.
export const temaBaslangiciniDogrula = (
  klasor: string,
  temalar: readonly Tema[],
):
  | { gecerli: true; deger: { tema: string; ayarlar: TemaAyarlari } }
  | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, temaBaslangicDosyasi, {});
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = temaBaslangicSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(temaBaslangicDosyasi, sonuc.error.issues) };
  }
  const kod = sonuc.data.tema ?? temalar[0]?.kod;
  const tema = temalar.find((aday) => aday.kod === kod);
  if (tema === undefined) {
    return {
      gecerli: false,
      hatalar: [`${temaBaslangicDosyasi}: tema: "${kod}" sitenin kullanabileceği temalarda yok.`],
    };
  }
  const sorunlar = temaAyariSorunlari(tema.tanim, sonuc.data.ayarlar);
  if (sorunlar.length > 0) {
    return {
      gecerli: false,
      hatalar: sorunlar.map(
        ({ alan, kod: hata, oneri }) =>
          `${temaBaslangicDosyasi}: ayarlar.${alan}: ${hata}${oneri === undefined ? "" : ` (öneri ${oneri})`}`,
      ),
    };
  }
  return { gecerli: true, deger: { tema: tema.kod, ayarlar: sonuc.data.ayarlar } };
};

export const markaKlasoru = "marka";

// Sitenin ilk logosu: marka/ klasöründe en çok bir logo.<uzantı> dosyası. Tür içerikten okunur ve
// uzantıyla aynı olmalıdır; boyut dosya sınırını aşamaz (cekirdek/kayitlar/dosya.ts).
export const markaLogosunuDogrula = (
  klasor: string,
):
  | { gecerli: true; logo?: { yol: string; tur: DosyaTuru } }
  | { gecerli: false; hatalar: string[] } => {
  const marka = join(klasor, markaKlasoru);
  if (!existsSync(marka)) return { gecerli: true };
  // Büyük harfli ya da başka uzantılı "logo" adları sessizce yok sayılmaz, hata verir.
  const logolar = readdirSync(marka).filter((ad) => /^logo\./i.test(ad));
  if (logolar.length === 0) return { gecerli: true };
  if (logolar.length > 1) {
    return {
      gecerli: false,
      hatalar: [`${markaKlasoru}/: birden çok logo var (${logolar.join(", ")}), bir tane olmalı.`],
    };
  }
  const [ad = ""] = logolar;
  const yer = `${markaKlasoru}/${ad}`;
  const tur = uzantininTuru(ad.slice("logo.".length));
  if (!ad.startsWith("logo.") || tur === undefined) {
    return { gecerli: false, hatalar: [`${yer}: ad logo.png, logo.jpg ya da logo.webp olmalı.`] };
  }
  const yol = join(marka, ad);
  // Sembolik bağlantı ve klasör kabul edilmez: dosya site klasörünün içinde, düz bir dosya olmalı.
  if (!lstatSync(yol).isFile()) {
    return {
      gecerli: false,
      hatalar: [`${yer}: düz bir dosya olmalı (bağlantı ya da klasör değil).`],
    };
  }
  const icerik = readFileSync(yol);
  if (icerik.length === 0 || icerik.length > dosyaSinirlari.enCokBayt) {
    return {
      gecerli: false,
      hatalar: [`${yer}: boş ya da ${dosyaSinirlari.enCokBayt} bayttan büyük.`],
    };
  }
  if (icerikTuru(icerik) !== tur) {
    return { gecerli: false, hatalar: [`${yer}: içeriği uzantısıyla uyuşmuyor.`] };
  }
  return { gecerli: true, logo: { yol, tur } };
};

export const siteKlasorunuDogrula = (klasor: string): DogrulamaSonucu => {
  if (!existsSync(klasor)) return { gecerli: false, hatalar: [`${klasor}: klasör yok.`] };

  const hatalar: string[] = [];
  const hamKimlik = jsonOku(klasor, "kimlik.json");
  const hamAyarlar = jsonOku(klasor, "ayarlar.json");

  let kimlik: Kimlik | undefined;
  if ("hata" in hamKimlik) {
    hatalar.push(hamKimlik.hata);
  } else {
    const sonuc = kimlikSemasi.safeParse(hamKimlik.deger);
    if (sonuc.success) kimlik = sonuc.data;
    else hatalar.push(...sorunlariYaz("kimlik.json", sonuc.error.issues));
  }

  let ayarlar: z.output<typeof ayarSemasi> | undefined;
  if ("hata" in hamAyarlar) {
    hatalar.push(hamAyarlar.hata);
  } else {
    hatalar.push(
      ...yanlisDosyadakiler("ayarlar.json", hamAyarlar.deger, baslangicDosyasi, magazaAyarSemasi),
    );
    const sonuc = ayarSemasi.safeParse(hamAyarlar.deger);
    if (sonuc.success) ayarlar = sonuc.data;
    else hatalar.push(...sorunlariYaz("ayarlar.json", sonuc.error.issues));
  }

  const baslangic = baslangicDosyasiniDogrula(klasor, magazaAyarSemasi);
  if (!baslangic.gecerli) hatalar.push(...baslangic.hatalar);
  const vergiBaslangici = vergiBaslangiciniDogrula(klasor);
  if (!vergiBaslangici.gecerli) hatalar.push(...vergiBaslangici.hatalar);
  const katalogBaslangici = katalogBaslangiciniDogrula(
    klasor,
    vergiBaslangici.gecerli && ayarlar !== undefined
      ? {
          saatDilimi: ayarlar.saatDilimi,
          vergi: vergiBaslangici.deger,
          videoSiteleri: ayarlar.videoSiteleri,
        }
      : undefined,
  );
  if (!katalogBaslangici.gecerli) hatalar.push(...katalogBaslangici.hatalar);
  const katalogGorselleri = katalogBaslangici.gecerli
    ? katalogGorselleriniDogrula(klasor, katalogBaslangici.deger)
    : undefined;
  if (katalogGorselleri !== undefined && !katalogGorselleri.gecerli) {
    hatalar.push(...katalogGorselleri.hatalar);
  }
  const markaLogosu = markaLogosunuDogrula(klasor);
  if (!markaLogosu.gecerli) hatalar.push(...markaLogosu.hatalar);
  const temalar = ayarlar === undefined ? undefined : temalariDogrula(klasor, ayarlar.temalar);
  if (temalar !== undefined && !temalar.gecerli) hatalar.push(...temalar.hatalar);
  const temaBaslangici =
    temalar?.gecerli === true ? temaBaslangiciniDogrula(klasor, temalar.temalar) : undefined;
  if (temaBaslangici !== undefined && !temaBaslangici.gecerli) {
    hatalar.push(...temaBaslangici.hatalar);
  }

  if (kimlik !== undefined && kimlik.kodAdi !== basename(klasor)) {
    hatalar.push(
      `kimlik.json: kodAdi: klasörün adıyla aynı olmalı (kodAdi "${kimlik.kodAdi}", klasör "${basename(klasor)}").`,
    );
  }

  if (
    hatalar.length > 0 ||
    kimlik === undefined ||
    ayarlar === undefined ||
    !baslangic.gecerli ||
    !vergiBaslangici.gecerli ||
    !katalogBaslangici.gecerli ||
    katalogGorselleri === undefined ||
    !katalogGorselleri.gecerli ||
    !markaLogosu.gecerli ||
    temalar === undefined ||
    !temalar.gecerli ||
    temaBaslangici === undefined ||
    !temaBaslangici.gecerli
  ) {
    return { gecerli: false, hatalar };
  }

  // Mağaza adı verilmemişse kimlikteki görünen ad başlangıç değeridir (kart 0071); o da ayarın
  // kuralından geçmeli, yoksa ilk okumada veritabanına geçersiz değer yazılırdı.
  const magazaAdi = baslangic.deger.magazaAdi ?? kimlik.gorunenAd;
  if (!magazaAyarSemasi.shape.magazaAdi.safeParse(magazaAdi).success) {
    return {
      gecerli: false,
      hatalar: [
        `kimlik.json: gorunenAd: mağaza adı olarak kullanılamaz (en çok 100 harf, @ olmadan); ${baslangicDosyasi} dosyasına magazaAdi yazın.`,
      ],
    };
  }

  const siparisOneki = ayarlar.siparisOneki ?? onekTuret(kimlik.gorunenAd);
  if (siparisOneki.length < 2) {
    return {
      gecerli: false,
      hatalar: [
        "ayarlar.json: siparisOneki: görünen addan en az iki harf türetilemedi, öneki yazın.",
      ],
    };
  }
  return {
    gecerli: true,
    site: {
      kimlik,
      ayarlar: { ...ayarlar, siparisOneki },
      baslangic: { ...baslangic.deger, magazaAdi },
      vergiBaslangici: vergiBaslangici.deger,
      katalogBaslangici: katalogBaslangici.deger,
      katalogGorselleri: katalogGorselleri.gorseller,
      ...(markaLogosu.logo === undefined ? {} : { markaLogosu: markaLogosu.logo }),
      temalar: temalar.temalar,
      temaBaslangici: temaBaslangici.deger,
    },
  };
};

// Klasör geçerli değilse bütün hataları sayarak durur.
export const siteKlasorunuOku = (klasor: string): Site => {
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) {
    throw new Error(`Site klasörü geçersiz (${klasor}):\n${sonuc.hatalar.join("\n")}`);
  }
  return sonuc.site;
};
