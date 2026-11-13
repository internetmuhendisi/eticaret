// İletişim bilgilerinin görünüşü (kart 0108; Canlı Çarşı taslağı). Telefon, e-posta ve adres mağaza ayarlarından
// bağlamla gelir; boş olan gösterilmez, hiçbiri yoksa bölüm çizilmez. Liste görünümünde başlık verilmezse mağazanın
// adıdır, bilgiler ikonsuz alt alta durur; yatay görünüm alt kısmın bütün satırını alır, bilgiler ikonlu yan
// yanadır.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
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
            <Baglanti href={eposta.adres} className={sinif(s.baglanti, "gap-2 wrap-anywhere")}>
              {ikon("eposta")}
              <span className="sr-only">{metin("vitrin.bolum.iletisimBilgileri.eposta")}</span>
              {eposta.metin}
            </Baglanti>
          </li>
        )}
      </ul>
    </section>
  );
}
