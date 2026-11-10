// Bileşen kataloğunun örnek vitrin bağlamı ve üst ve alt kısım bölümleri (kart 0108). Vitrinde bu veri mağaza
// ayarlarından ve menülerden gelir (cekirdek/vitrin/baglam-oku.ts); katalog onu örnekle doldurur. Bütün işlevler
// açıktır: arama, favori ve sepet düğmeleri ile ödeme işaretleri de görünür ve denenir. Örnek metinler metin
// dosyasındadır, hiçbir siteye ait değildir.
import { altyapiAdi } from "../kayitlar/altyapi";
import { islevler } from "../kayitlar/islevler";
import { odemeIsaretleri } from "../kayitlar/odeme";
import { sosyalHesapAdresleri } from "../kayitlar/sosyal-siteler";
import type { MetinAnahtari } from "../metinler/metin";
import { bicim, metin } from "../metinler/site-metni";
import { kayitAdresleri, vitrinAdresleri } from "../vitrin/adresler";
import type {
  BaglamGorseli,
  BaglamKategorisi,
  BaglamMarkasi,
  BaglamMenuDali,
  VitrinBaglami,
} from "../vitrin/bolum-kutuphanesi/baglam";
import type { BolumOrnegi } from "../vitrin/bolum-kutuphanesi/duzen";
import { type UrunKaynagi, urunKaynagiAnahtari } from "../vitrin/bolum-kutuphanesi/urun-kaynagi";
import type { UrunKartiVerisi } from "../vitrin/urun-karti/tur";
import { ornekUrunKartlari } from "./ornek-urun-kartlari";

const dal = (
  kimlik: string,
  metinDegeri: string,
  adres: string | undefined,
  altlar: BaglamMenuDali[] = [],
): BaglamMenuDali => ({
  kimlik,
  metin: metinDegeri,
  ...(adres === undefined ? {} : { adres }),
  yeniSekme: false,
  altlar,
});

const kategoriMenusu = (): BaglamMenuDali[] => [
  dal("k-giyim", metin("gelistirme.bolum.ornek.menu.giyim"), kayitAdresleri.kategori("giyim"), [
    dal("k-kadin", metin("gelistirme.bolum.ornek.menu.kadin"), kayitAdresleri.kategori("kadin")),
    dal("k-erkek", metin("gelistirme.bolum.ornek.menu.erkek"), kayitAdresleri.kategori("erkek")),
  ]),
  dal("k-ev", metin("gelistirme.bolum.ornek.menu.ev"), kayitAdresleri.kategori("ev")),
];

// Ana sayfa bölümlerinin örnek görselleri ve kategorileri (kart 0110). Vitrinde görseller vitrin görseli ucundan,
// kategoriler kategori tablosundan gelir; katalog kimliği sabit örneklerle doldurur. Görseller yalın biçimlerdir
// (veri adresi), ürün fotoğrafı değildir.
const ornekKimlik = (sira: number) => `00000000-0000-4000-8000-${String(sira).padStart(12, "0")}`;

const ornekSekiller = [
  "<circle cx='50' cy='50' r='34' opacity='0.7'/>",
  "<rect x='20' y='20' width='60' height='60' rx='8' opacity='0.6'/>",
  "<polygon points='50,14 86,82 14,82' opacity='0.65'/>",
  "<rect x='14' y='34' width='72' height='32' rx='16' opacity='0.55'/>",
];

const ornekGorsel = (sira: number, genislik: number, yukseklik: number): BaglamGorseli => ({
  kaynaklar: [
    {
      adres: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${genislik}' height='${yukseklik}' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'>${ornekSekiller[sira % ornekSekiller.length] ?? ""}</svg>`,
      )}`,
      genislik,
    },
  ],
  genislik,
  yukseklik,
});

// Kare görseller 1–8, geniş görseller 11–12 (masaüstü afişi), dikey görsel 21 (telefon afişi).
export const ornekGorselKimligi = {
  kare: (sira: number) => ornekKimlik(sira + 1),
  genis: (sira: number) => ornekKimlik(sira + 11),
  dikey: ornekKimlik(21),
};

const ornekGorseller = (): Record<string, BaglamGorseli> => ({
  ...Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6, 7].map((sira) => [
      ornekGorselKimligi.kare(sira),
      ornekGorsel(sira, 480, 480),
    ]),
  ),
  [ornekGorselKimligi.genis(0)]: ornekGorsel(0, 960, 480),
  [ornekGorselKimligi.genis(1)]: ornekGorsel(2, 960, 480),
  [ornekGorselKimligi.dikey]: ornekGorsel(1, 480, 640),
});

