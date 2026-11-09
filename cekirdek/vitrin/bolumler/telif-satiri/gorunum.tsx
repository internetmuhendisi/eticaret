// Telif satırının görünüşü (kart 0108): "© yıl mağaza adı", isteğe bağlı ek metin ve altyapı sahibinin ayarı
// açıksa altyapı adı. Yıl ve ad bağlamdan gelir.
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { altKisimSiniflari as s } from "../ortak/alt-kisim";
import { metinMi } from "../ortak/deger";

export function TelifSatiriGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { ekMetin?: unknown };
  return (
    <div
      className={sinif(
        s.kutu,
        "gap-1 border-t border-alt-kisim-soluk py-4 text-kucuk tablet:flex-row",
        gorunum === "iki-yana"
          ? "tablet:justify-between"
          : "items-center text-center tablet:justify-center tablet:gap-4",
      )}
    >
      <p>
        {metin("vitrin.bolum.telifSatiri.isaret")} {baglam.yil} {baglam.magazaAdi}
        {metinMi(degerler.ekMetin) ? ` ${degerler.ekMetin}` : null}
      </p>
      {baglam.altyapiAdi === undefined ? null : (
        <p className={s.soluk}>
          {metin("vitrin.bolum.telifSatiri.altyapi")} {baglam.altyapiAdi}
        </p>
      )}
    </div>
  );
}
