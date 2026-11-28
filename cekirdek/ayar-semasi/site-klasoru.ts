// Bir site klasörünü okur ve kimlik ile ayar şemasından geçirir (kart 0010).
// Doğrulama komutu (komutlar/site-dogrula.mts), testler ve çalışan uygulama aynı yolu kullanır.
// Komut bu dosyaları Node ile doğrudan çalıştırdığı için ayar-semasi/ ve onun aldığı dosyalar
// birbirini .ts uzantısıyla alır.
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { z } from "zod";
import {
  type DemoParcasi,
  demoParcaKodlari,
  demoParcalari,
  magazaAdiYerTutucusu,
} from "../kayitlar/demo-paketi.ts";
import { type DosyaTuru, dosyaSinirlari } from "../kayitlar/dosya.ts";
import type { VideoSitesi } from "../kayitlar/video-siteleri.ts";
import { icerikTuru, uzantininTuru } from "../moduller/dosya/tur.ts";
import {
  type BlogBaslangici,
  blogBaslangicKurallari,
  blogBaslangicSemasi,
  blogGorselAdlari,
} from "../moduller/icerik/baslangic-semasi.ts";
import {
  type SayfaBaslangici,
  sayfaBaslangicKurallari,
  sayfaBaslangicSemasi,
} from "../moduller/icerik/sayfa-baslangici.ts";
import {
  type KuponBaslangici,
  kuponBaslangicKurallari,
  kuponBaslangicSemasi,
} from "../moduller/kampanya/baslangic-semasi.ts";
import {
  type MenuBaslangici,
  menuBaslangicKurallari,
  menuBaslangicSemasi,
} from "../moduller/menu/semalar.ts";
import {
  bosKatalog,
  type KatalogBaslangici,
  katalogBaslangicSemasi,
  katalogGorselAdlari,
  katalogGorselKlasoru,
  katalogKurallari,
} from "../moduller/urun/baslangic-semasi.ts";
import { type VergiBaslangici, vergiBaslangicSemasi } from "../moduller/vergi/semalar.ts";
import { type TemaAyarlari, temaAyariSorunlari, temaAyarlariSemasi } from "../temalar/ayarlar.ts";
import { kodSemasi, siteTemasiSemasi } from "../temalar/sema.ts";
import { hazirTemaKodlari, hazirTemayiOku, type Tema } from "../temalar/temalar.ts";
import {
  type BaslangicDuzeni,
  baslangicDuzeniBulunamayanlar,
  baslangicDuzeniSemasi,
  baslangicDuzeniSorunlari,
  duzenBaslangicBaglari,
} from "../vitrin/bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../vitrin/bolum-kutuphanesi/kutuphane.ts";
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
// katalogGorselleri: başlangıç kataloğunun (galeri, kategori) ve başlangıç düzeninin görsellerinin dosya adından
// site klasöründeki tam yola (baslangic/gorseller/, kart 0087, 0115); görsel yoksa boştur.
// temalar: sitenin kullanabileceği temalar, şemadan geçmiş (kart 0105); ilki başlangıç temasıdır.
// temaBaslangici: tema ayarlarının başlangıç değeri (baslangic/tema.json). Yalnız sitenin tema sürümü hiç
// yazılmamışken kullanılır; asıl değer veritabanındadır (cekirdek/moduller/tema/).
// duzenBaslangici: düzenin başlangıç değeri (baslangic/duzen.json, yoksa başlangıç temasının düzeni, kart
// 0106). Yalnız sitenin düzen sürümü hiç yazılmamışken kullanılır (cekirdek/moduller/duzen/).
// menuBaslangici: başlangıç menüleri (baslangic/menuler.json, kart 0107). Yalnız sitede hiç menü
// yazılmamışken kullanılır (cekirdek/moduller/menu/baslangic.ts); dosyası yoksa boştur.
// blogBaslangici: başlangıç blogu (baslangic/blog.json, kart 0272). Yalnız sitede hiç blog satırı yokken kullanılır
// (cekirdek/moduller/icerik/baslangic.ts); dosyası yoksa boştur.
// sayfaBaslangici: başlangıç sabit sayfaları (baslangic/sayfalar.json, kart 0273). Yalnız sitede hiç sayfa satırı
// yokken kullanılır (cekirdek/moduller/icerik/sayfa-kurulumu.ts); dosyası yoksa boştur.
// kuponBaslangici: başlangıç kuponları (baslangic/kuponlar.json, kart 0312). Yalnız sitede hiç kupon satırı yokken
// kullanılır (cekirdek/moduller/kampanya/baslangic.ts); dosyası yoksa boştur.
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
  duzenBaslangici: BaslangicDuzeni;
  menuBaslangici: MenuBaslangici;
  blogBaslangici: BlogBaslangici;
  sayfaBaslangici: SayfaBaslangici;
  kuponBaslangici: KuponBaslangici;
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