// Kategori kutularının örnek kategorileri: altısının görseli var, biri görselsiz.
export const ornekKategoriKimligi = (sira: number) => ornekKimlik(sira + 101);
const ornekKategoriAdlari = [
  "gelistirme.bolum.ornek.menu.giyim",
  "gelistirme.bolum.ornek.menu.kadin",
  "gelistirme.bolum.ornek.menu.erkek",
  "gelistirme.bolum.ornek.menu.ev",
  "gelistirme.bolum.ornek.kategori.aksesuar",
  "gelistirme.bolum.ornek.kategori.uzunAdli",
  "gelistirme.bolum.ornek.kategori.gorselsiz",
] as const;
const ornekKategoriler = (): Record<string, BaglamKategorisi> =>
  Object.fromEntries(
    ornekKategoriAdlari.map((anahtar, sira) => [
      ornekKategoriKimligi(sira),
      {
        ad: metin(anahtar),
        adres: kayitAdresleri.kategori(`ornek-${sira + 1}`),
        ...(sira === ornekKategoriAdlari.length - 1
          ? {}
          : { gorsel: ornekGorselKimligi.kare(sira) }),
      },
    ]),
  );

// Ürün bölümlerinin örnek markaları ve kaynakları (kart 0111). Vitrinde markalar marka tablosundan, kaynakların
// ürünleri urunKartlari'ndan gelir; katalog örnek kartlarla doldurur. İlk iki markanın logosu var.
export const ornekMarkaKimligi = (sira: number) => ornekKimlik(sira + 201);
const ornekMarkaAdlari: readonly MetinAnahtari[] = [
  "gelistirme.bolum.ornek.anaSayfa.marka1",
  "gelistirme.bolum.ornek.anaSayfa.marka2",
  "gelistirme.bolum.ornek.anaSayfa.marka3",
  "gelistirme.bolum.ornek.anaSayfa.marka4",
  "gelistirme.bolum.ornek.anaSayfa.marka5",
];
const ornekMarkalar = (): Record<string, BaglamMarkasi> =>
  Object.fromEntries(
    ornekMarkaAdlari.map((anahtar, sira) => [
      ornekMarkaKimligi(sira),
      {
        ad: metin(anahtar),
        adres: kayitAdresleri.marka(`ornek-${sira + 1}`),
        ...(sira < 2 ? { logo: ornekGorselKimligi.genis(sira) } : {}),
      },
    ]),
  );

export const ornekKaynaklar = {
  oneCikan: { tur: "etiket", etiket: ornekKimlik(301), adet: 5 },
  yeni: { tur: "yeni", adet: 8 },
  kategori: { tur: "kategori", kategori: ornekKategoriKimligi(0), adet: 8 },
  indirimli: { tur: "indirimli", adet: 4 },
  marka: { tur: "marka", marka: ornekMarkaKimligi(0), adet: 4 },
  firsat2: { tur: "firsat", adet: 2 },
  firsat4: { tur: "firsat", adet: 4 },
} as const satisfies Record<string, UrunKaynagi>;

// Fırsatların örnek kartları: indirimli kartlar, bağlamın anından sonra biten indirimlerle (en yakın önce).
const dakikaSonra = (an: Date, dakika: number) => new Date(an.getTime() + dakika * 60_000);
const ornekFirsatlar = (an: Date): UrunKartiVerisi[] => {
  const kartlar = ornekUrunKartlari();
  const bitisler = [40, 3 * 60 + 20, 2 * 24 * 60 + 5 * 60, 6 * 24 * 60];
  return [0, 3, 6, 5].flatMap((sira, kacinci) => {
    const kart = kartlar[sira];
    const bitis = bitisler[kacinci];
    if (kart?.fiyat === undefined || bitis === undefined) return [];
    return [{ ...kart, fiyat: { ...kart.fiyat, indirimBitisi: dakikaSonra(an, bitis) } }];
  });
};

const ornekUrunler = (an: Date): Record<string, readonly UrunKartiVerisi[]> => {
  const kartlar = ornekUrunKartlari();
  const firsatlar = ornekFirsatlar(an);
  return {
    [urunKaynagiAnahtari(ornekKaynaklar.oneCikan)]: kartlar.slice(0, 5),
    [urunKaynagiAnahtari(ornekKaynaklar.yeni)]: kartlar.slice(0, 8),
    [urunKaynagiAnahtari(ornekKaynaklar.kategori)]: kartlar.slice(2, 6),
    [urunKaynagiAnahtari(ornekKaynaklar.indirimli)]: [0, 3, 6].flatMap(
      (sira) => kartlar[sira] ?? [],
    ),
    [urunKaynagiAnahtari(ornekKaynaklar.marka)]: kartlar.slice(4, 8),
    [urunKaynagiAnahtari(ornekKaynaklar.firsat2)]: firsatlar.slice(0, 2),
    [urunKaynagiAnahtari(ornekKaynaklar.firsat4)]: firsatlar,
  };
};

