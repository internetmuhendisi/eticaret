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

export type TemaDegerleri = {
  renkler: { acik: Record<RenkAdi, string>; koyu: Record<RenkAdi, string> };
  golgeler: { acik: Record<GolgeAdi, string>; koyu: Record<GolgeAdi, string> };
  yaziTipleri: Record<YaziTipiAdi, string>;
  kalinliklar: Record<KalinlikAdi, string>;
  yaziBoylari: Record<YaziBoyuAdi, { boy: string; satir: string }>;
  koseler: Record<KoseAdi, string>;
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
  // İçeriğin en çok genişliği.
  genislikler: { karekod: "16rem", form: "28rem", metin: "42rem", icerik: "80rem" },
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
export const yaziCiftleri: readonly (readonly [RenkAdi, RenkAdi])[] = [
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
];

export const isaretCiftleri: readonly (readonly [RenkAdi, RenkAdi])[] = [
  ["alan-kenari", "zemin"],
  ["odak", "zemin"],
  ["odak", "yuzey"],
  ["tehlike", "zemin"],
];
