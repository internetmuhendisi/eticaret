// Panelin sayfa ağacı (kart 0141, karar 0111): her panel sayfası burada bir kez yazılır. Ana menü, sayfa yolu,
// sayfa başlığı ve sekme başlığı buradan üretilir; menüye ve sayfaya izin de buradan bakılır. Yeni panel ekranı
// önce buraya eklenir, sonra `app/yonetim/(panel)/` altına yazılır ve PanelSayfasi'na kendi kodunu verir.
// Ekranı yazılmamış sayfa ağaca girmez: menüdeki bağlantı bulunamadı sayfasına gitmesin.
import type { IkonAdi } from "../../bilesenler/ikonlar/sozluk";
import type { EklentiKodu } from "../kayitlar/eklentiler";
import type { GirisIzni } from "../kayitlar/izinler";
import type { MetinAnahtari } from "../metinler/metin";
import { panelAdresi } from "./adresler";

// Menüdeki gruplar, menüdeki sırasıyla. Grubun adı yalnız menüde görünür; grubun kendi sayfası yoktur.
export const panelGruplari = {
  urunler: "yonetim.grup.urunler",
  vitrin: "yonetim.grup.vitrin",
} as const satisfies Record<string, MetinAnahtari>;
export type PanelGrubu = keyof typeof panelGruplari;

export type PanelSayfaTanimi = {
  kod: string;
  adres: string;
  // Menüde, sayfa yolunda, başlıkta ve sekmede görünen ad.
  ad: MetinAnahtari;
  // Komut çubuğunda başlığın altındaki bir iki cümle.
  aciklama: MetinAnahtari;
  ikon: IkonAdi;
  // Sayfayı görmek için gereken izin; null ise her yönetici görür.
  izin: GirisIzni<"yonetici"> | null;
  // Menüde hangi grubun altında durduğu; null ise grupsuz, en üstte.
  grup: PanelGrubu | null;
  // Bir alt sayfa (form, detay) menüde görünmez, sayfa yolunda üstünün altında durur.
  ust?: string;
  // Menüde adın yanındaki küçük işaret, örneğin "Kısayol" (kart 0142, taslak).
  isaret?: MetinAnahtari;
  // Sayfayı getiren eklenti (kart 0144, karar 0117): eklenti sitede kapalıysa sayfa menüde yoktur ve açılmaz.
  eklenti?: EklentiKodu;
};

// Sıra menüdeki sıradır. İlk sayfa panelin kökü ve girişten sonraki açılış sayfasıdır; sayfa yolu onunla başlar.
export const panelSayfalari = [
  {
    kod: "karsilama",
    adres: panelAdresi,
    ad: "yonetim.sayfa.karsilama.ad",
    aciklama: "yonetim.sayfa.karsilama.aciklama",
    ikon: "ev",
    izin: null,
    grup: null,
  },
  // Slider kısayolu (kart 0142, karar 0101): ana sayfadaki ilk kayan afişin formu. Kayıtta düzeni değiştirir.
  {
    kod: "slider",
    adres: `${panelAdresi}/slider`,
    // Ad bölümün kendi adıdır (tek yerde, karar 0101): kayan afiş panelde "Slider".
    ad: "vitrin.bolum.kayanAfis.ad",
    aciklama: "yonetim.sayfa.sliderAciklamasi",
    ikon: "slider",
    izin: "duzen.degistir",
    grup: "vitrin",
    isaret: "yonetim.cerceve.kisayol",
  },
  // Stoğa gelince haber ver eklentisi (kart 0144, karar 0117): bekleyen talepler stok bilgisidir, stok.gor ister.
  {
    kod: "stok-bildirimleri",
    adres: `${panelAdresi}/stok-bildirimleri`,
    ad: "yonetim.sayfa.stokBildirimleri.ad",
    aciklama: "yonetim.sayfa.stokBildirimleri.aciklama",
    ikon: "eposta",
    izin: "stok.gor",
    grup: "urunler",
    eklenti: "stoga-gelince-haber-ver",
  },
  {
    kod: "vitrin-bolumleri",
    adres: `${panelAdresi}/vitrin-bolumleri`,
    ad: "yonetim.sayfa.vitrinBolumleri.ad",
    aciklama: "yonetim.sayfa.vitrinBolumleri.aciklama",
    ikon: "bolumler",
    izin: "duzen.gor",
    grup: "vitrin",
  },
  {
    kod: "menuler",
    adres: `${panelAdresi}/menuler`,
    ad: "yonetim.sayfa.menuler.ad",
    aciklama: "yonetim.sayfa.menuler.aciklama",
    ikon: "menuler",
    izin: "menu.gor",
    grup: "vitrin",
  },
] as const satisfies readonly PanelSayfaTanimi[];

