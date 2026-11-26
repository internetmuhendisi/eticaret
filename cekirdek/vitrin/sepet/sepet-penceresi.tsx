"use client";
// Sepet penceresi (kart 0212, karar 0132; kart 0211'in taslağı): "Sepete ekleyince" ayarı "yan pencere"yse ürün
// eklenince sağdan açılır. Sepetin satırları, ara toplamı, "Ödemeye geç" (kart 0213), "Sepete git" ve "Alışverişe devam
// et" durur. Pencere vitrin çerçevesinde bir kez durur; açıklığı sepet durumundadır (pencereyiAc). Kapanınca odak açan
// düğmeye döner (durum açılırken odaktaki öğeyi saklar).
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import {
  YanPencere,
  YanPencereAltCubugu,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereKapat,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";
import { vitrinAdresleri } from "../adresler";
import { penceredenDonulecekOge, pencereyiKapat, useSepet } from "./durum";
import { SepetPenceresiIcerigi } from "./sepet-penceresi-icerigi";

export function SepetPenceresi() {
  const metin = useMetin();
  const sepet = useSepet();
  return (
    <YanPencere
      open={sepet.pencereAcik}
      onOpenChange={(acik) => {
        if (!acik) pencereyiKapat();
      }}
    >
      <YanPencereIcerigi
        kapatEtiketi={metin("ortak.parca.kapat")}
        aria-describedby={undefined}
        onCloseAutoFocus={(olay) => {
          const oge = penceredenDonulecekOge();
          if (oge === null) return;
          olay.preventDefault();
          oge.focus();
        }}
      >
        <YanPencereUstu>
          <YanPencereBasligi>
            {doldur(metin("vitrin.sepet.pencereBaslik"), {
              sayi: String(sepet.kalemler.reduce((toplam, kalem) => toplam + kalem.adet, 0)),
            })}
          </YanPencereBasligi>
        </YanPencereUstu>
        <div className="flex-1">
          <SepetPenceresiIcerigi acik={sepet.pencereAcik} />
        </div>
        <YanPencereAltCubugu className="flex-col items-stretch">
          <Baglanti href={vitrinAdresleri.odeme} gorunum="birincil" onClick={pencereyiKapat}>
            {metin("vitrin.sepet.odemeyeGec")}
          </Baglanti>
          <Baglanti href={vitrinAdresleri.sepet} gorunum="cerceveli" onClick={pencereyiKapat}>
            {metin("vitrin.sepet.sepeteGit")}
          </Baglanti>
          <YanPencereKapat asChild>
            <Dugme tur="baglanti" className="self-center">
              {metin("vitrin.sepet.alisveriseDevam")}
            </Dugme>
          </YanPencereKapat>
        </YanPencereAltCubugu>
      </YanPencereIcerigi>
    </YanPencere>
  );
}
