// Ödeme oturumunun ayırmalarının birlikte bırakılması (kart 0312): stok ayırması ve kuponun kullanım ayırması.
// Ödeme başarısız olunca, başlatılamayınca, müşteri yeniden onaylayınca (dışarıda başlamış oturumda) ve kartla ödemede
// sipariş kurulamayınca yalnız bu işlev çağrılır: biri unutulursa kuponun hakkı süresi dolana kadar ayrılı kalır.
// Sipariş kurulunca stok ayırması siparişe geçer (siparisiKur), kuponunki siparişe bağlanır; bu işlev çağrılmaz.
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kuponAyirmasiniBirak } from "../kampanya/servis.ts";
import { stokServisi } from "../stok/servis.ts";

const stok = stokServisi();

export const oturumunAyirmalariniBirak = async (
  islem: VeritabaniIslemi,
  oturum: string,
): Promise<void> => {
  await stok.ayirmayiBirak(islem, oturum);
  await kuponAyirmasiniBirak(islem, oturum);
};
