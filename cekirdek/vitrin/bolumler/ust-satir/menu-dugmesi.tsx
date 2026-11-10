"use client";
// Logo satırının telefondaki menü düğmesi ve yan penceresi (kart 0108). Tarayıcıda çizilir: yan pencerenin
// tetikleyicisi özelliklerini (aria-haspopup, tıklama) düğmeye ancak düğme burada çizilirse verebilir; sunucuda
// çizilen düğme ipucunun sarmalına dönüşür ve pencere açılmaz (ölçüldü). Metinler sunucudan gelir. Hesap öğesi
// girişli müşteride e-postayı ve "Çıkış yap"ı gösterir, oturum ortak durumdan gelir (kart 0131).
import { useState } from "react";
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import type { IkonAdi } from "../../../../bilesenler/ikonlar/sozluk";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { Dugme, IkonDugmesi } from "../../../../bilesenler/parcalar/dugme";
import { Uyari } from "../../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereTetikleyici,
} from "../../../../bilesenler/parcalar/yan-pencere";
import { useMetin } from "../../../metinler/istemci-metni";
import type { BaglamMenuDali } from "../../bolum-kutuphanesi/baglam";
import { cikisYap, useHesapDurumu } from "../../hesap-durumu";
import { YanMenu } from "../ortak/menu";

export type YandakiBaglanti = { adres: string; ikon: IkonAdi; etiket: string };

export function MenuDugmesi({
  menuler,
  yandakiler,
  hesap,
  hesapSorulur,
  metinler,
}: {
  menuler: readonly { kod: string; dallar: readonly BaglamMenuDali[] }[];
  yandakiler: readonly YandakiBaglanti[];
  hesap: YandakiBaglanti;
  // Bağlamın müşteri oturumu "sorulur" ise; katalogda istek gitmez.
  hesapSorulur: boolean;
  metinler: { ac: string; kapat: string; baslik: string; tumu: string };
}) {
  // Bağlantıya basılınca pencere kapanır: vitrinin çerçevesi sayfalar arasında yeniden çizilmez, açık kalırdı.
  const [acik, setAcik] = useState(false);
  const kapat = () => setAcik(false);
  const metin = useMetin();
  const durum = useHesapDurumu(hesapSorulur);
  const [cikisHatasi, setCikisHatasi] = useState(false);
  const cik = async () => {
    setCikisHatasi(false);
    if (!(await cikisYap())) setCikisHatasi(true);
  };
  const baglantiOgesi = (baglanti: YandakiBaglanti) => (
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
  );
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
            {yandakiler.map(baglantiOgesi)}
            {durum.tur === "girisli" ? (
              <li className="flex flex-col items-start gap-2 pt-2">
                <span className="flex items-center gap-2 wrap-anywhere">
                  <Ikon ad={hesap.ikon} className="size-5 shrink-0" />
                  {durum.eposta}
                </span>
                {cikisHatasi ? (
                  <Uyari tur="tehlike">{metin("vitrin.hesap.cikisHata")}</Uyari>
                ) : null}
                <Dugme tur="cerceveli" onClick={cik}>
                  {metin("vitrin.hesap.cikis")}
                </Dugme>
              </li>
            ) : (
              baglantiOgesi(hesap)
            )}
          </ul>
        </nav>
      </YanPencereIcerigi>
    </YanPencere>
  );
}
