"use client";
// Panelin ana menüsü (kart 0141, karar 0111). Sayfalar sunucuda sayfa ağacından ve yöneticinin izinlerinden
// süzülür (menuyuKur); burada yalnız çizilir. Bulunulan sayfa adresten bulunur ve aria-current="page" alır.
// Aynı menü masaüstünde yan menüde, telefonda yan pencerede durur; yan penceredeki bağlantıya basılınca
// pencere kapanır (tiklayinca): panelin çerçevesi sayfalar arasında yeniden çizilmez.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import type { PanelIkonAdi } from "../../bilesenler/ikonlar/panel-sozlugu";
import { Rozet } from "../../bilesenler/parcalar/rozet";
import { sinif } from "../../bilesenler/parcalar/sinif";
import { panelAdresi } from "./adresler";
import { PanelIkon } from "./panel-ikon";

export type CizilenMenuGrubu = {
  kod: string;
  // Grupsuz sayfaların başlığı yoktur.
  ad: string | null;
  sayfalar: {
    kod: string;
    adres: string;
    ad: string;
    ikon: PanelIkonAdi;
    isaret?: string;
    // Bakılması gereken kayıt sayısı (kart 0277): rozette sayı, ekran okuyucuda yazısı ("3 yorum onay bekliyor").
    sayi?: { deger: string; yazi: string };
  }[];
};

// Kök yalnız kendi adresinde seçilidir; öteki sayfa alt sayfalarında da seçili kalır.
export const seciliMi = (adres: string, yol: string): boolean =>
  yol === adres || (adres !== panelAdresi && yol.startsWith(`${adres}/`));

export function PanelMenusu({
  gruplar,
  tiklayinca,
}: {
  gruplar: readonly CizilenMenuGrubu[];
  tiklayinca?: () => void;
}) {
  const yol = usePathname();
  // Aynı menü yan menüde ve telefondaki yan pencerede birlikte durabilir: grup başlığının kimliği her çizimde ayrıdır.
  const kimlik = useId();
  return (
    <div className="flex flex-col gap-4">
      {gruplar.map((grup) => (
        <div key={grup.kod} className="flex flex-col gap-1">
          {grup.ad === null ? null : (
            <span
              id={`${kimlik}-${grup.kod}`}
              className="px-3 pt-3 text-kucuk font-en-kalin uppercase text-soluk-yazi"
            >
              {grup.ad}
            </span>
          )}
          <ul
            className="m-0 flex list-none flex-col gap-1 p-0"
            {...(grup.ad === null ? {} : { "aria-labelledby": `${kimlik}-${grup.kod}` })}
          >
            {grup.sayfalar.map((sayfa) => {
              const secili = seciliMi(sayfa.adres, yol);
              return (
                <li key={sayfa.kod}>
                  <Link
                    href={sayfa.adres}
                    {...(tiklayinca === undefined ? {} : { onClick: tiklayinca })}
                    {...(secili ? { "aria-current": "page" as const } : {})}
                    className={sinif(
                      "flex min-h-11 items-center gap-3 rounded-kucuk border-l-2 border-transparent px-3 text-yazi no-underline transition-colors duration-kisa hover:bg-yuzey",
                      secili ? "border-birincil bg-yuzey font-en-kalin" : "font-orta",
                    )}
                  >
                    <PanelIkon
                      ad={sayfa.ikon}
                      className={sinif("size-5", secili ? "text-yazi" : "text-soluk-yazi")}
                    />
                    {sayfa.ad}
                    {sayfa.isaret === undefined ? null : (
                      <Rozet tur="cerceveli" className="ml-auto font-orta">
                        {sayfa.isaret}
                      </Rozet>
                    )}
                    {sayfa.sayi === undefined ? null : (
                      <>
                        <Rozet tur="birincil" aria-hidden="true" className="ml-auto font-orta">
                          {sayfa.sayi.deger}
                        </Rozet>
                        <span className="sr-only">{sayfa.sayi.yazi}</span>
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
