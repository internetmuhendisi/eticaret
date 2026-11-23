// Tasarım değerleri (kart 0102, karar 0076). Vitrinin ve panelin bütün renkleri, yazı tipleri ve
// ölçüleri yalnız bu dosyada tanımlanır; Tailwind yalnız buradaki adları tanır (tailwind.ayar.ts).
// Belgesi: bilesenler/tasarim-degerleri/README.md
//
// İki tür değer vardır:
// - Tema değerleri: temadan temaya değişir (renkler, gölgeler, yazı tipleri, yazı ölçeği, köşeler).
//   Tailwind bunları CSS değişkeni olarak bilir, değerleri sayfa açılırken sitenin temasından yazılır
//   (css.ts). Aynı çekirdek görüntüsü her sitede çalıştığı için bu değerler derlemeye gömülmez.
// - Sabit değerler: bütün temalarda aynı cetveldir (boşluk ölçeği, genişlikler, kırılma noktaları,
//   katman sırası). Derlemede sınıflara yazılır.
//
// Başlangıç tema değerleri karar 0075'te seçilen Canlı Çarşı yönündendir. Yönetim paneli bütün
// sitelerde bu değerlerle açılır, siteden yalnız ana rengi alır (kart 0105). Vitrin değerlerini sitenin
// temasından alır (cekirdek/temalar/); Canlı Çarşı teması bugün bu değerleri kullanır.

// Renklerin anlamlı adları. "-ustu" o zeminin üstündeki yazı ve ikondur.
export const renkAdlari = [
  "zemin",
  "yuzey",
  "yazi",
  "soluk-yazi",
  "kenar",
  "alan-kenari",
  "birincil",
  "birincil-ustu",
  "indirim",
  "odak",
  "alt-kisim",
  "alt-kisim-ustu",
  "alt-kisim-soluk",
  "afis",
  "afis-ustu",
  "kutu-1",
  "kutu-2",
  "kutu-3",
  "kutu-4",
  "kutu-5",
  "tehlike",
  "tehlike-ustu",
  "tehlike-yazi",
  "tehlike-zemin",
  "basari",
  "basari-yazi",
  "basari-zemin",
  "uyari",
  "uyari-yazi",
  "uyari-zemin",
  "karekod",
  "karekod-zemin",
  "ortu",
] as const;
export type RenkAdi = (typeof renkAdlari)[number];

// Bağlı renkler (kart 0124): tema her birini ya kendi rengiyle verir ya da bir renk adına bağlar. Bağlı renk
// sayfada o rengin değişkenini okur: mağaza sahibi ana rengi değiştirince ana renge bağlı rozet de değişir
// (renkBaglari). Bağ her temada (açık ve koyu) ayrı verilebilir.
// - rozet / rozet-ustu: indirim rozeti, afişin üst yazısı, üst satırdaki sayı.
// - afis-dugmesi / afis-dugmesi-ustu: kayan afişin düğmesi.
// - vurgu-yazi: "Tümünü gör" bağlantısı ve güven şeridinin ikonları.
// - kart-kenari: ürün kartının kenarı (kartın kendi zeminine bağlanınca kenarsız görünür).
export const bagliRenkAdlari = [
  "rozet",
  "rozet-ustu",
  "afis-dugmesi",
  "afis-dugmesi-ustu",
  "vurgu-yazi",
  "kart-kenari",
] as const;
export type BagliRenkAdi = (typeof bagliRenkAdlari)[number];
export type TumRenkAdi = RenkAdi | BagliRenkAdi;

// Bir renk adı ya da "#rrggbb" (ayrımı renkAdiMi yapar; biçimi css.ts'teki şema denetler).
export type RenkKaynagi = string;
export type RenkBagi = RenkKaynagi | { acik: RenkKaynagi; koyu: RenkKaynagi };

export const renkAdiMi = (kaynak: string): kaynak is RenkAdi =>
  (renkAdlari as readonly string[]).includes(kaynak);

