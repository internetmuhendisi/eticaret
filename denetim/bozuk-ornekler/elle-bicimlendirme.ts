// Bilerek bozulmuş örnek: biçimleyici dışında elle biçimlendirme. Denetim bu dosyayı yakalamalıdır.
export const fiyat = (tutar: number) => tutar.toLocaleString();
export const tarih = new Intl.DateTimeFormat().format(new Date());
