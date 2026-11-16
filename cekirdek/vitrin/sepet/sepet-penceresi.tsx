"use client";
// Sepet penceresi (kart 0212, karar 0132; kart 0211'in taslağı): "Sepete ekleyince" ayarı "yan pencere"yse ürün
// eklenince sağdan açılır. Sepetin satırları, ara toplamı, "Sepete git" ve "Alışverişe devam et" durur. Pencere vitrin
// çerçevesinde bir kez durur; açıklığı sepet durumundadır (pencereyiAc). Kapanınca odak açan düğmeye döner (Radix).
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
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { vitrinAdresleri } from "../adresler";
import { pencereyiKapat, useSepet } from "./durum";
import { SepetPenceresiIcerigi } from "./sepet-gorunumu";

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
      <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} aria-describedby={undefined}>
        <YanPencereUstu>
          <YanPencereBasligi>
            {doldur(metin("vitrin.sepet.pencereBaslik"), { sayi: String(sepet.kalemler.length) })}
          </YanPencereBasligi>
        </YanPencereUstu>
        <div className="flex-1">
          <SepetPenceresiIcerigi acik={sepet.pencereAcik} />
        </div>
        <YanPencereAltCubugu className="flex-col items-stretch">
          <Baglanti href={vitrinAdresleri.sepet} gorunum="birincil" onClick={pencereyiKapat}>
            {metin("vitrin.sepet.sepeteGit")}
          </Baglanti>
          <YanPencereKapat asChild>
            <Dugme tur="sade">{metin("vitrin.sepet.alisveriseDevam")}</Dugme>
          </YanPencereKapat>
        </YanPencereAltCubugu>
      </YanPencereIcerigi>
    </YanPencere>
  );
}