// Bağlı rengin verilen temadaki kaynağı: renk adı ya da renk.
export const bagKaynagi = (bag: RenkBagi, mod: "acik" | "koyu"): RenkKaynagi =>
  typeof bag === "string" ? bag : bag[mod];

// Bir temanın bütün renkleri (bağlı renkler çözülmüş): okunurluk ve kontrast ölçüsü bunu kullanır.
export const renkleriCoz = (
  renkler: Readonly<Record<RenkAdi, string>>,
  baglar: Readonly<Record<BagliRenkAdi, RenkBagi>>,
  mod: "acik" | "koyu",
): Record<TumRenkAdi, string> => {
  const cozulmus = { ...renkler } as Record<TumRenkAdi, string>;
  for (const ad of bagliRenkAdlari) {
    const kaynak = bagKaynagi(baglar[ad], mod);
    cozulmus[ad] = renkAdiMi(kaynak) ? renkler[kaynak] : kaynak;
  }
  return cozulmus;
};

export const golgeAdlari = ["kart", "acilir", "pencere"] as const;
export type GolgeAdi = (typeof golgeAdlari)[number];

export const yaziTipiAdlari = ["govde", "baslik", "kod"] as const;
export type YaziTipiAdi = (typeof yaziTipiAdlari)[number];

// Sitede barındırılan yazı tipleri (tailwind.css, @fontsource-variable paketleri). Bir tema yalnız
// bunları ve cihazın kendi yazı tiplerini (genelYaziTipleri) kullanabilir (kart 0105): listede olmayan
// yazı tipi ziyaretçinin cihazında yoksa sessizce başka bir yazı tipine düşerdi. Listenin tailwind.css ile
// aynı olduğunu testler/tailwind.test.ts denetler.
export const yuklenenYaziTipleri = {
  "Inter Variable": "@fontsource-variable/inter",
  "Jost Variable": "@fontsource-variable/jost",
  "Manrope Variable": "@fontsource-variable/manrope",
  "Archivo Variable": "@fontsource-variable/archivo",
} as const;
export const genelYaziTipleri = [
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "sans-serif",
  "serif",
  "monospace",
] as const;

// Tailwind'de yazı tipi ve kalınlık aynı önekle yazılır (font-...): kalınlık adları yazı tipi
// adlarıyla çakışmaz.
// "en-kalin" düğme ve rozet yazısıdır (karar 0075'in taslağında 700).
export const kalinlikAdlari = ["normal", "orta", "kalin", "en-kalin", "baslik-kalinligi"] as const;
export type KalinlikAdi = (typeof kalinlikAdlari)[number];

// Küçükten büyüğe. "govde" metnin olağan boyudur. Tailwind'de renk ve yazı boyu aynı önekle yazılır
// (text-...): yazı boyu adları renk adlarıyla çakışmaz (testler/tailwind.test.ts).
export const yaziBoyuAdlari = [
  "kucuk",
  "govde",
  "orta",
  "buyuk",
  "baslik-4",
  "baslik-3",
  "baslik-2",
  "baslik-1",
  "afis-basligi",
] as const;
export type YaziBoyuAdi = (typeof yaziBoyuAdlari)[number];

export const koseAdlari = ["kucuk", "orta", "dugme"] as const;
export type KoseAdi = (typeof koseAdlari)[number];

// Temadan temaya değişen boşluklar (kart 0124); öteki boşluklar sabit ölçektedir (sabitDegerler.bosluklar).
// - kart-ici: dikey ürün kartının yazı alanının iç boşluğu.
// - bolum / bolum-masaustu: ana sayfada bölümler arası boşluk; telefon ve tablette, masaüstünde.
export const temaBoslukAdlari = ["kart-ici", "bolum", "bolum-masaustu"] as const;
export type TemaBoslukAdi = (typeof temaBoslukAdlari)[number];

