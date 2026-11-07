// Barkodun biçimi ve kontrol hanesi (kart 0076). Kabul edilenler: GTIN-8 (EAN-8), GTIN-12 (UPC-A),
// GTIN-13 (EAN-13; ISBN-13 de budur), GTIN-14 ve ISBN-10. Boşluk ve tire yazılabilir, saklanan biçimden
// atılır; ISBN-10'un son hanesi X olabilir ve büyük harfle saklanır.
//
// Komutlar bu dosyayı Node ile doğrudan çalıştırabilir: yalnız silinebilir tür sözdizimi.

// GTIN kontrol hanesi (GS1): sağdan sola, kontrol hanesinin solundaki haneler 3, 1, 3... ile çarpılır.
const gtinGecerliMi = (haneler: string): boolean => {
  const sayilar = [...haneler].map(Number);
  const kontrol = sayilar.pop();
  const toplam = sayilar
    .toReversed()
    .reduce((birikim, hane, sira) => birikim + hane * (sira % 2 === 0 ? 3 : 1), 0);
  return kontrol === (10 - (toplam % 10)) % 10;
};

// ISBN-10: haneler 10'dan 1'e kadar ağırlıkla çarpılır, toplam 11'e bölünür. X = 10.
const isbn10GecerliMi = (haneler: string): boolean => {
  const toplam = [...haneler].reduce(
    (birikim, hane, sira) => birikim + (hane === "X" ? 10 : Number(hane)) * (10 - sira),
    0,
  );
  return toplam % 11 === 0;
};

// Saklanacak biçimi döner; biçim ya da kontrol hanesi tutmazsa undefined.
export const barkoduDogrula = (barkod: string): string | undefined => {
  const temiz = barkod.replace(/[\s-]/g, "").toUpperCase();
  if (/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(temiz)) {
    return gtinGecerliMi(temiz) ? temiz : undefined;
  }
  if (/^\d{9}[\dX]$/.test(temiz)) return isbn10GecerliMi(temiz) ? temiz : undefined;
  return undefined;
};
