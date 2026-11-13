// Panelin bölüm formunun seçenekleri (kart 0142): bölüm alanlarında seçilebilecek gerçek kayıtlar. Yalnız
// silinmemiş kayıtlar gelir; her liste üst sınırlıdır (.claude/rules/veritabani.md). Marka, etiket, ürün ve menü
// ada göre sıralıdır. Kategoriler ağaç sırasındadır (üst, sonra altları, kardeşler kendi sırasıyla) ve adı üst
// kategorilerin adlarını taşır ("Kadın › Tişört"): farklı üstlerdeki aynı adlı kategoriler ayırt edilir.
// Seçilen kaydın gerçekten var ve silinmemiş olduğunu yine servis denetler (baglariDenetle): liste
// açıkken silinen kayıt kaydedilmez.
//
// Görseller (kart 0142, kullanıcı kararı): yalnız sitede zaten kayıtlı, bütün boyutları hazır görseller,
// en yeni önce. Panelden görsel yükleme ayrı bir iştir.
import { and, asc, desc, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { gorselBoyutAdlari } from "../../kayitlar/gorsel.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { dosyaBoyutlari, dosyalar } from "../dosya/model.ts";
import { etiketler } from "../etiket/model.ts";
import { kategorileriOku } from "../kategori/servis.ts";
import { markalar } from "../marka/model.ts";
import { menuler } from "../menu/model.ts";
import { urunler } from "../urun/model.ts";

// Her listenin üst sınırı. Daha çok kayıt olan mağazada en baştakiler gelir; arayarak seçme ayrı bir iştir.
export const panelSecenekSinirlari = { kayit: 500, gorsel: 200 } as const;

export type KayitSecenegi = { kimlik: string; ad: string };
export type GorselSecenegi = { kimlik: string; genislik: number; yukseklik: number };

export type DuzenSecenekleri = {
  kategoriler: KayitSecenegi[];
  markalar: KayitSecenegi[];
  etiketler: KayitSecenegi[];
  urunler: KayitSecenegi[];
  // Menüler koduyla seçilir: seçeneğin kimliği menünün kodudur.
  menuler: KayitSecenegi[];
  gorseller: GorselSecenegi[];
};

const adSirasi = (ad: AnyPgColumn) => [sql`lower(${ad})`];

// Kategori ağacı sırasıyla ve yoluyla. Ağacın yolu bütün ağacı ister: kategoriler bir kez, sınırsız okunur
// (kategorileriOku; kategori sayısı mağazada küçüktür), liste sonra sınırlanır.
const kategoriYoluAyraci = " › ";
const agacSirasiyla = (
  kategoriler: readonly { kimlik: string; ad: string; ust: string | null }[],
): KayitSecenegi[] => {
  const altlari = new Map<string | null, typeof kategoriler>();
  for (const kategori of kategoriler) {
    const ust = kategoriler.some((k) => k.kimlik === kategori.ust) ? kategori.ust : null;
    altlari.set(ust, [...(altlari.get(ust) ?? []), kategori]);
  }
  const sonuc: KayitSecenegi[] = [];
  const gez = (ust: string | null, yol: string[]) => {
    for (const kategori of altlari.get(ust) ?? []) {
      const ad = [...yol, kategori.ad];
      sonuc.push({ kimlik: kategori.kimlik, ad: ad.join(kategoriYoluAyraci) });
      gez(kategori.kimlik, ad);
    }
  };
  gez(null, []);
  return sonuc;
};

export const duzenSecenekleri = async (vt: Veritabani): Promise<DuzenSecenekleri> => {
  const [kategoriListesi, markaListesi, etiketListesi, urunListesi, menuListesi, gorselListesi] =
    await Promise.all([
      kategorileriOku(vt),
      vt
        .select({ kimlik: markalar.kimlik, ad: markalar.ad })
        .from(markalar)
        .where(isNull(markalar.silinme_zamani))
        .orderBy(...adSirasi(markalar.ad), asc(markalar.kimlik))
        .limit(panelSecenekSinirlari.kayit),
      vt
        .select({ kimlik: etiketler.kimlik, ad: etiketler.ad })
        .from(etiketler)
        .where(isNull(etiketler.silinme_zamani))
        .orderBy(...adSirasi(etiketler.ad), asc(etiketler.kimlik))
        .limit(panelSecenekSinirlari.kayit),
      vt
        .select({ kimlik: urunler.kimlik, ad: urunler.ad })
        .from(urunler)
        .where(isNull(urunler.silinme_zamani))
        .orderBy(...adSirasi(urunler.ad), asc(urunler.kimlik))
        .limit(panelSecenekSinirlari.kayit),
      vt
        .select({ kimlik: menuler.kod, ad: menuler.ad })
        .from(menuler)
        .where(isNull(menuler.silinme_zamani))
        .orderBy(...adSirasi(menuler.ad), asc(menuler.kod))
        .limit(panelSecenekSinirlari.kayit),
      // Silinmemiş ve kayıttaki bütün boyutları silinmemiş görseller (gorselHazirMi ile aynı kural, tek sorguda).
      // Boyut dosyasının kendi boyutu olmadığı için o da böylece dışarıda kalır (ayrı süzgeç etkisiz çıktı, ölçüldü).
      vt
        .select({
          kimlik: dosyalar.kimlik,
          genislik: dosyalar.genislik,
          yukseklik: dosyalar.yukseklik,
        })
        .from(dosyalar)
        .where(
          and(
            isNull(dosyalar.silinme_zamani),
            sql`(select count(distinct b.boyut) from ${dosyaBoyutlari} as b join ${dosyalar} as bd on bd.kimlik = b.dosya_kimligi where b.kaynak_kimligi = ${dosyalar.kimlik} and bd.silinme_zamani is null and b.boyut in ${gorselBoyutAdlari}) = ${gorselBoyutAdlari.length}`,
          ),
        )
        .orderBy(desc(dosyalar.olusturma_zamani), asc(dosyalar.kimlik))
        .limit(panelSecenekSinirlari.gorsel),
    ]);
  return {
    kategoriler: agacSirasiyla(kategoriListesi).slice(0, panelSecenekSinirlari.kayit),
    markalar: markaListesi,
    etiketler: etiketListesi,
    urunler: urunListesi,
    menuler: menuListesi,
    gorseller: gorselListesi,
  };
};
