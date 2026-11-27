// Mağaza sahibinin panelden düzenlediği e-posta metinleri (kart 0279, karar 0197). Tek kayıt: hangi e-postanın hangi
// hâlinin (birim) konusu, giriş ve kapanış metni düzenlenir, varsayılanı hangi metin anahtarıdır ve metinde hangi
// bilgiler ([Müşteri adı]) kullanılabilir. Tablo, tutar, kargo kutusu, düğmeler, güvenlik uyarısı ve alt bilginin
// yasal satırları düzenlenmez.
//
// Metin parçalarla saklanır: yazı ve bilgi ayrı durur, mağaza sahibinin yazdığı "{" ya da "[" bilgi sayılmaz, bilginin
// değeri metnin içinde yeniden aranmaz. Değerler (müşterinin adı) gönderimde HTML olarak kaçırılır (sablon.ts).
//
// Bu dosya saftır (veritabanı yok, metin dosyası yok): e-posta şablonu ve panelin ekranı içe aktarır.
import type { EpostaSablonu } from "../../kayitlar/eposta.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";

// Metinde kullanılabilen bilgiler; adları metin dosyasında (eposta.bilgi.<kod>), değerleri gönderimde gelir.
export const epostaBilgileri = [
  "ad",
  "numara",
  "magaza",
  "secenek",
  "tutar",
  "firma",
  "takipNo",
  "dakika",
] as const;
export type EpostaBilgisi = (typeof epostaBilgileri)[number];

export const epostaBilgiAdlari: Record<EpostaBilgisi, MetinAnahtari> = {
  ad: "eposta.bilgi.ad",
  numara: "eposta.bilgi.numara",
  magaza: "eposta.bilgi.magaza",
  secenek: "eposta.bilgi.secenek",
  tutar: "eposta.bilgi.tutar",
  firma: "eposta.bilgi.firma",
  takipNo: "eposta.bilgi.takipNo",
  dakika: "eposta.bilgi.dakika",
};

export const epostaMetinAlanlari = ["konu", "giris", "kapanis"] as const;
export type EpostaMetinAlani = (typeof epostaMetinAlanlari)[number];

export const epostaMetinSinirlari = { konu: 200, giris: 2000, kapanis: 1000 } as const;

export type EpostaMetinBirimi = {
  sablon: EpostaSablonu;
  grup: "siparis" | "hesap";
  konu: MetinAnahtari;
  giris: MetinAnahtari;
  // Varsayılan kapanış; yoksa kapanış boştur.
  kapanis?: MetinAnahtari;
  bilgiler: readonly EpostaBilgisi[];
};

const siparis = ["ad", "numara", "magaza"] as const;

