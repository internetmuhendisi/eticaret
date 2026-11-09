// Bileşen kataloğunun örnek vitrin bağlamı ve üst ve alt kısım bölümleri (kart 0108). Vitrinde bu veri mağaza
// ayarlarından ve menülerden gelir (cekirdek/vitrin/baglam-oku.ts); katalog onu örnekle doldurur. Bütün işlevler
// açıktır: arama, favori ve sepet düğmeleri ile ödeme işaretleri de görünür ve denenir. Örnek metinler metin
// dosyasındadır, hiçbir siteye ait değildir.
import { altyapiAdi } from "../kayitlar/altyapi";
import { islevler } from "../kayitlar/islevler";
import { odemeIsaretleri } from "../kayitlar/odeme";
import { sosyalHesapAdresleri } from "../kayitlar/sosyal-siteler";
import { bicim, metin } from "../metinler/site-metni";
import { kayitAdresleri, vitrinAdresleri } from "../vitrin/adresler";
import type { BaglamMenuDali, VitrinBaglami } from "../vitrin/bolum-kutuphanesi/baglam";
import type { BolumOrnegi } from "../vitrin/bolum-kutuphanesi/duzen";

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

export const ornekBaglam = (): VitrinBaglami => ({
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
  sayilar: { sepet: 2, favori: 3 },
  yil: bicim().yil(new Date()),
  altyapiAdi,
});

// Geniş logo (10:1): dar ekranda oranını korumalı, ezilmemeli (kart 0108 kontrolü).
export const ornekGenisLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='80'%3E%3Crect width='800' height='80'/%3E%3C/svg%3E";

const ornekBolum = (tur: string, gorunum: string, degerler: Record<string, unknown> = {}) => ({
  kimlik: `ornek-${tur}-${gorunum}`,
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
