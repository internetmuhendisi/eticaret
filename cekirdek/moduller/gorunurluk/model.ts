// Eski adresler (kart 0135, karar 0103). Kategori, marka, etiket ya da ürünün adres adı değişince ya da kayıt
// silinince ad burada saklanır (kayıt adı bırakmış sayılır); vitrin eski adrese geleni kaydın bugünkü adresine
// kalıcı olarak yönlendirir.
//
// Satırları yalnız veritabanındaki tetikleyici yazar (eski_adresi_sakla, değişiklikler 0031 ve 0032): adres adı
// hangi yoldan değişirse değişsin eski ad kaybolmaz. Servisler bu tabloya yazmaz.
//
// - Bir eski ad, bir türde tek kayda yönlenir. Ad sonradan başka bir kaydın eski adı olursa satır o kayda
//   geçer (en son bırakan kazanır).
// - Eski ad bugün yaşayan bir kaydın adıysa yaşayan kayıt kazanır: çözücü önce yaşayan kayıtlara bakar.
// - Çözücü silinmiş kayda yönlendirmez: eski adres "bulunamadı"ya düşer. Silme adı en son bırakan olarak
//   silinen kaydı yazar; böylece silinen kaydın adresi adın daha eski sahibine de yönlenmez.
// - Yönlendirme her zaman kaydın bugünkü adına gider, zincir kurulmaz.
//
// Aranan alanlar:
// - (kayit_turu, adres_adi): vitrinde bulunamayan adres adı burada aranır. Tekil indeks aramayı da karşılar.
// Kayıt başına eski adlar okunmaz; kaydın kimliğine göre indeks yoktur.
import { sql } from "drizzle-orm";
import { check, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const eskiAdresler = pgTable(
  "eski_adresler",
  {
    kimlik: kimlik(),
    kayit_turu: text().notNull(),
    // Adres adını bırakan kayıt. Tür birden çok tabloya baktığı için yabancı anahtar yoktur.
    kayit_kimligi: uuid().notNull(),
    adres_adi: text().notNull(),
    // Adın en son bırakıldığı an.
    olusturma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("eski_adresler_adres").on(tablo.kayit_turu, tablo.adres_adi),
    // Liste cekirdek/kayitlar/adres.ts ile aynıdır (testler/eski-adres.test.ts ölçer).
    check(
      "eski_adresler_tur",
      sql`${tablo.kayit_turu} in ('kategori', 'marka', 'etiket', 'urun', 'blog-yazisi', 'sayfa')`,
    ),
  ],
);