// Sıra panelin listesinin sırasıdır (taslak, karar 0185). Birimin kodu bir kez yayınlandıktan sonra değişmez: kayıtlı
// metinler onu taşır.
export const epostaMetinBirimleri = {
  "siparis-alindi-havale": {
    sablon: "siparis-alindi",
    grup: "siparis",
    konu: "eposta.siparisAlindi.konu",
    giris: "eposta.siparisAlindi.havale",
    bilgiler: siparis,
  },
  "siparis-alindi-kapida": {
    sablon: "siparis-alindi",
    grup: "siparis",
    konu: "eposta.siparisAlindi.konu",
    giris: "eposta.siparisAlindi.kapida",
    bilgiler: [...siparis, "secenek"],
  },
  "siparis-alindi-odendi": {
    sablon: "siparis-alindi",
    grup: "siparis",
    konu: "eposta.siparisAlindi.konu",
    giris: "eposta.siparisAlindi.odendi",
    bilgiler: siparis,
  },
  "havale-onaylandi": {
    sablon: "havale-onaylandi",
    grup: "siparis",
    konu: "eposta.havaleOnaylandi.konu",
    giris: "eposta.havaleOnaylandi.govde",
    bilgiler: [...siparis, "tutar"],
  },
  "kargoya-verildi": {
    sablon: "kargoya-verildi",
    grup: "siparis",
    konu: "eposta.kargoyaVerildi.konu",
    giris: "eposta.kargoyaVerildi.govde",
    bilgiler: [...siparis, "firma", "takipNo"],
  },
  "teslim-edildi": {
    sablon: "teslim-edildi",
    grup: "siparis",
    konu: "eposta.teslimEdildi.konu",
    giris: "eposta.teslimEdildi.govde",
    bilgiler: siparis,
  },
  "siparis-iptali-sure-doldu": {
    sablon: "siparis-iptali",
    grup: "siparis",
    konu: "eposta.siparisIptali.konu",
    giris: "eposta.siparisIptali.sureDoldu",
    bilgiler: siparis,
  },
  "siparis-iptali-musteri": {
    sablon: "siparis-iptali",
    grup: "siparis",
    konu: "eposta.siparisIptali.konu",
    giris: "eposta.siparisIptali.musteri",
    bilgiler: siparis,
  },
  "siparis-iptali-magaza": {
    sablon: "siparis-iptali",
    grup: "siparis",
    konu: "eposta.siparisIptali.konu",
    giris: "eposta.siparisIptali.magaza",
    bilgiler: siparis,
  },
  "siparis-iadesi": {
    sablon: "siparis-iadesi",
    grup: "siparis",
    konu: "eposta.tamIade.konu",
    giris: "eposta.tamIade.govde",
    bilgiler: siparis,
  },
  "siparis-kismi-iadesi": {
    sablon: "siparis-kismi-iadesi",
    grup: "siparis",
    konu: "eposta.kismiIade.konu",
    giris: "eposta.kismiIade.govde",
    bilgiler: siparis,
  },
  "musteriye-not": {
    sablon: "musteriye-not",
    grup: "siparis",
    konu: "eposta.musteriyeNot.konu",
    giris: "eposta.musteriyeNot.govde",
    bilgiler: siparis,
  },
  "iade-talebi-alindi": {
    sablon: "iade-talebi-alindi",
    grup: "siparis",
    konu: "eposta.talepAlindi.konu",
    giris: "eposta.talepAlindi.govde",
    bilgiler: siparis,
  },
  "iade-talebi-onaylandi": {
    sablon: "iade-talebi-onaylandi",
    grup: "siparis",
    konu: "eposta.talepOnaylandi.konu",
    giris: "eposta.talepOnaylandi.govde",
    kapanis: "eposta.talepOnaylandi.sonra",
    bilgiler: siparis,
  },
  "iade-talebi-reddedildi": {
    sablon: "iade-talebi-reddedildi",
    grup: "siparis",
    konu: "eposta.talepReddedildi.konu",
    giris: "eposta.talepReddedildi.govde",
    kapanis: "eposta.talepReddedildi.soru",
    bilgiler: siparis,
  },
  "adres-guncellendi": {
    sablon: "adres-guncellendi",
    grup: "siparis",
    konu: "eposta.adresGuncellendi.konu",
    giris: "eposta.adresGuncellendi.govde",
    kapanis: "eposta.adresGuncellendi.uyari",
    bilgiler: siparis,
  },
  "fatura-hazir": {
    sablon: "fatura-hazir",
    grup: "siparis",
    konu: "eposta.faturaHazir.konu",
    giris: "eposta.faturaHazir.govde",
    bilgiler: siparis,
  },
  "hos-geldin": {
    sablon: "hos-geldin",
    grup: "hesap",
    konu: "eposta.hosGeldin.konu",
    giris: "eposta.hosGeldin.govde",
    bilgiler: ["magaza"],
  },
  "sifre-sifirlama": {
    sablon: "sifre-sifirlama",
    grup: "hesap",
    konu: "eposta.sifreSifirlama.konu",
    giris: "eposta.sifreSifirlama.govde",
    bilgiler: ["magaza", "dakika"],
  },
} as const satisfies Record<string, EpostaMetinBirimi>;
export type EpostaMetinBirimKodu = keyof typeof epostaMetinBirimleri;
export const epostaMetinBirimKodlari = Object.keys(epostaMetinBirimleri) as EpostaMetinBirimKodu[];

export const birimKoduMu = (kod: string): kod is EpostaMetinBirimKodu =>
  Object.hasOwn(epostaMetinBirimleri, kod);

// Bir şablonun birimleri (kuyruğa giren e-postaya o anki metinleri yazılır).
export const sablonunBirimleri = (sablon: string): EpostaMetinBirimKodu[] =>
  epostaMetinBirimKodlari.filter((kod) => epostaMetinBirimleri[kod].sablon === sablon);