// Başlangıç görselleri (kart 0087, 0115): katalogun (galeri, kategori) ve başlangıç düzeninin kullandığı her ad
// baslangic/gorseller/ klasöründe düz bir dosya olmalı; tür içerikten okunur ve uzantıyla aynıdır, boyut dosya
// sınırını aşmaz. Görseller kurulumda dosya deposuna yüklenirken ayrıca yeniden kodlanır ve boyutları üretilir;
// bozuk görsel orada da düşer. Düzen geçersizse yalnız kataloğunkiler denetlenir, düzenin hatası kendi dosyasında yazar.
export const katalogGorselleriniDogrula = (
  klasor: string,
  katalog: KatalogBaslangici,
  duzen?: BaslangicDuzeni,
  blog?: BlogBaslangici,
): { gecerli: true; gorseller: Record<string, string> } | { gecerli: false; hatalar: string[] } => {
  const adlar = [
    ...new Set([
      ...katalogGorselAdlari(katalog),
      ...(duzen === undefined ? [] : duzenBaslangicBaglari(duzen, bolumKutuphanesi).gorsel),
      ...(blog === undefined ? [] : blogGorselAdlari(blog)),
    ]),
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
      hatalar.push(`${yer}: dosya yok (başlangıç kataloğu ya da düzeni bu görseli kullanıyor).`);
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

// Tema demosu (kart 0116, karar 0127): ziyaretçi yalnız gezer. Demo sitesi gerçek mağaza olamaz, e-posta göndermez
// (gönderen adresi yok) ve eklenti açmaz (eklentinin müşteri formu demoda çalışmazdı). Uçların kapalılığı kapıdadır.
export const temaDemosuSorunlari = (
  kimlik: Kimlik | undefined,
  ayarlar: z.output<typeof ayarSemasi>,
): string[] => {
  if (!ayarlar.temaDemosu) return [];
  const sorunlar: string[] = [];
  if (kimlik !== undefined && kimlik.tur !== "demo") {
    sorunlar.push(
      'ayarlar.json: temaDemosu: yalnız türü "demo" olan site tema demosu olabilir (kimlik.json).',
    );
  }
  if (ayarlar.epostaGonderenAdresi !== undefined) {
    sorunlar.push(
      "ayarlar.json: epostaGonderenAdresi: tema demosu e-posta göndermez, gönderen adresi yazılmaz.",
    );
  }
  if (ayarlar.eklentiler.length > 0) {
    sorunlar.push("ayarlar.json: eklentiler: tema demosunda eklenti açılmaz.");
  }
  return sorunlar;
};

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

export const duzenBaslangicDosyasi = "baslangic/duzen.json";

// Düzenin başlangıç değeri (kart 0106): dosya varsa bölüm kütüphanesinin kurallarından geçer, yoksa sitenin
// başlangıç temasının düzeni kullanılır (o da tema şemasında aynı kurallardan geçmiştir). Sitenin dosyası
// kategori, marka, etiket ve ürüne adres adıyla başvurur (kart 0114); adres adı başlangıç kataloğunda olmalı.
export const duzenBaslangiciniDogrula = (
  klasor: string,
  baslangicTemasi: Tema,
  katalog: KatalogBaslangici,
): { gecerli: true; deger: BaslangicDuzeni } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, duzenBaslangicDosyasi, null);
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  if (ham.deger === null) return { gecerli: true, deger: baslangicTemasi.tanim.baslangicDuzeni };
  const sonuc = baslangicDuzeniSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(duzenBaslangicDosyasi, sonuc.error.issues) };
  }
  const sorunlar = baslangicDuzeniSorunlari(sonuc.data, bolumKutuphanesi, { kayit: "adres-adi" });
  if (sorunlar.length > 0) {
    return {
      gecerli: false,
      hatalar: sorunlar.map(({ yer, kod }) => `${duzenBaslangicDosyasi}: ${yer.join(".")}: ${kod}`),
    };
  }
  const bulunamayanlar = baslangicDuzeniBulunamayanlar(sonuc.data, bolumKutuphanesi, {
    kategori: new Set(katalog.kategoriler.map((kayit) => kayit.adresAdi)),
    marka: new Set(katalog.markalar.map((kayit) => kayit.adresAdi)),
    etiket: new Set(katalog.etiketler.map((kayit) => kayit.adresAdi)),
    urun: new Set(katalog.urunler.map((kayit) => kayit.adresAdi)),
  });
  if (bulunamayanlar.length > 0) {
    return {
      gecerli: false,
      hatalar: bulunamayanlar.map(
        ({ yer, tur, adresAdi }) =>
          `${duzenBaslangicDosyasi}: ${yer.join(".")}: ${tur} ${adresAdi}: ${katalogBaslangicDosyasi} dosyasında bu adres adı yok`,
      ),
    };
  }
  return { gecerli: true, deger: sonuc.data };
};

