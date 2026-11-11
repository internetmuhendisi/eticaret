// Panelde karşılığı olmayan adres (kart 0120, karar 0104): vitrinin yakalayıcısına ((vitrin)/[...adres]) düşmesin
// diye burada bulunamadı verilir. Panelin düzeni girişi ister; girişliye Next.js'in kendi 404'ü döner.
import { notFound } from "next/navigation";

export default function PaneldeOlmayanAdres(): never {
  notFound();
}
