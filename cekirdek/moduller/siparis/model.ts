// Siparişler (kart 0214, karar 0141). Sipariş ödeme oturumundan (odeme_oturumlari) kurulur ve müşterinin verdiği andaki
// her şeyi kendisinde saklar: ürün adı, seçim, stok kodu, birim fiyat, vergi oranı ve tutarı, kargo, toplam, teslimat
// ve fatura bilgisi, not, metin sürümüyle onaylar ve ödeme yöntemi. Ürün, fiyat ya da vergi sonradan değişince sipariş
// değişmez. Sipariş ve kalemleri kalıcı silinmez (.claude/rules/veritabani.md).
//
// - numara: müşteriye gösterilen tekil numara ("ORN-1001"), tam yazılışıyla saklanır: önek sonradan değişse de eski
//   numara aynı kalır. Sıra numarası veritabanının sırasından (siparis_numarasi) gelir, başlangıcı sitenin
//   siparisBaslangici ayarıdır; aynı anda gelen siparişlerde tekrar etmez.
// - Tutarlar kuruş, gösterim biçimindedir (vergi dahil ya da hariç, gosterim alanı); sepetin tek hesabından
//   (sepetiHesapla) gelir.
// - erisim_ozeti: siparişi veren tarayıcıya verilen anahtarın SHA-256 özeti (sipariş alındı sayfası); anahtarın
//   kendisi saklanmaz.
// - odeme_son_zamani: yalnız havalede; bu andan sonra ödenmemiş (bildirimsiz) sipariş kendiliğinden iptal olur.
// - tahsilat: yalnız ödemesi sipariş kurulurken alınmış siparişte (kartla ödeme, kart 0215): müşterinin ödediği tutar
//   (taksit farkıyla, kuruş), taksit sayısı ve ödeme kuruluşunun ödeme kimliği. Kart numarası saklanmaz.
// - odeme_zamani: ödemenin alındığı an (kart 0234): kartla ödemede sipariş kurulurken, havalede onayda, kapıda
//   ödemede teslimde (siparisIslemleri). Ödeme alınmamış siparişte boştur.
// - kargo_firmasi, takip_numarasi, takip_adresi, kargo_zamani: kargoya verildiği andaki firma adı, takip numarası ve
//   firmanın kalıbından kurulmuş takip adresi (kart 0234). Firma listesi sonradan değişse de sipariş değişmez.
// - teslim_zamani: mağaza sahibinin teslim edildi dediği an (karar 0145).
// - kisisel_veri_silinme_zamani: saklama süresi dolunca ad, adres, telefon, e-posta ve not silindi (karar 0145).
//
// Aranan alanlar:
// - numara: havale bildirimi ve müşterinin sorusu, tekil indeks.
// - oturum_kimligi: ödeme oturumunun siparişe dönüp dönmediği (temizlik, kart 0215'in tekrar denetimi), tekil indeks.
// - durum ve odeme_son_zamani: havalenin iptal taraması, kısmi indeks (yalnız ödeme bekleyen havale).
// - musteri_kimligi: müşterinin önceki siparişi (adres önerisi), siparişlerim (on üçüncü bölüm), indeksli.
// - erisim_ozeti: sipariş alındı sayfası, indeksli.
// - durum ve olusturma_zamani: panelin durum sekmeleri ve sayıları (kart 0234), indeksli. Panelin aramasındaki ad ve
//   e-posta indekssizdir: liste sayfalıdır, bir site birkaç bin siparişe kadar tam taramayla yeter.
// - olusturma_zamani (kişisel bilgisi silinmemiş): saklama süresi temizliği, kısmi indeks.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { kimlik, tutar, zaman } from "../../veritabani/turler.ts";
import { musteriler } from "../musteri/model.ts";
import { type OturumOnayi, odemeOturumlari } from "../odeme/model.ts";
import type { Fatura, Teslimat } from "../odeme/semalar.ts";
import { urunBirimleri } from "../urun/model.ts";

// Siparişin sıra numarası. Sipariş numarası başlangıç ayarı eksi bir artı bu sıradır; geri alınan işlemin numarası
// boşta kalır (numaralar ardışık olmak zorunda değildir, tekil olmak zorundadır).
export const siparisNumarasiSirasi = pgSequence("siparis_numarasi", { startWith: 1 });

export type VergiDokumu = { ad?: string; oran: number; matrah: number; vergi: number }[];

