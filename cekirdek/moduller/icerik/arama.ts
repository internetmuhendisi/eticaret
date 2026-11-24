// Panelde içeriğin kayıtlarını arayarak seçmek (kart 0273): menü öğesinin hedefi sabit sayfa ya da blog yazısı olunca
// kayıt arama kutusu bunu kullanır (uç icerik-ara, izin icerik.gor). Kuralı katalogun aramasıyla aynıdır
// (cekirdek/moduller/urun/kayit-arama.ts): harf kuralı aramanınkidir, aranan metin başlığın herhangi bir yerinde geçebilir
// (strpos; % ve _ joker olmaz). Yalnız silinmemiş kayıtlar gelir; taslak da gelir (panel öğenin durumunu ayrıca gösterir).
// Başlığa göre sıralı, adres adıyla, sayfalı.
import { and, asc, isNull, sql } from "drizzle-orm";
import type { IcerikMenuHedefi } from "../../kayitlar/menu.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { type KayitAramaSonucu, kayitAramaSinirlari } from "../urun/kayit-arama.ts";
import { blogYazilari, sabitSayfalar } from "./model.ts";

export const icerikAra = async (
  vt: Veritabani,
  tur: IcerikMenuHedefi,
  arananGirdisi: string,
  sayfaGirdisi = 0,
): Promise<KayitAramaSonucu> => {
  const aranan = aramaAnahtari(arananGirdisi.slice(0, kayitAramaSinirlari.aranan));
  const sayfa = Number.isSafeInteger(sayfaGirdisi) && sayfaGirdisi > 0 ? sayfaGirdisi : 0;
  const { sayfa: boyut } = kayitAramaSinirlari;
  const tablo = tur === "sayfa" ? sabitSayfalar : blogYazilari;
  const satirlar = await vt
    .select({ kimlik: tablo.kimlik, ad: tablo.baslik, adresAdi: tablo.adres_adi })
    .from(tablo)
    .where(
      and(
        isNull(tablo.silinme_zamani),
        aranan === "" ? undefined : sql`strpos(${aramaAnahtariSql(tablo.baslik)}, ${aranan}) > 0`,
      ),
    )
    .orderBy(sql`lower(${tablo.baslik})`, asc(tablo.kimlik))
    .limit(boyut + 1)
    .offset(sayfa * boyut);
  return { kayitlar: satirlar.slice(0, boyut), dahaVar: satirlar.length > boyut };
};