// Metnin parçası: yazı ya da bilgi.
export type MetinParcasi = { yazi: string } | { bilgi: EpostaBilgisi };
// Bir birimin kayıtlı metinleri: yalnız varsayılandan farklı olan alan yazılır.
export type BirimMetinleri = Partial<Record<EpostaMetinAlani, MetinParcasi[]>>;
export type KayitliMetinler = Partial<Record<EpostaMetinBirimKodu, BirimMetinleri>>;

const bilgiMi = (ad: string): ad is EpostaBilgisi =>
  (epostaBilgileri as readonly string[]).includes(ad);

// Metin dosyasındaki varsayılan ("Merhaba {ad}, ...") parçalara çevrilir; tanınmayan {x} yazı kalır.
export const varsayilanParcalar = (metin: string): MetinParcasi[] => {
  const parcalar: MetinParcasi[] = [];
  let son = 0;
  for (const eslesme of metin.matchAll(/\{([a-zA-Z]+)\}/g)) {
    const ad = eslesme[1] ?? "";
    if (!bilgiMi(ad)) continue;
    if (eslesme.index > son) parcalar.push({ yazi: metin.slice(son, eslesme.index) });
    parcalar.push({ bilgi: ad });
    son = eslesme.index + eslesme[0].length;
  }
  if (son < metin.length) parcalar.push({ yazi: metin.slice(son) });
  return parcalar;
};

// Parçaların panelde görünen yazısı: bilgi köşeli parantezde adıyla ("[Müşteri adı]").
export const parcalariYaz = (
  parcalar: readonly MetinParcasi[],
  adlar: Record<EpostaBilgisi, string>,
): string => parcalar.map((p) => ("yazi" in p ? p.yazi : `[${adlar[p.bilgi]}]`)).join("");

// Bilgilerin değerleriyle doldurur; değer yeniden aranmaz.
export const parcalariDoldur = (
  parcalar: readonly MetinParcasi[],
  degerler: Partial<Record<EpostaBilgisi, string>>,
): string => parcalar.map((p) => ("yazi" in p ? p.yazi : (degerler[p.bilgi] ?? ""))).join("");

// Ad karşılaştırması: büyük-küçük harf ve baştaki, sondaki boşluk fark etmez.
const adAnahtari = (ad: string, dil: string) => ad.normalize("NFC").trim().toLocaleLowerCase(dil);

// Panelin yazısını parçalara çevirir. Köşeli parantezdeki ad birimin bilgilerinden biri değilse "bilinmeyenler"e girer
// (kayıt reddedilir; önizleme onu yazı olarak çizer). Parantezin dışındaki yazı olduğu gibi kalır.
export const metniCoz = (
  hamYazi: string,
  g: { adlar: Record<EpostaBilgisi, string>; izinli: readonly EpostaBilgisi[]; dil: string },
): { parcalar: MetinParcasi[]; bilinmeyenler: string[] } => {
  // Yapıştırılan ayrışık harfler ("u" + iki nokta) birleşik yazılır: ad tanınır, kayıt tek biçimdedir.
  const yazi = hamYazi.normalize("NFC");
  const parcalar: MetinParcasi[] = [];
  const bilinmeyenler: string[] = [];
  const ekle = (metin: string) => {
    if (metin === "") return;
    const onceki = parcalar.at(-1);
    if (onceki !== undefined && "yazi" in onceki) onceki.yazi += metin;
    else parcalar.push({ yazi: metin });
  };
  let son = 0;
  for (const eslesme of yazi.matchAll(/\[([^[\]]*)\]/g)) {
    const ad = eslesme[1] ?? "";
    ekle(yazi.slice(son, eslesme.index));
    son = eslesme.index + eslesme[0].length;
    const bilgi = g.izinli.find((b) => adAnahtari(g.adlar[b], g.dil) === adAnahtari(ad, g.dil));
    if (bilgi === undefined) {
      bilinmeyenler.push(ad.trim());
      ekle(eslesme[0]);
    } else parcalar.push({ bilgi });
  }
  ekle(yazi.slice(son));
  return { parcalar, bilinmeyenler };
};

export const parcalarAyniMi = (a: readonly MetinParcasi[], b: readonly MetinParcasi[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
