// Panelin "Demoyu gez" bağlantısı (kart 0148, karar 0127): tema demosunun adresi ortamdan gelir
// (temaDemosuAdresiDegiskeni), temanın kodu demonun adres parametresiyle eklenir. Adres yalnız http ya da https,
// kullanıcı adı, şifre, yol, sorgu ve parça taşımayan bir kök adres olabilir; değilse bağlantı yoktur.

import { temaDemosuAdresiDegiskeni } from "../kayitlar/site.ts";
import { temaDemosu } from "../kayitlar/tema.ts";

type DemoOrtami = Readonly<Record<string, string | undefined>>;

export const temaDemosuAdresi = (ortam: DemoOrtami = process.env): string | undefined => {
  const deger = ortam[temaDemosuAdresiDegiskeni]?.trim();
  if (!deger || !URL.canParse(deger)) return undefined;
  const adres = new URL(deger);
  if (adres.protocol !== "https:" && adres.protocol !== "http:") return undefined;
  if (adres.username !== "" || adres.password !== "") return undefined;
  if (adres.pathname !== "/" || adres.search !== "" || adres.hash !== "") return undefined;
  return adres.origin;
};

// Temanın demodaki adresi. Demo adresi yoksa bağlantı da yoktur.
export const temaDemosuBaglantisi = (
  kod: string,
  ortam: DemoOrtami = process.env,
): string | undefined => {
  const adres = temaDemosuAdresi(ortam);
  if (adres === undefined) return undefined;
  const baglanti = new URL("/", adres);
  baglanti.searchParams.set(temaDemosu.parametre, kod);
  return baglanti.href;
};
