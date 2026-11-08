// Bir site klasörünü okur ve kimlik ile ayar şemasından geçirir (kart 0010).
// Doğrulama komutu (komutlar/site-dogrula.mts), testler ve çalışan uygulama aynı yolu kullanır.
// Komut bu dosyaları Node ile doğrudan çalıştırdığı için ayar-semasi/ ve onun aldığı dosyalar
// birbirini .ts uzantısıyla alır.
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { z } from "zod";
import { type DosyaTuru, dosyaSinirlari } from "../kayitlar/dosya.ts";
import { icerikTuru, uzantininTuru } from "../moduller/dosya/tur.ts";
import {
  bosKatalog,
  type KatalogBaslangici,
  katalogBaslangicSemasi,
  katalogKurallari,
} from "../moduller/urun/baslangic-semasi.ts";
import { type VergiBaslangici, vergiBaslangicSemasi } from "../moduller/vergi/semalar.ts";
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
export type Site = {
  kimlik: Kimlik;
  ayarlar: SiteAyarlari;
  baslangic: MagazaAyarlari;
  vergiBaslangici: VergiBaslangici;
  katalogBaslangici: KatalogBaslangici;
  markaLogosu?: { yol: string; tur: DosyaTuru };
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
  site: { saatDilimi: string; vergi: VergiBaslangici } | undefined,
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
  }).map(({ yer, kod }) =>
    kod === "vergi-sinifi-tanimsiz"
      ? `${katalogBaslangicDosyasi}: ${yer}: ${kod} (${vergiBaslangicDosyasi} dosyasında bu adlı sınıf yok)`
      : `${katalogBaslangicDosyasi}: ${yer}: ${kod}`,
  );
  return hatalar.length > 0 ? { gecerli: false, hatalar } : { gecerli: true, deger: sonuc.data };
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
      ? { saatDilimi: ayarlar.saatDilimi, vergi: vergiBaslangici.deger }
      : undefined,
  );
  if (!katalogBaslangici.gecerli) hatalar.push(...katalogBaslangici.hatalar);
  const markaLogosu = markaLogosunuDogrula(klasor);
  if (!markaLogosu.gecerli) hatalar.push(...markaLogosu.hatalar);

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
    !markaLogosu.gecerli
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
      ...(markaLogosu.logo === undefined ? {} : { markaLogosu: markaLogosu.logo }),
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