// Başlıkların biçimi (kart 0124): büyük harfe çevrilmesi ve harf aralığı. "font-baslik" sınıflı her yazıya
// uygulanır (tailwind.css); kayan afişin düğmesi de aynı biçimi alır.
export const baslikDonusumleri = ["none", "uppercase"] as const;

export type TemaDegerleri = {
  renkler: { acik: Record<RenkAdi, string>; koyu: Record<RenkAdi, string> };
  renkBaglari: Record<BagliRenkAdi, RenkBagi>;
  golgeler: { acik: Record<GolgeAdi, string>; koyu: Record<GolgeAdi, string> };
  yaziTipleri: Record<YaziTipiAdi, string>;
  kalinliklar: Record<KalinlikAdi, string>;
  yaziBoylari: Record<YaziBoyuAdi, { boy: string; satir: string }>;
  koseler: Record<KoseAdi, string>;
  baslikBicimi: { donusum: (typeof baslikDonusumleri)[number]; harfAraligi: string };
  bosluklar: Record<TemaBoslukAdi, string>;
  // Geniş ekranda (kirilmaNoktalari.genis) tam genişlikteki ürün ızgarasının ve şeridinin bir sıradaki kart
  // sayısı. Yan afişin yanındaki ızgara üç temada da dört sütundur (taslak).
  urunSutunu: number;
};

