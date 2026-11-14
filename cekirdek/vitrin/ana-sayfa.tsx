// Vitrinin ana sayfasının içeriği (kartlar 0009, 0041, 0071, 0110). Ad mağaza sahibinin ayarıdır; sayfa
// (app/(vitrin)/page.tsx) okuyup verir, bu bileşen yalnız çizer.
//
// Kart 0110: düzenin ana sayfa alanında bölüm varsa sayfa onları sırayla çizer; sayfanın başlığı (h1) mağaza
// adıdır ve yalnız ekran okuyucuda görünür, bölümlerin başlıkları h2'dir. Bölüm yoksa ya da düzen
// okunamadıysa bugünkü sade sayfa (ad ve "Yakında açılıyoruz") görünür. Bölümler arası boşluk Canlı Çarşı
// taslağındaki gibidir: masaüstünde 48, telefonda 40 piksel.
import { metin } from "../metinler/site-metni";
import type { VitrinBaglami } from "./bolum-kutuphanesi/baglam";
import type { BolumOrnegi } from "./bolum-kutuphanesi/duzen";
import type { BolumGorunumleri } from "./bolum-kutuphanesi/gorunumler";
import { DuzenAlaniCizimi } from "./duzen-alani";
import { HesapAlani } from "./hesap-alani";
import { stil } from "./stil";

export type AnaSayfaDuzeni = {
  bolumler: readonly BolumOrnegi[];
  gorunumler: BolumGorunumleri;
  baglam: VitrinBaglami;
};

export function AnaSayfa({
  magazaAdi,
  yakindaYazisi,
  duzen,
}: {
  magazaAdi: string;
  yakindaYazisi: boolean;
  duzen?: AnaSayfaDuzeni | undefined;
}) {
  if (duzen !== undefined && duzen.bolumler.length > 0) {
    return (
      <main className="flex flex-col gap-bolum pb-bolum masaustu:gap-bolum-masaustu masaustu:pb-bolum-masaustu">
        <h1 className="sr-only">{magazaAdi}</h1>
        <DuzenAlaniCizimi {...duzen} />
      </main>
    );
  }
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