export type Tahsilat = { odenen: number; taksit: number; odemeKimligi: string };

export const siparisler = pgTable(
  "siparisler",
  {
    kimlik: kimlik(),
    numara: text().notNull(),
    oturum_kimligi: uuid()
      .notNull()
      .references(() => odemeOturumlari.kimlik, { onDelete: "restrict" }),
    // Giriş yapmış ya da ödemede hesap açan müşteri; üye olmayan müşteride boştur.
    musteri_kimligi: uuid().references(() => musteriler.kimlik, { onDelete: "restrict" }),
    eposta: text().notNull(),
    teslimat: jsonb().$type<Teslimat>().notNull(),
    fatura: jsonb().$type<Fatura>().notNull(),
    not: text(),
    onaylar: jsonb().$type<OturumOnayi[]>().notNull(),
    // cekirdek/kayitlar/odeme.ts: odemeYontemleri; kapıda ödemede seçenek (kapidaOdemeSecenekleri).
    odeme_yontemi: text().notNull(),
    kapida_secenegi: text(),
    // cekirdek/kayitlar/siparis.ts: siparisDurumTanimlari.
    durum: text().notNull(),
    para_birimi: text().notNull(),
    // Tutarların vergi durumu: vergi-dahil, vergi-haric ya da yok (vergi kapalı).
    gosterim: text().notNull(),
    ara_toplam: tutar().notNull(),
    // Kargonun türü (yok: kargo gerektirmeyen sipariş, ucretsiz, ucretli) ve ücretli kargoda gösterim biçimindeki
    // tutarı; ücretsiz ya da kargosuz siparişte 0.
    kargo_turu: text().notNull(),
    kargo_tutari: tutar().notNull(),
    vergi_toplami: tutar().notNull(),
    toplam: tutar().notNull(),
    vergi_dokumu: jsonb().$type<VergiDokumu>().notNull(),
    odeme_son_zamani: zaman(),
    tahsilat: jsonb().$type<Tahsilat>(),
    odeme_zamani: zaman(),
    kargo_firmasi: text(),
    takip_numarasi: text(),
    takip_adresi: text(),
    kargo_zamani: zaman(),
    teslim_zamani: zaman(),
    kisisel_veri_silinme_zamani: zaman(),
    erisim_ozeti: text().notNull(),
    olusturma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    uniqueIndex("siparisler_numara").on(tablo.numara),
    uniqueIndex("siparisler_oturum").on(tablo.oturum_kimligi),
    index("siparisler_musteri").on(tablo.musteri_kimligi, tablo.olusturma_zamani),
    index("siparisler_erisim").on(tablo.erisim_ozeti),
    index("siparisler_durum_zaman").on(tablo.durum, tablo.olusturma_zamani),
    index("siparisler_kisisel_veri")
      .on(tablo.olusturma_zamani)
      .where(sql`${tablo.kisisel_veri_silinme_zamani} is null`),
    index("siparisler_havale_bekleyen")
      .on(tablo.odeme_son_zamani)
      .where(sql`${tablo.durum} = 'odeme-bekleniyor' and ${tablo.odeme_son_zamani} is not null`),
    // Kayıt dosyalarıyla aynıdır (cekirdek/kayitlar/siparis.ts, odeme.ts); bunu servis testi denetler.
    check(
      "siparisler_durum",
      sql`${tablo.durum} in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim-edildi', 'kismi-iade', 'iade-edildi', 'iptal')`,
    ),
    // Kargo bilgisi birlikte yazılır: firma ve an ya ikisi de var ya ikisi de yok; takip numarası ve adresi firmasız
    // olamaz. Kargoya verilmiş (ve sonrasındaki) siparişte firma vardır.
    check(
      "siparisler_kargo_bilgisi",
      sql`(${tablo.kargo_firmasi} is null) = (${tablo.kargo_zamani} is null) and (${tablo.kargo_firmasi} is not null or (${tablo.takip_numarasi} is null and ${tablo.takip_adresi} is null)) and (${tablo.durum} not in ('kargoda', 'teslim-edildi') or ${tablo.kargo_firmasi} is not null)`,
    ),
    check(
      "siparisler_teslim",
      sql`(${tablo.teslim_zamani} is null) = (${tablo.durum} in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'iptal'))`,
    ),
    check(
      "siparisler_odeme_yontemi",
      sql`(${tablo.odeme_yontemi} = 'havale' and ${tablo.kapida_secenegi} is null and ${tablo.odeme_son_zamani} is not null) or (${tablo.odeme_yontemi} = 'kapida-odeme' and ${tablo.kapida_secenegi} in ('nakit', 'kart') and ${tablo.odeme_son_zamani} is null) or (${tablo.odeme_yontemi} = 'kart' and ${tablo.kapida_secenegi} is null and ${tablo.odeme_son_zamani} is null and ${tablo.tahsilat} is not null)`,
    ),
    // Tahsilat yalnız kartla ödemede vardır (yukarıdaki denetim kartta ister).
    check("siparisler_tahsilat", sql`${tablo.tahsilat} is null or ${tablo.odeme_yontemi} = 'kart'`),
    check(
      "siparisler_kargo",
      sql`(${tablo.kargo_turu} = 'ucretli' and ${tablo.kargo_tutari} > 0) or (${tablo.kargo_turu} in ('yok', 'ucretsiz') and ${tablo.kargo_tutari} = 0)`,
    ),
    check("siparisler_gosterim", sql`${tablo.gosterim} in ('vergi-dahil', 'vergi-haric', 'yok')`),
    check(
      "siparisler_tutarlar",
      sql`${tablo.ara_toplam} >= 0 and ${tablo.kargo_tutari} >= 0 and ${tablo.vergi_toplami} >= 0 and ${tablo.toplam} >= 0`,
    ),
  ],
);
export type Siparis = typeof siparisler.$inferSelect;

