// Kuruş yuvarlamasının tek kuralı (kart 0075, karar 0061, .claude/rules/e-ticaret-is-kurallari.md: "yuvarlama
// tek yerde tanımlanır"). Vergi, fiyat ve iade hesapları tutarı yalnız buradan yuvarlar.
//
// - Ticari yuvarlama: yarım kuruş ve üstü yukarı, altı aşağı (kullanıcı kararı).
// - Hesap BigInt ile yapılır: kuruş × milyonda bir oran güvenli tam sayı sınırını aşabilir, küsuratlı
//   sayı hiçbir adımda kullanılmaz. Sonuç güvenli tam sayı değilse hata verir.
// - Yalnız sıfır ve artı tutarlar yuvarlanır: indirim ve iade eksi tutarla değil, kendi akışlarıyla gelir.

// pay / payda, yarım ve üstü yukarı. Pay sıfır ya da artı, payda artı olmalı.
export const bolVeYuvarla = (pay: bigint, payda: bigint): bigint => {
  if (pay < 0n || payda <= 0n) throw new Error("Yuvarlama yalnız sıfır ve artı tutarla yapılır.");
  return (2n * pay + payda) / (2n * payda);
};

// Hesabın sonucu kuruş olarak sayıya döner. Güvenli tam sayı sınırını aşan tutar sessizce bozulmaz.
export const kurusa = (tutar: bigint): number => {
  const sayi = Number(tutar);
  if (!Number.isSafeInteger(sayi)) throw new Error("Tutar güvenli tam sayı sınırını aşıyor.");
  return sayi;
};

// Bir toplamı paylara oranla dağıtır: her pay aşağı yuvarlanır, kalan kuruşlar küsuratı en büyük
// olanlara (eşitse önce gelene) birer birer verilir. Payların toplamı her zaman toplama eşittir.
export const oranlaDagit = (toplam: bigint, agirliklar: readonly bigint[]): bigint[] => {
  const agirlikToplami = agirliklar.reduce((a, b) => a + b, 0n);
  if (agirlikToplami === 0n) return agirliklar.map((_, sira) => (sira === 0 ? toplam : 0n));
  const paylar = agirliklar.map((agirlik) => (toplam * agirlik) / agirlikToplami);
  let kalan = toplam - paylar.reduce((a, b) => a + b, 0n);
  const sira = agirliklar
    .map((agirlik, yer) => ({ yer, kusurat: (toplam * agirlik) % agirlikToplami }))
    .sort((a, b) => (a.kusurat === b.kusurat ? a.yer - b.yer : a.kusurat > b.kusurat ? -1 : 1));
  for (const { yer } of sira) {
    if (kalan === 0n) break;
    paylar[yer] = (paylar[yer] ?? 0n) + 1n;
    kalan -= 1n;
  }
  return paylar;
};