export const menuBaslangicDosyasi = "baslangic/menuler.json";

// Başlangıç menüleri (kart 0107): dosya menü şemasından geçer, bağlanılan kategori, marka ve ürün başlangıç
// kataloğunda, sayfa (kart 0273) başlangıç sayfalarında olmalı. Dosyası olmayan sitede başlangıç menüsü yoktur.
export const menuBaslangiciniDogrula = (
  klasor: string,
  katalog: KatalogBaslangici,
  sayfalar: SayfaBaslangici = [],
): { gecerli: true; deger: MenuBaslangici } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, menuBaslangicDosyasi, []);
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = menuBaslangicSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(menuBaslangicDosyasi, sonuc.error.issues) };
  }
  const sorunlar = menuBaslangicKurallari(sonuc.data, {
    kategori: new Set(katalog.kategoriler.map((kayit) => kayit.adresAdi)),
    marka: new Set(katalog.markalar.map((kayit) => kayit.adresAdi)),
    urun: new Set(katalog.urunler.map((kayit) => kayit.adresAdi)),
    sayfa: new Set(sayfalar.map((sayfa) => sayfa.adresAdi)),
  });
  if (sorunlar.length > 0) {
    return {
      gecerli: false,
      hatalar: sorunlar.map(
        ({ yer, kod }) =>
          `${menuBaslangicDosyasi}: ${yer.join(".")}: ${kod} (${katalogBaslangicDosyasi} ya da ${sayfaBaslangicDosyasi} dosyasında bu adres adı yok)`,
      ),
    };
  }
  return { gecerli: true, deger: sonuc.data };
};

export const blogBaslangicDosyasi = "baslangic/blog.json";

// Başlangıç blogu (kart 0272): dosya şemadan ve alanlar arası kurallardan geçer. Dosyası olmayan sitede başlangıç blogu
// yoktur. Kapak görsellerini katalogGorselleriniDogrula denetler.
export const blogBaslangiciniDogrula = (
  klasor: string,
  saatDilimi: string,
): { gecerli: true; deger: BlogBaslangici } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, blogBaslangicDosyasi, {});
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = blogBaslangicSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(blogBaslangicDosyasi, sonuc.error.issues) };
  }
  const sorunlar = blogBaslangicKurallari(sonuc.data, saatDilimi);
  if (sorunlar.length > 0) {
    return {
      gecerli: false,
      hatalar: sorunlar.map((sorun) => `${blogBaslangicDosyasi}: ${sorun}`),
    };
  }
  return { gecerli: true, deger: sonuc.data };
};

export const sayfaBaslangicDosyasi = "baslangic/sayfalar.json";

