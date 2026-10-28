// Bilerek bozulmuş örnek: sorguya değer gömülmüş. Denetim bu dosyayı yakalamalıdır.
declare const veritabani: { query(sorgu: string): Promise<unknown> };

export const urunBul = (kimlik: string) =>
  veritabani.query(`SELECT * FROM urunler WHERE kimlik = '${kimlik}'`);
