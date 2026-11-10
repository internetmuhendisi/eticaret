// Keskin Çizgi (karar 0075'in C yönü): beyaz zemin, koyu lacivert afiş, elektrik mavisi düğme, Archivo
// başlık ve köşesiz kutular. Renkler planlar/tasarim-yonu/secenekler.html taslağındandır; taslakta olmayan
// durum renkleri (alan kenarı, odak, uyarı, başarı, hata) bu temanın zeminlerinde okunur olacak biçimde
// seçildi. Taslaktan bilerek ayrılan yerler (büyük harfli başlık, sarı rozet) bugünkü tasarım değerleriyle
// yazılamaz, kart 0124'tedir.
import { keskinCizgiDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaTanimiGirdisi } from "../sema.ts";
import { hazirTemaBaslangicDuzeni } from "./baslangic-duzeni.ts";
import { hazirTemaSecenekleri } from "./magaza-secenekleri.ts";

export const keskinCizgi: TemaTanimiGirdisi = {
  degerler: keskinCizgiDegerleri,
  magazaSecenekleri: hazirTemaSecenekleri,
  gorunumler: { "urun-karti": "dikey" },
  baslangicDuzeni: hazirTemaBaslangicDuzeni,
};
