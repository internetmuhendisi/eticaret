// Vitrinin ana sayfasının içeriği (kartlar 0009, 0041, 0071). Ad mağaza sahibinin ayarıdır; sayfa
// (app/page.tsx) okuyup verir, bu bileşen yalnız çizer.
import { metin } from "../metinler/site-metni";
import { HesapAlani } from "./hesap-alani";
import { stil } from "./stil";

export function AnaSayfa({
  magazaAdi,
  yakindaYazisi,
}: {
  magazaAdi: string;
  yakindaYazisi: boolean;
}) {
  return (
    <>
      <HesapAlani />
      <main className={stil.icerik}>
        <h1>{magazaAdi}</h1>
        {yakindaYazisi ? <p>{metin("vitrin.anasayfa.yakindaAciliyoruz")}</p> : null}
      </main>
    </>
  );
}
