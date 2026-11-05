// Sunucunun kurulması ve denetlenmesi (kart 0018, karar 0030). Kurma (sunucu-kur.mts) ve denetleme
// (sunucu-denetle.mts) komutları bu dosyayı kullanır.
//
// - Sunucunun boyutu, yeri ve açık kapıları yalnız burada tanımlıdır.
// - Hetzner anahtarı yalnız .env'deki HETZNER_ANAHTARI'ndan okunur, ekrana ve dosyaya yazılmaz.
// - Giriş anahtarı bilgisayarda ~/.ssh altında durur, proje klasörüne girmez.
// - Kurulan sunucunun gizli olmayan bilgileri sunucu/sunucular.json dosyasına yazılır.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

export const kok = join(import.meta.dirname, "..");
const envYolu = join(kok, ".env");
export const ilkAcilisDosyasi = join(kok, "sunucu", "kurulum", "ilk-acilis.yaml");
export const kayitDosyasi = join(kok, "sunucu", "sunucular.json");

// Sunucunun tanımı. Boyut: site başına yarım GB tahminiyle 8 GB, yaklaşık 10 site (karar 0030).
export const sunucuTanimi = {
  ad: "altyapi-1",
  tip: "cx33",
  konum: "fsn1",
  ulke: "DE",
  imaj: "ubuntu-24.04",
  duvarAdi: "altyapi-duvar",
  anahtarAdi: "altyapi-giris",
  kullanici: "yonetici",
} as const;

// Dışarıya açık olan kapılar. Bunlar dışında her kapı dıştaki duvarda yanıtsız kalmalıdır.
export const acikKapilar = [22, 80, 443] as const;
export const yonetimKapisi = 22;

// Dıştaki duvarın kuralları: yalnız gereken kapılar, her yerden. Kurma komutu duvarı her
// çalışmada bu kurallara eşitler (elle eklenmiş kural silinir), denetim de bunlarla karşılaştırır.
export const duvarKurallari = acikKapilar.map((kapi) => ({
  direction: "in",
  protocol: "tcp",
  port: String(kapi),
  source_ips: ["0.0.0.0/0", "::/0"],
}));

export type DuvarKurali = {
  direction: string;
  protocol: string;
  port?: string | null;
  source_ips?: string[];
};

// Bir duvarın kuralları yalnız gereken kurallardan oluşuyorsa boş liste döner.
export const fazlaKurallar = (kurallar: DuvarKurali[]): string[] => {
  const izinli = new Set(duvarKurallari.map((k) => `${k.direction} ${k.protocol} ${k.port}`));
  return kurallar
    .map((k) => `${k.direction} ${k.protocol} ${k.port ?? "hepsi"}`)
    .filter((k) => !izinli.has(k));
};

// Bekleyen yeniden başlatma gece kendiliğinden yapılır (karar 0030); iki günden eskisi kırmızıdır.
export const yenidenBaslatmaSiniri = 2 * 24 * 60 * 60;

export const girisAnahtari = join(homedir(), ".ssh", "altyapi_sunucu");

// --- Hetzner ---

const hetznerAnahtarAdi = "HETZNER_ANAHTARI";

const hetznerAnahtari = (): string => {
  const deger = existsSync(envYolu)
    ? (parseEnv(readFileSync(envYolu, "utf8")) as Record<string, string | undefined>)[
        hetznerAnahtarAdi
      ]
    : undefined;
  if (!deger) {
    throw new Error(
      `.env dosyasında ${hetznerAnahtarAdi} yok. Biçimi .env.example dosyasında yazar.`,
    );
  }
  return deger;
};

