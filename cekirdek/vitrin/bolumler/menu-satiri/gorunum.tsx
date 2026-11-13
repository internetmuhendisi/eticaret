// Menü satırının görünüşü (kart 0108). Masaüstünde görünür; telefonda gizlidir, menüler logo satırının yan
// penceresinden açılır. Alt düzeyi olan dal açılır menüyle açılır (ok tuşları, Escape); kategori menüsü
// "Kategoriler" düğmesinin altındadır, alt kategoriler alt menüdür.
import Link from "next/link";
import type { ReactNode } from "react";
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import {
  AcilirMenu,
  AcilirMenuBasligi,
  AcilirMenuIcerigi,
  AcilirMenuOgesi,
  AcilirMenuTetikleyici,
  AltMenu,
  AltMenuIcerigi,
  AltMenuTetikleyici,
} from "../../../../bilesenler/parcalar/acilir-menu";
import { Dugme } from "../../../../bilesenler/parcalar/dugme";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import type { BaglamMenuDali, VitrinBaglami } from "../../bolum-kutuphanesi/baglam";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import type { BolumDegerleri } from "../../bolum-kutuphanesi/tarif";
import { metinMi } from "../ortak/deger";
import { MenuBaglantisi, yeniSekmeOzellikleri } from "../ortak/menu";

// Açılır menünün bağlantı öğesi; başlık (adressiz dal) seçilemeyen etikettir.
function MenuOgesi({ dal, metinYerine }: { dal: BaglamMenuDali; metinYerine?: string }) {
  if (dal.adres === undefined) return <AcilirMenuBasligi>{dal.metin}</AcilirMenuBasligi>;
  return (
    <AcilirMenuOgesi asChild>
      <Link href={dal.adres} {...yeniSekmeOzellikleri(dal.yeniSekme)}>
        {metinYerine ?? dal.metin}
      </Link>
    </AcilirMenuOgesi>
  );
}

// Dalın altları; dalın adresi varsa ilk öğe "Tümü"dür.
function Altlar({ dal }: { dal: BaglamMenuDali }) {
  return (
    <>
      {dal.adres === undefined ? null : (
        <MenuOgesi dal={dal} metinYerine={metin("vitrin.bolum.menuSatiri.tumu")} />
      )}
      {dal.altlar.map((alt) => (
        <MenuOgesi key={alt.kimlik} dal={alt} />
      ))}
    </>
  );
}

// Açılır dalın düğmesi; kategoriler düğmesi ana renkte, menü ikonlu ve az yuvarlak köşelidir (Canlı Çarşı
// taslağı), öteki dallar menü bağlantısı gibi görünür.
function AcilirDal({
  etiket,
  children,
  kategoriler = false,
}: {
  etiket: string;
  children: ReactNode;
  kategoriler?: boolean;
}) {
  return (
    <AcilirMenu>
      <AcilirMenuTetikleyici asChild>
        <Dugme
          tur={kategoriler ? "birincil" : "sade"}
          className={kategoriler ? "my-1.5 mr-3 rounded-kucuk px-4 font-kalin" : "px-3 font-orta"}
        >
          {kategoriler ? <Ikon ad="menu" className="size-5" /> : null}
          {etiket}
          <Ikon ad="asagi" />
        </Dugme>
      </AcilirMenuTetikleyici>
      <AcilirMenuIcerigi align="start">{children}</AcilirMenuIcerigi>
    </AcilirMenu>
  );
}

// Seçilen ana menü ve kategori menüsü. Panel de boşluğu bununla bulur (kart 0172, menuSatiriBosMu).
export const menuSatiriMenuleri = (ham: BolumDegerleri, baglam: VitrinBaglami) => {
  const degerler = ham as { anaMenu?: unknown; kategoriMenusu?: unknown };
  return {
    anaMenu: metinMi(degerler.anaMenu) ? baglam.menuler[degerler.anaMenu] : undefined,
    kategoriler: metinMi(degerler.kategoriMenusu)
      ? baglam.menuler[degerler.kategoriMenusu]
      : undefined,
  };
};
export const menuSatiriBosMu = (ham: BolumDegerleri, baglam: VitrinBaglami) => {
  const { anaMenu, kategoriler } = menuSatiriMenuleri(ham, baglam);
  return (anaMenu?.length ?? 0) === 0 && (kategoriler?.length ?? 0) === 0;
};

export function MenuSatiriGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  const { anaMenu, kategoriler } = menuSatiriMenuleri(ham, baglam);
  if (menuSatiriBosMu(ham, baglam)) return null;
  return (
    <nav
      aria-label={metin("vitrin.bolum.menuSatiri.gezinme")}
      className="hidden border-b border-kenar bg-zemin masaustu:block"
    >
      <ul
        className={sinif(
          "mx-auto flex max-w-icerik flex-wrap items-center gap-2 px-4 tablet:px-6",
          gorunum === "ortali" && "justify-center",
        )}
      >
        {kategoriler === undefined || kategoriler.length === 0 ? null : (
          <li>
            <AcilirDal etiket={metin("vitrin.bolum.menuSatiri.kategoriler")} kategoriler>
              {kategoriler.map((dal) =>
                dal.altlar.length === 0 ? (
                  <MenuOgesi key={dal.kimlik} dal={dal} />
                ) : (
                  <AltMenu key={dal.kimlik}>
                    <AltMenuTetikleyici>{dal.metin}</AltMenuTetikleyici>
                    <AltMenuIcerigi>
                      <Altlar dal={dal} />
                    </AltMenuIcerigi>
                  </AltMenu>
                ),
              )}
            </AcilirDal>
          </li>
        )}
        {(anaMenu ?? []).map((dal) => (
          <li key={dal.kimlik}>
            {dal.altlar.length === 0 ? (
              <MenuBaglantisi dal={dal} className="px-3 font-orta no-underline hover:underline" />
            ) : (
              <AcilirDal etiket={dal.metin}>
                <Altlar dal={dal} />
              </AcilirDal>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
