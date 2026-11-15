// Tema demosunun adresi (kart 0148, karar 0127). Panelin "Demoyu gez" bağlantısının tek kaynağı demo sitesinin
// kimliğidir: komutlar adresi oradan bulup her sitenin kutusuna ortam değişkeniyle verir
// (temaDemosuAdresiDegiskeni). Çekirdek demo sitesinin adını bilmez (cekirdek/testler/site-adi-yok.test.ts).
//
// Demo sitesi türü "demo" olan ve temaDemosu ayarı açık sitedir. Birden çok demo sitesi varsa hangisinin
// bağlanacağı belli değildir: komut durur. Demo sitesi yoksa ya da ortamda adresi yoksa değişken verilmez,
// panel bağlantıyı çizmez.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { type Site, siteKlasorunuDogrula } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { temaDemosuAdresiDegiskeni } from "../cekirdek/kayitlar/site.ts";
import type { Ortam } from "./gizli-bilgi.mts";

const kok = join(import.meta.dirname, "..");

type DemoAdayi = Pick<Site, "kimlik" | "ayarlar">;

// Sitelerin arasındaki demo sitesi. Birden çoksa durur.
export const demoSitesi = <S extends DemoAdayi>(siteler: readonly S[]): S | undefined => {
  const demolar = siteler.filter((site) => site.kimlik.tur === "demo" && site.ayarlar.temaDemosu);
  if (demolar.length > 1) {
    throw new Error(
      `Birden çok tema demosu var: ${demolar.map((site) => site.kimlik.kodAdi).join(", ")}. Panelin "Demoyu gez" bağlantısı hangisine gideceğini bilemez.`,
    );
  }
  return demolar[0];
};

// Sunucudaki ortamda demonun adresi: canlıda canlı adresi, yoksa deneme adresi (demo arama motorlarına kapalıdır,
// deneme adresi de herkese açıktır); deneme ortamında deneme adresi.
export const sunucudakiDemoAdresi = (
  demo: DemoAdayi | undefined,
  ortam: Ortam,
): string | undefined => {
  if (demo === undefined) return undefined;
  const { canli, deneme } = demo.kimlik.adresler;
  return ortam === "canli" ? (canli ?? deneme) : deneme;
};

// Yerelde (yerel ortam, tarayıcı testleri) demonun adresi: Caddy'nin site adresi.
export const yereldekiDemoAdresi = (
  demo: DemoAdayi | undefined,
  port: string | number,
): string | undefined =>
  demo === undefined ? undefined : `http://${demo.kimlik.kodAdi}.localhost:${port}`;

// Kutunun ortamına eklenecek değişken: adres yoksa hiçbir şey.
export const temaDemosuOrtami = (adres: string | undefined): Record<string, string> =>
  adres === undefined ? {} : { [temaDemosuAdresiDegiskeni]: adres };

// Projedeki siteler/ klasörünün geçerli siteleri. Geçersiz site burada atlanır: onu yayın ve site doğrulaması
// kendisi durdurur.
export const projedekiSiteler = (klasor = join(kok, "siteler")): Site[] =>
  existsSync(klasor)
    ? readdirSync(klasor, { withFileTypes: true })
        .filter((girdi) => girdi.isDirectory())
        .flatMap((girdi) => {
          const sonuc = siteKlasorunuDogrula(join(klasor, girdi.name));
          return sonuc.gecerli ? [sonuc.site] : [];
        })
    : [];
