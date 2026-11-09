"use client";
// Logo satırının telefondaki menü düğmesi ve yan penceresi (kart 0108). Tarayıcıda çizilir: yan pencerenin
// tetikleyicisi özelliklerini (aria-haspopup, tıklama) düğmeye ancak düğme burada çizilirse verebilir; sunucuda
// çizilen düğme ipucunun sarmalına dönüşür ve pencere açılmaz (ölçüldü). Metinler sunucudan gelir.
import { useState } from "react";
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import type { IkonAdi } from "../../../../bilesenler/ikonlar/sozluk";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { IkonDugmesi } from "../../../../bilesenler/parcalar/dugme";
import {
  YanPencere,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereTetikleyici,
} from "../../../../bilesenler/parcalar/yan-pencere";
import type { BaglamMenuDali } from "../../bolum-kutuphanesi/baglam";
import { YanMenu } from "../ortak/menu";

export type YandakiBaglanti = { adres: string; ikon: IkonAdi; etiket: string };

export function MenuDugmesi({
  menuler,
  yandakiler,
  metinler,
}: {
  menuler: readonly { kod: string; dallar: readonly BaglamMenuDali[] }[];
  yandakiler: readonly YandakiBaglanti[];
  metinler: { ac: string; kapat: string; baslik: string; tumu: string };
}) {
  // Bağlantıya basılınca pencere kapanır: vitrinin çerçevesi sayfalar arasında yeniden çizilmez, açık kalırdı.
  const [acik, setAcik] = useState(false);
  const kapat = () => setAcik(false);
  return (
    <YanPencere open={acik} onOpenChange={setAcik}>
      <YanPencereTetikleyici asChild>
        <IkonDugmesi ikon="menu" etiket={metinler.ac} className="masaustu:hidden" />
      </YanPencereTetikleyici>
      <YanPencereIcerigi taraf="sol" kapatEtiketi={metinler.kapat}>
        <YanPencereBasligi>{metinler.baslik}</YanPencereBasligi>
        <nav aria-label={metinler.baslik} className="flex flex-col gap-6">
          {menuler.map(({ kod, dallar }) => (
            <YanMenu key={kod} dallar={dallar} tumu={metinler.tumu} tiklayinca={kapat} />
          ))}
          <ul className="flex flex-col">
            {yandakiler.map((baglanti) => (
              <li key={baglanti.adres}>
                <Baglanti
                  href={baglanti.adres}
                  gorunum="sade"
                  className="w-full justify-start px-0"
                  onClick={kapat}
                >
                  <Ikon ad={baglanti.ikon} className="size-5" />
                  {baglanti.etiket}
                </Baglanti>
              </li>
            ))}
          </ul>
        </nav>
      </YanPencereIcerigi>
    </YanPencere>
  );
}
