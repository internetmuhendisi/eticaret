// Logo ve simgeler satırının görünüşü (kart 0108; Canlı Çarşı taslağı). Logo yoksa mağaza adı yazılır. Arama kutusu
// (kart 0137), favori ve sepet yalnız işlevi yazılınca görünür; telefonda menü düğmesi seçilen menüleri soldan açılan yan
// pencerede gösterir, arama ve sepet satırda kalır. Masaüstünde menüler menü satırındadır; hesap yazısıyla, sepet
// yazısı ve sayısıyla kenarlı bir hap içinde görünür. Telefon numarası yalnız logo ortada görünümündedir; logo
// solda görünümünde taslaktaki gibi duyuru şeridindedir.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import type { IkonAdi } from "../../../../bilesenler/ikonlar/sozluk";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import { vitrinAdresleri } from "../../adresler";
import { AramaKutusu } from "../../arama-kutusu";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { FavoriSayisi } from "../../favori-dugmesi";
import { HesapMenusu } from "./hesap-menusu";
import { MenuDugmesi } from "./menu-dugmesi";

// Telefonda yalnız arama ve sepet satırda kalır (kart 0108); hesap ve favoriler yan penceredeki listededir,
// böylece logoya yer kalır.
type Simge = { adres: string; ikon: IkonAdi; etiket: string; sayi?: number | undefined };

// Sepetteki ve favorilerdeki ürün sayısı: yuvarlak, ana renkte. Simge köşesinde durur; yazılı haptaki sayı satırın
// içindedir. Sıfır yalnız haptaki sayıda görünür.
const sayiSiniflari =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-dugme bg-rozet px-1.5 text-kucuk font-kalin text-rozet-ustu";

// Yalnız ikonlu bağlantı (arama, favori); telefonda gizlenebilir. Favorinin sayısı tarayıcıda, favori durumundan
// gelir (kart 0140): sayfada tek istek gider, düğmeler değişince sayı da değişir.
function SimgeBaglantisi({
  adres,
  ikon,
  etiket,
  sayi,
  favoriSayisi = false,
  telefondaGizli = false,
}: Simge & { favoriSayisi?: boolean; telefondaGizli?: boolean }) {
  return (
    <Baglanti
      href={adres}
      gorunum="sade"
      className={sinif(
        "relative size-11 px-0 no-underline",
        telefondaGizli && "hidden tablet:inline-flex",
      )}
    >
      <Ikon ad={ikon} className="size-5" />
      <span className="sr-only">{etiket}</span>
      {favoriSayisi ? (
        <FavoriSayisi
          {...(sayi === undefined ? {} : { ornekSayi: sayi })}
          className={sinif(sayiSiniflari, "absolute top-0 right-0")}
        />
      ) : sayi === undefined || sayi === 0 ? null : (
        <span className={sinif(sayiSiniflari, "absolute top-0 right-0")}>{sayi}</span>
      )}
    </Baglanti>
  );
}

// Masaüstünde ikon ve yazı (hesap), ya da kenarlı hap içinde ikon, yazı ve sayı (sepet); daha dar ekranda yalnız
// ikon. Hesabım menüsünün düğmesi de bu sınıflarla durur (kart 0131).
const yaziliSiniflar = ({ hap = false, telefondaGizli = false }) =>
  sinif(
    "relative min-w-11 gap-2 px-0 no-underline masaustu:px-3",
    hap
      ? "masaustu:border masaustu:border-kenar masaustu:bg-yuzey masaustu:px-4 masaustu:font-kalin"
      : "font-normal",
    telefondaGizli && "hidden tablet:inline-flex",
  );

function YaziliBaglanti({
  adres,
  ikon,
  etiket,
  sayi,
  hap = false,
  telefondaGizli = false,
}: Simge & { hap?: boolean; telefondaGizli?: boolean }) {
  return (
    <Baglanti href={adres} gorunum="sade" className={yaziliSiniflar({ hap, telefondaGizli })}>
      <Ikon ad={ikon} className="size-5" />
      <span className="sr-only masaustu:not-sr-only">{etiket}</span>
      {sayi === undefined ? null : (
        <span
          className={sinif(
            sayiSiniflari,
            "absolute top-0 right-0 masaustu:static",
            sayi === 0 && "hidden masaustu:inline-flex",
          )}
        >
          {sayi}
        </span>
      )}
    </Baglanti>
  );
}

