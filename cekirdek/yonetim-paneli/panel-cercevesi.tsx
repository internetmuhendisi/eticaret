"use client";
// Panelin çerçevesi (kart 0141, karar 0102 ve 0111): masaüstünde solda yan menü, telefon ve tablette üstte menü
// düğmesi ve mağazanın adı; menü yan pencerede açılır. Sayfa, çerçevenin sağındaki ana bölgeye kendi iskeletiyle
// (PanelSayfasi) çizilir. Panelin araması (kart 0321) masaüstünde ana bölgenin üstündeki şeritte, telefon ve
// tablette üst çubuktaki büyüteçle açılır; yalnız yöneticinin izni olan türler aranır. Tarayıcıda çizilir: yan pencerenin tetikleyicisi özelliklerini ancak düğme burada
// çizilirse alır (kart 0108'de ölçüldü). Metinler ve menü sunucudan gelir.
import { usePathname } from "next/navigation";
import { type ReactNode, useId, useState } from "react";
import { BildirimAlani } from "../../bilesenler/parcalar/bildirim";
import { useCizimdenSonraOdak } from "../../bilesenler/parcalar/cizimden-sonra-odak";
import { IkonDugmesi } from "../../bilesenler/parcalar/dugme";
import {
  YanPencere,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereTetikleyici,
} from "../../bilesenler/parcalar/yan-pencere";
import type { PanelAramaTuru } from "../kayitlar/panel-arama";
import { usePanelMetni } from "../metinler/panel-metni";
import { PanelAramaKutusu, TelefonAramaKapat, usePanelAramasi } from "./arama/panel-aramasi";
import { CikisKorumasi } from "./form/cikis-korumasi";
import { type MagazaGorunumu, MagazaIsareti, MenuIcerigi } from "./menu-icerigi";
import type { CizilenMenuGrubu } from "./panel-menusu";

export function PanelCercevesi({
  magaza,
  eposta,
  gruplar,
  altyapiAdi,
  aramaTurleri,
  children,
}: {
  magaza: MagazaGorunumu;
  eposta: string;
  gruplar: readonly CizilenMenuGrubu[];
  altyapiAdi: string;
  // Yöneticinin izni olan arama türleri (sunucu süzer); boşsa arama çizilmez.
  aramaTurleri: readonly PanelAramaTuru[];
  children: ReactNode;
}) {
  const metin = usePanelMetni();
  const [acik, setAcik] = useState(false);
  const { seritKutusu, telefondaAcik, setTelefondaAcik } = usePanelAramasi(aramaTurleri);
  const buyutecKimligi = useId();
  const odakla = useCizimdenSonraOdak();
  // Telefonun arama kipi kapanınca odak büyütece döner; bir sonuç açılınca sayfa değişir, odak verilmez.
  const telefonAramasiniKapat = (geriDon: boolean) => {
    setTelefondaAcik(false);
    if (geriDon) odakla(() => document.getElementById(buyutecKimligi));
  };
  // Sayfa değişince menü kapanır: çıkış sorusu bağlantının tıklamasını durdurup gezinmeyi kendisi yaptığında
  // menünün kapatan işlevi çağrılmaz (kart 0259, bağımsız kontrolün bulgusu).
  const yol = usePathname();
  const [gorulenYol, setGorulenYol] = useState(yol);
  if (yol !== gorulenYol) {
    setGorulenYol(yol);
    setAcik(false);
    setTelefondaAcik(false);
  }
  const menu = { magaza, eposta, gruplar, altyapiAdi };
  return (
    // Kaydedilmemiş değişiklikle panelin başka bir sayfasına geçerken sorulur (kart 0259).
    <CikisKorumasi>
      <div className="flex min-h-dvh bg-yuzey text-yazi print:block print:min-h-0 print:bg-zemin">
        {/* Yazdırırken menü, üst çubuk ve bildirimler çıkmaz; yalnız sayfanın içeriği basılır (kart 0270). */}
        <aside className="hidden w-full max-w-yan-menu shrink-0 border-r border-kenar bg-zemin masaustu:block print:hidden">
          <div className="sticky top-0 h-dvh overflow-y-auto px-3 py-4">
            <MenuIcerigi {...menu} />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-kenar bg-zemin px-2 py-1 masaustu:hidden print:hidden">
            {telefondaAcik ? (
              <>
                <PanelAramaKutusu
                  turler={aramaTurleri}
                  otomatikOdak
                  sonra={(geriDon) => telefonAramasiniKapat(geriDon)}
                />
                <TelefonAramaKapat kapat={() => telefonAramasiniKapat(true)} />
              </>
            ) : (
              <>
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
                {aramaTurleri.length === 0 ? null : (
                  <IkonDugmesi
                    id={buyutecKimligi}
                    ikon="arama"
                    etiket={metin("yonetim.arama.ac")}
                    className="ml-auto shrink-0"
                    onClick={() => setTelefondaAcik(true)}
                  />
                )}
              </>
            )}
          </div>
          {aramaTurleri.length === 0 ? null : (
            <div className="hidden justify-end border-b border-kenar bg-zemin px-6 py-2 masaustu:flex print:hidden">
              <div className="w-full max-w-form">
                <PanelAramaKutusu turler={aramaTurleri} kutuRef={seritKutusu} />
              </div>
            </div>
          )}
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
        {/* Panel ekranlarının bildirimleri (kart 0142): alan sayfada bir kez durur. */}
        <BildirimAlani
          alanEtiketi={metin("ortak.parca.bildirimler")}
          kapatEtiketi={metin("ortak.parca.bildirimiKapat")}
        />
      </div>
    </CikisKorumasi>
  );
}
