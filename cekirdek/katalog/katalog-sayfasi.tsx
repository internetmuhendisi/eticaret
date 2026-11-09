// Bileşen kataloğunun sayfaları (kart 0104, karar 0078). Ana sayfa bütün parçaları bir arada, parça
// sayfası tek parçayı dosyası ve kullanıldığı yerlerle gösterir. Renk ve genişlik seçimi adrestedir:
// genişlik seçilince sayfa o genişlikte bir çerçevede, aynı seçimle açılır.
import type { ReactNode } from "react";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { metin } from "../metinler/site-metni";
import {
  type GenislikSecenegi,
  genislikSecenekleri,
  type KatalogSecimi,
  katalogAdresi,
  katalogParcalari,
  type RenkSecenegi,
  renkSecenekleri,
  secimAdresi,
} from "./kayit";
import kullanimlar from "./kullanimlar.json" with { type: "json" };
import { KatalogOrnegi } from "./ornekler";
import { RenkSecimi } from "./renk-secimi";

type ParcaBilgisi = (typeof katalogParcalari)[number];

function SecimListesi<T extends string>({
  baslik,
  secenekler,
  secili,
  adres,
}: {
  baslik: string;
  secenekler: [T, string][];
  secili: T;
  adres: (deger: T) => string;
}) {
  return (
    <nav aria-label={baslik} className="flex flex-wrap items-center gap-2">
      <span className="font-orta">{baslik}</span>
      {secenekler.map(([deger, ad]) => (
        <Baglanti
          key={deger}
          href={adres(deger)}
          gorunum={deger === secili ? "birincil" : "cerceveli"}
          {...(deger === secili ? { "aria-current": "page" as const } : {})}
        >
          {ad}
        </Baglanti>
      ))}
    </nav>
  );
}

function AracCubugu({ yol, secim }: { yol: string; secim: KatalogSecimi }) {
  return (
    <div className="flex flex-col gap-2">
      <SecimListesi
        baslik={metin("gelistirme.katalog.renk")}
        secenekler={(Object.keys(renkSecenekleri) as RenkSecenegi[]).map((renk) => [
          renk,
          metin(renkSecenekleri[renk]),
        ])}
        secili={secim.renk}
        adres={(renk) => secimAdresi(yol, { ...secim, renk })}
      />
      <SecimListesi
        baslik={metin("gelistirme.katalog.genislik")}
        secenekler={(Object.keys(genislikSecenekleri) as GenislikSecenegi[]).map((genislik) => [
          genislik,
          metin(genislikSecenekleri[genislik].baslik),
        ])}
        secili={secim.genislik}
        adres={(genislik) => secimAdresi(yol, { ...secim, genislik })}
      />
    </div>
  );
}

// Seçilen genişlikte çerçeve. Çerçeve sayfadan genişse kendi kutusunda kayar, sayfa yana kaymaz. Kenar
// dıştaki kutudadır: çerçevenin içi tam seçilen genişliktir.
function Onizleme({ yol, secim }: { yol: string; secim: KatalogSecimi }) {
  const { piksel } = genislikSecenekleri[secim.genislik];
  return (
    <div className="overflow-x-auto">
      <div className="w-fit border border-kenar">
        <iframe
          title={metin("gelistirme.katalog.onizleme")}
          src={secimAdresi(yol, { ...secim, genislik: "tam", cerceve: true })}
          width={piksel}
          height={900}
          className="block"
        />
      </div>
    </div>
  );
}

function KatalogDuzeni({
  yol,
  secim,
  baslik,
  ust,
  children,
}: {
  yol: string;
  secim: KatalogSecimi;
  baslik: string;
  ust?: ReactNode;
  children: ReactNode;
}) {
  const onizleme = secim.genislik !== "tam" && !secim.cerceve;
  return (
    <main className="mx-auto flex w-full max-w-metin flex-col gap-6 p-4">
      <RenkSecimi renk={secim.renk} />
      {secim.cerceve ? null : (
        <>
          <h1>{baslik}</h1>
          {ust}
          <AracCubugu yol={yol} secim={secim} />
        </>
      )}
      {onizleme ? <Onizleme yol={yol} secim={secim} /> : children}
    </main>
  );
}

function ParcaBolumu({ parca, secim }: { parca: ParcaBilgisi; secim: KatalogSecimi }) {
  const baslik = metin(parca.baslik);
  return (
    <section aria-label={baslik} className="flex flex-col gap-4 border-t border-kenar pt-6">
      <h2>
        <Baglanti href={secimAdresi(`${katalogAdresi}/${parca.kod}`, secim)}>{baslik}</Baglanti>
      </h2>
      <KatalogOrnegi kod={parca.kod} />
    </section>
  );
}

export function KatalogAnaSayfasi({ secim }: { secim: KatalogSecimi }) {
  return (
    <KatalogDuzeni
      yol={katalogAdresi}
      secim={secim}
      baslik={metin("gelistirme.katalog.baslik")}
      ust={<p>{metin("gelistirme.katalog.aciklama")}</p>}
    >
      {katalogParcalari.map((parca) => (
        <ParcaBolumu key={parca.kod} parca={parca} secim={secim} />
      ))}
    </KatalogDuzeni>
  );
}

export function KatalogParcaSayfasi({
  parca,
  secim,
}: {
  parca: ParcaBilgisi;
  secim: KatalogSecimi;
}) {
  const yol = `${katalogAdresi}/${parca.kod}`;
  const kullananlar: string[] = (kullanimlar as Record<string, string[]>)[parca.dosya] ?? [];
  return (
    <KatalogDuzeni
      yol={yol}
      secim={secim}
      baslik={metin(parca.baslik)}
      ust={
        <Baglanti href={secimAdresi(katalogAdresi, { ...secim, cerceve: false })}>
          {metin("gelistirme.katalog.butunParcalar")}
        </Baglanti>
      }
    >
      <section aria-label={metin(parca.baslik)} className="flex flex-col gap-4">
        <KatalogOrnegi kod={parca.kod} />
      </section>
      {secim.cerceve ? null : (
        <>
          <section className="flex flex-col gap-2 border-t border-kenar pt-6">
            <h2>{metin("gelistirme.katalog.dosya")}</h2>
            <code className="break-all">{parca.dosya}</code>
          </section>
          <section className="flex flex-col gap-2 border-t border-kenar pt-6">
            <h2>{metin("gelistirme.katalog.kullanildigiYerler")}</h2>
            {kullananlar.length === 0 ? (
              <p>{metin("gelistirme.katalog.kullanilmiyor")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {kullananlar.map((dosya) => (
                  <li key={dosya}>
                    <code className="break-all">{dosya}</code>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </KatalogDuzeni>
  );
}
