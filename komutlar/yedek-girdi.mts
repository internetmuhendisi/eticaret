// Yedek komutlarının ortak girdisi: site klasörü ve ortam (kart 0024).

import { siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { type Ortam, ortamMi, siteNumaralariniOku } from "./gizli-bilgi.mts";
import { kayitlariOku } from "./sunucu.mts";

export const secenek = (ad: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3);

export const yedekSitesi = (
  komut: string,
): { ipv4: string; ortam: Ortam; kodAdi: string; numara: number } => {
  const [klasor, ortam] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!klasor || !ortam || !ortamMi(ortam)) {
    throw new Error(`Kullanım: pnpm ${komut} <site klasörü> <deneme|canli>`);
  }
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) throw new Error(`${klasor} geçersiz:\n  ${sonuc.hatalar.join("\n  ")}`);
  const { kodAdi } = sonuc.site.kimlik;
  const numara = siteNumaralariniOku()[kodAdi];
  if (numara === undefined) throw new Error(`${kodAdi} sitesinin numarası yok.`);
  const [sunucu] = kayitlariOku();
  if (!sunucu) throw new Error("sunucu/sunucular.json'da sunucu yok. Önce: pnpm sunucu-kur");
  return { ipv4: sunucu.ipv4, ortam, kodAdi, numara };
};
