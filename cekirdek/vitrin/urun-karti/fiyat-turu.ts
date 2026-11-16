// Fiyat bileşeninin okuduğu alanlar (kart 0212). Fiyat aralığının (FiyatAraligi, fiyat/gosterim.ts) yalnız gösterimde
// kullanılan kısmıdır: tarih taşımaz, JSON olarak tarayıcıya gidebilir (sepet). Yalnız türdür, sunucu kodu almaz.
import type { FiyatAraligi, GosterilecekFiyat } from "../../moduller/fiyat/gosterim.ts";

export type GosterimFiyati = Pick<FiyatAraligi, "tek" | "yaziliAralik"> & {
  enDusuk: Pick<GosterilecekFiyat, "tutar" | "yazili" | "ekMetin">;
  enYuksek: Pick<GosterilecekFiyat, "tutar">;
};
