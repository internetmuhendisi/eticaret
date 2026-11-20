"use client";
// IBAN'ı kopyala (kart 0214; kart 0211'in taslağı): sipariş alındı sayfasında her banka hesabının yanında. Numara
// panoya boşluksuz kopyalanır, sonuç vitrinin bildirim alanında söylenir. Pano kullanılamazsa (izin, eski tarayıcı)
// numaranın elle seçilebileceği söylenir.
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";

export function IbanKopyala({ iban, banka }: { iban: string; banka: string }) {
  const metin = useMetin();
  return (
    <Dugme
      tur="cerceveli"
      aria-label={doldur(metin("vitrin.siparisAlindi.ibanKopyalaAdi"), { banka })}
      onClick={() => {
        void navigator.clipboard
          .writeText(iban)
          .then(() => bildirimGoster("basari", metin("vitrin.siparisAlindi.kopyalandi")))
          .catch(() => bildirimGoster("tehlike", metin("vitrin.siparisAlindi.kopyalanamadi")));
      }}
    >
      <Ikon ad="kopyala" />
      {metin("vitrin.siparisAlindi.ibanKopyala")}
    </Dugme>
  );
}
