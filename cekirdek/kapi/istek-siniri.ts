// İstek sınırının ortak yeri (karar 0024). Sayaçlar bellekte durur: her site tek kutuda,
// tek süreçte çalışır. Pencere sabittir: sürenin başında sayaç sıfırlanır.
import { type IstekSiniri, istekSinirlari } from "../kayitlar/kapi.ts";

type Sayac = { bitis: number; sayi: number };

const sayaclar = new Map<string, Sayac>();
let sonTemizlik = 0;

// Süresi geçmiş sayaçları en çok dakikada bir siler, bellek büyümez.
const temizle = (simdi: number): void => {
  if (simdi - sonTemizlik < 60_000) return;
  sonTemizlik = simdi;
  for (const [anahtar, sayac] of sayaclar) {
    if (sayac.bitis <= simdi) sayaclar.delete(anahtar);
  }
};

export type SinirSonucu = { izinli: true } | { izinli: false; bekleSaniye: number };

// anahtar: uç ile istemciyi birlikte tanır, örneğin "GET /kapi/herkese-acik/saglik 10.0.0.1".
export const istegiSay = (
  anahtar: string,
  sinir: IstekSiniri,
  simdi: number = Date.now(),
): SinirSonucu => {
  temizle(simdi);
  const { istek, saniye } = istekSinirlari[sinir];
  const sayac = sayaclar.get(anahtar);
  if (sayac === undefined || sayac.bitis <= simdi) {
    sayaclar.set(anahtar, { bitis: simdi + saniye * 1000, sayi: 1 });
    return { izinli: true };
  }
  if (sayac.sayi >= istek) {
    return { izinli: false, bekleSaniye: Math.ceil((sayac.bitis - simdi) / 1000) };
  }
  sayac.sayi += 1;
  return { izinli: true };
};

// İstemcinin adresi. Canlıda uygulamaya yalnız önündeki ters vekil (Caddy) ulaşır ve
// X-Forwarded-For başlığının son değerini o yazar. Başlık yoksa istek bu bilgisayardandır.
export const istemciAdresi = (istek: Request): string =>
  istek.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "yerel";