export const hetzner = async <T,>(
  yol: string,
  { yontem = "GET", govde }: { yontem?: string; govde?: unknown } = {},
): Promise<T> => {
  const yanit = await fetch(`https://api.hetzner.cloud/v1${yol}`, {
    method: yontem,
    headers: {
      Authorization: `Bearer ${hetznerAnahtari()}`,
      ...(govde === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });
  const metin = await yanit.text();
  const veri = metin ? JSON.parse(metin) : {};
  if (!yanit.ok) {
    const hata = (veri as { error?: { code?: string; message?: string } }).error;
    throw new Error(
      `Hetzner ${yontem} ${yol} reddetti (${yanit.status}): ${hata?.code ?? ""} ${hata?.message ?? ""}`,
    );
  }
  return veri as T;
};

// Duvar kuralı değişince Hetzner duvarı bir süre "pending" gösterir; kurma ve denetim
// duvarın uygulanmasını bekler. En fazla iki dakika sonra son durum döner.
export const duvarUygulanmasiniBekle = async (
  sunucuNumarasi: number,
): Promise<{ id: number; status: string }[]> => {
  for (let deneme = 0; ; deneme++) {
    const { server } = await hetzner<{
      server: { public_net: { firewalls: { id: number; status: string }[] } };
    }>(`/servers/${sunucuNumarasi}`);
    const duvarlar = server.public_net.firewalls;
    if (duvarlar.every((d) => d.status === "applied") || deneme >= 40) return duvarlar;
    await new Promise((bitti) => setTimeout(bitti, 3000));
  }
};

// --- Kayıt ---

export type SunucuKaydi = {
  ad: string;
  hetzner_numarasi: number;
  tip: string;
  veri_merkezi: string;
  sehir: string;
  ulke: string;
  imaj: string;
  ipv4: string;
  ipv6: string;
  ipv6_agi: string;
  kullanici: string;
  acilis: string;
};

export const kayitlariOku = (): SunucuKaydi[] =>
  existsSync(kayitDosyasi) ? (JSON.parse(readFileSync(kayitDosyasi, "utf8")) as SunucuKaydi[]) : [];

export const kaydiYaz = (kayit: SunucuKaydi): void => {
  const oteki = kayitlariOku().filter((k) => k.ad !== kayit.ad);
  writeFileSync(kayitDosyasi, `${JSON.stringify([...oteki, kayit], null, 2)}\n`);
};

// --- Giriş anahtarı ---

export const girisAnahtariniHazirla = (): string => {
  if (!existsSync(girisAnahtari)) {
    mkdirSync(join(homedir(), ".ssh"), { recursive: true, mode: 0o700 });
    const sonuc = spawnSync(
      "ssh-keygen",
      ["-t", "ed25519", "-N", "", "-C", sunucuTanimi.anahtarAdi, "-f", girisAnahtari],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
    if (sonuc.status !== 0) throw new Error("Giriş anahtarı üretilemedi.");
    console.log(`üretildi    giriş anahtarı ${girisAnahtari}`);
  }
  return readFileSync(`${girisAnahtari}.pub`, "utf8").trim();
};

export const anahtarYeri = "__GIRIS_ANAHTARI__";

export const ilkAcilisAyari = (acikAnahtar: string): string => {
  if (!/^ssh-ed25519 [A-Za-z0-9+/=]+( \S+)?$/.test(acikAnahtar)) {
    throw new Error("Açık giriş anahtarı beklenen biçimde değil.");
  }
  const ayar = readFileSync(ilkAcilisDosyasi, "utf8");
  if (ayar.split(anahtarYeri).length !== 2) {
    throw new Error(`İlk açılış ayarında ${anahtarYeri} tam bir kez geçmeli.`);
  }
  // İşlevle verilir: anahtardaki "$&" gibi kalıplar özel anlam taşımaz.
  return ayar.replace(anahtarYeri, () => acikAnahtar);
};

// Hetzner sunucuya bir IPv6 ağı (/64) verir; sunucunun adresi o ağın ::1'idir.
export const ipv6Adresi = (ag: string): string => {
  const onek = ag.match(/^([0-9a-f:]+)::\/64$/i)?.[1];
  if (!onek) throw new Error(`Beklenmeyen IPv6 ağı: ${ag}`);
  return `${onek}::1`;
};

// --- ssh ---

// Bilinen sunucu dosyası proje dışındadır ve yalnız bu sunucular içindir.
const bilinenSunucular = join(homedir(), ".ssh", "altyapi_bilinen_sunucular");

// Yeni açılan bir sunucu eski bir sunucunun adresini alabilir; eski sunucu anahtarı unutulur.
export const bilinenSunucuyuUnut = (adres: string): void => {
  if (existsSync(bilinenSunucular)) {
    spawnSync("ssh-keygen", ["-R", adres, "-f", bilinenSunucular], { stdio: "ignore" });
  }
};

export const sshSecenekleri = [
  "-o",
  "BatchMode=yes",
  "-o",
  "ConnectTimeout=10",
  "-o",
  `UserKnownHostsFile=${bilinenSunucular}`,
  "-o",
  "StrictHostKeyChecking=accept-new",
];

export const sshKomutu = (
  adres: string,
  komut: string,
  { kullanici = sunucuTanimi.kullanici as string, ek = [] as string[] } = {},
) =>
  spawnSync(
    "ssh",
    [
      ...sshSecenekleri,
      "-i",
      girisAnahtari,
      "-o",
      "IdentitiesOnly=yes",
      ...ek,
      `${kullanici}@${adres}`,
      komut,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );

// --- Denetimin karar kuralları (testleri: komutlar/testler/sunucu.test.ts) ---

// ssh -v çıktısındaki "Authentications that can continue: publickey,password" satırını okur.
export const girisYontemleri = (sshCiktisi: string): string[] | undefined => {
  const satir = sshCiktisi.match(/Authentications that can continue: ([\w,-]+)/);
  return satir?.[1]?.split(",");
};

export const yalnizAnahtarla = (yontemler: string[] | undefined): boolean =>
  yontemler !== undefined && yontemler.length > 0 && yontemler.every((y) => y === "publickey");

// "hata": bağlantı denemesi ağ hatasıyla bitti (ağ yok, adres ulaşılamaz, dosya sınırı...).
// Bu durumda kapı hakkında bir şey bilinmez, denetim kırmızıdır.
export type KapiDurumu = "acik" | "reddetti" | "yanitsiz" | "hata";

// Gereken kapılar dışında her kapı yanıtsız olmalı (dıştaki duvar düşürür).
// Yönetim kapısı açık olmalı; web kapıları henüz dinleyen yoksa reddedebilir.
export const kapiHatalari = (durumlar: Map<number, KapiDurumu>): string[] => {
  const hatalar: string[] = [];
  const agHatasi = [...durumlar].filter(([, durum]) => durum === "hata").map(([kapi]) => kapi);
  if (agHatasi.length > 0) {
    hatalar.push(`${agHatasi.length} kapıda ağ hatası, sonuç güvenilmez (ilki ${agHatasi[0]})`);
  }
  for (const [kapi, durum] of durumlar) {
    if (durum === "hata") continue;
    const gerekli = (acikKapilar as readonly number[]).includes(kapi);
    if (!gerekli && durum !== "yanitsiz") hatalar.push(`${kapi} dışarıya açık (${durum})`);
    if (gerekli && durum === "yanitsiz") hatalar.push(`${kapi} duvarda kapalı, açık olmalı`);
  }
  if (durumlar.get(yonetimKapisi) !== "acik") {
    hatalar.push(
      `${yonetimKapisi} (yönetim girişi) açık değil (${durumlar.get(yonetimKapisi) ?? "bakılmadı"})`,
    );
  }
  return hatalar;
};