// Yazı tiplerinin adları: dosyaları sitede barındırılır (tailwind.css, @fontsource-variable paketleri),
// dış sunucudan yüklenmez. Adlar tırnaksız yazılır, böylece sayfaya yazılırken kaçış gerekmez.
export const varsayilanTemaDegerleri: TemaDegerleri = {
  renkler: {
    acik: {
      zemin: "#FFFFFF",
      yuzey: "#F5F6F8",
      yazi: "#1B1F27",
      "soluk-yazi": "#5A6170",
      kenar: "#E3E6EB",
      "alan-kenari": "#7A8190",
      birincil: "#F29F05",
      "birincil-ustu": "#1B1F27",
      indirim: "#C62F21",
      odak: "#1D5FD1",
      "alt-kisim": "#1E2533",
      "alt-kisim-ustu": "#E6E9EF",
      "alt-kisim-soluk": "#A9B1BF",
      afis: "#FFE2A8",
      "afis-ustu": "#1B1F27",
      "kutu-1": "#FDF1D6",
      "kutu-2": "#E2F0FF",
      "kutu-3": "#FFE3E3",
      "kutu-4": "#E4F6E8",
      "kutu-5": "#EFE6FF",
      tehlike: "#D92D20",
      "tehlike-ustu": "#FFFFFF",
      "tehlike-yazi": "#B42318",
      "tehlike-zemin": "#FEECEB",
      basari: "#17B26A",
      "basari-yazi": "#067647",
      "basari-zemin": "#E6F6EC",
      uyari: "#F29F05",
      "uyari-yazi": "#8A5300",
      "uyari-zemin": "#FEF4E2",
      karekod: "#000000",
      "karekod-zemin": "#FFFFFF",
      // Pencerenin arkasındaki örtü; saydamlığıyla kullanılır (bg-ortu/60).
      ortu: "#12151B",
    },
    koyu: {
      zemin: "#12151B",
      yuzey: "#1B2029",
      yazi: "#EEF0F4",
      "soluk-yazi": "#A3AAB8",
      kenar: "#2A303B",
      "alan-kenari": "#7C8496",
      birincil: "#F5A623",
      "birincil-ustu": "#12151B",
      indirim: "#FF8577",
      odak: "#8DB4FF",
      "alt-kisim": "#0B0D11",
      "alt-kisim-ustu": "#E6E9EF",
      "alt-kisim-soluk": "#A3AAB8",
      afis: "#33270F",
      "afis-ustu": "#EEF0F4",
      "kutu-1": "#2E2716",
      "kutu-2": "#17263A",
      "kutu-3": "#3A1F22",
      "kutu-4": "#1A2E22",
      "kutu-5": "#262037",
      tehlike: "#F04438",
      "tehlike-ustu": "#12151B",
      "tehlike-yazi": "#FF8577",
      "tehlike-zemin": "#3A1F22",
      basari: "#17B26A",
      "basari-yazi": "#6CD49A",
      "basari-zemin": "#1A2E22",
      uyari: "#F5A623",
      "uyari-yazi": "#F5C26B",
      "uyari-zemin": "#2E2716",
      // Karekod koyu temada da açık zeminde koyu durur: doğrulama uygulamaları ters renkli kodu
      // okuyamayabilir.
      karekod: "#000000",
      "karekod-zemin": "#FFFFFF",
      ortu: "#000000",
    },
  },
  golgeler: {
    acik: {
      kart: "none",
      acilir: "0 8px 24px rgb(27 31 39 / 0.12)",
      pencere: "0 16px 48px rgb(27 31 39 / 0.18)",
    },
    koyu: {
      kart: "none",
      acilir: "0 8px 24px rgb(0 0 0 / 0.45)",
      pencere: "0 16px 48px rgb(0 0 0 / 0.6)",
    },
  },
  yaziTipleri: {
    govde: "Inter Variable, system-ui, sans-serif",
    baslik: "Jost Variable, Inter Variable, system-ui, sans-serif",
    kod: "ui-monospace, monospace",
  },
  kalinliklar: {
    normal: "400",
    orta: "500",
    kalin: "600",
    "en-kalin": "700",
    "baslik-kalinligi": "600",
  },
  yaziBoylari: {
    kucuk: { boy: "0.75rem", satir: "1.4" },
    govde: { boy: "0.875rem", satir: "1.5" },
    orta: { boy: "1rem", satir: "1.5" },
    buyuk: { boy: "1.125rem", satir: "1.4" },
    "baslik-4": { boy: "1.25rem", satir: "1.2" },
    "baslik-3": { boy: "1.375rem", satir: "1.2" },
    "baslik-2": { boy: "1.5rem", satir: "1.15" },
    "baslik-1": { boy: "2rem", satir: "1.1" },
    "afis-basligi": { boy: "3rem", satir: "1.08" },
  },
  koseler: { kucuk: "4px", orta: "8px", dugme: "9999px" },
  // Rozet ana renktir, afiş düğmesi koyu (yazı renginde), vurgu yazı rengindedir, kartın ince kenarı vardır.
  renkBaglari: {
    rozet: "birincil",
    "rozet-ustu": "birincil-ustu",
    "afis-dugmesi": "yazi",
    "afis-dugmesi-ustu": "zemin",
    "vurgu-yazi": "yazi",
    "kart-kenari": "kenar",
  },
  baslikBicimi: { donusum: "none", harfAraligi: "normal" },
  bosluklar: { "kart-ici": "0.75rem", bolum: "2.5rem", "bolum-masaustu": "3rem" },
  urunSutunu: 5,
};

