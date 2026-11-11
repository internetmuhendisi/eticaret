"use client";
// Üst satırın arama kutusu (kart 0137; Canlı Çarşı taslağı). Arama sayfasına GET ile gider (AramaFormu); kod
// yüklenmeden de çalışır. Arama sayfasındayken kutuda aranan metin durur: çerçeve sayfanın adresini bilmez,
// kutu adresi tarayıcıda okur ve aranan metin değişince yeniden kurulur.
import { usePathname, useSearchParams } from "next/navigation";
import { AramaFormu } from "../../bilesenler/form/form";
import { aramaSinirlari } from "../kayitlar/liste";
import { vitrinAdresleri } from "./adresler";
import { listeParametreleri } from "./urun-listesi/adres";

export function AramaKutusu({
  metinler,
  className,
}: {
  metinler: { etiket: string; yerTutucu: string; dugme: string };
  className?: string;
}) {
  const yol = usePathname();
  const parametreler = useSearchParams();
  const deger =
    yol === vitrinAdresleri.arama ? (parametreler.get(listeParametreleri.ara) ?? "") : "";
  return (
    <AramaFormu
      key={deger}
      adres={vitrinAdresleri.arama}
      alanAdi={listeParametreleri.ara}
      deger={deger}
      etiket={metinler.etiket}
      yerTutucu={metinler.yerTutucu}
      dugmeEtiketi={metinler.dugme}
      enCokUzunluk={aramaSinirlari.metin}
      {...(className === undefined ? {} : { className })}
    />
  );
}
