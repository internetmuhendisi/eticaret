// Panelin ayrıntı ekranlarının ortak parçaları (kart 0234'ten taşındı, kart 0271): başlıklı kart bölümü, tutar
// satırı ve ad-değer bilgisi. Sipariş ve müşteri ayrıntısı kullanır. Sunucuda çizilir.
import type { ReactNode } from "react";
import { Kart } from "../../bilesenler/parcalar/kart";
import { sinif } from "../../bilesenler/parcalar/sinif";

export function Bolum({
  baslik,
  kimlik,
  ek,
  children,
}: {
  baslik: string;
  kimlik: string;
  // Başlığın yanındaki işaret (rozet); verilince (null da) başlık satırı her zaman çizilir.
  ek?: ReactNode;
  children: ReactNode;
}) {
  const basligi = (
    <h2 id={kimlik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
      {baslik}
    </h2>
  );
  return (
    <Kart className="gap-4 p-4 tablet:p-5">
      {ek === undefined ? (
        basligi
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {basligi}
          {ek}
        </div>
      )}
      {children}
    </Kart>
  );
}

export function Satir({
  ad,
  children,
  vurgu = false,
}: {
  ad: string;
  children: ReactNode;
  vurgu?: boolean;
}) {
  return (
    <div
      className={sinif(
        "flex justify-between gap-3",
        vurgu && "border-t border-kenar pt-2 font-kalin",
      )}
    >
      <dt className={vurgu ? "" : "text-soluk-yazi"}>{ad}</dt>
      <dd className="text-right whitespace-nowrap">{children}</dd>
    </div>
  );
}

export function Bilgi({ ad, children }: { ad: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-kucuk text-soluk-yazi">{ad}</dt>
      <dd className="font-kalin wrap-anywhere">{children}</dd>
    </div>
  );
}
