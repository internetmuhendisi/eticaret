// Mağaza yöneticilerinin hesapları, oturumları ve rolleri (kartlar 0025, 0026). Hesap ve oturum
// tablolarının biçimi ve aranan alanları ortak tanımdadır: cekirdek/moduller/oturum/model.ts.
//
// Aranan alanlar:
// - roller.kod: rol verilirken, benzersiz indeksli.
// - roller.tam_yetki: tam yetkili sahipler sayılırken. Tablo birkaç satırdır, indeks gerekmez.
// - rol_izinleri: rol ve izinle, birincil anahtar indeksiyle.
// - yonetici_rolleri.yonetici_kimligi: her istekte izin kontrolünde, birincil anahtarın başı.
// - yonetici_rolleri.rol_kimligi: bir rolü taşıyanlar bulunurken, indeksli.
// - yonetici_iki_asama.yonetici_kimligi: her kod denemesinde, birincil anahtar.
// - yonetici_yedek_kodlari.yonetici_kimligi ve kod_ozeti: yedek kod denenirken, benzersiz indeksli.
// - yonetici_giris_adimlari.anahtar_ozeti: ara adım okunurken, benzersiz indeksli.
// - yonetici_giris_adimlari.yonetici_kimligi: süresi dolanlar silinirken, indeksli.
// - yonetici_davetleri.anahtar_ozeti: davet bağlantısı açılırken ve kabul edilirken, benzersiz indeksli.
// - yonetici_davetleri.eposta: aynı e-postanın bekleyen daveti aranırken (davet gönderilirken), indeksli.
// - yonetici_davetleri.bitis: bekleyenler listelenirken ve saklama süresi dolanlar silinirken, indeksli.
// - yonetici_davetleri.davet_eden: daveti gönderenin hesabı kapanınca bekleyenleri düşerken, indeksli.
// - yonetici_davet_rolleri: davetle, birincil anahtar indeksiyle.
import {
  bigint,
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kimlik, zaman } from "../../veritabani/turler.ts";
import { hesapTablosu, oturumTablosu, sifreSifirlamaTablosu } from "../oturum/model.ts";

// ad: davetle gelen yöneticinin kendi yazdığı adı (kart 0275); sunucudan açılan hesapta boştur.
export const yoneticiler = hesapTablosu("yoneticiler", { ad: text() });
export const yoneticiOturumlari = oturumTablosu("yonetici_oturumlari", () => yoneticiler.kimlik);
export const yoneticiSifreSifirlamalari = sifreSifirlamaTablosu(
  "yonetici_sifre_sifirlamalari",
  () => yoneticiler.kimlik,
);

export const roller = pgTable(
  "roller",
  {
    kimlik: kimlik(),
    kod: text().notNull(),
    // Bütün yönetici izinlerini verir; yeni izin için rol_izinleri'ne satır gerekmez.
    tam_yetki: boolean().notNull().default(false),
    olusturulma_zamani: zaman().notNull().defaultNow(),
    guncellenme_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [uniqueIndex("roller_kod_benzersiz").on(tablo.kod)],
);

export const rolIzinleri = pgTable(
  "rol_izinleri",
  {
    rol_kimligi: uuid()
      .notNull()
      .references(() => roller.kimlik),
    // cekirdek/kayitlar/izinler.ts dosyasındaki izin adı.
    izin: text().notNull(),
  },
  (tablo) => [primaryKey({ columns: [tablo.rol_kimligi, tablo.izin] })],
);

export const yoneticiRolleri = pgTable(
  "yonetici_rolleri",
  {
    yonetici_kimligi: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
    rol_kimligi: uuid()
      .notNull()
      .references(() => roller.kimlik),
    olusturulma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.yonetici_kimligi, tablo.rol_kimligi] }),
    index("yonetici_rolleri_rol").on(tablo.rol_kimligi),
  ],
);

