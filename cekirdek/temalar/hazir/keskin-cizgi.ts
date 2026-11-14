// Keskin Çizgi (karar 0075'in C yönü): beyaz zemin, koyu lacivert afiş, elektrik mavisi düğme, Archivo
// başlık ve köşesiz kutular. Renkler planlar/tasarim-yonu/secenekler.html taslağındandır; taslakta olmayan
// durum renkleri (alan kenarı, odak, uyarı, başarı, hata) bu temanın zeminlerinde okunur olacak biçimde
// seçildi. Büyük harfli başlık, sarı rozet ve afiş düğmesi, ana renkte bağlantılar ve bölüm aralığı kart
// 0124'te tema değeri olarak yazıldı; taslaktan ayrılmaya devam eden yerler karar 0126'dadır.
import { keskinCizgiDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaTanimiGirdisi } from "../sema.ts";
import { hazirTemaBaslangicDuzeni } from "./baslangic-duzeni.ts";
import { hazirTemaSecenekleri } from "./magaza-secenekleri.ts";

export const keskinCizgi: TemaTanimiGirdisi = {
  degerler: keskinCizgiDegerleri,
  magazaSecenekleri: hazirTemaSecenekleri,
  gorunumler: { "urun-karti": "dikey", "urun-filtresi": "solda" },
  baslangicDuzeni: hazirTemaBaslangicDuzeni,
};