// Başlangıç sayfaları (kart 0273): dosya şemadan ve adres adının tekilliğinden geçer. Dosyası olmayan sitede başlangıç
// sayfası yoktur.
export const sayfaBaslangiciniDogrula = (
  klasor: string,
): { gecerli: true; deger: SayfaBaslangici } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, sayfaBaslangicDosyasi, []);
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = sayfaBaslangicSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(sayfaBaslangicDosyasi, sonuc.error.issues) };
  }
  const sorunlar = sayfaBaslangicKurallari(sonuc.data);
  if (sorunlar.length > 0) {
    return {
      gecerli: false,
      hatalar: sorunlar.map((sorun) => `${sayfaBaslangicDosyasi}: ${sorun}`),
    };
  }
  return { gecerli: true, deger: sonuc.data };
};

export const kuponBaslangicDosyasi = "baslangic/kuponlar.json";

// Başlangıç kuponları (kart 0312): dosya şemadan ve alanlar arası kurallardan (tekil kod, türe uyan değer, kapsamın
// kayıtları başlangıç kataloğunda, geçerli zamanlar) geçer. Dosyası olmayan sitede başlangıç kuponu yoktur.
export const kuponBaslangiciniDogrula = (
  klasor: string,
  katalog: KatalogBaslangici,
  saatDilimi: string,
): { gecerli: true; deger: KuponBaslangici } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, kuponBaslangicDosyasi, []);
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = kuponBaslangicSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(kuponBaslangicDosyasi, sonuc.error.issues) };
  }
  const sorunlar = kuponBaslangicKurallari(
    sonuc.data,
    {
      urun: new Set(katalog.urunler.map((kayit) => kayit.adresAdi)),
      kategori: new Set(katalog.kategoriler.map((kayit) => kayit.adresAdi)),
    },
    saatDilimi,
  );
  if (sorunlar.length > 0) {
    return {
      gecerli: false,
      hatalar: sorunlar.map((sorun) => `${kuponBaslangicDosyasi}: ${sorun}`),
    };
  }
  return { gecerli: true, deger: sonuc.data };
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

// --- Demo paketi (kart 0345, karar 0203) ---

// Paketin yeri: site klasörünün iki üstündeki cekirdek/demolar/<kod>. Depoda siteler/<kod>/ için deponun kendisi;
// kutularda site /siteler/<kod> altına, paketler /cekirdek/demolar altına bağlanır.
export const demoKlasoru = (siteKlasoru: string, kod: string): string =>
  join(siteKlasoru, "..", "..", "cekirdek", "demolar", kod);

export const demoTanimDosyasi = "paket.json";

export const demoTanimSemasi = z.strictObject({
  kod: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  ad: z.string().trim().min(1).max(80),
  sektor: z.string().trim().min(1).max(80),
  aciklama: z.string().trim().min(1).max(500),
  // Önizleme görseli: paketin görsellerinden biri.
  onizleme: z.string().min(1),
  onerilenTema: kodSemasi,
  dil: ayarSemasi.shape.dil,
  paraBirimi: ayarSemasi.shape.paraBirimi,
  saatDilimi: ayarSemasi.shape.saatDilimi,
  // Paketin ürünlerinin kullandığı vergi sınıflarının adları: paketi kullanan sitenin vergi başlangıcında olmalı.
  vergiSiniflari: z.array(z.string().min(1)).max(50),
});
export type DemoTanimi = z.output<typeof demoTanimSemasi>;

export const demoTaniminiOku = (
  paketKlasoru: string,
): { gecerli: true; deger: DemoTanimi } | { gecerli: false; hatalar: string[] } => {
  if (!existsSync(paketKlasoru)) return { gecerli: false, hatalar: ["paket yok."] };
  const ham = jsonOku(paketKlasoru, demoTanimDosyasi);
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const sonuc = demoTanimSemasi.safeParse(ham.deger);
  if (!sonuc.success) {
    return { gecerli: false, hatalar: sorunlariYaz(demoTanimDosyasi, sonuc.error.issues) };
  }
  const hatalar: string[] = [];
  if (sonuc.data.kod !== basename(paketKlasoru)) {
    hatalar.push(
      `${demoTanimDosyasi}: kod: klasörün adıyla aynı olmalı (${basename(paketKlasoru)}).`,
    );
  }
  if (!existsSync(join(paketKlasoru, demoParcalari.gorseller, sonuc.data.onizleme))) {
    hatalar.push(`${demoTanimDosyasi}: onizleme: ${demoParcalari.gorseller} klasöründe yok.`);
  }
  // Mağaza adının yer tutucusu yalnız sayfaların ve blogun metinlerinde geçer (kurulum yalnız orada yerleştirir).
  for (const parca of ["katalog", "menuler", "duzen", "kuponlar"] as const) {
    const yol = join(paketKlasoru, demoParcalari[parca]);
    if (existsSync(yol) && readFileSync(yol, "utf8").includes(magazaAdiYerTutucusu)) {
      hatalar.push(
        `${demoParcalari[parca]}: ${magazaAdiYerTutucusu} yalnız sayfalarda ve blogda kullanılır.`,
      );
    }
  }
  return hatalar.length > 0 ? { gecerli: false, hatalar } : { gecerli: true, deger: sonuc.data };
};

