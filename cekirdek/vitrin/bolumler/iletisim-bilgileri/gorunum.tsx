// İletişim bilgilerinin görünüşü (kart 0108; Canlı Çarşı taslağı). Telefon, e-posta ve adres mağaza ayarlarından
// bağlamla gelir; boş olan gösterilmez, hiçbiri yoksa bölüm çizilmez. Liste görünümünde başlık verilmezse mağazanın
// adıdır, bilgiler ikonsuz alt alta durur; yatay görünüm alt kısmın bütün satırını alır, bilgiler ikonlu yan
// yanadır.
import { Fragment } from "react";
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { doldur } from "../../../metinler/doldur";
import { metin } from "../../../metinler/site-metni";
import type { VitrinBaglami } from "../../bolum-kutuphanesi/baglam";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { altKisimSiniflari as s } from "../ortak/alt-kisim";
import { metinMi } from "../ortak/deger";

// Mağaza ayarlarında telefon, e-posta ve adresin hiçbiri yok. Panel de boşluğu bununla bulur (kart 0172).
export const iletisimBosMu = (baglam: VitrinBaglami) => {
  const { telefon, eposta, adres } = baglam.iletisim;
  return telefon === undefined && eposta === undefined && adres === undefined;
};

// E-posta adresinin yazısı (kart 0190): satır yalnız "@" ve noktadan sonra kırılır, tireden kırılmaz
// ("satis@kucuk-" / "dukkan.test" olmaz). Her parça satıra hiç sığmazsa kendi içinde kırılır, sayfa yana kaymaz.
function EpostaYazisi({ adres }: { adres: string }) {
  // Her parça "@" ya da noktayla biter (son parça hariç); yeri parçanın anahtarıdır.
  const parcalar = [...adres.matchAll(/[^@.]*[@.]|[^@.]+$/gu)].map((eslesme) => ({
    yer: eslesme.index,
    parca: eslesme[0],
  }));
  return (
    <span className="min-w-0">
      {parcalar.map(({ yer, parca }) => (
        <Fragment key={yer}>
          {yer === 0 ? null : <wbr />}
          <span className="inline-block max-w-full wrap-anywhere">{parca}</span>
        </Fragment>
      ))}
    </span>
  );
}

export function IletisimBilgileriGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { baslik?: unknown };
  const { telefon, eposta, adres } = baglam.iletisim;
  if (iletisimBosMu(baglam)) return null;
  const yatay = gorunum === "yatay";
  const baslik = metinMi(degerler.baslik) ? degerler.baslik : baglam.magazaAdi;
  const ikon = (ad: "telefon" | "eposta" | "konum") => (yatay ? <Ikon ad={ad} /> : null);
  return (
    <section
      aria-label={metin("vitrin.bolum.iletisimBilgileri.ad")}
      className={sinif(s.sutun, yatay && "col-span-2 masaustu:col-span-5")}
    >
      <h2 className="mb-1 font-baslik text-buyuk font-baslik-kalinligi text-alt-kisim-ustu">
        {baslik}
      </h2>
      <ul className={sinif("flex", yatay ? "flex-wrap gap-x-6" : "flex-col")}>
        {adres === undefined ? null : (
          <li className={sinif("flex gap-2 pb-2", s.soluk)}>
            {ikon("konum")}
            <address className="not-italic">
              <span className="sr-only">{metin("vitrin.bolum.iletisimBilgileri.adres")}</span>
              {adres.map((satir) => (
                <span key={satir} className="block">
                  {satir}
                </span>
              ))}
            </address>
          </li>
        )}
        {telefon === undefined ? null : (
          <li>
            <Baglanti href={telefon.adres} className={sinif(s.baglanti, "gap-2")}>
              {ikon("telefon")}
              <span className="sr-only">{metin("vitrin.bolum.iletisimBilgileri.telefon")}</span>
              {telefon.metin}
            </Baglanti>
          </li>
        )}
        {eposta === undefined ? null : (
          <li>
            {/* Ad adresin tamamıdır: parçalar satır içi blok olduğu için tarayıcı adda aralarına boşluk koyardı
                ("satis@ kucuk-dukkan. test"). */}
            <Baglanti
              href={eposta.adres}
              aria-label={doldur(metin("vitrin.bolum.iletisimBilgileri.epostaBaglantisi"), {
                adres: eposta.metin,
              })}
              className={sinif(s.baglanti, "gap-2")}
            >
              {ikon("eposta")}
              <EpostaYazisi adres={eposta.metin} />
            </Baglanti>
          </li>
        )}
      </ul>
    </section>
  );
}