// Öteki iki hazır temanın değerleri (kart 0114, karar 0075'in B ve C yönleri). Renkler
// planlar/tasarim-yonu/secenekler.html taslağındandır; taslakta olmayan durum renkleri (alan kenarı, odak,
// uyarı, başarı, hata) o temanın zeminlerinde okunur olacak biçimde seçildi. Temaların kendisi
// cekirdek/temalar/hazir/ altındadır.
//
// Yumuşak Mevsim: kırık beyaz zemin, koyu yeşil vurgu, Manrope, yumuşak köşeler, gölgeli kart.
export const yumusakMevsimDegerleri: TemaDegerleri = {
  renkler: {
    acik: {
      zemin: "#FBFAF7",
      yuzey: "#F1EEE8",
      yazi: "#23211E",
      "soluk-yazi": "#5F5950",
      kenar: "#E4DFD6",
      "alan-kenari": "#7D776D",
      birincil: "#2F5D50",
      "birincil-ustu": "#FFFFFF",
      indirim: "#A63D29",
      odak: "#1D5FD1",
      "alt-kisim": "#2F3B36",
      "alt-kisim-ustu": "#EEF1EE",
      "alt-kisim-soluk": "#B9C3BD",
      afis: "#E3EBE4",
      "afis-ustu": "#23211E",
      "kutu-1": "#E9EFE6",
      "kutu-2": "#F3E7DA",
      "kutu-3": "#E6ECF2",
      "kutu-4": "#F2E4E4",
      "kutu-5": "#ECE8F1",
      tehlike: "#D92D20",
      "tehlike-ustu": "#FFFFFF",
      "tehlike-yazi": "#B42318",
      "tehlike-zemin": "#FEECEB",
      basari: "#17B26A",
      "basari-yazi": "#067647",
      "basari-zemin": "#E6F6EC",
      uyari: "#F29F05",
      "uyari-yazi": "#8A5300",
      "uyari-zemin": "#FEF4E2",
      karekod: "#000000",
      "karekod-zemin": "#FFFFFF",
      ortu: "#23211E",
    },
    koyu: {
      zemin: "#161816",
      yuzey: "#1F2320",
      yazi: "#ECEDE8",
      "soluk-yazi": "#A7ABA3",
      kenar: "#2E332F",
      "alan-kenari": "#7E847C",
      birincil: "#8CC5B0",
      "birincil-ustu": "#102019",
      indirim: "#F08A73",
      odak: "#8DB4FF",
      "alt-kisim": "#0F110F",
      "alt-kisim-ustu": "#ECEDE8",
      "alt-kisim-soluk": "#A7ABA3",
      afis: "#202A22",
      "afis-ustu": "#ECEDE8",
      "kutu-1": "#202A22",
      "kutu-2": "#2C251E",
      "kutu-3": "#1E2630",
      "kutu-4": "#2E2122",
      "kutu-5": "#25222D",
      tehlike: "#F04438",
      "tehlike-ustu": "#161816",
      "tehlike-yazi": "#FF8577",
      "tehlike-zemin": "#3A1F22",
      basari: "#17B26A",
      "basari-yazi": "#6CD49A",
      "basari-zemin": "#1A2E22",
      uyari: "#F5A623",
      "uyari-yazi": "#F5C26B",
      "uyari-zemin": "#2E2716",
      karekod: "#000000",
      "karekod-zemin": "#FFFFFF",
      ortu: "#000000",
    },
  },
  golgeler: {
    acik: {
      kart: "0 1px 3px rgb(35 33 30 / 0.08), 0 6px 18px rgb(35 33 30 / 0.05)",
      acilir: "0 8px 24px rgb(35 33 30 / 0.12)",
      pencere: "0 16px 48px rgb(35 33 30 / 0.18)",
    },
    koyu: {
      kart: "0 1px 3px rgb(0 0 0 / 0.4), 0 6px 18px rgb(0 0 0 / 0.3)",
      acilir: "0 8px 24px rgb(0 0 0 / 0.45)",
      pencere: "0 16px 48px rgb(0 0 0 / 0.6)",
    },
  },
  yaziTipleri: {
    govde: "Manrope Variable, system-ui, sans-serif",
    baslik: "Manrope Variable, system-ui, sans-serif",
    kod: "ui-monospace, monospace",
  },
  kalinliklar: { ...varsayilanTemaDegerleri.kalinliklar, "baslik-kalinligi": "800" },
  yaziBoylari: {
    ...varsayilanTemaDegerleri.yaziBoylari,
    govde: { boy: "0.9375rem", satir: "1.55" },
    "baslik-2": { boy: "1.75rem", satir: "1.15" },
    "afis-basligi": { boy: "3.25rem", satir: "1.08" },
  },
  koseler: { kucuk: "8px", orta: "16px", dugme: "12px" },
  // Afiş düğmesi ve vurgu ana renktir; kart kenarsızdır (kenar kartın kendi zeminindedir), gölgesi iki katlıdır.
  renkBaglari: {
    rozet: "birincil",
    "rozet-ustu": "birincil-ustu",
    "afis-dugmesi": "birincil",
    "afis-dugmesi-ustu": "birincil-ustu",
    "vurgu-yazi": "birincil",
    "kart-kenari": "zemin",
  },
  baslikBicimi: { donusum: "none", harfAraligi: "-0.01em" },
  bosluklar: { "kart-ici": "1rem", bolum: "3.5rem", "bolum-masaustu": "5rem" },
  urunSutunu: 4,
};