// Kurulumu bitmiş iki aşamalı giriş (kart 0028, karar 0044): satır varsa kurulum bitmiştir. Gizli şifreli
// durur (moduller/oturum/iki-asama.ts). son_kod_adimi aynı kodun ikinci kez geçmesini önler.
export const yoneticiIkiAsama = pgTable("yonetici_iki_asama", {
  yonetici_kimligi: uuid()
    .primaryKey()
    .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
  sifreli_gizli: text().notNull(),
  son_kod_adimi: bigint({ mode: "number" }).notNull(),
  onay_zamani: zaman().notNull(),
  guncellenme_zamani: zaman().notNull().defaultNow(),
});

// Tek kullanımlık yedek kodlar. Yalnız özetleri durur; kullanılan satır silinmez, işaretlenir.
export const yoneticiYedekKodlari = pgTable(
  "yonetici_yedek_kodlari",
  {
    kimlik: kimlik(),
    yonetici_kimligi: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
    kod_ozeti: text().notNull(),
    kullanilma_zamani: zaman(),
    olusturulma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("yonetici_yedek_kodlari_benzersiz").on(tablo.yonetici_kimligi, tablo.kod_ozeti),
  ],
);

// Şifre doğrulandıktan sonraki ara adım. Oturum değildir: panele ve yönetici uçlarına girmez.
// bekleyen_gizli kurulum ekranının gizlisidir ve bu adıma aittir: kurulum bitmeden başka bir şifre
// girişinden görülemez, kurulum bitince hesabın bütün adımlarından silinir.
export const yoneticiGirisAdimlari = pgTable(
  "yonetici_giris_adimlari",
  {
    kimlik: kimlik(),
    yonetici_kimligi: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik, { onDelete: "cascade" }),
    anahtar_ozeti: text().notNull(),
    bitis: zaman().notNull(),
    bekleyen_gizli: text(),
    olusturulma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("yonetici_giris_adimlari_benzersiz").on(tablo.anahtar_ozeti),
    index("yonetici_giris_adimlari_hesap").on(tablo.yonetici_kimligi),
  ],
);

// Ekibe davet (kart 0275, karar 0179). Bağlantının anahtarı tutulmaz, yalnız özeti. Davet bekliyorsa kullanılmamış,
// geri alınmamış ve süresi dolmamıştır. Kabul edilince açılan hesap yonetici_kimligi'ndedir. E-posta kişisel veridir:
// satır, davetin süresi dolduktan sonra saklama süresi geçince silinir (davetTemizligi).
export const yoneticiDavetleri = pgTable(
  "yonetici_davetleri",
  {
    kimlik: kimlik(),
    // Küçük harfe çevrilmiş e-posta (oturum/semalar.ts).
    eposta: text().notNull(),
    anahtar_ozeti: text().notNull(),
    davet_eden: uuid()
      .notNull()
      .references(() => yoneticiler.kimlik),
    bitis: zaman().notNull(),
    kullanilma_zamani: zaman(),
    geri_alinma_zamani: zaman(),
    yonetici_kimligi: uuid().references(() => yoneticiler.kimlik),
    olusturulma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("yonetici_davetleri_anahtar_benzersiz").on(tablo.anahtar_ozeti),
    index("yonetici_davetleri_eposta").on(tablo.eposta),
    index("yonetici_davetleri_bitis").on(tablo.bitis),
    index("yonetici_davetleri_davet_eden").on(tablo.davet_eden),
  ],
);

// Davetin verdiği roller; kabul edilince yöneticinin rolleri olur.
export const yoneticiDavetRolleri = pgTable(
  "yonetici_davet_rolleri",
  {
    davet_kimligi: uuid()
      .notNull()
      .references(() => yoneticiDavetleri.kimlik, { onDelete: "cascade" }),
    rol_kimligi: uuid()
      .notNull()
      .references(() => roller.kimlik),
  },
  (tablo) => [primaryKey({ columns: [tablo.davet_kimligi, tablo.rol_kimligi] })],
);
