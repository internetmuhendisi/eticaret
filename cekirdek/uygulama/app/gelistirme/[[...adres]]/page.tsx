// Geliştirme klasöründe karşılığı olmayan adres ve /gelistirme'nin kendisi (kart 0120, karar 0104): vitrinin
// yakalayıcısına ((vitrin)/[...adres]) düşmesin diye burada bulunamadı verilir. Öteki geliştirme sayfaları gibi
// katalog kapısını sayfada ve sayfa bilgisinde çağırır (kart 0104).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { katalogKapisi } from "../../../../katalog/kapi";

export const generateMetadata = (): Metadata => {
  katalogKapisi();
  return { robots: { index: false, follow: false } };
};

export default function GelistirmedeOlmayanAdres(): never {
  katalogKapisi();
  notFound();
}
