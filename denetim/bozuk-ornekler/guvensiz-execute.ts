// Bilerek bozulmuş örnek: execute() içine önceden kurulmuş bir metin verilmiş.
// Denetim bu dosyayı yakalamalıdır.
declare const veritabani: { execute(sorgu: unknown): Promise<unknown> };

export const urunBul = (kimlik: string) => {
  const sorgu = `select * from urunler where kimlik = '${kimlik}'`;
  return veritabani.execute(sorgu);
};
