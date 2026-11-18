// Tarayıcı testlerinden önce uygulamanın her yolunu bir kez ister (kart 0222). Geliştirme sunucusu bir yolu ilk
// istendiğinde derler; derleme sürerken o yola giden istek bekler. Kontrol hattında takımın ortasında ilk kez
// istenen ödeme ve stok bildirimi uçlarının derlemesi 4,5 saniyeyi geçti, tarayıcıda "[Fast Refresh] rebuilding"
// yazdı ve testin 5 saniyelik beklemesi düştü (hat izleri 44079499012 ve 43893063883). Isınmadan sonra testlerin
// isteği yalnız kendi işini bekler.
//
// Yollar uygulamanın klasöründen okunur: yeni sayfa ve uç kendiliğinden ısınmaya girer. Girişsiz istekte ara
// katmanın girişe yönlendirdiği sayfalar (panel sayfaları, giriş kodu ve kurulum) ikinci bölümde, gerçek tarayıcıyla
// bir deneme yöneticisi girerek açılır (kart 0164): hatta girişten sonra kurulum sayfasının ilk derlemesi 4,5 saniye
// sürdü ve testin 5 saniyelik beklemesi düştü (hat 44244153259). Yalnız page.tsx ve route.ts okunur; başka türden yol dosyası (ör. sitemap.ts)
// eklenirse buraya da eklenmelidir.
//
// Tarayıcı testlerinin ikinci hazırlığıdır (playwright.config.ts), kurulumdan sonra çalışır. Hız ölçümünde yoktur:
// orada sunucu canlıdaki gibi önceden derlenmiştir ve kendinden imzalı sertifikalı vekilin arkasındadır; ısınma ilk
// gönderimde hız ölçümünün hazırlığına konmuştu, Node'un isteği sertifikayı reddedip hazırlığı düşürdü (hat
// 44220561276).
import { readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { chromium, type FullConfig, type Page } from "@playwright/test";
import { paneleGir, sifreyleGir, yoneticiAc } from "./yonetici";

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

// Tarayıcı turu (kart 0164): sayfalar gerçek tarayıcıda açılır, sunucunun ve tarayıcının kodu birlikte derlenir.
// Önce girişsiz sayfalar; sonra deneme yöneticisi testlerin yoluyla açılır, şifre ve iki aşamalı kurulumdan geçer
// (kurulum sayfası), panelin her sayfasını açar; sonra kurulumu bitmiş hesapla yeniden girer (giriş kodu sayfası).
// Testlerin giriş yardımcıları kullanılır, beklemeleri ilk derlemeyi bekleyecek kadar uzundur. Her adımın bağlamı işi
// bitince kapanır: açık sayfa sonraki derlemelerin canlı güncellemesini almaz.
//
// Her tur kendi istemci adresinden gelir: giriş ucu dakikada beş istekle sınırlıdır, bir tur iki kez girer.
const tarayiciylaIsit = async (kokAdres: string, istemci: string): Promise<void> => {
  const tarayici = await chromium.launch();
  try {
    const adim = async (is: (sayfa: Page) => Promise<void>) => {
      const baglam = await tarayici.newContext({
        baseURL: kokAdres,
        extraHTTPHeaders: { "x-forwarded-for": istemci },
      });
      try {
        const sayfa = await baglam.newPage();
        sayfa.setDefaultTimeout(istekSuresi);
        sayfa.setDefaultNavigationTimeout(istekSuresi);
        await is(sayfa);
      } finally {
        await baglam.close();
      }
    };
    await adim(async (sayfa) => {
      for (const adres of girissizSayfalar()) await sayfa.goto(adres);
    });
    const yonetici = yoneticiAc();
    await adim(async (sayfa) => {
      await paneleGir(sayfa, yonetici, { beklemeSuresi: istekSuresi });
      for (const adres of panelAdresleri()) await sayfa.goto(adres);
    });
    await adim(async (sayfa) => {
      await sayfa.goto("/yonetim/giris");
      await sifreyleGir(sayfa, yonetici);
      await sayfa.waitForURL(/\/yonetim\/giris\/kod/);
    });
  } finally {
    await tarayici.close();
  }
};

// Tarayıcı turu iki kez yapılır (kart 0164). Boş önbellekle tek turdan sonra ilk test kurulum sayfasında 967 ms,
// menüler sayfasında 837 ms derleme bekledi; iki turdan sonra 6 ve 10 ms (birer deneme). Sebebin, sonradan derlenen
// sayfaların öncekileri yeniden derletmesi olduğu tahmindir, ölçülmedi. Üç tam takımda testler sırasında kurulum
// sayfasının en uzun derleme payı 44, 229 ve 115 ms (yalnız fetch ısınmasıyla 859 ms).
const tarayiciTurlari = ["192.0.2.8", "192.0.2.9"];

// Bir tur düşerse (yerelde ağ değişikliği, net::ERR_NETWORK_CHANGED) bir kez yeniden denenir; ikinci kez düşerse
// hazırlık düşer: sunucu ya da giriş gerçekten çalışmıyordur.
const turuYap = async (kokAdres: string, istemci: string): Promise<void> => {
  try {
    await tarayiciylaIsit(kokAdres, istemci);
  } catch {
    await tarayiciylaIsit(kokAdres, istemci);
  }
};

// Playwright'ın hazırlık olarak çağırdığı işlev: kök adres tarayıcı testlerinin ayarından.
export default async function isinma(ayar: FullConfig): Promise<void> {
  const kokAdres = ayar.projects[0]?.use.baseURL;
  if (kokAdres === undefined) throw new Error("Yolların ısınması: kök adres yok.");
  await yollariIsit(kokAdres);
  for (const istemci of tarayiciTurlari) await turuYap(kokAdres, istemci);
}
