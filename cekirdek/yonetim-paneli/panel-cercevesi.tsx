"use client";
// Panelin çerçevesi (kart 0141, karar 0102 ve 0111): masaüstünde solda yan menü, telefon ve tablette üstte menü
// düğmesi ve mağazanın adı; menü yan pencerede açılır. Sayfa, çerçevenin sağındaki ana bölgeye kendi iskeletiyle
// (PanelSayfasi) çizilir. Tarayıcıda çizilir: yan pencerenin tetikleyicisi özelliklerini ancak düğme burada
// çizilirse alır (kart 0108'de ölçüldü). Metinler ve menü sunucudan gelir.
import { type ReactNode, useState } from "react";
import { IkonDugmesi } from "../../bilesenler/parcalar/dugme";
import {
  YanPencere,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereTetikleyici,
} from "../../bilesenler/parcalar/yan-pencere";
import { useMetin } from "../metinler/istemci-metni";
import { type MagazaGorunumu, MagazaIsareti, MenuIcerigi } from "./menu-icerigi";
import type { CizilenMenuGrubu } from "./panel-menusu";

export function PanelCercevesi({
  magaza,
  eposta,
  gruplar,
  altyapiAdi,
  children,
}: {
  magaza: MagazaGorunumu;
  eposta: string;
  gruplar: readonly CizilenMenuGrubu[];
  altyapiAdi: string;
  children: ReactNode;
}) {
  const metin = useMetin();
  const [acik, setAcik] = useState(false);
  const menu = { magaza, eposta, gruplar, altyapiAdi };
  return (
    <div className="flex min-h-dvh bg-yuzey text-yazi">
      <aside className="hidden w-full max-w-yan-menu shrink-0 border-r border-kenar bg-zemin masaustu:block">
        <div className="sticky top-0 h-dvh overflow-y-auto px-3 py-4">
          <MenuIcerigi {...menu} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-kenar bg-zemin px-2 py-1 masaustu:hidden">
          <YanPencere open={acik} onOpenChange={setAcik}>
            <YanPencereTetikleyici asChild>
              <IkonDugmesi ikon="menu" etiket={metin("yonetim.cerceve.menuyuAc")} />
            </YanPencereTetikleyici>
            <YanPencereIcerigi
              taraf="sol"
              kapatEtiketi={metin("yonetim.cerceve.menuyuKapat")}
              className="tablet:max-w-yan-menu"
            >
              <YanPencereBasligi className="sr-only">
                {metin("yonetim.cerceve.menu")}
              </YanPencereBasligi>
              <MenuIcerigi {...menu} tiklayinca={() => setAcik(false)} />
            </YanPencereIcerigi>
          </YanPencere>
          <MagazaIsareti magaza={magaza} />
        </div>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