// Siparişin kalemleri: sipariş anındaki ürün adı, seçim, stok kodu, birim fiyat ve vergi. Birim silinse de kalem kalır
// (birim silinmiş olarak işaretlenir, satırı durur).
//
// Aranan alanlar: siparis_kimligi ve sira (siparişin kalemleri), indeksli.
export const siparisKalemleri = pgTable(
  "siparis_kalemleri",
  {
    kimlik: kimlik(),
    siparis_kimligi: uuid()
      .notNull()
      .references(() => siparisler.kimlik, { onDelete: "restrict" }),
    sira: integer().notNull(),
    birim_kimligi: uuid()
      .notNull()
      .references(() => urunBirimleri.kimlik, { onDelete: "restrict" }),
    urun_kimligi: uuid().notNull(),
    urun_adi: text().notNull(),
    // Birleşimin seçenekleri ürünün sırasıyla ({ secenek: "Renk", deger: "Lacivert" }); basit üründe boş.
    secim: jsonb().$type<{ secenek: string; deger: string }[]>().notNull(),
    stok_kodu: text(),
    adet: integer().notNull(),
    // Gösterim biçiminde birim fiyat ve satırın tutarı; vergisiz, vergi ve uygulanan oranlar vergi hesabından.
    birim_tutari: tutar().notNull(),
    tutar: tutar().notNull(),
    vergisiz: tutar().notNull(),
    vergi: tutar().notNull(),
    // Uygulanan oranlar (milyonda bir), adlarıyla.
    vergi_oranlari: jsonb().$type<{ ad?: string; oran: number }[]>().notNull(),
  },
  (tablo) => [
    uniqueIndex("siparis_kalemleri_sira").on(tablo.siparis_kimligi, tablo.sira),
    check("siparis_kalemleri_adet", sql`${tablo.adet} > 0`),
    check(
      "siparis_kalemleri_tutarlar",
      sql`${tablo.birim_tutari} >= 0 and ${tablo.tutar} >= 0 and ${tablo.vergisiz} >= 0 and ${tablo.vergi} >= 0`,
    ),
  ],
);
export type SiparisKalemi = typeof siparisKalemleri.$inferSelect;

