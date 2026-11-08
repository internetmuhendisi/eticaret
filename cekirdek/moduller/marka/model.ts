// Markalar ve ürünlerin markaları (kart 0078, karar 0064). Tablo ve bağlantı biçimi markayla etikette
// aynıdır (cekirdek/moduller/urun/grup.ts). Bir ürünün en çok bir markası olur.
import { grupBaglantisi, grupTablosu } from "../urun/grup.ts";

export const markalar = grupTablosu("markalar");
export const urunMarkalari = grupBaglantisi("urun_markalari", markalar, { tekil: true });
