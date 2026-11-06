// Yanlış giriş denemelerinin sayacı (kart 0027, karar 0042). Bellektedir: her site tek süreçte
// çalışır, yeniden başlayınca sıfırlanır. Deneme şifreye bakmadan önce ayrılır: aynı anda giden
// istekler sayılmadan önce sınırı aşamaz. Başarılı giriş ayrılan denemeyi geri verir.

type Sayac = { bitis: number; sayi: number };
export type DenemeKurali = { anahtar: string; deneme: number; saniye: number };

const sayaclar = new Map<string, Sayac>();
let sonTemizlik = 0;

const temizle = (simdi: number): void => {
  if (simdi - sonTemizlik < 60_000) return;
  sonTemizlik = simdi;
  for (const [anahtar, sayac] of sayaclar) {
    if (sayac.bitis <= simdi) sayaclar.delete(anahtar);
  }
};

// Sınır doluysa beklenecek saniyeyi döner ve hiçbir sayacı artırmaz; değilse hepsini artırır.
export const denemeyiAyir = (
  kurallar: readonly DenemeKurali[],
  simdi: number = Date.now(),
): number | null => {
  temizle(simdi);
  let bekle = 0;
  for (const { anahtar, deneme } of kurallar) {
    const sayac = sayaclar.get(anahtar);
    if (sayac !== undefined && sayac.bitis > simdi && sayac.sayi >= deneme) {
      bekle = Math.max(bekle, Math.ceil((sayac.bitis - simdi) / 1000));
    }
  }
  if (bekle > 0) return bekle;
  for (const { anahtar, deneme, saniye } of kurallar) {
    const sayac = sayaclar.get(anahtar);
    if (sayac === undefined || sayac.bitis <= simdi) {
      sayaclar.set(anahtar, { bitis: simdi + saniye * 1000, sayi: 1 });
      continue;
    }
    sayac.sayi += 1;
    // Sınır dolunca bekleme son denemeden itibaren tam süredir.
    if (sayac.sayi >= deneme) sayac.bitis = simdi + saniye * 1000;
  }
  return null;
};

export const denemeyiGeriVer = (anahtar: string): void => {
  const sayac = sayaclar.get(anahtar);
  if (sayac === undefined) return;
  sayac.sayi -= 1;
  if (sayac.sayi <= 0) sayaclar.delete(anahtar);
};

export const denemeleriSil = (anahtar: string): void => {
  sayaclar.delete(anahtar);
};