// Siparişin geçmişi: her durum değişikliği kim, ne zaman, neden ile. Satır sonradan değiştirilemez (tetikleyici,
// stok geçmişiyle aynı kural).
//
// Aranan alanlar: siparis_kimligi ve zaman, indeksli.
export const siparisGecmisi = pgTable(
  "siparis_gecmisi",
  {
    kimlik: kimlik(),
    siparis_kimligi: uuid()
      .notNull()
      .references(() => siparisler.kimlik, { onDelete: "restrict" }),
    // Satırın yazıldığı an (clock_timestamp): aynı işlemde yazılan satırların sırası yazılma sırasıdır.
    zaman: zaman().notNull().defaultNow(),
    onceki_durum: text(),
    sonraki_durum: text().notNull(),
    // cekirdek/kayitlar/siparis.ts: siparisGecmisiNedenleri.
    neden: text().notNull(),
    kim_turu: text().notNull(),
    kim_kimligi: uuid(),
    kim_adi: text(),
  },
  (tablo) => [
    index("siparis_gecmisi_siparis").on(tablo.siparis_kimligi, tablo.zaman),
    check(
      "siparis_gecmisi_neden",
      sql`${tablo.neden} in ('olusturuldu', 'havale-suresi-doldu', 'havale-bildirildi', 'havale-onaylandi', 'hazirlamaya-alindi', 'kargoya-verildi', 'kargo-duzeltildi', 'teslim-edildi', 'yonetici-iptali', 'iade-yapildi')`,
    ),
    check(
      "siparis_gecmisi_durum",
      sql`${tablo.sonraki_durum} in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim-edildi', 'kismi-iade', 'iade-edildi', 'iptal') and (${tablo.onceki_durum} is null or ${tablo.onceki_durum} in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim-edildi', 'kismi-iade', 'iade-edildi', 'iptal'))`,
    ),
    check(
      "siparis_gecmisi_kim_dolu",
      sql`(${tablo.kim_turu} = 'sistem' and length(${tablo.kim_adi}) > 0 and ${tablo.kim_kimligi} is null) or (${tablo.kim_turu} in ('yonetici', 'musteri', 'sahip') and ${tablo.kim_kimligi} is not null and ${tablo.kim_adi} is null)`,
    ),
  ],
);

// Havale bildirimi (kart 0214): müşteri ödediğini bildirir. Bildirimli sipariş süre dolunca kendiliğinden iptal
// olmaz (kullanıcı kararı): mağaza sahibi bakar. Panelde görünmesi ve havalenin onayı on üçüncü bölümdedir. Hesap
// bildirim anındaki banka ve numarayla saklanır: hesap sonradan silinse de bildirim okunur.
//
// Aranan alanlar: siparis_kimligi (siparişin bildirimleri), indeksli.
export const havaleBildirimleri = pgTable(
  "havale_bildirimleri",
  {
    kimlik: kimlik(),
    siparis_kimligi: uuid()
      .notNull()
      .references(() => siparisler.kimlik, { onDelete: "restrict" }),
    gonderen: text().notNull(),
    banka: text().notNull(),
    iban: text().notNull(),
    tutar: tutar().notNull(),
    // Müşterinin yazdığı ödeme günü (sitenin saat diliminde), YYYY-AA-GG.
    odeme_tarihi: text().notNull(),
    not: text(),
    olusturma_zamani: zaman().notNull().defaultNow(),
  },
  (tablo) => [
    index("havale_bildirimleri_siparis").on(tablo.siparis_kimligi),
    check("havale_bildirimleri_tutar", sql`${tablo.tutar} > 0`),
  ],
);

// Siparişin notları (kart 0234): iç not yalnız panelde, müşteriye not müşterinin sipariş ayrıntısında görünür. Not
// sonradan değiştirilemez ve silinmez (tetikleyici, geçmişle aynı kural). Yazanı geçmişle aynı biçimde saklanır.
//
// Aranan alanlar: siparis_kimligi ve zaman (siparişin notları, zaman sırasıyla), indeksli.
export const siparisNotlari = pgTable(
  "siparis_notlari",
  {
    kimlik: kimlik(),
    siparis_kimligi: uuid()
      .notNull()
      .references(() => siparisler.kimlik, { onDelete: "restrict" }),
    zaman: zaman().notNull().defaultNow(),
    // cekirdek/kayitlar/siparis.ts: siparisNotTurleri.
    tur: text().notNull(),
    metin: text().notNull(),
    kim_turu: text().notNull(),
    kim_kimligi: uuid(),
    kim_adi: text(),
  },
  (tablo) => [
    index("siparis_notlari_siparis").on(tablo.siparis_kimligi, tablo.zaman),
    check("siparis_notlari_tur", sql`${tablo.tur} in ('ic', 'musteri')`),
    check("siparis_notlari_metin", sql`length(${tablo.metin}) between 1 and 1000`),
    check(
      "siparis_notlari_kim_dolu",
      sql`(${tablo.kim_turu} = 'sistem' and length(${tablo.kim_adi}) > 0 and ${tablo.kim_kimligi} is null) or (${tablo.kim_turu} in ('yonetici', 'musteri', 'sahip') and ${tablo.kim_kimligi} is not null and ${tablo.kim_adi} is null)`,
    ),
  ],
);
export type SiparisNotu = typeof siparisNotlari.$inferSelect;

