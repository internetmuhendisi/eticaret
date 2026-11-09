// Menüler ve menü öğeleri (kart 0107, karar 0082). Kayıt: cekirdek/kayitlar/menu.ts.
//
// Menü bir kodla bulunur (ana-menu, alt-bilgi): üst ve alt kısım bölümleri menüye kodla başvurur, başlangıç
// düzeni de kimlik bilmeden kod yazabilir. Kod menü açılırken verilir ve değişmez. Kategori menüsü
// (kategori-agaci) öğe saklamaz.
//
// Öğe tek bir hedefe bağlanır: kayıtlı hedefin kimliği kendi alanındadır (gerçek bağla), dış adres adres
// alanındadır, başlık bağlantısızdır. Bağlı kayıt silinme işaretiyle silinince öğe yerinde kalır: vitrinde
// görünmez, panelde işaretlenir. Öğe ve menü de silinme işaretiyle silinir.
//
// Derinlik (kayıttaki menuSinirlari.derinlik), üstün aynı menüde ve silinmemiş olması, döngü ve kategori
// menüsüne öğe yazılmaması servisle aynı kilidi alan tetikleyiciyle (menu_ogeleri_agac, değişiklik 0026)
// veritabanında da denetlenir. Hedefin türüyle dolu alanların uyumu denetimle (menu_ogeleri_hedef)
// korunur.
//
// Aranan alanlar:
// - menuler.kod: vitrin menüyü bununla okur. Silinmemişler arasında tekil (kısmi tekil indeks), indeks
//   aramayı da karşılar.
// - menu_ogeleri.menu_kimligi: bir menünün öğeleri tek sorguyla okunur (indeks). Bir hedefe bağlı öğeler
//   aranmaz: silinen hedef öğeyi değiştirmez, okurken birleştirilir.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { kategoriler } from "../kategori/model.ts";
import { markalar } from "../marka/model.ts";
import { urunler } from "../urun/model.ts";

export const menuler = pgTable(
  "menuler",
  {
    kimlik: kimlik(),
    kod: text().notNull(),
    ad: text().notNull(),
    // Kayıttaki menuTurleri.
    tur: text().notNull(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("menuler_kod").on(tablo.kod).where(sql`${tablo.silinme_zamani} is null`),
    check("menuler_tur", sql`${tablo.tur} in ('elle', 'kategori-agaci')`),
  ],
);

export const menuOgeleri = pgTable(
  "menu_ogeleri",
  {
    kimlik: kimlik(),
    menu_kimligi: uuid()
      .notNull()
      .references(() => menuler.kimlik, { onDelete: "restrict" }),
    // Boşsa öğe en üst düzeydedir.
    ust_kimligi: uuid().references((): AnyPgColumn => menuOgeleri.kimlik, {
      onDelete: "restrict",
    }),
    // Kardeşler arasında sıra; küçük önce.
    sira: integer().notNull().default(0),
    // Boşsa vitrinde bağlı kaydın adı görünür (ad değişince menü de değişir). Adres ve başlıkta zorunlu.
    metin: text(),
    // Kayıttaki menuHedefTurleri.
    hedef_turu: text().notNull(),
    kategori_kimligi: uuid().references(() => kategoriler.kimlik, { onDelete: "restrict" }),
    marka_kimligi: uuid().references(() => markalar.kimlik, { onDelete: "restrict" }),
    urun_kimligi: uuid().references(() => urunler.kimlik, { onDelete: "restrict" }),
    adres: text(),
    yeni_sekme: boolean().notNull().default(false),
    olusturma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    index("menu_ogeleri_menu").on(tablo.menu_kimligi),
    check("menu_ogeleri_kendi_ustu", sql`${tablo.ust_kimligi} <> ${tablo.kimlik}`),
    check("menu_ogeleri_sira", sql`${tablo.sira} >= 0`),
    // Her hedef türü yalnız kendi alanını doldurur. Sayfa hedefi düz sayfalarla açılır: bugün hiçbir satır
    // sayfaya bağlanamaz. Adres ve başlığın metni zorunludur. Yeni sekme yalnız adreste.
    check(
      "menu_ogeleri_hedef",
      sql`${tablo.hedef_turu} in ('kategori', 'marka', 'urun', 'adres', 'baslik')
        and (${tablo.hedef_turu} = 'kategori') = (${tablo.kategori_kimligi} is not null)
        and (${tablo.hedef_turu} = 'marka') = (${tablo.marka_kimligi} is not null)
        and (${tablo.hedef_turu} = 'urun') = (${tablo.urun_kimligi} is not null)
        and (${tablo.hedef_turu} = 'adres') = (${tablo.adres} is not null)
        and (${tablo.hedef_turu} not in ('adres', 'baslik') or ${tablo.metin} is not null)
        and (${tablo.hedef_turu} = 'adres' or not ${tablo.yeni_sekme})`,
    ),
  ],
);
