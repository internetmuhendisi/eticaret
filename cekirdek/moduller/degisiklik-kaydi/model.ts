// Değişiklik kaydı (kart 0029, karar 0045): kim, ne zaman, hangi kaydı, eskisinden yenisine. Satırlar
// sonradan değiştirilemez: güncelleme, silme ve toplu silme veritabanındaki tetikleyiciyle reddedilir
// (değişiklik dosyası 0005). Kayıt hesaplara veritabanı bağıyla bağlı değildir: hesap silinse de kalır.
//
// Aranan alanlar:
// - kayit_turu ve kayit_kimligi: bir kaydın geçmişi bulunurken, indeksli.
// - kim_kimligi: bir hesabın yaptıkları bulunurken, indeksli.
// - zaman: dönem aranırken, indeksli.
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";

export const degisiklikKayitlari = pgTable(
  "degisiklik_kayitlari",
  {
    kimlik: kimlik(),
    zaman: zaman().notNull().defaultNow(),
    // Hesapsa türü ve kimliği, komutsa "sistem" ve adı.
    kim_turu: text().notNull(),
    kim_kimligi: uuid(),
    kim_adi: text(),
    // cekirdek/kayitlar/degisiklik-islemleri.ts dosyasındaki işlem adı.
    islem: text().notNull(),
    kayit_turu: text().notNull(),
    kayit_kimligi: uuid().notNull(),
    eski_deger: jsonb(),
    yeni_deger: jsonb(),
  },
  (tablo) => [
    index("degisiklik_kayitlari_kayit").on(tablo.kayit_turu, tablo.kayit_kimligi),
    index("degisiklik_kayitlari_kim").on(tablo.kim_kimligi),
    index("degisiklik_kayitlari_zaman").on(tablo.zaman),
    // "Kim" boş kalamaz: hesap kimliği ya da komut adı olmalı.
    check(
      "degisiklik_kayitlari_kim_dolu",
      sql`(${tablo.kim_turu} = 'sistem' and length(${tablo.kim_adi}) > 0 and ${tablo.kim_kimligi} is null) or (${tablo.kim_turu} in ('yonetici', 'musteri', 'sahip') and ${tablo.kim_kimligi} is not null and ${tablo.kim_adi} is null)`,
    ),
  ],
);
