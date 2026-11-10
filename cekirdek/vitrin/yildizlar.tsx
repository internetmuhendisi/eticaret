// Beş yıldızlı puan (kart 0109, karar 0086; kart 0112): ürün kartının puanı ve müşteri yorumunun puanı aynı
// parçayla çizilir. Dolu yıldız sayısı verilen sayıdır; yıldızlar ekran okuyucudan gizlidir, okunan yazıyı çağıran
// verir.
import { Ikon } from "../../bilesenler/ikonlar/ikon";
import { sinif } from "../../bilesenler/parcalar/sinif";

export const yildizSayisi = 5;

export function Yildizlar({
  dolu,
  yazi,
  boyut = "kucuk",
}: {
  dolu: number;
  // Ekran okuyucunun okuduğu puan ("5 üzerinden 4").
  yazi: string;
  boyut?: "kucuk" | "orta";
}) {
  return (
    <span data-slot="puan" className="flex items-center gap-0.5">
      {Array.from({ length: yildizSayisi }, (_, sira) => (
        <Ikon
          // biome-ignore lint/suspicious/noArrayIndexKey: yıldızlar sabit sıradadır, kimlikleri yoktur.
          key={sira}
          ad="yildiz"
          className={sinif(boyut === "kucuk" ? "size-3" : "size-4", sira < dolu && "fill-current")}
        />
      ))}
      <span className="sr-only">{yazi}</span>
    </span>
  );
}