export const ornekBaglam = (an: Date = new Date()): VitrinBaglami => ({
  magazaAdi: metin("gelistirme.bolum.ornek.magazaAdi"),
  iletisim: {
    telefon: { metin: metin("gelistirme.bolum.ornek.telefon"), adres: "tel:+900000000000" },
    eposta: {
      metin: metin("gelistirme.bolum.ornek.eposta"),
      adres: `mailto:${metin("gelistirme.bolum.ornek.eposta")}`,
    },
    adres: [metin("gelistirme.bolum.ornek.adres1"), metin("gelistirme.bolum.ornek.adres2")],
  },
  sosyalHesaplar: [
    { site: "instagram", adres: sosyalHesapAdresleri.instagram("ornek") },
    { site: "tiktok", adres: sosyalHesapAdresleri.tiktok("ornek") },
  ],
  odemeIsaretleri,
  menuler: {
    "ana-menu": [
      dal("a-yeni", metin("gelistirme.bolum.ornek.menu.yeni"), vitrinAdresleri.anasayfa),
      ...kategoriMenusu(),
      dal("a-markalar", metin("gelistirme.bolum.ornek.menu.markalar"), undefined, [
        dal("a-marka", metin("gelistirme.bolum.ornek.menu.marka"), kayitAdresleri.marka("ornek")),
      ]),
    ],
    "kategori-menusu": kategoriMenusu(),
    "alt-bilgi": [
      dal(
        "b-alisveris",
        metin("gelistirme.bolum.ornek.menu.alisveris"),
        undefined,
        kategoriMenusu(),
      ),
      dal("b-sozlesmeler", metin("gelistirme.bolum.ornek.menu.sozlesmeler"), undefined, [
        dal(
          "b-uyelik",
          metin("gelistirme.bolum.ornek.menu.uyelik"),
          vitrinAdresleri.uyelikSozlesmesi,
        ),
        dal("b-kvkk", metin("gelistirme.bolum.ornek.menu.kvkk"), vitrinAdresleri.kvkkAydinlatma),
      ]),
    ],
  },
  islevler: Object.fromEntries(islevler.map((islev) => [islev, true])) as VitrinBaglami["islevler"],
  gorseller: ornekGorseller(),
  kategoriler: ornekKategoriler(),
  markalar: ornekMarkalar(),
  urunler: ornekUrunler(an),
  an,
  yerTutucular: { kargoyaVermeSuresi: bicim().sayi(1) },
  parcaGorunumleri: { "urun-karti": "dikey" },
  sayilar: { sepet: 2, favori: 3 },
  yil: bicim().yil(new Date()),
  altyapiAdi,
});

// Geniş logo (10:1): dar ekranda oranını korumalı, ezilmemeli (kart 0108 kontrolü).
export const ornekGenisLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='80'%3E%3Crect width='800' height='80'/%3E%3C/svg%3E";

// Aynı tür ve görünümden ikinci bölümün kimliği ekle ayrılır (React anahtarı tekil olmalı).
const ornekBolum = (
  tur: string,
  gorunum: string,
  degerler: Record<string, unknown> = {},
  ek = "",
) => ({
  kimlik: `ornek-${tur}-${gorunum}${ek}`,
  tur,
  gorunum,
  gizli: false,
  degerler,
});

// Üst ve alt kısmın örnek bölümleri: önce her türün ilk görünümü (vitrindeki gibi bir arada), sonra öteki
// görünümleri.
export const ornekUstKisim = (): BolumOrnegi[] => [
  ornekBolum("duyuru-seridi", "iki-yana", {
    metin: metin("gelistirme.bolum.ornek.duyuru"),
    zemin: "alt-kisim",
  }),
  ornekBolum("ust-satir", "logo-solda", {
    menuler: [{ menu: "ana-menu" }, { menu: "kategori-menusu" }],
  }),
  ornekBolum("menu-satiri", "sola-yasli", {
    anaMenu: "ana-menu",
    kategoriMenusu: "kategori-menusu",
  }),
];

