// Tarayıcı testlerinden önce uygulamanın her yolunu bir kez ister (kart 0222). Geliştirme sunucusu bir yolu ilk
// istendiğinde derler; derleme sürerken o yola giden istek bekler. Kontrol hattında takımın ortasında ilk kez
// istenen ödeme ve stok bildirimi uçlarının derlemesi 4,5 saniyeyi geçti, tarayıcıda "[Fast Refresh] rebuilding"
// yazdı ve testin 5 saniyelik beklemesi düştü (hat izleri 44079499012 ve 43893063883). Isınmadan sonra testlerin
// isteği yalnız kendi işini bekler.
//
// Yollar uygulamanın klasöründen okunur: yeni sayfa ve uç kendiliğinden ısınmaya girer. Girişsiz istekte ara
// katmanın girişe yönlendirdiği sayfalar burada derlenmez: panel sayfaları (yonetim/(panel)/) ile giriş kodu ve
// kurulum sayfaları (yonetim/giris/kod, yonetim/giris/kurulum). Bunlar testlerde ilk açıldıklarında derlenir;
// hatta düştükleri görülmedi. Yalnız page.tsx ve route.ts okunur; başka türden yol dosyası (ör. sitemap.ts)
// eklenirse buraya da eklenmelidir.
//
// Tarayıcı testlerinin ikinci hazırlığıdır (playwright.config.ts), kurulumdan sonra çalışır. Hız ölçümünde yoktur:
// orada sunucu canlıdaki gibi önceden derlenmiştir ve kendinden imzalı sertifikalı vekilin arkasındadır; ısınma ilk
// gönderimde hız ölçümünün hazırlığına konmuştu, Node'un isteği sertifikayı reddedip hazırlığı düşürdü (hat
// 44220561276).
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

// İstemci adresi belgeler için ayrılmış bloklardan testlerin kullanmadığı bloktadır (testler 198.51.100.x ve
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

// Playwright'ın hazırlık olarak çağırdığı işlev: kök adres tarayıcı testlerinin ayarından.
export default async function isinma(ayar: FullConfig): Promise<void> {
  const kokAdres = ayar.projects[0]?.use.baseURL;
  if (kokAdres === undefined) throw new Error("Yolların ısınması: kök adres yok.");
  await yollariIsit(kokAdres);
}
