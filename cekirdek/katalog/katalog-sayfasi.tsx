// Bileşen kataloğunun sayfaları (kart 0104, karar 0078). Ana sayfa bütün parçaları bir arada, parça
// sayfası tek parçayı dosyası ve kullanıldığı yerlerle gösterir. Renk ve genişlik seçimi adrestedir:
// genişlik seçilince sayfa o genişlikte bir çerçevede, aynı seçimle açılır.
import type { ReactNode } from "react";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { sinif } from "../../bilesenler/parcalar/sinif";
import { urunKartiGorunumleri } from "../kayitlar/tema";
import { metin } from "../metinler/site-metni";
import { bolumGorunumleri } from "../vitrin/bolum-kutuphanesi/gorunumler";
import { DuzenAlaniCizimi } from "../vitrin/duzen-alani";
import { UrunKarti, type UrunKartiIslevleri } from "../vitrin/urun-karti/urun-karti";
import { AltKisim, UstKisim } from "../vitrin/ust-alt-kisim";
import { BolumFormu } from "../yonetim-paneli/bolum-formu";
import { denemeGorunumleri } from "./deneme-bolumu/gorunum";
import { denemeBolumu } from "./deneme-bolumu/tarif";
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
import {
  ornekAltKisim,
  ornekBaglam,
  ornekGenisLogo,
  ornekOtekiGorunumler,
  ornekUstKisim,
} from "./ornek-baglam";
import { ornekUrunKartlari } from "./ornek-urun-kartlari";
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
  genis = false,
  children,
}: {
  yol: string;
  secim: KatalogSecimi;
  baslik: string;
  ust?: ReactNode;
  // Vitrinin üst ve alt kısmı gibi sayfanın tamamına yayılan örnekler için içerik genişliği (kart 0108).
  genis?: boolean;
  children: ReactNode;
}) {
  const onizleme = secim.genislik !== "tam" && !secim.cerceve;
  return (
    <main
      className={sinif(
        "mx-auto flex w-full flex-col gap-6 p-4",
        genis ? "max-w-icerik" : "max-w-metin",
      )}
    >
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
        <Baglanti
          href={secimAdresi(`${katalogAdresi}/${parca.kod}`, secim)}
          className="font-baslik-kalinligi"
        >
          {baslik}
        </Baglanti>
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
      ust={
        <>
          <p>{metin("gelistirme.katalog.aciklama")}</p>
          <Baglanti href={secimAdresi(bolumKutuphanesiAdresi, secim)}>
            {metin("gelistirme.katalog.bolumKutuphanesi")}
          </Baglanti>
          <Baglanti href={secimAdresi(urunKartiAdresi, secim)}>
            {metin("gelistirme.urunKarti.baslik")}
          </Baglanti>
        </>
      }
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

// Bölüm kütüphanesinin sayfası (kart 0106): deneme bölümünün görünüşü ve tarifinden çıkan düzenleme formu. Kart
// 0108: üst ve alt kısım bölümleri örnek bağlamla, her görünümüyle.
export const bolumKutuphanesiAdresi = `${katalogAdresi}/bolum-kutuphanesi`;

export function KatalogBolumKutuphanesiSayfasi({ secim }: { secim: KatalogSecimi }) {
  const baglam = ornekBaglam();
  const otekiler = ornekOtekiGorunumler();
  const ornek = {
    baslik: metin("gelistirme.bolum.ornek.baslik"),
    aciklama: metin("gelistirme.bolum.ornek.aciklama"),
    zemin: "kutu-1",
    maddeler: [
      { metin: metin("gelistirme.bolum.ornek.madde1") },
      { metin: metin("gelistirme.bolum.ornek.madde2") },
    ],
  };
  return (
    <KatalogDuzeni
      yol={bolumKutuphanesiAdresi}
      secim={secim}
      genis
      baslik={metin("gelistirme.bolum.baslik")}
      ust={
        <>
          <p>{metin("gelistirme.bolum.aciklama")}</p>
          <Baglanti href={secimAdresi(katalogAdresi, { ...secim, cerceve: false })}>
            {metin("gelistirme.katalog.butunParcalar")}
          </Baglanti>
        </>
      }
    >
      <section
        aria-label={metin("gelistirme.bolum.ustAlt")}
        className="flex flex-col gap-4 border-t border-kenar pt-6"
      >
        <h2>{metin("gelistirme.bolum.ustAlt")}</h2>
        <p>{metin("gelistirme.bolum.ustAltAciklamasi")}</p>
        <div className="flex flex-col border border-kenar">
          <UstKisim bolumler={ornekUstKisim()} gorunumler={bolumGorunumleri} baglam={baglam} />
          <div className="p-4">{metin("gelistirme.bolum.ornek.icerik")}</div>
          <AltKisim bolumler={ornekAltKisim()} gorunumler={bolumGorunumleri} baglam={baglam} />
        </div>
        <h3>{metin("gelistirme.bolum.otekiGorunumler")}</h3>
        <div className="flex flex-col border border-kenar">
          <UstKisim bolumler={otekiler.ust} gorunumler={bolumGorunumleri} baglam={baglam} />
          <UstKisim
            bolumler={otekiler.logolu}
            gorunumler={bolumGorunumleri}
            baglam={{ ...baglam, logoAdresi: ornekGenisLogo }}
          />
          <AltKisim bolumler={otekiler.alt} gorunumler={bolumGorunumleri} baglam={baglam} />
        </div>
      </section>
      <section
        aria-label={metin("gelistirme.bolum.cizim")}
        className="flex flex-col gap-4 border-t border-kenar pt-6"
      >
        <h2>{metin("gelistirme.bolum.cizim")}</h2>
        <DuzenAlaniCizimi
          bolumler={[
            {
              kimlik: "deneme-genis",
              tur: denemeBolumu.tur,
              gorunum: "genis",
              gizli: false,
              degerler: ornek,
            },
            {
              kimlik: "deneme-dar",
              tur: denemeBolumu.tur,
              gorunum: "dar",
              gizli: false,
              degerler: { baslik: ornek.baslik },
            },
          ]}
          gorunumler={denemeGorunumleri}
          baglam={baglam}
        />
      </section>
      <section
        aria-label={metin("gelistirme.bolum.form")}
        className="flex flex-col gap-4 border-t border-kenar pt-6"
      >
        <h2>{metin("gelistirme.bolum.form")}</h2>
        <BolumFormu
          tarif={denemeBolumu}
          ilkDegerler={ornek}
          secenekler={{
            kategoriler: [],
            markalar: [],
            etiketler: [],
            urunler: [],
            gorseller: [],
            menuler: [],
          }}
        />
      </section>
    </KatalogDuzeni>
  );
}

// Ürün kartının sayfası (kart 0109): her görünüm her durumla, işlevler açıkken; bugünkü vitrin gibi
// işlevler kapalıyken de dikey görünüm. Izgaralar vitrindeki yoğunluktadır (karar 0075: masaüstünde bir
// sırada 5 ürün, telefonda 2).
export const urunKartiAdresi = `${katalogAdresi}/urun-karti`;

const kartIzgarasi: Record<(typeof urunKartiGorunumleri)[number], string> = {
  dikey: "grid grid-cols-2 gap-3 tablet:grid-cols-3 masaustu:grid-cols-5 masaustu:gap-4",
  yatay: "grid grid-cols-1 gap-3 tablet:grid-cols-2 masaustu:grid-cols-3",
  "buyuk-gorsel": "grid grid-cols-1 gap-4 tablet:grid-cols-2 masaustu:grid-cols-3",
};

const acikIslevler: UrunKartiIslevleri = { favori: true, sepet: true, yorum: true };
const kapaliIslevler: UrunKartiIslevleri = { favori: false, sepet: false, yorum: false };

export function KatalogUrunKartiSayfasi({ secim }: { secim: KatalogSecimi }) {
  const urunler = ornekUrunKartlari();
  return (
    <KatalogDuzeni
      yol={urunKartiAdresi}
      secim={secim}
      genis
      baslik={metin("gelistirme.urunKarti.baslik")}
      ust={
        <>
          <p>{metin("gelistirme.urunKarti.aciklama")}</p>
          <p>{metin("gelistirme.urunKarti.islevler")}</p>
          <Baglanti href={secimAdresi(katalogAdresi, { ...secim, cerceve: false })}>
            {metin("gelistirme.katalog.butunParcalar")}
          </Baglanti>
        </>
      }
    >
      {urunKartiGorunumleri.map((gorunum) => {
        const baslik = metin(`gelistirme.urunKarti.gorunum.${gorunum}`);
        return (
          <section
            key={gorunum}
            aria-label={baslik}
            className="flex flex-col gap-4 border-t border-kenar pt-6"
          >
            <h2>{baslik}</h2>
            <div className={kartIzgarasi[gorunum]}>
              {urunler.map((urun, sira) => (
                <UrunKarti
                  key={urun.kimlik}
                  urun={urun}
                  gorunum={gorunum}
                  islevler={acikIslevler}
                  oncelikli={sira < 2}
                />
              ))}
            </div>
          </section>
        );
      })}
      <section
        aria-label={metin("gelistirme.urunKarti.islevsiz")}
        className="flex flex-col gap-4 border-t border-kenar pt-6"
      >
        <h2>{metin("gelistirme.urunKarti.islevsiz")}</h2>
        <div className={kartIzgarasi.dikey}>
          {urunler.map((urun) => (
            <UrunKarti key={urun.kimlik} urun={urun} gorunum="dikey" islevler={kapaliIslevler} />
          ))}
        </div>
      </section>
    </KatalogDuzeni>
  );
}
