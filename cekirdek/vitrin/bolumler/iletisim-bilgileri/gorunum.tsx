// İletişim bilgilerinin görünüşü (kart 0108). Telefon, e-posta ve adres mağaza ayarlarından bağlamla gelir;
// boş olan gösterilmez, hiçbiri yoksa bölüm çizilmez.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { altKisimSiniflari as s } from "../ortak/alt-kisim";
import { metinMi } from "../ortak/deger";

export function IletisimBilgileriGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { baslik?: unknown };
  const { telefon, eposta, adres } = baglam.iletisim;
  if (telefon === undefined && eposta === undefined && adres === undefined) return null;
  const baslik = metinMi(degerler.baslik)
    ? degerler.baslik
    : metin("vitrin.bolum.iletisimBilgileri.baslik");
  return (
    <section aria-label={baslik} className={s.kutu}>
      <h2 className={s.baslik}>{baslik}</h2>
      <ul className={sinif("flex gap-x-6", gorunum === "yatay" ? "flex-wrap" : "flex-col")}>
        {telefon === undefined ? null : (
          <li>
            <Baglanti href={telefon.adres} className={sinif(s.baglanti, "gap-2 font-normal")}>
              <Ikon ad="telefon" />
              <span className="sr-only">{metin("vitrin.bolum.iletisimBilgileri.telefon")}</span>
              {telefon.metin}
            </Baglanti>
          </li>
        )}
        {eposta === undefined ? null : (
          <li>
            <Baglanti
              href={eposta.adres}
              className={sinif(s.baglanti, "gap-2 font-normal wrap-anywhere")}
            >
              <Ikon ad="eposta" />
              <span className="sr-only">{metin("vitrin.bolum.iletisimBilgileri.eposta")}</span>
              {eposta.metin}
            </Baglanti>
          </li>
        )}
        {adres === undefined ? null : (
          <li className="flex gap-2 py-3">
            <Ikon ad="konum" className="mt-1" />
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
      </ul>
    </section>
  );
}
