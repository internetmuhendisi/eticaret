// Sitenin dilinde metin okuyucu. Ekranlar metni buradan okur.
// Geçici: sitenin dili kart 0010'da site ayarından okunacak.
import { type Dil, metinOkuyucu } from "./metin";

export const siteDili: Dil = "tr";

export const metin = metinOkuyucu(siteDili);