// Canlı Çarşı taslağının sırası: iletişim sütunu önce, sonra bağlantı sütunları; telif ve ödeme işaretleri alt
// satırda.
export const ornekAltKisim = (): BolumOrnegi[] => [
  ornekBolum("iletisim-bilgileri", "liste"),
  ornekBolum("baglanti-sutunlari", "sutunlu", { menu: "alt-bilgi" }),
  ornekBolum("sosyal-hesaplar", "liste"),
  ornekBolum("telif-satiri", "duz", { ekMetin: metin("gelistirme.bolum.ornek.telifEk") }),
  ornekBolum("odeme-isaretleri", "yazili"),
];

export const ornekOtekiGorunumler = (): {
  ust: BolumOrnegi[];
  logolu: BolumOrnegi[];
  alt: BolumOrnegi[];
} => ({
  logolu: [ornekBolum("ust-satir", "logo-solda", { menuler: [{ menu: "ana-menu" }] })],
  ust: [
    ornekBolum("duyuru-seridi", "ortali", {
      metin: metin("gelistirme.bolum.ornek.duyuru"),
      baglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
      zemin: "birincil",
    }),
    ornekBolum("ust-satir", "logo-ortada", { menuler: [{ menu: "ana-menu" }] }),
    ornekBolum("menu-satiri", "ortali", { anaMenu: "ana-menu" }),
  ],
  alt: [
    ornekBolum("baglanti-sutunlari", "tek-satir", { menu: "alt-bilgi" }),
    ornekBolum("iletisim-bilgileri", "yatay"),
    ornekBolum("sosyal-hesaplar", "yatay"),
    ornekBolum("odeme-isaretleri", "yalniz-isaret"),
    ornekBolum("telif-satiri", "duz"),
  ],
});

// Ana sayfa bölümleri (kart 0110): önce her türün ilk görünümü, sonra öteki görünümler. Görseller ve
// kategoriler yukarıdaki örneklerdir.
const om = (anahtar: string) =>
  metin(`gelistirme.bolum.ornek.anaSayfa.${anahtar}` as Parameters<typeof metin>[0]);

const ornekSlaytlar = () => [
  {
    gorsel: ornekGorselKimligi.kare(0),
    gorselMetni: om("gorselMetni"),
    ustYazi: om("slayt1Ust"),
    baslik: om("slayt1Baslik"),
    metin: om("slayt1Metin"),
    dugmeYazisi: om("slayt1Dugme"),
    baglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
  },
  {
    gorsel: ornekGorselKimligi.kare(2),
    darEkranGorseli: ornekGorselKimligi.dikey,
    ustYazi: om("slayt2Ust"),
    baslik: om("slayt2Baslik"),
    metin: om("slayt2Metin"),
    dugmeYazisi: om("slayt2Dugme"),
    baglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
  },
  { baslik: om("slayt3Baslik") },
];

const ornekKampanyalar = () => [
  {
    gorsel: ornekGorselKimligi.kare(1),
    gorselMetni: om("gorselMetni"),
    rozet: om("kampanya1Rozet"),
    baslik: om("kampanya1Baslik"),
    metin: om("kampanya1Metin"),
    dugmeYazisi: om("kampanyaDugme"),
    baglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
  },
  {
    gorsel: ornekGorselKimligi.kare(3),
    rozet: om("kampanya2Rozet"),
    baslik: om("kampanya2Baslik"),
    baglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
    dugmeYazisi: om("kampanyaDugme"),
  },
  { baslik: om("kampanya3Baslik"), zemin: "yuzey" },
];

const ornekGenisAfis = () => ({
  gorsel: ornekGorselKimligi.kare(4),
  ustYazi: om("genisUst"),
  baslik: om("genisBaslik"),
  metin: om("genisMetin"),
  dugmeYazisi: om("genisDugme"),
  baglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
});

const ornekKategoriKutulari = () => ({
  baslik: om("kategoriBaslik"),
  kategoriler: [0, 1, 2, 3, 4, 5, 6].map((sira) => ({ kategori: ornekKategoriKimligi(sira) })),
});

const ornekGuvenMaddeleri = () => [
  { ikon: "kargo", metin: om("guven1") },
  { ikon: "paket", metin: om("guven2") },
  { ikon: "iade", metin: om("guven3") },
  { ikon: "havale", metin: om("guven4") },
];

