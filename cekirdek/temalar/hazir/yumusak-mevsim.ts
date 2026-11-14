// Yumuşak Mevsim (karar 0075'in B yönü): kırık beyaz zemin, koyu yeşil vurgu, Manrope, yumuşak köşeler ve
// gölgeli kart. Renkler planlar/tasarim-yonu/secenekler.html taslağındandır; taslakta olmayan durum renkleri
// (alan kenarı, odak, uyarı, başarı, hata) bu temanın zeminlerinde okunur olacak biçimde seçildi.
// Kenarsız kart, sırada 4 ürün, geniş kart içi ve bölüm aralığı, ana renkte bağlantılar ve afiş düğmesi kart
// 0124'te tema değeri olarak yazıldı; taslaktan ayrılmaya devam eden yerler karar 0126'dadır.
import { yumusakMevsimDegerleri } from "../../../bilesenler/tasarim-degerleri/degerler.ts";
import type { TemaTanimiGirdisi } from "../sema.ts";
import { hazirTemaBaslangicDuzeni } from "./baslangic-duzeni.ts";
import { hazirTemaSecenekleri } from "./magaza-secenekleri.ts";

export const yumusakMevsim: TemaTanimiGirdisi = {
  degerler: yumusakMevsimDegerleri,
  magazaSecenekleri: hazirTemaSecenekleri,
  gorunumler: { "urun-karti": "dikey", "urun-filtresi": "solda" },
  baslangicDuzeni: hazirTemaBaslangicDuzeni,
};
