// Bir ürünün vitrinde görünüp görünmediğini bulan tek koşul (kart 0076, karar 0062). Vitrin sayfası,
// listeler, arama ve site haritası ürünü yalnız bu koşulla süzer.
//
// Koşul durum tablosundan (cekirdek/kayitlar/urun.ts) kurulur: hangi durumun nerede göründüğü orada
// yazar, burada durum adı elle yazılmaz. Silinmiş ürün hiçbir yerde görünmez. Zamanlanmış ürün
// yayın zamanı geldiği anda görünür; durumu değiştiren bir iş gerekmez.
//
// Tükenen ürün (kart 0083, karar 0069): mağaza sahibinin tukenenUrun ayarı "gizle" ise tükenmiş ürün
// listelerde (liste yeri) görünmez; kendi sayfası (sayfa yeri) açılır, ürün satılamaz (kullanıcı
// kararı). Tükenmişlik stok modülünün tek kuralıyla sınanır (stok/durum.ts); fiyatı olmayan birim de
// satılamaz (kart 0155, karar 0133), bu yüzden "gizle" sitenin para birimini de taşır. Ayar zorunlu
// değerdir: koşulu kuran her yer onu vermeden derlenmez, unutulamaz. Siteden okunan ayar
// vitrinStokSecenegi ile kurulur. Stok ya da fiyat gelince ürün kendiliğinden döner.
import { and, inArray, isNull, lte, not, or, type SQL, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { TukenenUrunDavranisi } from "../../kayitlar/stok.ts";
import { urunDurumlari, urunDurumVitrini, type VitrinYeri } from "../../kayitlar/urun.ts";
import { tukenmisUrunKosulu } from "../stok/durum.ts";
import { urunler } from "./model.ts";

// Mağaza sahibinin tukenenUrun ayarı (magaza-ayarlari servisinden okunur); "gizle"de tükenmişliği
// sınamak için sitenin para birimi.
export type VitrinStokSecenegi =
  | { tukenenUrun: "goster" }
  | { tukenenUrun: "gizle"; paraBirimi: string };

export type VitrinSecenekleri = VitrinStokSecenegi & {
  // Verilmezse veritabanının şimdiki zamanı: sunucuların saati farklı olsa da sonuç aynıdır.
  an?: Date;
};

// Sitenin ayarından vitrin stok seçeneği.
export const vitrinStokSecenegi = (
  site: Site,
  ayarlar: { tukenenUrun: TukenenUrunDavranisi },
): VitrinStokSecenegi =>
  ayarlar.tukenenUrun === "gizle"
    ? { tukenenUrun: "gizle", paraBirimi: site.ayarlar.paraBirimi }
    : { tukenenUrun: "goster" };

export const vitrinKosulu = (yer: VitrinYeri, secenekler: VitrinSecenekleri): SQL => {
  const { an } = secenekler;
  const simdi = an === undefined ? sql`now()` : sql`${an.toISOString()}::timestamptz`;
  const gorunen = urunDurumlari.filter((durum) => urunDurumVitrini[durum][yer]);
  const herZaman = gorunen.filter((durum) => !urunDurumVitrini[durum].zamanli);
  const zamanli = gorunen.filter((durum) => urunDurumVitrini[durum].zamanli);
  const kosul = and(
    isNull(urunler.silinme_zamani),
    or(
      herZaman.length > 0 ? inArray(urunler.durum, herZaman) : sql`false`,
      zamanli.length > 0
        ? and(inArray(urunler.durum, zamanli), lte(urunler.yayin_zamani, simdi))
        : sql`false`,
    ),
    yer === "liste" && secenekler.tukenenUrun === "gizle"
      ? not(tukenmisUrunKosulu(secenekler.paraBirimi))
      : undefined,
  );
  if (kosul === undefined) throw new Error("Vitrin koşulu kurulamadı.");
  return kosul;
};