export const ornekAnaSayfa = (): BolumOrnegi[] => [
  ornekBolum("kayan-afis", "yazi-solda", { slaytlar: ornekSlaytlar() }),
  ornekBolum("guven-seridi", "ikonlu", { maddeler: ornekGuvenMaddeleri() }),
  ornekBolum("kampanya-afisleri", "yatay", { afisler: ornekKampanyalar() }),
  ornekBolum("kategori-kutulari", "izgara", ornekKategoriKutulari()),
  ornekBolum("genis-afis", "yan-yana", ornekGenisAfis()),
];

export const ornekAnaSayfaOtekiGorunumler = (): BolumOrnegi[] => [
  ornekBolum("kayan-afis", "gorsel-arkada", {
    slaytlar: ornekSlaytlar().map((slayt, sira) =>
      sira === 0 ? { ...slayt, gorsel: ornekGorselKimligi.genis(0) } : slayt,
    ),
    gecis: "kapali",
    zemin: "yuzey",
  }),
  ornekBolum("guven-seridi", "kutulu", { maddeler: ornekGuvenMaddeleri().slice(0, 3) }),
  ornekBolum("kampanya-afisleri", "dikey", { afisler: ornekKampanyalar().slice(0, 2) }),
  ornekBolum("kategori-kutulari", "kaydirmali", ornekKategoriKutulari()),
  ornekBolum("genis-afis", "tam-genislik", {
    ...ornekGenisAfis(),
    gorsel: ornekGorselKimligi.genis(1),
    zemin: "afis",
  }),
];

// Ürün bölümleri (kart 0111): önce her türün ilk görünümü, sonra öteki görünümler. Ürünler, markalar ve indirim
// bitişleri yukarıdaki örneklerdir.
// Sıra Canlı Çarşı taslağındaki gibidir: öne çıkanlar, yan afişli yeni gelenler (bölümün başlığı yan afişin
// başlığıdır), kategoriye göre sekmeler, süreli fırsatlar, markalar.
export const ornekUrunBolumleri = (): BolumOrnegi[] => [
  ornekBolum("urun-vitrini", "izgara", {
    baslik: om("oneCikanlar"),
    urunler: ornekKaynaklar.oneCikan,
    tumuBaglantisi: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
  }),
  ornekBolum(
    "urun-vitrini",
    "izgara",
    {
      urunler: ornekKaynaklar.kategori,
      yanBaslik: om("yeniGelenler"),
      yanMetin: om("yeniGelenlerMetni"),
      yanGorsel: ornekGorselKimligi.kare(4),
      yanDugmeYazisi: om("yanDugme"),
      yanBaglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
    },
    "-yan-afisli",
  ),
  ornekBolum("sekmeli-vitrin", "izgara", {
    baslik: om("kategoriyeGore"),
    sekmeler: [
      { baslik: om("sekmeYeni"), urunler: ornekKaynaklar.yeni },
      { baslik: om("sekmeIndirimli"), urunler: ornekKaynaklar.indirimli },
      { baslik: om("sekmeMarka"), urunler: ornekKaynaklar.marka },
    ],
    kartGorunumu: "yatay",
  }),
  ornekBolum("firsatlar", "yan-panelli", {
    ustYazi: om("firsatUst"),
    baslik: om("firsatBaslik"),
  }),
  ornekBolum("marka-logolari", "izgara", {
    markalar: [0, 1, 2, 3, 4].map((sira) => ({ marka: ornekMarkaKimligi(sira) })),
  }),
];

export const ornekUrunBolumleriOtekiGorunumler = (): BolumOrnegi[] => [
  // Başlıklı bölümde yan afişin başlığı düz yazıdır.
  ornekBolum("urun-vitrini", "kaydirmali", {
    baslik: om("oneCikanlar"),
    urunler: ornekKaynaklar.yeni,
    yanBaslik: om("yeniGelenler"),
    yanMetin: om("yeniGelenlerMetni"),
    yanDugmeYazisi: om("yanDugme"),
    yanBaglanti: { adres: vitrinAdresleri.anasayfa, yeniSekme: false },
    yanZemin: "yuzey",
  }),
  ornekBolum("sekmeli-vitrin", "kaydirmali", {
    sekmeler: [
      { baslik: om("sekmeIndirimli"), urunler: ornekKaynaklar.indirimli },
      { baslik: om("sekmeMarka"), urunler: ornekKaynaklar.marka },
    ],
    kartGorunumu: "dikey",
  }),
  ornekBolum("firsatlar", "panelsiz", { adet: "dort", kartGorunumu: "yatay" }),
  ornekBolum("marka-logolari", "kaydirmali", {
    baslik: om("markalar"),
    markalar: [0, 1, 2, 3, 4].map((sira) => ({ marka: ornekMarkaKimligi(sira) })),
  }),
];