export type PanelSayfaKodu = (typeof panelSayfalari)[number]["kod"];

export type MenuSayfasi = {
  kod: string;
  adres: string;
  ad: MetinAnahtari;
  ikon: IkonAdi;
  isaret?: MetinAnahtari;
};
export type MenuGrubu = { grup: PanelGrubu | null; sayfalar: MenuSayfasi[] };

// Sayfa sitede açık mı: eklentinin getirdiği sayfa yalnız eklenti açıkken vardır.
export const sayfaAcikMi = (
  sayfa: Pick<PanelSayfaTanimi, "eklenti">,
  eklentiAcik: (kod: EklentiKodu) => boolean,
): boolean => sayfa.eklenti === undefined || eklentiAcik(sayfa.eklenti);

// Yöneticinin göreceği menü: yalnız izni olan, sitede açık ve alt sayfa olmayan sayfalar, gruplar menü sırasıyla,
// boş grup yok. Grupsuz sayfalar en üstte durur. İzin sunucuda okunur (yoneticininYetkileri), burada yalnız sorulur.
export const menuyuKur = (
  agac: readonly PanelSayfaTanimi[],
  yetkili: (izin: GirisIzni<"yonetici">) => boolean,
  eklentiAcik: (kod: EklentiKodu) => boolean = () => false,
): MenuGrubu[] => {
  const gorunenler = agac.filter(
    (sayfa) =>
      sayfa.ust === undefined &&
      (sayfa.izin === null || yetkili(sayfa.izin)) &&
      sayfaAcikMi(sayfa, eklentiAcik),
  );
  const gruplar: (PanelGrubu | null)[] = [null, ...(Object.keys(panelGruplari) as PanelGrubu[])];
  return gruplar
    .map((grup) => ({
      grup,
      sayfalar: gorunenler
        .filter((sayfa) => sayfa.grup === grup)
        .map(({ kod, adres, ad, ikon, isaret }) => ({
          kod,
          adres,
          ad,
          ikon,
          ...(isaret === undefined ? {} : { isaret }),
        })),
    }))
    .filter((grup) => grup.sayfalar.length > 0);
};

export const sayfaTanimi = (
  agac: readonly PanelSayfaTanimi[],
  kod: string,
): PanelSayfaTanimi | undefined => agac.find((sayfa) => sayfa.kod === kod);

// Kökten sayfaya kadar olan sayfalar: kök, üst sayfalar, sayfanın kendisi. Kökün kendisi tek adımdır.
// Döngü ve olmayan üst ağaç testinde yakalanır; burada yine de sonsuza dönülmez.
export const sayfaYolunuKur = (
  agac: readonly PanelSayfaTanimi[],
  kod: string,
): PanelSayfaTanimi[] => {
  const [kok] = agac;
  const yol: PanelSayfaTanimi[] = [];
  let sayfa = sayfaTanimi(agac, kod);
  while (sayfa !== undefined && !yol.includes(sayfa)) {
    yol.unshift(sayfa);
    sayfa = sayfa.ust === undefined ? undefined : sayfaTanimi(agac, sayfa.ust);
  }
  if (kok !== undefined && yol[0] !== kok) yol.unshift(kok);
  return yol;
};
