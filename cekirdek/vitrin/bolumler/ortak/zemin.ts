// Ana sayfa bölümlerinin zemin renkleri ve üstündeki yazının rengi (kart 0110). Her zemin okunur çiftiyle
// çizilir (tasarım değerlerinin kontrast listesi: afis-ustu/afis, yazi/yuzey, yazi/kutu-1…5); sınıf adları
// parçalardan birleştirilmez. Renkli zeminde odak çerçevesi yazının rengindedir (odak-yazi-renginde): odak
// rengi yalnız zemin ve yüzey üstünde ölçülmüştür.
import { metinMi } from "./deger";

export const zeminRenkleri = {
  "alt-kisim": "bg-alt-kisim text-alt-kisim-ustu odak-yazi-renginde",
  afis: "bg-afis text-afis-ustu odak-yazi-renginde",
  // Fırsatlar panelinin varsayılanı (kart 0111; Canlı Çarşı taslağı): birincil-ustu/birincil okunur çifttir.
  birincil: "bg-birincil text-birincil-ustu odak-yazi-renginde",
  yuzey: "bg-yuzey text-yazi",
  "kutu-1": "bg-kutu-1 text-yazi odak-yazi-renginde",
  "kutu-2": "bg-kutu-2 text-yazi odak-yazi-renginde",
  "kutu-3": "bg-kutu-3 text-yazi odak-yazi-renginde",
  "kutu-4": "bg-kutu-4 text-yazi odak-yazi-renginde",
  "kutu-5": "bg-kutu-5 text-yazi odak-yazi-renginde",
} as const;
export type ZeminRengi = keyof typeof zeminRenkleri;

// Zeminin üstündeki ikincil yazı: koyu alt kısım renginde kendi soluk yazısı (okunur çifti ölçülmüş), öteki
// zeminlerde yazının kendisi (soluk yazının kutu renkleri üstünde kontrastı ölçülmemiştir).
export const solukYaziSiniflari = (deger: unknown): string | undefined =>
  deger === "alt-kisim" ? "text-alt-kisim-soluk" : undefined;

// Kutu renkleri sırayla: rengi seçilmemiş öğeler bunlarla dönüşümlü boyanır (Canlı Çarşı taslağı).
const kutuRenkleri = ["kutu-1", "kutu-2", "kutu-3", "kutu-4", "kutu-5"] as const;

export const zeminSiniflari = (deger: unknown, yedek: ZeminRengi): string =>
  metinMi(deger) && Object.hasOwn(zeminRenkleri, deger)
    ? zeminRenkleri[deger as ZeminRengi]
    : zeminRenkleri[yedek];

export const siradakiKutuRengi = (sira: number): ZeminRengi =>
  kutuRenkleri[sira % kutuRenkleri.length] ?? "kutu-1";