// Siparişin iptalleri ve iadeleri (kart 0235, karar 0147). Her satır bir iptal ya da iadedir; bir siparişte birden çok
// iade olabilir, toplamları ödenen tutarı aşamaz (servis). Tutarlar kuruş, siparişin para birimindedir: tutar müşteriye
// geri dönen paradır (vergi dahil), vergi_dokumu onun oran oran vergisidir. kalemler: iade edilen sipariş kalemleri
// (sıra, adet, tutar). Kartla ödemede para ödeme kuruluşundan döner (yontem "kurulus"); kuruluşun yanıtı beklenirken
// satır "bekliyor"dur, sipariş değişmez. Satır silinmez.
//
// Aranan alanlar: siparis_kimligi (siparişin iadeleri, bekleyen iade), indeksli; bekleyen iadeler (kuruluşun
// taraması), kısmi indeks.
export const siparisIadeleri = pgTable(
  "siparis_iadeleri",
  {
    kimlik: kimlik(),
    siparis_kimligi: uuid()
      .notNull()
      .references(() => siparisler.kimlik, { onDelete: "restrict" }),
    // cekirdek/kayitlar/siparis.ts: iadeTurleri, iadeDurumlari, iadeNedenleri.
    tur: text().notNull(),
    durum: text().notNull(),
    // Para nereden döner: kuruluş (kartla ödeme eklentisi) ya da elle (mağaza sahibi gönderir); tutar 0 ise yok.
    yontem: text().notNull(),
    tutar: tutar().notNull(),
    vergi_dokumu: jsonb().$type<VergiDokumu>().notNull(),
    kalemler: jsonb().$type<{ sira: number; adet: number; tutar: number }[]>().notNull(),
    kargo_tutari: tutar().notNull(),
    stoga_konacak: boolean().notNull(),
    neden: text().notNull(),
    aciklama: text(),
    kim_turu: text().notNull(),
    kim_kimligi: uuid(),
    kim_adi: text(),
    olusturma_zamani: zaman().notNull().defaultNow(),
    sonuc_zamani: zaman(),
  },
  (tablo) => [
    index("siparis_iadeleri_siparis").on(tablo.siparis_kimligi, tablo.olusturma_zamani),
    index("siparis_iadeleri_bekleyen")
      .on(tablo.olusturma_zamani)
      .where(sql`${tablo.durum} = 'bekliyor'`),
    // Bir siparişte aynı anda en çok bir bekleyen iade.
    uniqueIndex("siparis_iadeleri_tek_bekleyen")
      .on(tablo.siparis_kimligi)
      .where(sql`${tablo.durum} = 'bekliyor'`),
    check("siparis_iadeleri_tur", sql`${tablo.tur} in ('iptal', 'iade')`),
    check("siparis_iadeleri_durum", sql`${tablo.durum} in ('bekliyor', 'tamamlandi', 'basarisiz')`),
    check("siparis_iadeleri_yontem", sql`${tablo.yontem} in ('kurulus', 'elle', 'yok')`),
    check(
      "siparis_iadeleri_neden",
      sql`${tablo.neden} in ('musteri-vazgecti', 'beklentiyi-karsilamadi', 'kusurlu-hasarli', 'yanlis-urun', 'stok-yok', 'diger')`,
    ),
    check(
      "siparis_iadeleri_tutar",
      sql`${tablo.tutar} >= 0 and ${tablo.kargo_tutari} >= 0 and (${tablo.yontem} = 'yok') = (${tablo.tutar} = 0)`,
    ),
    check(
      "siparis_iadeleri_kim_dolu",
      sql`(${tablo.kim_turu} = 'sistem' and length(${tablo.kim_adi}) > 0 and ${tablo.kim_kimligi} is null) or (${tablo.kim_turu} in ('yonetici', 'musteri', 'sahip') and ${tablo.kim_kimligi} is not null and ${tablo.kim_adi} is null)`,
    ),
  ],
);
export type SiparisIadesi = typeof siparisIadeleri.$inferSelect;
