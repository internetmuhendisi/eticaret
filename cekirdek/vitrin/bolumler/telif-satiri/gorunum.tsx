// Telif satırının görünüşü (kart 0108; Canlı Çarşı taslağı): "© yıl mağaza adı", isteğe bağlı ek metin ve altyapı
// sahibinin ayarı açıksa altyapı adı. Yıl ve ad bağlamdan gelir. Alt kısmın en alt satırının solundadır; yazı boyu
// ve rengi o satırdandır.
import { metin } from "../../../metinler/site-metni";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { metinMi } from "../ortak/deger";

export function TelifSatiriGorunumu({ degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { ekMetin?: unknown };
  return (
    <p>
      {metin("vitrin.bolum.telifSatiri.isaret")} {baglam.yil} {baglam.magazaAdi}
      {metinMi(degerler.ekMetin) ? ` ${degerler.ekMetin}` : null}
      {baglam.altyapiAdi === undefined
        ? null
        : ` · ${metin("vitrin.bolum.telifSatiri.altyapi")} ${baglam.altyapiAdi}`}
    </p>
  );
}
