// Ana sayfa bölümlerinin zemin renkleri ve üstündeki yazının rengi (kart 0110). Her zemin okunur çiftiyle
// çizilir (tasarım değerlerinin kontrast listesi: afis-ustu/afis, yazi/yuzey, yazi/kutu-1…5); sınıf adları
// parçalardan birleştirilmez. Renkli zeminde odak çerçevesi yazının rengindedir (odak-yazi-renginde): odak
// rengi yalnız zemin ve yüzey üstünde ölçülmüştür.
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metinMi } from "./deger";

// Yüzey dışındaki zeminlerde odak çerçevesi yazının rengindedir (odakliSiniflar); yüzey üstünde odak rengi
// ölçülmüştür.
const zeminRenkleri = {
  "alt-kisim": "bg-alt-kisim text-alt-kisim-ustu",
  afis: "bg-afis text-afis-ustu",
  // Fırsatlar panelinin varsayılanı (kart 0111; Canlı Çarşı taslağı): birincil-ustu/birincil okunur çifttir.
  birincil: "bg-birincil text-birincil-ustu",
  yuzey: "bg-yuzey text-yazi",
  "kutu-1": "bg-kutu-1 text-yazi",
  "kutu-2": "bg-kutu-2 text-yazi",
  "kutu-3": "bg-kutu-3 text-yazi",
  "kutu-4": "bg-kutu-4 text-yazi",
  "kutu-5": "bg-kutu-5 text-yazi",
} as const;
const odakliSiniflar = "odak-yazi-renginde";
export type ZeminRengi = keyof typeof zeminRenkleri;

// Zeminin üstündeki ikincil yazı: koyu alt kısım renginde kendi soluk yazısı (okunur çifti ölçülmüş), öteki
// zeminlerde yazının kendisi (soluk yazının kutu renkleri üstünde kontrastı ölçülmemiştir).
export const solukYaziSiniflari = (deger: unknown): string | undefined =>
  deger === "alt-kisim" ? "text-alt-kisim-soluk" : undefined;

// Kutu renkleri sırayla: rengi seçilmemiş öğeler bunlarla dönüşümlü boyanır (Canlı Çarşı taslağı).
const kutuRenkleri = ["kutu-1", "kutu-2", "kutu-3", "kutu-4", "kutu-5"] as const;

// odak: false (kart 0112): zeminin kendi odak kuralı yazılmaz. Yalnız bütün odaklanabilir öğeleri zemin renginde bir
// kutunun içinde olan bölge için (bülten şeridi): kural iç kutuya da geçer, oradaki öğenin odağını kendi yazı
// rengine (zemin üstünde zemin rengi) çevirip görünmez yapıyordu.
export const zeminSiniflari = (
  deger: unknown,
  yedek: ZeminRengi,
  { odak = true }: { odak?: boolean } = {},
): string => {
  const renk: ZeminRengi =
    metinMi(deger) && Object.hasOwn(zeminRenkleri, deger) ? (deger as ZeminRengi) : yedek;
  return odak && renk !== "yuzey"
    ? sinif(zeminRenkleri[renk], odakliSiniflar)
    : zeminRenkleri[renk];
};

export const siradakiKutuRengi = (sira: number): ZeminRengi =>
  kutuRenkleri[sira % kutuRenkleri.length] ?? "kutu-1";