// Keskin Çizgi: beyaz zemin, koyu lacivert afiş, elektrik mavisi düğme, Archivo başlık, köşesiz kutular.
export const keskinCizgiDegerleri: TemaDegerleri = {
  renkler: {
    acik: {
      zemin: "#FFFFFF",
      yuzey: "#F2F3F7",
      yazi: "#0D1021",
      "soluk-yazi": "#4D5266",
      kenar: "#D6D9E3",
      "alan-kenari": "#767B90",
      birincil: "#2340FF",
      "birincil-ustu": "#FFFFFF",
      indirim: "#C8102E",
      odak: "#2340FF",
      "alt-kisim": "#0D1021",
      "alt-kisim-ustu": "#F1F2F8",
      "alt-kisim-soluk": "#A6ABC2",
      afis: "#0D1021",
      "afis-ustu": "#FFFFFF",
      "kutu-1": "#EEF1FF",
      "kutu-2": "#FFF6D6",
      "kutu-3": "#F0F0F0",
      "kutu-4": "#E8F7F1",
      "kutu-5": "#FDEBEF",
      tehlike: "#D92D20",
      "tehlike-ustu": "#FFFFFF",
      "tehlike-yazi": "#B42318",
      "tehlike-zemin": "#FEECEB",
      basari: "#17B26A",
      "basari-yazi": "#067647",
      "basari-zemin": "#E6F6EC",
      uyari: "#FFD43B",
      "uyari-yazi": "#7A5A00",
      "uyari-zemin": "#FFF6D6",
      karekod: "#000000",
      "karekod-zemin": "#FFFFFF",
      ortu: "#0D1021",
    },
    koyu: {
      zemin: "#0B0D18",
      yuzey: "#151829",
      yazi: "#F1F2F8",
      "soluk-yazi": "#A6ABC2",
      kenar: "#262A40",
      "alan-kenari": "#7A80A0",
      birincil: "#6F82FF",
      "birincil-ustu": "#0B0D18",
      indirim: "#FF6B81",
      odak: "#8FA0FF",
      "alt-kisim": "#05060C",
      "alt-kisim-ustu": "#F1F2F8",
      "alt-kisim-soluk": "#A6ABC2",
      afis: "#1A1F3D",
      "afis-ustu": "#F1F2F8",
      "kutu-1": "#1A2040",
      "kutu-2": "#2E2A14",
      "kutu-3": "#1E2130",
      "kutu-4": "#14291F",
      "kutu-5": "#30182A",
      tehlike: "#F04438",
      "tehlike-ustu": "#0B0D18",
      "tehlike-yazi": "#FF8577",
      "tehlike-zemin": "#3A1F22",
      basari: "#17B26A",
      "basari-yazi": "#6CD49A",
      "basari-zemin": "#14291F",
      uyari: "#FFD43B",
      "uyari-yazi": "#FFD43B",
      "uyari-zemin": "#2E2A14",
      karekod: "#000000",
      "karekod-zemin": "#FFFFFF",
      ortu: "#000000",
    },
  },
  golgeler: {
    acik: {
      kart: "none",
      acilir: "0 8px 24px rgb(13 16 33 / 0.14)",
      pencere: "0 16px 48px rgb(13 16 33 / 0.2)",
    },
    koyu: {
      kart: "none",
      acilir: "0 8px 24px rgb(0 0 0 / 0.5)",
      pencere: "0 16px 48px rgb(0 0 0 / 0.65)",
    },
  },
  yaziTipleri: {
    govde: "Inter Variable, system-ui, sans-serif",
    baslik: "Archivo Variable, Inter Variable, system-ui, sans-serif",
    kod: "ui-monospace, monospace",
  },
  kalinliklar: { ...varsayilanTemaDegerleri.kalinliklar, "baslik-kalinligi": "800" },
  yaziBoylari: {
    ...varsayilanTemaDegerleri.yaziBoylari,
    "baslik-2": { boy: "1.625rem", satir: "1.15" },
    "afis-basligi": { boy: "3.25rem", satir: "1.08" },
  },
  koseler: { kucuk: "0", orta: "0", dugme: "0" },
  // Rozet ve afiş düğmesi sarıdır (taslaktaki #FFD43B), üstündeki yazı koyudur; vurgu ana renktir.
  renkBaglari: {
    rozet: "#FFD43B",
    "rozet-ustu": { acik: "yazi", koyu: "zemin" },
    "afis-dugmesi": "#FFD43B",
    "afis-dugmesi-ustu": { acik: "yazi", koyu: "zemin" },
    "vurgu-yazi": "birincil",
    "kart-kenari": "kenar",
  },
  baslikBicimi: { donusum: "uppercase", harfAraligi: "0.02em" },
  bosluklar: { "kart-ici": "0.75rem", bolum: "2.5rem", "bolum-masaustu": "3.5rem" },
  urunSutunu: 5,
};

