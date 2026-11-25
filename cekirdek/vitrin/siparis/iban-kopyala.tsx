"use client";
// IBAN'ı kopyala (kart 0214; kart 0211'in taslağı): sipariş alındı sayfasında her banka hesabının yanında. Numara
// panoya boşluksuz kopyalanır, sonuç vitrinin bildirim alanında söylenir (KopyalaDugmesi, kart 0275).
import { KopyalaDugmesi } from "../../../bilesenler/parcalar/kopyala-dugmesi";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";

export function IbanKopyala({ iban, banka }: { iban: string; banka: string }) {
  const metin = useMetin();
  return (
    <KopyalaDugmesi
      deger={iban}
      etiket={metin("vitrin.siparisAlindi.ibanKopyala")}
      aria-label={doldur(metin("vitrin.siparisAlindi.ibanKopyalaAdi"), { banka })}
      kopyalandiMetni={metin("vitrin.siparisAlindi.kopyalandi")}
      kopyalanamadiMetni={metin("vitrin.siparisAlindi.kopyalanamadi")}
    />
  );
}
