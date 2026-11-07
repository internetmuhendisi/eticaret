// Kontrol hattının .env dosyasını üretir (kart 0017, karar 0029). Hatta gerçek gizli bilgi yoktur:
// şifreler her çalışmada yeniden üretilen rastgele değerlerdir ve çalışmayla birlikte yok olur.
// Biçim .env.example dosyasından gelir. VERITABANI_ADRESI demo site Örnek Mağaza'nındır (karar 0007).
// .env dosyası zaten varsa hiçbir şeye dokunmadan durur; yereldeki .env'nin üzerine yazılmaz.
// Çalıştırma: pnpm hat-ortami-hazirla

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { siteVeritabaniAdi } from "../cekirdek/veritabani/baglanti.ts";

const kok = join(import.meta.dirname, "..");
const envYolu = join(kok, ".env");

if (existsSync(envYolu)) {
  console.error(".env zaten var, dokunulmadı. Bu komut yalnız .env'si olmayan hat ortamı içindir.");
  process.exit(1);
}

const ornek = parseEnv(readFileSync(join(kok, ".env.example"), "utf8"));
const port = (ad: string): string => {
  const deger = ornek[ad];
  if (!deger) throw new Error(`.env.example dosyasında ${ad} yok.`);
  return deger;
};
const sifre = () => randomBytes(24).toString("base64url");

const { kimlik } = siteKlasorunuOku(join(kok, "siteler", "ornek-magaza"));
const ad = siteVeritabaniAdi(kimlik.kodAdi);
const veritabaniPortu = port("VERITABANI_PORTU");

// Adres parça parça kurulur: kayıtlı dosyada şifreli adres kalıbı durmaz (veri ayrımı testi).
const adres = new URL("postgres://localhost");
adres.username = ad;
adres.password = sifre();
adres.port = veritabaniPortu;
adres.pathname = `/${ad}`;

const degerler: Record<string, string> = {
  VERITABANI_PORTU: veritabaniPortu,
  VERITABANI_YONETICI_SIFRESI: sifre(),
  VERITABANI_ADRESI: adres.href,
  IKI_ASAMA_ANAHTARI: randomBytes(32).toString("hex"),
  YEREL_ORTAM_PORTU: port("YEREL_ORTAM_PORTU"),
  POSTA_SMTP_PORTU: port("POSTA_SMTP_PORTU"),
  POSTA_KUTUSU_PORTU: port("POSTA_KUTUSU_PORTU"),
  EPOSTA_SUNUCUSU: port("EPOSTA_SUNUCUSU"),
  // Hatta Hetzner anahtarı bilerek yoktur: sunucu denetimi hatta çalışmaz (karar 0030).
  HETZNER_ANAHTARI: "",
  // Cloudflare anahtarı da hatta yoktur: alan adı komutu hatta çalışmaz (karar 0032).
  CLOUDFLARE_ANAHTARI: "",
  // Yedek deposunun anahtarı da hatta yoktur: yedek komutları hatta çalışmaz (karar 0037).
  YEDEK_DEPO_ERISIM_ANAHTARI: "",
  YEDEK_DEPO_GIZLI_ANAHTARI: "",
};

// .env.example'a eklenen her anahtar burada da üretilmeli; eksik kalırsa hat burada durur.
const eksikler = Object.keys(ornek).filter((anahtar) => !(anahtar in degerler));
if (eksikler.length > 0) {
  console.error(`Hat ortamı .env.example'daki şu anahtarları üretmiyor: ${eksikler.join(", ")}`);
  process.exit(1);
}

// "wx": dosya bu arada oluştuysa üzerine yazmaz, hata verir.
writeFileSync(
  envYolu,
  `${Object.entries(degerler)
    .map(([anahtar, deger]) => `${anahtar}=${deger}`)
    .join("\n")}\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(`hazır       .env (${Object.keys(degerler).join(", ")})`);
