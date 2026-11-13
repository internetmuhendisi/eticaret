// Bölümlerin ortak menü parçaları (kart 0108): menünün dalını bağlantı ya da başlık olarak çizer; telefonun yan
// penceresinde alt düzeyi olan dal akordeonla açılır. İçerik yalnız bağlamdaki menüden gelir.
import {
  Akordeon,
  AkordeonBasligi,
  AkordeonIcerigi,
  AkordeonOgesi,
} from "../../../../bilesenler/parcalar/akordeon";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import type { BaglamMenuDali } from "../../bolum-kutuphanesi/baglam";

// Yeni sekmede açılan bağlantı açtığı sayfaya erişim vermez.
export const yeniSekmeOzellikleri = (yeniSekme: boolean) =>
  yeniSekme ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};

// Dalın kendisi: adresi varsa bağlantı, yoksa (başlık) yazı.
// tiklayinca: yan penceredeki bağlantı pencereyi kapatır (vitrinin çerçevesi sayfalar arasında yeniden
// çizilmez, pencere kendiliğinden kapanmaz; kart 0108 kontrolü).
export function MenuBaglantisi({
  dal,
  className,
  tiklayinca,
}: {
  dal: BaglamMenuDali;
  className?: string;
  tiklayinca?: () => void;
}) {
  if (dal.adres === undefined) return <span className={className}>{dal.metin}</span>;
  return (
    <Baglanti
      href={dal.adres}
      className={className}
      {...(tiklayinca === undefined ? {} : { onClick: tiklayinca })}
      {...yeniSekmeOzellikleri(dal.yeniSekme)}
    >
      {dal.metin}
    </Baglanti>
  );
}

// Telefonun yan penceresindeki menü: alt düzeyi olan dal akordeonla açılır, adresi varsa ilk alt öğesi "Tümü"
// bağlantısıdır.
export function YanMenu({
  dallar,
  tumu,
  tiklayinca,
  duzey = 3,
}: {
  dallar: readonly BaglamMenuDali[];
  tumu: string;
  tiklayinca?: () => void;
  // Akordeon başlıklarının düzeyi: pencerenin başlığı h2'dir; "Kategoriler" grubunun içindekiler h4 (kart 0168).
  duzey?: 3 | 4;
}) {
  const kapatma = tiklayinca === undefined ? {} : { tiklayinca };
  const satir = "min-h-11 w-full py-2";
  return (
    <ul className="flex flex-col">
      {dallar.map((dal) =>
        dal.altlar.length === 0 ? (
          <li key={dal.kimlik} className="border-b border-kenar">
            <MenuBaglantisi dal={dal} className={sinif(satir, "flex items-center")} {...kapatma} />
          </li>
        ) : (
          <li key={dal.kimlik} className="border-b border-kenar">
            <Akordeon type="single" collapsible>
              <AkordeonOgesi value={dal.kimlik}>
                <AkordeonBasligi duzey={duzey}>{dal.metin}</AkordeonBasligi>
                <AkordeonIcerigi>
                  <ul className="flex flex-col pl-4">
                    {dal.adres === undefined ? null : (
                      <li>
                        <MenuBaglantisi
                          dal={{ ...dal, metin: tumu }}
                          className={satir}
                          {...kapatma}
                        />
                      </li>
                    )}
                    {dal.altlar.map((alt) => (
                      <li key={alt.kimlik}>
                        <MenuBaglantisi dal={alt} className={satir} {...kapatma} />
                      </li>
                    ))}
                  </ul>
                </AkordeonIcerigi>
              </AkordeonOgesi>
            </Akordeon>
          </li>
        ),
      )}
    </ul>
  );
}

// Yan penceredeki adlı menü grubu (kart 0168): kategori menüsü masaüstündeki "Kategoriler" düğmesi gibi tek bir
// satırdır, dokununca açılır; içinde kategoriler YanMenu ile (alt kategorisi olan akordeonla) durur. Böylece ana
// menüde de geçen kategoriler pencerenin en üst düzeyinde iki kez görünmez.
export function YanMenuGrubu({
  baslik,
  dallar,
  tumu,
  tiklayinca,
}: {
  baslik: string;
  dallar: readonly BaglamMenuDali[];
  tumu: string;
  tiklayinca?: () => void;
}) {
  return (
    <ul className="flex flex-col">
      <li className="border-b border-kenar">
        <Akordeon type="single" collapsible>
          <AkordeonOgesi value={baslik}>
            <AkordeonBasligi duzey={3}>{baslik}</AkordeonBasligi>
            <AkordeonIcerigi>
              <div className="pl-4">
                <YanMenu
                  dallar={dallar}
                  tumu={tumu}
                  duzey={4}
                  {...(tiklayinca === undefined ? {} : { tiklayinca })}
                />
              </div>
            </AkordeonIcerigi>
          </AkordeonOgesi>
        </Akordeon>
      </li>
    </ul>
  );
}
