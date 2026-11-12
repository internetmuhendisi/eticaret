// Panelin sayfa ağacı (kart 0141, karar 0111): her panel sayfası burada bir kez yazılır. Ana menü, sayfa yolu,
// sayfa başlığı ve sekme başlığı buradan üretilir; menüye ve sayfaya izin de buradan bakılır. Yeni panel ekranı
// önce buraya eklenir, sonra `app/yonetim/(panel)/` altına yazılır ve PanelSayfasi'na kendi kodunu verir.
// Ekranı yazılmamış sayfa ağaca girmez: menüdeki bağlantı bulunamadı sayfasına gitmesin.
import type { IkonAdi } from "../../bilesenler/ikonlar/sozluk";
import type { GirisIzni } from "../kayitlar/izinler";
import type { MetinAnahtari } from "../metinler/metin";
import { panelAdresi } from "./adresler";

// Menüdeki gruplar, menüdeki sırasıyla. Grubun adı yalnız menüde görünür; grubun kendi sayfası yoktur.
export const panelGruplari = {
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
] as const satisfies readonly PanelSayfaTanimi[];

export type PanelSayfaKodu = (typeof panelSayfalari)[number]["kod"];

export type MenuSayfasi = { kod: string; adres: string; ad: MetinAnahtari; ikon: IkonAdi };
export type MenuGrubu = { grup: PanelGrubu | null; sayfalar: MenuSayfasi[] };

// Yöneticinin göreceği menü: yalnız izni olan ve alt sayfa olmayan sayfalar, gruplar menü sırasıyla, boş grup yok.
// Grupsuz sayfalar en üstte durur. İzin sunucuda okunur (yoneticininYetkileri), burada yalnız sorulur.
export const menuyuKur = (
  agac: readonly PanelSayfaTanimi[],
  yetkili: (izin: GirisIzni<"yonetici">) => boolean,
): MenuGrubu[] => {
  const gorunenler = agac.filter(
    (sayfa) => sayfa.ust === undefined && (sayfa.izin === null || yetkili(sayfa.izin)),
  );
  const gruplar: (PanelGrubu | null)[] = [null, ...(Object.keys(panelGruplari) as PanelGrubu[])];
  return gruplar
    .map((grup) => ({
      grup,
      sayfalar: gorunenler
        .filter((sayfa) => sayfa.grup === grup)
        .map(({ kod, adres, ad, ikon }) => ({ kod, adres, ad, ikon })),
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
