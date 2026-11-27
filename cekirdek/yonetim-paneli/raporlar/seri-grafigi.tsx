"use client";
// Raporun serisi (kart 0317; taslak: panel-2.html "Günlük ciro"): sütun grafiği ve tablo karşılığı. Grafik ekran
// okuyucudan gizlidir; tablo her zaman ekran okuyucuya açıktır, "Tablo olarak göster" onu ekranda da gösterir.
// Sütunun yüksekliği sunucunun verdiği orandır (en yüksek nokta 1); tutarlar sitenin biçimiyle sunucudan gelir.
import { useState } from "react";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { usePanelMetni } from "../../metinler/panel-metni";
import { PanelIkon } from "../panel-ikon";

// Çizimin kendi birimi (viewBox): genişlik 100, yükseklik 40, en yüksek sütun 37. Çizim kabın genişliğini doldurur,
// yüksekliği bu orandan gelir (ölçekte grafik boyu yoktur).
const yukseklik = 40;
const enYuksekSutun = 37;

export function SeriGrafigi({
  baslik,
  noktalar,
}: {
  baslik: string;
  noktalar: { ad: string; deger: string; oran: number }[];
}) {
  const metin = usePanelMetni();
  const [tablo, setTablo] = useState(false);
  // Kısa dönemde (bir gün, üç gün) sütun bütün genişliği kaplamaz: yer en az yedi sütunluktur, sütunlar ortalanır.
  const genislik = 100 / Math.max(noktalar.length, 7);
  const bosluk = (100 - genislik * noktalar.length) / 2;
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 100 ${yukseklik}`} aria-hidden="true" className="h-auto w-full">
        <line
          x1="0"
          y1={yukseklik - 0.5}
          x2="100"
          y2={yukseklik - 0.5}
          strokeWidth="0.4"
          className="stroke-kenar"
        />
        {noktalar.map((nokta, sira) => {
          const boy = nokta.oran * enYuksekSutun;
          return (
            <rect
              key={nokta.ad}
              x={bosluk + sira * genislik + genislik * 0.15}
              y={yukseklik - 1 - boy}
              width={genislik * 0.7}
              height={boy}
              rx="0.4"
              className="fill-birincil"
            />
          );
        })}
      </svg>
      <div className="flex justify-between gap-2 text-kucuk text-soluk-yazi" aria-hidden="true">
        <span>{noktalar[0]?.ad}</span>
        <span>{noktalar.at(-1)?.ad}</span>
      </div>
      <div className={sinif(tablo ? "overflow-x-auto" : "sr-only")}>
        <Tablo>
          <TabloBasligi className={tablo ? "sr-only" : undefined}>{baslik}</TabloBasligi>
          <TabloUstu>
            <TabloSatiri>
              <TabloBasHucresi scope="col" className="py-2 pr-3">
                {metin("yonetim.rapor.seri.donem")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="py-2 text-right">
                {metin("yonetim.rapor.csv.satis")}
              </TabloBasHucresi>
            </TabloSatiri>
          </TabloUstu>
          <TabloGovdesi>
            {noktalar.map((nokta) => (
              <TabloSatiri key={nokta.ad}>
                <TabloHucresi className="py-2 pr-3">{nokta.ad}</TabloHucresi>
                <TabloHucresi className="py-2 text-right whitespace-nowrap">
                  {nokta.deger}
                </TabloHucresi>
              </TabloSatiri>
            ))}
          </TabloGovdesi>
        </Tablo>
      </div>
      <Dugme tur="sade" className="self-start" onClick={() => setTablo((onceki) => !onceki)}>
        <PanelIkon ad="tablo" />
        {metin(tablo ? "yonetim.rapor.tabloyuGizle" : "yonetim.rapor.tabloyuGoster")}
      </Dugme>
    </div>
  );
}
