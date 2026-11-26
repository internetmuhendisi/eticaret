// Kuponlar ve kullanımları (kart 0312, karar 0187).
//
// - Kod harf, rakam ve tiredir; silinmemiş kuponlar arasında harf ayrımsız tekildir (ad anahtarı). Müşterinin yazdığı
//   kodun harf büyüklüğünün fark edip etmediği altyapı sahibinin ayarıdır (kuponKoduHarfDuyarli).
// - Kullanılmış kuponun kodu, türü, değeri ve kapsamı değişmez (karar 0185): servis reddeder, veritabanındaki
//   tetikleyici (kupon_degismezlik) de reddeder. Süresi, sınırları, en az tutarı ve açık-kapalı durumu değişir.
// - Kullanım, ödeme oturumu açılınca stok ayırmasıyla aynı işlemde ve aynı süreyle ayrılır; sipariş kurulunca siparişe
//   bağlanır. Sayılan kullanım: serbest bırakılmamış ve (siparişe bağlı ya da süresi dolmamış) satır. İptal ve tam
//   iade kullanımı serbest bırakır (karar 0185); kısmi iade bırakmaz.
// - Kişi başı sınır aynı hesabın ya da aynı e-postanın kullanımlarıyla sayılır: üyede hesap, üye olmayanda e-posta
//   (taslak, karar 0185); üyenin üye olmadan aynı e-postayla kullandığı da sayılır.
//
// Aranan alanlar: kuponun kod anahtarı (tekil indeks), kuponun kullanımları (kupon ve kişi), oturumun ve siparişin
// kullanımı.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import { kimlik, tutar, zaman } from "../../veritabani/turler.ts";
import { kategoriler } from "../kategori/model.ts";
import { musteriler } from "../musteri/model.ts";
import { odemeOturumlari } from "../odeme/model.ts";
import { siparisler } from "../siparis/model.ts";
import { urunler } from "../urun/model.ts";

export const kuponlar = pgTable(
  "kuponlar",
  {
    kimlik: kimlik(),
    kod: text().notNull(),
    // Mağaza sahibinin kendi adı ("Yılbaşı"); müşteriye görünmez.
    ad: text(),
    tur: text().notNull(),
    // Yüzdede 1–99 (ürünler sıfıra inmez, kullanıcı kararı), tutarda kuruş (fiyat girişi biçiminde), ücretsiz kargoda 0.
    deger: tutar().notNull(),
    kapsam: text().notNull(),
    // Sepetin ara toplamı (gösterim biçiminde, kupondan önce) bunun altındaysa kupon geçmez.
    en_az_tutar: tutar(),
    baslangic_zamani: zaman(),
    bitis_zamani: zaman(),
    toplam_sinir: integer(),
    kisi_basi_sinir: integer(),
    // İndirimde olan ürüne (geçerli fiyatı satış fiyatının altında) kupon geçmez.
    indirimde_gecmez: boolean().notNull().default(false),
    acik: boolean().notNull().default(true),
    olusturma_zamani: zaman().notNull().defaultNow(),
    silinme_zamani: zaman(),
  },
  (tablo) => [
    uniqueIndex("kuponlar_kod")
      .on(adAnahtariSql(tablo.kod))
      .where(sql`${tablo.silinme_zamani} is null`),
    // Kayıtla aynı olduğunu servis testi denetler (kuponTurleri, kuponKapsamlari).
    check("kuponlar_tur", sql`${tablo.tur} in ('yuzde', 'tutar', 'ucretsiz-kargo')`),
    check("kuponlar_kapsam", sql`${tablo.kapsam} in ('hepsi', 'urunler', 'kategoriler')`),
    check(
      "kuponlar_deger",
      sql`(${tablo.tur} = 'yuzde' and ${tablo.deger} between 1 and 99)
        or (${tablo.tur} = 'tutar' and ${tablo.deger} > 0)
        or (${tablo.tur} = 'ucretsiz-kargo' and ${tablo.deger} = 0)`,
    ),
    check(
      "kuponlar_sinirlar",
      sql`coalesce(${tablo.en_az_tutar}, 0) >= 0 and coalesce(${tablo.toplam_sinir}, 1) > 0
        and coalesce(${tablo.kisi_basi_sinir}, 1) > 0`,
    ),
    check(
      "kuponlar_sure",
      sql`${tablo.baslangic_zamani} is null or ${tablo.bitis_zamani} is null
        or ${tablo.bitis_zamani} > ${tablo.baslangic_zamani}`,
    ),
  ],
);
export type Kupon = typeof kuponlar.$inferSelect;

// Kapsamı "urunler" ya da "kategoriler" olan kuponun ürünleri ya da kategorileri. Kategori alt kategorileriyle sayılır.
export const kuponKapsami = pgTable(
  "kupon_kapsami",
  {
    kupon_kimligi: uuid()
      .notNull()
      .references(() => kuponlar.kimlik, { onDelete: "cascade" }),
    urun_kimligi: uuid().references(() => urunler.kimlik, { onDelete: "restrict" }),
    kategori_kimligi: uuid().references(() => kategoriler.kimlik, { onDelete: "restrict" }),
    // Ürün ya da kategorinin kimliği (birincil anahtar için).
    kayit_kimligi: uuid().notNull(),
  },
  (tablo) => [
    primaryKey({ columns: [tablo.kupon_kimligi, tablo.kayit_kimligi] }),
    check(
      "kupon_kapsami_tek",
      sql`(${tablo.urun_kimligi} is null) <> (${tablo.kategori_kimligi} is null)
        and ${tablo.kayit_kimligi} = coalesce(${tablo.urun_kimligi}, ${tablo.kategori_kimligi})`,
    ),
  ],
);

export const kuponKullanimlari = pgTable(
  "kupon_kullanimlari",
  {
    kimlik: kimlik(),
    kupon_kimligi: uuid()
      .notNull()
      .references(() => kuponlar.kimlik, { onDelete: "restrict" }),
    // Oturum silinince (müşteri yeniden onaylayınca, temizlik) siparişe bağlanmamış ayırma da gider.
    oturum_kimligi: uuid()
      .notNull()
      .references(() => odemeOturumlari.kimlik, { onDelete: "cascade" }),
    siparis_kimligi: uuid().references(() => siparisler.kimlik, { onDelete: "restrict" }),
    musteri_kimligi: uuid().references(() => musteriler.kimlik, { onDelete: "restrict" }),
    // Küçük harfle; kişisel veri temizliği siparişle birlikte boşaltır.
    eposta: text(),
    // Siparişe bağlanmamış ayırmanın bittiği an (stok ayırmasıyla aynı).
    bitis_zamani: zaman().notNull(),
    // İptal ya da tam iade kullanımı geri verdi.
    serbest_zamani: zaman(),
    zaman: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("kupon_kullanimlari_oturum").on(tablo.oturum_kimligi),
    index("kupon_kullanimlari_kupon").on(tablo.kupon_kimligi),
    index("kupon_kullanimlari_siparis").on(tablo.siparis_kimligi),
  ],
);
export type KuponKullanimi = typeof kuponKullanimlari.$inferSelect;
