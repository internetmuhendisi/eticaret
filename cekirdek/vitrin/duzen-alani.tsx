// Bir düzen alanının (üst kısım, ana sayfa, alt kısım) çizimi (kart 0106, karar 0081). Bölümler düzen
// servisinin süzdüğü sırayla gelir (cizilecekBolumler): gizli, türü bilinmeyen ve işlevi olmayan bölüm buraya
// gelmez. Her bölüm kendi hata sınırının içinde çizilir: bozulan bölüm yalnız kendi yerinde uyarı gösterir,
// sayfanın geri kalanı çalışır (.claude/rules/hata-izleme.md).
import { Bolum } from "../izleme/bolum";
import type { BolumOrnegi } from "./bolum-kutuphanesi/duzen";
import type { BolumGorunumleri } from "./bolum-kutuphanesi/gorunumler";

export function DuzenAlaniCizimi({
  bolumler,
  gorunumler,
}: {
  bolumler: readonly BolumOrnegi[];
  gorunumler: BolumGorunumleri;
}) {
  return bolumler.map((bolum) => {
    const Gorunum = gorunumler[bolum.tur];
    if (Gorunum === undefined) return null;
    return (
      <Bolum key={bolum.kimlik}>
        <Gorunum gorunum={bolum.gorunum} degerler={bolum.degerler} />
      </Bolum>
    );
  });
}