// Her paket parçasının okunacağı klasör ve hatalara paketin yerini ekleyen yardımcı. Demosuz sitede her parça
// sitenin kendi klasöründendir.
const demoKaynaklari = (
  klasor: string,
  ayarlar: z.output<typeof ayarSemasi> | undefined,
  vergi: VergiBaslangici | undefined,
) => {
  const kaynak = Object.fromEntries(demoParcaKodlari.map((p) => [p, klasor])) as Record<
    DemoParcasi,
    string
  >;
  const hatalar: string[] = [];
  const kod = ayarlar?.baslangicDemosu;
  const siteden = new Set(ayarlar?.demoParcasiSiteden ?? []);
  if (kod === undefined) {
    if (siteden.size > 0) {
      hatalar.push("ayarlar.json: demoParcasiSiteden: başlangıç demosu yokken yazılmaz.");
    }
  } else {
    const paket = demoKlasoru(klasor, kod);
    const tanim = demoTaniminiOku(paket);
    if (!tanim.gecerli) {
      hatalar.push(...tanim.hatalar.map((h) => `demo paketi ${kod}: ${h}`));
    } else if (ayarlar !== undefined) {
      for (const alan of ["dil", "paraBirimi", "saatDilimi"] as const) {
        if (tanim.deger[alan] !== ayarlar[alan]) {
          hatalar.push(
            `ayarlar.json: baslangicDemosu: ${kod} paketinin ${alan} değeri ${tanim.deger[alan]}, sitenin ${ayarlar[alan]}.`,
          );
        }
      }
      const siniflar = new Set(vergi?.siniflar.map((s) => s.ad) ?? []);
      for (const sinif of tanim.deger.vergiSiniflari) {
        if (vergi !== undefined && !siniflar.has(sinif)) {
          hatalar.push(
            `${vergiBaslangicDosyasi}: ${kod} paketinin ürünleri "${sinif}" vergi sınıfını kullanıyor, sitede yok.`,
          );
        }
      }
    }
    for (const parca of demoParcaKodlari) {
      const sitede = existsSync(join(klasor, demoParcalari[parca]));
      if (siteden.has(parca)) {
        if (!sitede)
          hatalar.push(`${demoParcalari[parca]}: demoParcasiSiteden'de yazılı ama sitede yok.`);
      } else {
        if (sitede) {
          hatalar.push(
            `${demoParcalari[parca]}: ${kod} paketinde; sitede de olamaz (değiştirmek için demoParcasiSiteden).`,
          );
        }
        kaynak[parca] = paket;
      }
    }
  }
  const yerler = Object.fromEntries(
    demoParcaKodlari.map((p) => [p, kaynak[p] === klasor ? "" : `cekirdek/demolar/${kod ?? ""}/`]),
  ) as Record<DemoParcasi, string>;
  const oneklenmis = <T extends { gecerli: boolean }>(parca: DemoParcasi, sonuc: T): T =>
    !sonuc.gecerli && "hatalar" in sonuc && yerler[parca]
      ? { ...sonuc, hatalar: (sonuc.hatalar as string[]).map((h) => `${yerler[parca]}${h}`) }
      : sonuc;
  return { kaynak, hatalar, oneklenmis };
};

