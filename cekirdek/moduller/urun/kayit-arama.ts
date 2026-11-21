// Panelde katalog kayıtlarını arayarak seçmek (kart 0143, karar 0116): menü öğesinin hedefi (ve kart 0161'de vitrin
// bölümlerinin alanları) kategori, marka ya da ürünü yazdıkça bulur; ürün ekranı etiketi de (kart 0263). Yalnız silinmemiş kayıtlar gelir; ürünün
// durumu (taslak, arşiv) seçimi engellemez, panel öğenin durumunu ayrıca gösterir.
//
// Harf kuralı aramanınkidir (aramaAnahtari): "gomlek" "Gömlek"i bulur. Aranan metin adın herhangi bir yerinde
// geçebilir (strpos; LIKE kullanılmaz, % ve _ joker olmaz). Kategoriler üst kategorilerinin adıyla ("Kadın › Tişört")
// gelir, ağaç sırasındadır ve bu yolda aranır. Marka ve ürün ada göre sıralıdır, adres adlarıyla gelir. Sonuç sayfalıdır.
import { and, asc, isNull, sql } from "drizzle-orm";
import { type KayitliMenuHedefi, kayitliMenuHedefleri } from "../../kayitlar/menu.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { etiketler } from "../etiket/model.ts";
import { kategorileriOku } from "../kategori/servis.ts";
import { kategoriYollari, kategoriYoluAyraci } from "../kategori/yol.ts";
import { markalar } from "../marka/model.ts";
import { urunler } from "./model.ts";

// Aranabilen kayıt türleri: menünün kayıtlı hedefleri ve ürünün etiketi (kart 0263).
export const aranabilirKayitlar = [...kayitliMenuHedefleri, "etiket"] as const;
export type AranabilirKayit = KayitliMenuHedefi | "etiket";

// Bir sayfadaki kayıt sayısı ve aranan metnin en çok uzunluğu.
export const kayitAramaSinirlari = { sayfa: 20, aranan: 100 } as const;

// Bulunan kayıt: adı (kategoride yolu) ve adres adı. Ürün adı tekil değildir: adres adı aynı adlı ürünleri ayırır.
export type BulunanKayit = { kimlik: string; ad: string; adresAdi?: string };
export type KayitAramaSonucu = { kayitlar: BulunanKayit[]; dahaVar: boolean };

export const kayitAra = async (
  vt: Veritabani,
  tur: AranabilirKayit,
  arananGirdisi: string,
  sayfaGirdisi = 0,
): Promise<KayitAramaSonucu> => {
  const aranan = aramaAnahtari(arananGirdisi.slice(0, kayitAramaSinirlari.aranan));
  const sayfa = Number.isSafeInteger(sayfaGirdisi) && sayfaGirdisi > 0 ? sayfaGirdisi : 0;
  const { sayfa: boyut } = kayitAramaSinirlari;
  if (tur === "kategori") {
    // Kategori ağacı küçüktür ve yol bütün ağacı ister: bir kez okunur, uygulamada süzülür.
    // Yol ayracı aranmaz: "kadin tisort" "Kadın › Tişört"ü bulur.
    const hepsi = kategoriYollari(await kategorileriOku(vt)).filter((kategori) =>
      aramaAnahtari(kategori.ad.replaceAll(kategoriYoluAyraci, " ")).includes(aranan),
    );
    return {
      kayitlar: hepsi.slice(sayfa * boyut, (sayfa + 1) * boyut),
      dahaVar: hepsi.length > (sayfa + 1) * boyut,
    };
  }
  const tablo = tur === "marka" ? markalar : tur === "etiket" ? etiketler : urunler;
  const satirlar = await vt
    .select({ kimlik: tablo.kimlik, ad: tablo.ad, adresAdi: tablo.adres_adi })
    .from(tablo)
    .where(
      and(
        isNull(tablo.silinme_zamani),
        aranan === "" ? undefined : sql`strpos(${aramaAnahtariSql(tablo.ad)}, ${aranan}) > 0`,
      ),
    )
    .orderBy(sql`lower(${tablo.ad})`, asc(tablo.kimlik))
    .limit(boyut + 1)
    .offset(sayfa * boyut);
  return { kayitlar: satirlar.slice(0, boyut), dahaVar: satirlar.length > boyut };
};
