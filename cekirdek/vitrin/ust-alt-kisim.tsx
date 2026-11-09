// Vitrinin üst ve alt kısmı (kart 0108, karar 0083): düzenin "ust-kisim" ve "alt-kisim" alanlarındaki bölümler,
// sırasıyla. Vitrin sayfalarının çerçevesi (app/(vitrin)/layout.tsx) ve bileşen kataloğu aynı bileşenle çizer.
// Bölüm yoksa kısım hiç çizilmez. Alt kısmın zemini ve yazısı temanın alt kısım renkleridir.
import type { VitrinBaglami } from "./bolum-kutuphanesi/baglam";
import type { BolumOrnegi } from "./bolum-kutuphanesi/duzen";
import type { BolumGorunumleri } from "./bolum-kutuphanesi/gorunumler";
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

export function AltKisim({ bolumler, gorunumler, baglam }: Ozellikler) {
  if (bolumler.length === 0) return null;
  return (
    <footer className="mt-auto bg-alt-kisim text-alt-kisim-ustu odak-yazi-renginde">
      <DuzenAlaniCizimi bolumler={bolumler} gorunumler={gorunumler} baglam={baglam} />
    </footer>
  );
}