// Paketin kendi başına doğrulanması (karar 0203): tanımındaki saat dilimi, vergi sınıfları ve önerilen temayla, site
// doğrulamasının aynı başlangıç denetimleri. Hatalar paketin klasörüne göre yazılır.
export const demoPaketiniDogrula = (paketKlasoru: string): string[] => {
  const tanim = demoTaniminiOku(paketKlasoru);
  if (!tanim.gecerli) return tanim.hatalar;
  const { saatDilimi, vergiSiniflari, onerilenTema } = tanim.deger;
  const hatalar: string[] = [];
  const videoSiteleri = ayarSemasi.shape.videoSiteleri.parse(undefined);
  const vergi = vergiBaslangicSemasi.parse({ siniflar: vergiSiniflari.map((ad) => ({ ad })) });
  const katalog = katalogBaslangiciniDogrula(paketKlasoru, { saatDilimi, vergi, videoSiteleri });
  if (!katalog.gecerli) hatalar.push(...katalog.hatalar);
  const sayfalar = sayfaBaslangiciniDogrula(paketKlasoru);
  if (!sayfalar.gecerli) hatalar.push(...sayfalar.hatalar);
  const blog = blogBaslangiciniDogrula(paketKlasoru, saatDilimi);
  if (!blog.gecerli) hatalar.push(...blog.hatalar);
  if (!hazirTemaKodlari().includes(onerilenTema)) {
    hatalar.push(`${demoTanimDosyasi}: onerilenTema: hazır temalarda yok: ${onerilenTema}.`);
  }
  if (!katalog.gecerli) return hatalar;
  if (sayfalar.gecerli) {
    const menuler = menuBaslangiciniDogrula(paketKlasoru, katalog.deger, sayfalar.deger);
    if (!menuler.gecerli) hatalar.push(...menuler.hatalar);
  }
  const kuponlar = kuponBaslangiciniDogrula(paketKlasoru, katalog.deger, saatDilimi);
  if (!kuponlar.gecerli) hatalar.push(...kuponlar.hatalar);
  const tema = hazirTemaKodlari().includes(onerilenTema) ? hazirTemayiOku(onerilenTema) : undefined;
  if (tema !== undefined && !tema.gecerli) hatalar.push(...tema.hatalar);
  const duzen =
    tema?.gecerli === true
      ? duzenBaslangiciniDogrula(paketKlasoru, tema.tema, katalog.deger)
      : undefined;
  if (duzen !== undefined && !duzen.gecerli) hatalar.push(...duzen.hatalar);
  const gorseller = katalogGorselleriniDogrula(
    paketKlasoru,
    katalog.deger,
    duzen?.gecerli === true ? duzen.deger : undefined,
    blog.gecerli ? blog.deger : undefined,
  );
  if (!gorseller.gecerli) hatalar.push(...gorseller.hatalar);
  return hatalar;
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

  if (ayarlar !== undefined) hatalar.push(...temaDemosuSorunlari(kimlik, ayarlar));

  const baslangic = baslangicDosyasiniDogrula(klasor, magazaAyarSemasi);
  if (!baslangic.gecerli) hatalar.push(...baslangic.hatalar);
  const vergiBaslangici = vergiBaslangiciniDogrula(klasor);
  if (!vergiBaslangici.gecerli) hatalar.push(...vergiBaslangici.hatalar);

  // Demo paketi (karar 0203): paketin parçaları paketten, sitenin değiştirdiği parçalar siteden okunur.
  const kaynaklar = demoKaynaklari(
    klasor,
    ayarlar,
    vergiBaslangici.gecerli ? vergiBaslangici.deger : undefined,
  );
  hatalar.push(...kaynaklar.hatalar);
  const { kaynak, oneklenmis } = kaynaklar;

  const katalogBaslangici = oneklenmis(
    "katalog",
    katalogBaslangiciniDogrula(
      kaynak.katalog,
      vergiBaslangici.gecerli && ayarlar !== undefined
        ? {
            saatDilimi: ayarlar.saatDilimi,
            vergi: vergiBaslangici.deger,
            videoSiteleri: ayarlar.videoSiteleri,
          }
        : undefined,
    ),
  );
  if (!katalogBaslangici.gecerli) hatalar.push(...katalogBaslangici.hatalar);
  const sayfaBaslangici = oneklenmis("sayfalar", sayfaBaslangiciniDogrula(kaynak.sayfalar));
  if (!sayfaBaslangici.gecerli) hatalar.push(...sayfaBaslangici.hatalar);
  const menuBaslangici =
    katalogBaslangici.gecerli && sayfaBaslangici.gecerli
      ? oneklenmis(
          "menuler",
          menuBaslangiciniDogrula(kaynak.menuler, katalogBaslangici.deger, sayfaBaslangici.deger),
        )
      : undefined;
  if (menuBaslangici !== undefined && !menuBaslangici.gecerli) {
    hatalar.push(...menuBaslangici.hatalar);
  }
  const kuponBaslangici = katalogBaslangici.gecerli
    ? oneklenmis(
        "kuponlar",
        kuponBaslangiciniDogrula(
          kaynak.kuponlar,
          katalogBaslangici.deger,
          ayarlar?.saatDilimi ?? "UTC",
        ),
      )
    : undefined;
  if (kuponBaslangici !== undefined && !kuponBaslangici.gecerli) {
    hatalar.push(...kuponBaslangici.hatalar);
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
  const baslangicTemasi =
    temalar?.gecerli === true && temaBaslangici?.gecerli === true
      ? temalar.temalar.find((tema) => tema.kod === temaBaslangici.deger.tema)
      : undefined;
  const duzenBaslangici =
    baslangicTemasi === undefined || !katalogBaslangici.gecerli
      ? undefined
      : oneklenmis(
          "duzen",
          duzenBaslangiciniDogrula(kaynak.duzen, baslangicTemasi, katalogBaslangici.deger),
        );
  if (duzenBaslangici !== undefined && !duzenBaslangici.gecerli) {
    hatalar.push(...duzenBaslangici.hatalar);
  }
  const blogBaslangici = oneklenmis(
    "blog",
    blogBaslangiciniDogrula(kaynak.blog, ayarlar?.saatDilimi ?? "UTC"),
  );
  if (!blogBaslangici.gecerli) hatalar.push(...blogBaslangici.hatalar);
  // Başlangıç düzeninin blog bölümü kategoriyi adres adıyla seçer: başlangıç blogunda olmalı (kart 0272).
  if (blogBaslangici.gecerli && duzenBaslangici?.gecerli === true) {
    const blogKategorileri = new Set(blogBaslangici.deger.kategoriler.map((k) => k.adresAdi));
    for (const [alan, bolumler] of Object.entries(duzenBaslangici.deger)) {
      for (const [sira, bolum] of bolumler.entries()) {
        const kategori = (bolum.degerler as { kategori?: unknown }).kategori;
        if (bolum.tur === "blog-yazilari" && typeof kategori === "string" && kategori !== "") {
          if (!blogKategorileri.has(kategori)) {
            hatalar.push(
              `${duzenBaslangicDosyasi}: ${alan}.${sira}.degerler.kategori: ${blogBaslangicDosyasi} dosyasında bu adres adıyla blog kategorisi yok.`,
            );
          }
        }
      }
    }
  }
  const katalogGorselleri = katalogBaslangici.gecerli
    ? oneklenmis(
        "gorseller",
        katalogGorselleriniDogrula(
          kaynak.gorseller,
          katalogBaslangici.deger,
          duzenBaslangici?.gecerli === true ? duzenBaslangici.deger : undefined,
          blogBaslangici.gecerli ? blogBaslangici.deger : undefined,
        ),
      )
    : undefined;
  if (katalogGorselleri !== undefined && !katalogGorselleri.gecerli) {
    hatalar.push(...katalogGorselleri.hatalar);
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
    menuBaslangici === undefined ||
    !menuBaslangici.gecerli ||
    !sayfaBaslangici.gecerli ||
    kuponBaslangici === undefined ||
    !kuponBaslangici.gecerli ||
    !markaLogosu.gecerli ||
    temalar === undefined ||
    !temalar.gecerli ||
    temaBaslangici === undefined ||
    !temaBaslangici.gecerli ||
    duzenBaslangici === undefined ||
    !duzenBaslangici.gecerli ||
    !blogBaslangici.gecerli
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
      duzenBaslangici: duzenBaslangici.deger,
      menuBaslangici: menuBaslangici.deger,
      blogBaslangici: blogBaslangici.deger,
      sayfaBaslangici: sayfaBaslangici.deger,
      kuponBaslangici: kuponBaslangici.deger,
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
