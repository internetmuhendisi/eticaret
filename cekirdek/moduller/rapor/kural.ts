// Raporların sayma kuralı (kart 0317, 0318; karar 0195): hangi siparişin satış, hangi iadenin iade sayıldığı yalnız
// burada yazılır. Satış, ödemesi dönemde alınmış sitenin para birimindeki siparişlerdir (`odeme_zamani`); iade,
// dönemde tamamlanmış iadedir (`sonuc_zamani`, durum "tamamlandi"). Sorgular siparişi `s`, iadeyi `i` adıyla yazar.
import { type SQL, sql } from "drizzle-orm";
import type { IadeDurumu } from "../../kayitlar/siparis.ts";

export const tamamlandi: IadeDurumu = "tamamlandi";

// `s` (siparisler) dönemde satış sayılır.
export const satisKosulu = (paraBirimi: string, bas: Date, son: Date): SQL =>
  sql`s.odeme_zamani >= ${bas} and s.odeme_zamani < ${son} and s.para_birimi = ${paraBirimi}`;

// `i` (siparis_iadeleri) dönemde tamamlanmış iadedir; siparişin (`s`) para birimi ayrıca denetlenir.
export const iadeKosulu = (paraBirimi: string, bas: Date, son: Date): SQL =>
  sql`i.durum = ${tamamlandi} and i.sonuc_zamani >= ${bas} and i.sonuc_zamani < ${son} and s.para_birimi = ${paraBirimi}`;

// Siparişin dönemden bağımsız bütün tamamlanmış iadeleri, toplamını aşmadan (taksit farkı; kupon raporunun "iade
// sonrası"): `s` siparişinde kalan tutar.
export const iadeSonrasiTutar = (): SQL =>
  sql`greatest(0, s.toplam - least(s.toplam, coalesce((select sum(i.tutar) from siparis_iadeleri i where i.siparis_kimligi = s.kimlik and i.durum = ${tamamlandi}), 0)))`;
