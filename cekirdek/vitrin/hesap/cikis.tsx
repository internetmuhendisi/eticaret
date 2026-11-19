"use client";
// Hesabım menüsünün çıkış düğmesi (kart 0237): çıkış yalnız cikisYap ile (karar 0098). Çıkış olmazsa nedeni düğmenin
// altında duyurulur.
import { useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { cikisYap } from "../hesap-durumu";

export function HesaptanCikis({
  etiket,
  hataMetni,
  className,
}: {
  etiket: string;
  hataMetni: string;
  className?: string;
}) {
  const [hata, setHata] = useState(false);
  return (
    <span className="flex flex-col gap-1">
      <Dugme
        tur="sade"
        className={className}
        onClick={async () => {
          setHata(!(await cikisYap()));
        }}
      >
        <Ikon ad="cikis" />
        {etiket}
      </Dugme>
      <span role="status" className="px-3 text-kucuk text-tehlike-yazi empty:hidden">
        {hata ? hataMetni : ""}
      </span>
    </span>
  );
}
