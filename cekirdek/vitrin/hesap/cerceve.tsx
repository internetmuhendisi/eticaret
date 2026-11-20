// Hesabım çerçevesi (kart 0237, karar 0145, 0149; Canlı Çarşı taslağı siparis-ve-hesap.html): sayfa yolu, hesap menüsü
// ve sayfanın başlığı. Masaüstünde menü solda yan menüdür, telefonda yatay kayan şerittir (kullanıcı kararı). Seçili
// sayfa aria-current ile işaretlenir. Sipariş ayrıntısında menüde Siparişlerim seçilidir, sayfa yoluna numara eklenir
// ve başlığı ayrıntı kendisi çizer (kart 0238).
import type { ReactNode } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import type { IkonAdi } from "../../../bilesenler/ikonlar/sozluk";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { vitrinAdresleri } from "../adresler";
import { HesaptanCikis } from "./cikis";

type HesapSayfasi = "siparisler" | "adresler" | "favoriler" | "bilgiler";

// Menünün öğeleri, sırasıyla.
const menu: readonly { sayfa: HesapSayfasi; adres: string; ikon: IkonAdi; ad: MetinAnahtari }[] = [
  {
    sayfa: "siparisler",
    adres: vitrinAdresleri.hesapSiparisleri,
    ikon: "paket",
    ad: "vitrin.hesap.siparisler.baslik",
  },
  {
    sayfa: "adresler",
    adres: vitrinAdresleri.hesapAdresleri,
    ikon: "konum",
    ad: "vitrin.hesap.adresler.baslik",
  },
  {
    sayfa: "favoriler",
    adres: vitrinAdresleri.hesapFavorileri,
    ikon: "favori",
    ad: "vitrin.favori.baslik",
  },
  {
    sayfa: "bilgiler",
    adres: vitrinAdresleri.hesapBilgileri,
    ikon: "hesap",
    ad: "vitrin.hesap.bilgiler.baslik",
  },
];

// Taslaktaki gibi: telefonda seçili öğenin altında, masaüstünde solunda ana renkte çizgi.
const ogeSinifi =
  "min-h-11 shrink-0 justify-start gap-2 rounded-none border-b-2 border-transparent px-3 font-orta text-yazi no-underline hover:bg-yuzey masaustu:rounded-kucuk masaustu:border-b-0 masaustu:border-l-2";

export function HesapCercevesi({
  secili,
  eposta,
  children,
  ek,
  basliksiz = false,
  sonAdim,
}: {
  secili: HesapSayfasi;
  eposta: string;
  children: ReactNode;
  // Başlığı içeriğin kendisi çiziyorsa (Favorilerim: favori listesi sayısıyla çizer).
  basliksiz?: boolean;
  // Başlığın yanındaki eylem (Adreslerim: "Yeni adres ekle").
  ek?: ReactNode;
  // Sayfa yolunun son adımları (sipariş ayrıntısı: numara ve adresi; iade talebi: numara ve talep, kart 0239).
  sonAdim?: { ad: string; adres: string } | readonly { ad: string; adres: string }[];
}) {
  const sayfa = menu.find((oge) => oge.sayfa === secili);
  const baslik = metin(sayfa?.ad ?? "vitrin.hesap.baslik");
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.hesap.baslik"), adres: vitrinAdresleri.hesabim },
          { ad: baslik, adres: sayfa?.adres ?? vitrinAdresleri.hesabim },
          ...(sonAdim === undefined ? [] : Array.isArray(sonAdim) ? sonAdim : [sonAdim]),
        ]}
      />
      <div className="flex flex-col gap-6 masaustu:flex-row masaustu:items-start masaustu:gap-8">
        <nav
          aria-label={metin("vitrin.hesap.menu")}
          className="flex min-w-0 flex-col gap-2 masaustu:w-full masaustu:max-w-yan-menu masaustu:shrink-0 masaustu:rounded-orta masaustu:border masaustu:border-kenar masaustu:p-3"
        >
          <p className="hidden flex-col px-3 pb-2 text-kucuk text-soluk-yazi masaustu:flex">
            {metin("vitrin.hesap.merhaba")}
            <span className="font-kalin text-yazi wrap-anywhere">{eposta}</span>
          </p>
          {/* Telefonda yatay kayan şerit: yalnız kendi kutusu kayar, sayfa yana kaymaz. */}
          <ul className="-mx-4 flex gap-1 overflow-x-auto border-b border-kenar px-4 tablet:-mx-6 tablet:px-6 masaustu:mx-0 masaustu:flex-col masaustu:overflow-visible masaustu:border-b-0 masaustu:px-0">
            {menu.map((oge) => (
              <li key={oge.sayfa} className="shrink-0">
                <Baglanti
                  href={oge.adres}
                  {...(oge.sayfa === secili
                    ? {
                        "aria-current":
                          sonAdim === undefined ? ("page" as const) : ("true" as const),
                      }
                    : {})}
                  className={sinif(
                    ogeSinifi,
                    "w-full",
                    oge.sayfa === secili && "border-birincil font-en-kalin masaustu:bg-yuzey",
                  )}
                >
                  <Ikon ad={oge.ikon} />
                  {metin(oge.ad)}
                </Baglanti>
              </li>
            ))}
            <li className="shrink-0">
              <HesaptanCikis
                etiket={metin("vitrin.hesap.cikis")}
                hataMetni={metin("vitrin.hesap.cikisHata")}
                className={ogeSinifi}
              />
            </li>
          </ul>
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {basliksiz ? null : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SayfaBasligi baslik={baslik} />
              {ek}
            </div>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
