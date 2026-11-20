"use client";
// "Başka bir sipariş sorgula" (kart 0238, bağımsız kontrolün bulgusu): takibi kapatır, sonra boş formu açar. Ortak
// bilgisayarda arkadan gelen kişi 30 dakika içinde siparişi görmesin. Kapatma isteği düşse de form açılır (?yeni);
// anahtar süresi dolunca kendiliğinden geçersizdir.
import { useState } from "react";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { kapiyaIstek } from "../../kapi/istemci";
import { vitrinAdresleri } from "../adresler";

const uc = "/kapi/herkese-acik/siparis-takibi";

export function TakibiKapat({ etiket }: { etiket: string }) {
  const [bekliyor, setBekliyor] = useState(false);
  const kapat = async () => {
    if (bekliyor) return;
    setBekliyor(true);
    try {
      const yanit = await kapiyaIstek(uc, { method: "DELETE" });
      window.location.assign(
        yanit.ok ? vitrinAdresleri.siparisTakibi : `${vitrinAdresleri.siparisTakibi}?yeni`,
      );
    } catch {
      window.location.assign(`${vitrinAdresleri.siparisTakibi}?yeni`);
    }
  };
  return (
    <Dugme tur="cerceveli" className="self-start" onClick={kapat} disabled={bekliyor}>
      {etiket}
    </Dugme>
  );
}
