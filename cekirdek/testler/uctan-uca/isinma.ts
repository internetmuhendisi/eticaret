// Geliştirme sunucusunda uygulamanın her yolunu bir kez ister (kart 0222). Geliştirme sunucusu bir yolu ilk
// istendiğinde derler; derleme sürerken o yola giden istek bekler. Kontrol hattında takımın ortasında ilk kez
// istenen ödeme ve stok bildirimi uçlarının derlemesi 4,5 saniyeyi geçti, tarayıcıda "[Fast Refresh] rebuilding"
// yazdı ve testin 5 saniyelik beklemesi düştü (hat izleri 44079499012 ve 43893063883).
//
// Yollar uygulamanın klasöründen okunur: yeni sayfa ve uç kendiliğinden ısınmaya girer. Yalnız page.tsx ve route.ts
// okunur; başka türden yol dosyası (ör. sitemap.ts) eklenirse buraya da eklenmelidir. Sayfaların tarayıcıda
// açılması (kart 0164) geliştirme taramasıdır (gelistirme-taramasi.test.ts): girişsiz istekte ara katmanın girişe
// yönlendirdiği sayfalar (panel, giriş kodu ve kurulum) orada deneme yöneticisiyle açılır.
//
// Kart 0251'den beri (karar 0184) yalnız tarayıcı testlerinin geliştirme aşamasının hazırlığıdır
// (playwright.gelistirme.config.ts). Asıl aşama ve hız ölçümü canlıdaki gibi derlenmiş sunucuda çalışır, orada
// derlenecek yol yoktur.
import { readdirSync } from "node:fs";
import { join, sep } from "node:path";
import type { FullConfig } from "@playwright/test";

const uygulamaKlasoru = join(import.meta.dirname, "..", "..", "uygulama", "app");

// Bilerek hata veren deneme sayfası (kart 0120) ısıtılmaz: her çalışmada sunucu günlüğüne hata yazardı.
const isitilmayanlar = new Set(["/gelistirme/hata-denemesi"]);

// Adresin yerine konan değer. Kayıt sayfaları bulunamadı verir; sayfa yine derlenir.
const ornekParca = "isinma";

// Dosyanın yolundan isteğin adresi: grup klasörleri adrese girmez, değişken parça örnek değer alır, isteğe bağlı
// her şeyi yakalayan parça boş kalır.
export const dosyaAdresi = (dosya: string): string => {
  const parcalar = dosya
    .split(sep)
    .slice(0, -1)
    .filter((parca) => !(parca.startsWith("(") && parca.endsWith(")")))
    .filter((parca) => !parca.startsWith("[["))
    .map((parca) => (parca.startsWith("[") ? ornekParca : parca));
  return `/${parcalar.join("/")}`;
};

export const isinmaAdresleri = (): string[] =>
  readdirSync(uygulamaKlasoru, { recursive: true, encoding: "utf8" })
    .filter((dosya) => /(^|[\\/])(page\.tsx|route\.ts)$/.test(dosya))
    .map(dosyaAdresi)
    .filter((adres) => !isitilmayanlar.has(adres))
    .sort();

// İstemci adresleri belgeler için ayrılmış bloklardan testlerin kullanmadığı bloktadır (testler 198.51.100.x ve
// 203.0.113.x kullanır): ısınma testlerin istek sınırını tüketmez.
const isinmaIstemcisi = "192.0.2.7";
// Hattın makinesinde tek bir ilk derleme 5 saniyeyi geçebildi; bu süre derlemenin bitmesini bekler. Bir yol bu
// sürede yanıt vermezse hazırlık düşer ve testler başlamaz: yanıt vermeyen sunucuda testler de geçmezdi.
const istekSuresi = 120_000;

// Sırayla ister: aynı anda verilen derlemeler hattın iki işlemcisinde birbirini bekletir. Yanıtın durumu önemsizdir
// (bulunamadı, giriş gerekli, yöntem yok); bağlantı kurulamazsa hazırlık düşer.
export const yollariIsit = async (kokAdres: string): Promise<void> => {
  for (const adres of isinmaAdresleri()) {
    const yanit = await fetch(new URL(adres, kokAdres), {
      redirect: "manual",
      headers: { "x-forwarded-for": isinmaIstemcisi },
      signal: AbortSignal.timeout(istekSuresi),
    });
    await yanit.arrayBuffer();
  }
};

// Girişsiz istekte girişe yönlenen panel sayfaları (giriş sayfaları dışında, yakalayıcı dahil).
const panelSayfasiMi = (adres: string) =>
  adres === "/yonetim" || (adres.startsWith("/yonetim/") && !adres.startsWith("/yonetim/giris"));
export const panelAdresleri = (): string[] => isinmaAdresleri().filter(panelSayfasiMi);

// Girişli adımların açtığı giriş sayfaları: girişsiz istekte girişe yönlenirler.
export const girisliGirisSayfalari = ["/yonetim/giris/kod", "/yonetim/giris/kurulum"] as const;

// Sayfa dosyası olan bütün adresler (ısıtılmayanlar dahil).
export const sayfaAdresleri = (): string[] =>
  readdirSync(uygulamaKlasoru, { recursive: true, encoding: "utf8" })
    .filter((dosya) => /(^|[\\/])page\.tsx$/.test(dosya))
    .map(dosyaAdresi)
    .sort();

// Tarayıcıyla girişsiz açılan sayfalar: panel ve girişli adımların açtığı giriş sayfaları dışındakiler.
export const girissizSayfalar = (): string[] =>
  sayfaAdresleri().filter(
    (adres) =>
      !isitilmayanlar.has(adres) &&
      !panelSayfasiMi(adres) &&
      !(girisliGirisSayfalari as readonly string[]).includes(adres),
  );

// Playwright'ın hazırlık olarak çağırdığı işlev: kök adres tarayıcı testlerinin ayarından.
export default async function isinma(ayar: FullConfig): Promise<void> {
  const kokAdres = ayar.projects[0]?.use.baseURL;
  if (kokAdres === undefined) throw new Error("Yolların ısınması: kök adres yok.");
  await yollariIsit(kokAdres);
}
