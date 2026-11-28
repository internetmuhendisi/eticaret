// Demo paketinin parçaları (kart 0345, karar 0203). Tek liste: site doğrulaması paketi bu listeyle okur, içe
// aktarma (kart 0347) aynı listeyi kullanır. Her parçanın paketteki ve sitedeki yeri aynıdır (baslangic/ altında).
export const demoParcalari = {
  katalog: "baslangic/katalog.json",
  gorseller: "baslangic/gorseller",
  menuler: "baslangic/menuler.json",
  duzen: "baslangic/duzen.json",
  sayfalar: "baslangic/sayfalar.json",
  blog: "baslangic/blog.json",
  kuponlar: "baslangic/kuponlar.json",
} as const;

export type DemoParcasi = keyof typeof demoParcalari;
export const demoParcaKodlari = Object.keys(demoParcalari) as [DemoParcasi, ...DemoParcasi[]];

// Mağazanın kendisine ait olanlar: pakette yoktur, sitede kalır (içe aktarma bunlara dokunmaz).
export const magazaninParcalari = {
  ayarlar: "baslangic/ayarlar.json",
  vergi: "baslangic/vergi.json",
  tema: "baslangic/tema.json",
  logo: "marka",
} as const;

// Paket metinlerinde mağazanın adının yer tutucusu; kurulumda mağazanın adı konur (kullanıcı kararı).
export const magazaAdiYerTutucusu = "{magazaAdi}";

// Yer tutucunun yerine mağazanın adını koyar. Ad düz metin olarak girer ($ ve benzeri işaretler yorumlanmaz); HTML
// içerikte (sayfa ve blog içeriği) kaçırılarak girer: "Moda<3" gibi bir ad etiket sanılıp silinmesin.
const htmlIcin = (ad: string): string =>
  ad.replace(/[&<>"']/g, (harf) => `&#${harf.charCodeAt(0)};`);

export const magazaAdiniYerlestir = (
  metin: string,
  ad: string,
  { html = false }: { html?: boolean } = {},
): string => metin.split(magazaAdiYerTutucusu).join(html ? htmlIcin(ad) : ad);

// Kutuda demo paketlerinin klasörü: site /siteler/<kod> altına bağlandığı için site klasörünün iki üstü (karar 0203).
export const kutudakiDemoKlasoru = "/cekirdek/demolar";
