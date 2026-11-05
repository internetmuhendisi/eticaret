// Hata izleme denemesinin uydurma kişisel ve gizli bilgileri (kart 0022, karar 0036). Deneme bu
// değerleri bilerek hatanın içine koyar, sonra araçtaki kayıtta hiçbirinin açık geçmediğini
// ölçer. Kutudaki parça (hata-izleme-denemesi.ts) ve deneme komutu
// (komutlar/hata-izleme-denemesi.mts) aynı değerleri buradan alır.
export const denemeDegerleri = {
  eposta: "deneme.kisi@example.com",
  telefon: "0532 987 65 43",
  sifre: "Deneme-Sifre-9",
  kart: "4111 1111 1111 1111",
  jwt: "eyJhbGciOiJIUzI1NiJ9.eyJkZW5lbWUiOjF9.imza",
  // Tarayıcı denemesinde sayfa adresinin sorgu kısmına "k" adıyla konur; araca hiç gitmemeli.
  // Adı maskenin tanıdığı bir sözcük değildir: değer ancak sorgu kısmı eklenmediği için gitmez.
  sorgu: "denemegizlisorgu",
} as const;

// Araçtaki kayıtta aranacak açık biçimler (ayırıcılı ve ayırıcısız).
export const acikBicimler = [
  denemeDegerleri.eposta,
  denemeDegerleri.telefon,
  denemeDegerleri.telefon.replaceAll(" ", ""),
  denemeDegerleri.sifre,
  denemeDegerleri.kart,
  denemeDegerleri.kart.replaceAll(" ", ""),
  denemeDegerleri.jwt,
  denemeDegerleri.sorgu,
];

// Denemenin hata mesajı: işaret, kaydı araçta bulmaya yarar. İşaret en sondadır: ardından
// "=" ya da ":" gelseydi ve işaret rastgele "otp", "key" gibi bir parça taşısaydı, maske
// sonrasını gizli alan sayıp e-postayı bütünüyle silerdi (bulundu: yaklaşık 200 denemede bir).
export const denemeMesaji = (isaret: string, kaynak: string): string =>
  `hata izleme denemesi ${kaynak} ${denemeDegerleri.eposta} ${denemeDegerleri.telefon} sifre=${denemeDegerleri.sifre} kart ${denemeDegerleri.kart} isaret ${isaret}`;