export function UstSatirGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { menuler?: unknown };
  const kodlar = Array.isArray(degerler.menuler)
    ? (degerler.menuler as { menu?: unknown }[]).flatMap((oge) =>
        typeof oge.menu === "string" ? [oge.menu] : [],
      )
    : [];
  const menuler = kodlar.flatMap((kod) => {
    const dallar = baglam.menuler[kod];
    return dallar === undefined || dallar.length === 0
      ? []
      : [{ kod, dallar, kategori: baglam.kategoriMenuleri.includes(kod) }];
  });
  const { islevler, sayilar, iletisim } = baglam;
  const ortada = gorunum === "logo-ortada";

  const hesap: Simge = {
    adres: vitrinAdresleri.giris,
    ikon: "hesap",
    etiket: metin("vitrin.bolum.ustSatir.hesap"),
  };
  const favori: Simge | undefined = islevler.favori
    ? {
        adres: vitrinAdresleri.favoriler,
        ikon: "favori",
        etiket: metin("vitrin.bolum.ustSatir.favoriler"),
        sayi: sayilar.favori,
      }
    : undefined;

  // Menü düğmesi masaüstünde gizlidir; menüler orada menü satırındadır.
  const menuDugmesi = (
    <MenuDugmesi
      menuler={menuler}
      yandakiler={
        favori === undefined
          ? []
          : [{ adres: favori.adres, ikon: favori.ikon, etiket: favori.etiket }]
      }
      hesap={{ adres: hesap.adres, ikon: hesap.ikon, etiket: hesap.etiket }}
      hesapSorulur={baglam.musteriOturumu === "sorulur"}
      metinler={{
        ac: metin("vitrin.bolum.ustSatir.menuyuAc"),
        kapat: metin("vitrin.bolum.ustSatir.menuyuKapat"),
        baslik: metin("vitrin.bolum.ustSatir.menuBasligi"),
        tumu: metin("vitrin.bolum.ustSatir.tumu"),
        kategoriler: metin("vitrin.bolum.menuSatiri.kategoriler"),
      }}
    />
  );

  const logo = (
    <Baglanti
      href={vitrinAdresleri.anasayfa}
      gorunum="sade"
      className="dokunma-alani min-w-0 shrink px-0 no-underline"
    >
      {baglam.logoAdresi === undefined ? (
        <span className="min-w-0 truncate font-baslik text-buyuk font-baslik-kalinligi masaustu:text-baslik-3">
          {baglam.magazaAdi}
        </span>
      ) : (
        // biome-ignore lint/performance/noImgElement: logo ucundan gelir, boyutlandırma tarayıcının işidir.
        <img
          src={baglam.logoAdresi}
          alt={baglam.magazaAdi}
          className="h-auto max-h-10 w-auto max-w-full"
        />
      )}
    </Baglanti>
  );

  const telefon =
    iletisim.telefon === undefined ? null : (
      <Baglanti
        href={iletisim.telefon.adres}
        gorunum="sade"
        className="hidden gap-2 px-2 tablet:inline-flex"
      >
        <Ikon ad="telefon" />
        {iletisim.telefon.metin}
      </Baglanti>
    );

  const simgeler = (
    <div className="flex shrink-0 items-center justify-end gap-1">
      {favori === undefined ? null : <SimgeBaglantisi {...favori} favoriSayisi telefondaGizli />}
      <HesapMenusu
        baglanti={<YaziliBaglanti {...hesap} telefondaGizli />}
        etiket={hesap.etiket}
        className={yaziliSiniflar({ telefondaGizli: true })}
        sorulur={baglam.musteriOturumu === "sorulur"}
      />
      {islevler.sepet ? (
        <YaziliBaglanti
          adres={vitrinAdresleri.sepet}
          ikon="sepet"
          etiket={metin("vitrin.bolum.ustSatir.sepet")}
          sayi={sayilar.sepet}
          hap
        />
      ) : null}
    </div>
  );

  // Arama kutusu (kart 0137): işlev açıkken. Logo solda görünümünde masaüstünde logonun yanında, daha dar
  // ekranda satırın altında; logo ortada görünümünde her genişlikte satırın altında (kullanıcı kararı).
  const aramaKutusu = (className: string) =>
    islevler.arama ? (
      <AramaKutusu
        className={className}
        metinler={{
          etiket: metin("vitrin.bolum.ustSatir.aramaEtiketi"),
          yerTutucu: metin("vitrin.bolum.ustSatir.aramaYerTutucu"),
          dugme: metin("vitrin.bolum.ustSatir.arama"),
        }}
      />
    ) : null;
  const alttakiArama = islevler.arama ? (
    <div
      className={sinif("mx-auto max-w-icerik px-4 pb-3 tablet:px-6", !ortada && "masaustu:hidden")}
    >
      {aramaKutusu("w-full")}
    </div>
  ) : null;

  return (
    <div className="border-b border-kenar bg-zemin">
      {ortada ? (
        // Logo ortada: iki yan grup eşit büyür, logo aralarında kalır; telefonda logo kısalır.
        <div className="mx-auto flex max-w-icerik items-center gap-2 px-4 py-2 tablet:px-6 masaustu:gap-6 masaustu:py-4">
          <div className="flex flex-1 items-center gap-2">
            {menuDugmesi}
            {telefon}
          </div>
          {logo}
          <div className="flex flex-1 justify-end">{simgeler}</div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-icerik items-center gap-2 px-4 py-2 tablet:px-6 masaustu:gap-6 masaustu:py-4">
          {menuDugmesi}
          {logo}
          <div className="flex min-w-0 flex-1">
            {aramaKutusu("hidden w-full max-w-arama masaustu:block")}
          </div>
          {simgeler}
        </div>
      )}
      {alttakiArama}
    </div>
  );
}
