// Logo ve simgeler satırının görünüşü (kart 0108). Logo yoksa mağaza adı yazılır. Arama, favori ve sepet yalnız
// işlevi yazılınca görünür; telefonda menü düğmesi seçilen menüleri soldan açılan yan pencerede gösterir, arama ve
// sepet satırda kalır. Masaüstünde menüler menü satırındadır.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import type { IkonAdi } from "../../../../bilesenler/ikonlar/sozluk";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import { vitrinAdresleri } from "../../adresler";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { MenuDugmesi } from "./menu-dugmesi";

// Telefonda yalnız arama ve sepet satırda kalır (kart 0108); hesap ve favoriler yan penceredeki listededir,
// böylece logoya yer kalır.
type Simge = { adres: string; ikon: IkonAdi; etiket: string; sayi?: number | undefined };

function SimgeBaglantisi({
  adres,
  ikon,
  etiket,
  sayi,
  telefondaGizli = false,
}: Simge & { telefondaGizli?: boolean }) {
  return (
    <Baglanti
      href={adres}
      gorunum="sade"
      className={sinif("relative size-11 px-0", telefondaGizli && "hidden tablet:inline-flex")}
    >
      <Ikon ad={ikon} className="size-5" />
      <span className="sr-only">{etiket}</span>
      {sayi === undefined || sayi === 0 ? null : (
        <Rozet className="absolute top-0 right-0">{sayi}</Rozet>
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
    return dallar === undefined || dallar.length === 0 ? [] : [{ kod, dallar }];
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
  const yandakiler = favori === undefined ? [hesap] : [favori, hesap];

  // Menü düğmesi masaüstünde gizlidir; menüler orada menü satırındadır.
  const menuDugmesi = (
    <MenuDugmesi
      menuler={menuler}
      yandakiler={yandakiler.map(({ adres, ikon, etiket }) => ({ adres, ikon, etiket }))}
      metinler={{
        ac: metin("vitrin.bolum.ustSatir.menuyuAc"),
        kapat: metin("vitrin.bolum.ustSatir.menuyuKapat"),
        baslik: metin("vitrin.bolum.ustSatir.menuBasligi"),
        tumu: metin("vitrin.bolum.ustSatir.tumu"),
      }}
    />
  );

  const logo = (
    <Baglanti
      href={vitrinAdresleri.anasayfa}
      gorunum="sade"
      className="min-w-0 shrink px-0 no-underline"
    >
      {baglam.logoAdresi === undefined ? (
        <span className="min-w-0 truncate text-baslik-4 font-baslik-kalinligi">
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
    <div className="flex shrink-0 items-center justify-end">
      {islevler.arama ? (
        <SimgeBaglantisi
          adres={vitrinAdresleri.arama}
          ikon="arama"
          etiket={metin("vitrin.bolum.ustSatir.arama")}
        />
      ) : null}
      {favori === undefined ? null : <SimgeBaglantisi {...favori} telefondaGizli />}
      <SimgeBaglantisi {...hesap} telefondaGizli />
      {islevler.sepet ? (
        <SimgeBaglantisi
          adres={vitrinAdresleri.sepet}
          ikon="sepet"
          etiket={metin("vitrin.bolum.ustSatir.sepet")}
          sayi={sayilar.sepet}
        />
      ) : null}
    </div>
  );

  return (
    <div className="border-b border-kenar bg-zemin">
      {ortada ? (
        // Logo ortada: iki yan grup eşit büyür, logo aralarında kalır; telefonda logo kısalır.
        <div className="mx-auto flex max-w-icerik items-center gap-2 px-4 py-2">
          <div className="flex flex-1 items-center gap-2">
            {menuDugmesi}
            {telefon}
          </div>
          {logo}
          <div className="flex flex-1 justify-end">{simgeler}</div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-icerik items-center gap-2 px-4 py-2">
          {menuDugmesi}
          {logo}
          <div className="flex flex-1 justify-end">{telefon}</div>
          {simgeler}
        </div>
      )}
    </div>
  );
}
