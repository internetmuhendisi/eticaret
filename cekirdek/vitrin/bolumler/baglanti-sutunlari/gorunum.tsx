// Bağlantı sütunlarının görünüşü (kart 0108; Canlı Çarşı taslağı). En üst öğe sütun başlığıdır (adresi varsa
// bağlantı), altları bağlantıdır; altı olmayan en üst bağlantılar ayrı bir sütunda toplanır. Bölüm alt kısmın
// ızgarasında sütun sayısı kadar yer alır ve sütunları o ızgaraya oturur; daha dar ekranda sütunlar ızgaraya tek
// tek yerleşir. Tek satır görünümünde bütün bağlantılar
// bir satırda yan yana dizilir.
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import type { BaglamMenuDali } from "../../bolum-kutuphanesi/baglam";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { altKisimSiniflari as s } from "../ortak/alt-kisim";
import { metinMi } from "../ortak/deger";
import { MenuBaglantisi } from "../ortak/menu";

// Masaüstünde ızgarada kaç sütun kaplar (en çok 5); sınıf adları parçalardan birleştirilmez.
const masaustuGenisligi = [
  "masaustu:col-span-1",
  "masaustu:col-span-1",
  "masaustu:col-span-2",
  "masaustu:col-span-3",
  "masaustu:col-span-4",
  "masaustu:col-span-5",
] as const;

function Baglantilar({ dallar }: { dallar: readonly BaglamMenuDali[] }) {
  return (
    <ul className="flex flex-col">
      {dallar.map((dal) => (
        <li key={dal.kimlik}>
          <MenuBaglantisi dal={dal} className={s.baglanti} />
        </li>
      ))}
    </ul>
  );
}

export function BaglantiSutunlariGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { menu?: unknown };
  const dallar = metinMi(degerler.menu) ? baglam.menuler[degerler.menu] : undefined;
  if (dallar === undefined || dallar.length === 0) return null;
  if (gorunum === "tek-satir") {
    const hepsi = dallar.flatMap((dal) => [
      ...(dal.adres === undefined ? [] : [dal]),
      ...dal.altlar,
    ]);
    return (
      <nav
        aria-label={metin("vitrin.bolum.baglantiSutunlari.gezinme")}
        className="col-span-2 masaustu:col-span-5"
      >
        <ul className="flex flex-wrap gap-x-6">
          {hepsi.map((dal) => (
            <li key={dal.kimlik}>
              <MenuBaglantisi dal={dal} className={s.baglanti} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  const sutunlar = dallar.filter((dal) => dal.altlar.length > 0);
  const tekler = dallar.filter((dal) => dal.altlar.length === 0);
  const sutunSayisi = Math.min(5, sutunlar.length + (tekler.length === 0 ? 0 : 1));
  return (
    <nav
      aria-label={metin("vitrin.bolum.baglantiSutunlari.gezinme")}
      // Masaüstünün altında sütunlar alt kısmın ızgarasına tek tek yerleşir (iletişim sütununun yanındaki boşluğu
      // doldurur); masaüstünde bölüm sütun sayısı kadar yer alır ve sütunları o ızgaraya oturur.
      className={sinif(
        "contents masaustu:grid masaustu:grid-cols-subgrid masaustu:gap-y-8",
        masaustuGenisligi[sutunSayisi],
      )}
    >
      {sutunlar.map((dal) => (
        <div key={dal.kimlik} className={s.sutun}>
          <h2 className={s.baslik}>
            {dal.adres === undefined ? (
              dal.metin
            ) : (
              <MenuBaglantisi
                dal={dal}
                className="text-alt-kisim-ustu no-underline hover:underline"
              />
            )}
          </h2>
          <Baglantilar dallar={dal.altlar} />
        </div>
      ))}
      {tekler.length === 0 ? null : (
        <div className={s.sutun}>
          <Baglantilar dallar={tekler} />
        </div>
      )}
    </nav>
  );
}
