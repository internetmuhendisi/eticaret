// Bağlantı sütunlarının görünüşü (kart 0108). En üst öğe sütun başlığıdır (adresi varsa bağlantı), altları
// bağlantıdır; altı olmayan en üst bağlantılar ayrı bir sütunda toplanır. Tek satır görünümünde bütün
// bağlantılar yan yana dizilir.
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import type { BaglamMenuDali } from "../../bolum-kutuphanesi/baglam";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { altKisimSiniflari as s } from "../ortak/alt-kisim";
import { metinMi } from "../ortak/deger";
import { MenuBaglantisi } from "../ortak/menu";

function Baglantilar({ dallar }: { dallar: readonly BaglamMenuDali[] }) {
  return (
    <ul className="flex flex-col">
      {dallar.map((dal) => (
        <li key={dal.kimlik}>
          <MenuBaglantisi dal={dal} className={sinif(s.baglanti, "font-normal")} />
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
      <nav aria-label={metin("vitrin.bolum.baglantiSutunlari.gezinme")} className={s.kutu}>
        <ul className="flex flex-wrap gap-x-6">
          {hepsi.map((dal) => (
            <li key={dal.kimlik}>
              <MenuBaglantisi dal={dal} className={sinif(s.baglanti, "font-normal")} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  const sutunlar = dallar.filter((dal) => dal.altlar.length > 0);
  const tekler = dallar.filter((dal) => dal.altlar.length === 0);
  return (
    <nav
      aria-label={metin("vitrin.bolum.baglantiSutunlari.gezinme")}
      className={sinif(s.kutu, "grid gap-6 tablet:grid-cols-2 masaustu:grid-cols-4")}
    >
      {sutunlar.map((dal) => (
        <div key={dal.kimlik} className="flex flex-col gap-2">
          <h2 className={s.baslik}>
            <MenuBaglantisi dal={dal} className={s.baglanti} />
          </h2>
          <Baglantilar dallar={dal.altlar} />
        </div>
      ))}
      {tekler.length === 0 ? null : <Baglantilar dallar={tekler} />}
    </nav>
  );
}