// Sabit değerler: bütün temalarda aynıdır.
export const sabitDegerler = {
  // Boşluk ölçeği: iç ve dış boşluk, aralık, genişlik ve yükseklik yalnız bu adımlarla yazılır.
  // 11 (2,75rem = 44px) parmakla rahat basılan en küçük yüksekliktir.
  bosluklar: {
    "0": "0px",
    px: "1px",
    "0.5": "0.125rem",
    "1": "0.25rem",
    "1.5": "0.375rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "11": "2.75rem",
    "12": "3rem",
    "16": "4rem",
    "20": "5rem",
  },
  // Kırılma noktaları: telefon varsayılandır, tablet ve masaüstü bu genişliklerden başlar.
  kirilmaNoktalari: { tablet: "40rem", masaustu: "64rem", genis: "80rem" },
  // Kapsayıcı genişlikleri (kart 0193): ekranın değil, parçanın kendi genişliğine göre yerleşim
  // (`@container` ile `@kart:`, `@max-kart:`).
  // kart: yatay ürün kartında sepet ve favori bu genişliğin altında fiyatın altına iner (karar 0134).
  kapsayicilar: { kart: "22rem" },
  // İçeriğin en çok genişliği.
  // panel: ürün bölümlerinin yan afişi ve fırsat paneli (kart 0111), masaüstünde.
  // yan-menu: yönetim panelinin yan menüsü (kart 0141), masaüstünde.
  genislikler: {
    karekod: "16rem",
    panel: "16rem",
    "yan-menu": "15.5rem",
    form: "28rem",
    // acilir: açılır panel (kart 0267, liste süzgecinin tarih paneli); 320 px telefonda kenar paylarıyla sığar.
    acilir: "18rem",
    // arama: üst satırdaki arama kutusu, masaüstünde logonun yanında (kart 0137, Canlı Çarşı taslağı).
    arama: "35rem",
    metin: "42rem",
    icerik: "80rem",
    // eposta: e-postanın gövdesi (kart 0240); e-posta programları bu genişlikten dar ekranda tam genişlik çizer.
    eposta: "37.5rem",
  },
  // Kod yüklenmeyince "yükleniyor" yazısının görünmeden önce beklediği süre (kart 0057).
  yukleniyorGecikmesi: "3s",
  // Açılış ve kapanış hareketlerinin süreleri (kart 0103). Hareketi azaltmayı seçen kullanıcıda
  // hareket olmaz (tailwind.css).
  sureler: { kisa: "150ms", orta: "200ms", uzun: "300ms", don: "1s", nabiz: "2s" },
  // Üst üste binen öğelerin sırası (.claude/rules/tasarim-sistemi.md).
  // Açılır parçalar (menü, seçim listesi, ipucu) pencerelerin üstündedir: pencerenin içinde açılan liste
  // pencerenin arkasında kalmaz (kart 0103, ölçüldü). Bildirim her şeyin üstündedir.
  katmanlar: {
    taban: "0",
    "ust-kisim": "10",
    "yan-pencere": "20",
    pencere: "30",
    acilir: "40",
    bildirim: "50",
  },
} as const;

