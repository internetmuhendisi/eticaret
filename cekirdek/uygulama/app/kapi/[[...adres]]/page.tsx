// Kapıda karşılığı olmayan adres ve /kapi'nin kendisi (kart 0120, karar 0104): vitrinin yakalayıcısına
// ((vitrin)/[...adres]) düşmesin diye burada bulunamadı verilir. Vitrin çerçevesi çizilmez, Next.js'in kendi 404'ü
// döner.
import { notFound } from "next/navigation";

export default function KapidaOlmayanAdres(): never {
  notFound();
}
