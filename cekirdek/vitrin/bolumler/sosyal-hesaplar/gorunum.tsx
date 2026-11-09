// Sosyal hesapların görünüşü (kart 0108). Hesaplar mağaza ayarından gelir, adresi kayıttan kurulmuştur; yeni
// sekmede açılır. Hesap yoksa bölüm çizilmez.
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import type { SosyalSite } from "../../../kayitlar/sosyal-siteler";
import type { MetinAnahtari } from "../../../metinler/metin";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { altKisimSiniflari as s } from "../ortak/alt-kisim";
import { metinMi } from "../ortak/deger";
import { yeniSekmeOzellikleri } from "../ortak/menu";

const siteAdlari = {
  instagram: "vitrin.bolum.sosyalHesaplar.site.instagram",
  facebook: "vitrin.bolum.sosyalHesaplar.site.facebook",
  x: "vitrin.bolum.sosyalHesaplar.site.x",
  youtube: "vitrin.bolum.sosyalHesaplar.site.youtube",
  tiktok: "vitrin.bolum.sosyalHesaplar.site.tiktok",
  pinterest: "vitrin.bolum.sosyalHesaplar.site.pinterest",
  linkedin: "vitrin.bolum.sosyalHesaplar.site.linkedin",
} as const satisfies Record<SosyalSite, MetinAnahtari>;

export function SosyalHesaplarGorunumu({
  gorunum,
  degerler: ham,
  baglam,
}: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { baslik?: unknown };
  if (baglam.sosyalHesaplar.length === 0) return null;
  const yatay = gorunum === "yatay";
  const baslik = metinMi(degerler.baslik)
    ? degerler.baslik
    : metin("vitrin.bolum.sosyalHesaplar.baslik");
  return (
    <section
      aria-label={baslik}
      className={sinif(s.sutun, yatay && "col-span-2 masaustu:col-span-5")}
    >
      <h2 className={s.baslik}>{baslik}</h2>
      <ul className={sinif("flex", yatay ? "flex-wrap gap-x-6" : "flex-col")}>
        {baglam.sosyalHesaplar.map((hesap) => (
          <li key={hesap.adres}>
            <Baglanti
              href={hesap.adres}
              className={sinif(s.baglanti, "gap-2")}
              {...yeniSekmeOzellikleri(true)}
            >
              {yatay ? <Ikon ad="dis-baglanti" /> : null}
              {metin(siteAdlari[hesap.site])}
              <span className="sr-only">{metin("vitrin.bolum.sosyalHesaplar.yeniSekme")}</span>
            </Baglanti>
          </li>
        ))}
      </ul>
    </section>
  );
}
