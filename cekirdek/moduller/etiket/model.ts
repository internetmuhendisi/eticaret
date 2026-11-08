// Etiketler ve ürünlerin etiketleri (kart 0078, karar 0064). Tablo ve bağlantı biçimi markayla etikette
// aynıdır (cekirdek/moduller/urun/grup.ts). Bir ürünün birden çok etiketi olur.
import { grupBaglantisi, grupTablosu } from "../urun/grup.ts";

export const etiketler = grupTablosu("etiketler");
export const urunEtiketleri = grupBaglantisi("urun_etiketleri", etiketler, { tekil: false });
