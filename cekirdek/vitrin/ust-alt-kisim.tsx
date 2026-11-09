// Vitrinin üst ve alt kısmı (kart 0108, karar 0083): düzenin "ust-kisim" ve "alt-kisim" alanlarındaki bölümler,
// sırasıyla. Vitrin sayfalarının çerçevesi (app/(vitrin)/layout.tsx) ve bileşen kataloğu aynı bileşenle çizer.
// Bölüm yoksa kısım hiç çizilmez. Alt kısmın zemini ve yazısı temanın alt kısım renkleridir.
//
// Alt kısım Canlı Çarşı taslağının yerleşimindedir: sütun bölümleri bir ızgarada (telefonda 2, masaüstünde 5
// sütun; bağlantı sütunları kendi sütun sayısı kadar yer alır), telif ve ödeme işaretleri çizgiyle ayrılan en
// alt satırda (tarifteki altKisimdaYeri). Her grup kendi içinde düzendeki sırayı korur.
import type { VitrinBaglami } from "./bolum-kutuphanesi/baglam";
import type { BolumOrnegi } from "./bolum-kutuphanesi/duzen";
import type { BolumGorunumleri } from "./bolum-kutuphanesi/gorunumler";
import { bolumKutuphanesi } from "./bolum-kutuphanesi/kutuphane";
import { DuzenAlaniCizimi } from "./duzen-alani";

type Ozellikler = {
  bolumler: readonly BolumOrnegi[];
  gorunumler: BolumGorunumleri;
  baglam: VitrinBaglami;
};

export function UstKisim({ bolumler, gorunumler, baglam }: Ozellikler) {
  if (bolumler.length === 0) return null;
  return (
    <header className="relative z-ust-kisim">
      <DuzenAlaniCizimi bolumler={bolumler} gorunumler={gorunumler} baglam={baglam} />
    </header>
  );
}

const altSatirdaMi = (bolum: BolumOrnegi) =>
  Object.hasOwn(bolumKutuphanesi, bolum.tur) &&
  bolumKutuphanesi[bolum.tur]?.altKisimdaYeri === "alt-satir";

export function AltKisim({ bolumler, gorunumler, baglam }: Ozellikler) {
  if (bolumler.length === 0) return null;
  const sutunlar = bolumler.filter((bolum) => !altSatirdaMi(bolum));
  const altSatir = bolumler.filter(altSatirdaMi);
  return (
    <footer className="mt-auto bg-alt-kisim text-alt-kisim-ustu odak-yazi-renginde">
      <div className="mx-auto flex max-w-icerik flex-col gap-8 px-4 pt-11 pb-6 tablet:px-6">
        {sutunlar.length === 0 ? null : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 masaustu:grid-cols-5">
            <DuzenAlaniCizimi bolumler={sutunlar} gorunumler={gorunumler} baglam={baglam} />
          </div>
        )}
        {altSatir.length === 0 ? null : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-alt-kisim-soluk pt-5 text-kucuk text-alt-kisim-soluk">
            <DuzenAlaniCizimi bolumler={altSatir} gorunumler={gorunumler} baglam={baglam} />
          </div>
        )}
      </div>
    </footer>
  );
}