// Kontrastı ölçülen çiftler: [yazı ya da işaret, zemin]. Her çift açık ve koyu temada ölçülür
// (testler/kontrast.test.ts). Yazı en az 4,5:1, alan kenarı ve odak gibi işaretler en az 3:1.
// Birincil renk işaret değildir: düğmeyi üstündeki yazı tanıtır (birincil-ustu / birincil çifti).
// Bu yüzden birincil renk tek başına bir şeyi göstermek için (onay kutusu, ilerleme) kullanılmaz.
// Bağlı renkler çözülerek ölçülür (renkleriCoz): ana renge bağlı vurgu, mağaza sahibinin seçtiği ana renkle de
// ölçülür.
export const yaziCiftleri: readonly (readonly [TumRenkAdi, TumRenkAdi])[] = [
  ["yazi", "zemin"],
  ["yazi", "yuzey"],
  ["soluk-yazi", "zemin"],
  ["soluk-yazi", "yuzey"],
  ["birincil-ustu", "birincil"],
  ["indirim", "zemin"],
  ["indirim", "yuzey"],
  ["alt-kisim-ustu", "alt-kisim"],
  ["alt-kisim-soluk", "alt-kisim"],
  ["afis-ustu", "afis"],
  ["yazi", "kutu-1"],
  ["yazi", "kutu-2"],
  ["yazi", "kutu-3"],
  ["yazi", "kutu-4"],
  ["yazi", "kutu-5"],
  ["tehlike-ustu", "tehlike"],
  ["tehlike-yazi", "zemin"],
  ["tehlike-yazi", "tehlike-zemin"],
  ["basari-yazi", "zemin"],
  ["basari-yazi", "basari-zemin"],
  ["uyari-yazi", "zemin"],
  ["uyari-yazi", "uyari-zemin"],
  ["karekod", "karekod-zemin"],
  // İpucu ters renklidir: zemin renginde yazı, yazı renginde zemin.
  ["zemin", "yazi"],
  // İkincil düğmenin ve menü öğesinin üzerine gelinmiş hâli.
  ["yazi", "kenar"],
  ["soluk-yazi", "kenar"],
  // Bağlı renkler (kart 0124): rozet, afiş düğmesi, "Tümünü gör" bağlantısı.
  ["rozet-ustu", "rozet"],
  ["afis-dugmesi-ustu", "afis-dugmesi"],
  ["vurgu-yazi", "zemin"],
];

export const isaretCiftleri: readonly (readonly [TumRenkAdi, TumRenkAdi])[] = [
  ["alan-kenari", "zemin"],
  ["odak", "zemin"],
  ["odak", "yuzey"],
  ["tehlike", "zemin"],
  // Güven şeridinin ikonu yüzey renginde bir dairededir; yanında yazısı vardır (kart 0124).
  ["vurgu-yazi", "yuzey"],
];
