// İstek sınırının ortak yeri (karar 0024). Sayaçlar bellekte durur: her site tek kutuda,
// tek süreçte çalışır. Pencere sabittir: sürenin başında sayaç sıfırlanır.
import { isIP } from "node:net";
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

// IPv6 adresini sekiz parçaya açar. URL ayrıştırıcısı yazılışı tek biçime indirir: küçük harf,
// noktalı IPv4 kuyruğu onaltılık.
const ipv6Parcalari = (adres: string): string[] => {
  const yalin = new URL(`http://[${adres}]`).hostname.slice(1, -1);
  const [bas, son] = yalin.split("::").map((kisim) => kisim.split(":").filter(Boolean));
  if (bas === undefined || son === undefined) return bas ?? [];
  return [...bas, ...Array<string>(8 - bas.length - son.length).fill("0"), ...son];
};

// Sayaçta istemciyi tanıyan değer (karar 0041). IPv4 tam adresle, IPv6 ilk 64 bitiyle sayılır: bir
// bağlantının elinde milyarlarca IPv6 adresi vardır, tam adresle saymak sınırı anlamsız kılardı.
// IPv4'ün IPv6 yazılışı (::ffff:1.2.3.4) aynı adrestir, IPv4 sayılır. Adres olmayan değer
// (doğrudan erişimde "yerel") olduğu gibi kalır.
export const sayacAdresi = (adres: string): string => {
  const [yalin = ""] = adres.split("%");
  if (isIP(yalin) !== 6) return adres;
  const parcalar = ipv6Parcalari(yalin);
  const ipv4Mu = parcalar.slice(0, 5).every((parca) => parca === "0") && parcalar[5] === "ffff";
  if (ipv4Mu) {
    return parcalar
      .slice(6)
      .flatMap((parca) => {
        const deger = Number.parseInt(parca, 16);
        return [deger >> 8, deger & 255];
      })
      .join(".");
  }
  return `${parcalar.slice(0, 4).join(":")}::/64`;
};
