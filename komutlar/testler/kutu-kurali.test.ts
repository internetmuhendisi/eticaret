// Kalıcı kutuların yeniden başlama kuralı (kart 0038, karar 0033). Her kalıcı kutu tanımı kuralı
// tek tanımdan (kutu-kurali.mts) almalıdır; kuralı eksik bir tanım kırmızıya düşer.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hataIzlemeTanimi } from "../hata-izleme.mts";
import { kutuKuraliDogru, yenidenBaslama, yenidenBaslamaHatalari } from "../kutu-kurali.mts";
import { onKapiTanimi } from "../on-kapi.mts";
import { veritabaniTanimi } from "../sunucu-veritabani.mts";
import { yayinKutusuTanimi } from "../yayin.mts";
import { siteKutusu, yerelKutuKullanicisi } from "../yerel-ortam.mts";

const kok = join(import.meta.dirname, "..", "..");
const sunucu = join(kok, "sunucu");

// Sürekli çalışan kutuları tanımlayan dosyalar: kuralı almalıdır.
const kaliciDosyalar = [
  "sunucu/compose.yaml",
  "sunucu/yerel-ortam.yaml",
  "komutlar/on-kapi.mts",
  "komutlar/yerel-ortam.mts",
  "komutlar/sunucu-veritabani.mts",
  "komutlar/yayin.mts",
  "komutlar/hata-izleme.mts",
];
// Geçici kutu açan dosyalar: kuralı bilerek almaz. Kutular --rm ile açılır ya da deneme
// sonunda silinir (sunucu-gizli-denemesi.mts).
const geciciDosyalar = [
  // Yönetici açan geçici kutu: iş bitince silinir (--rm).
  "komutlar/sunucu-yonetici.mts",
  "komutlar/sunucu-gizli-denemesi.mts",
  "komutlar/cekirdek-goruntusu-denetle.mts",
  "komutlar/sunucu-denetle.mts",
  "komutlar/sunucu-veritabani-denemesi.mts",
  "komutlar/yedek.mts",
  "komutlar/yedek-denemesi.mts",
  "sunucu/yedek/ortak.sh",
  // Dosya klasörlerinin ayrımını ölçen geçici kutular (kart 0072): --rm ile açılır.
  "komutlar/yerel-ortam-testi.mts",
];

// Metin bir kutu tanımlıyor ya da açıyor mu? Yorum satırları sayılmaz.
const kutuIzi = (metin: string): boolean => {
  const kod = metin
    .split("\n")
    .filter((satir) => !/^\s*(#|\/\/)/.test(satir))
    .join("\n");
  return [
    /^\s*services\s*:/m,
    /["']?\bservices\b["']?\s*[:=,}[]/,
    /\bdocker\s+(container\s+)?(run|create)\b/,
    // spawnSync("docker", ["run", ...]) ve docker(["run", ...]); dizi satırlara yayılabilir.
    /(\bdocker\s*\(|"docker"\s*,)\s*\[\s*("compose"\s*,\s*)?"(run|create)"/,
  ].some((kalip) => kalip.test(kod));
};

// Ayar dosyalarını Docker'ın kendisi okur: Docker'ın uygulayacağı kural budur. Değişkenler
// uydurma değerlerdir, tanımın okunması için gerekir.
const composeAyari = (dosyalar: string[]) => {
  const sonuc = spawnSync(
    "docker",
    [
      "compose",
      ...dosyalar.flatMap((dosya) => ["-f", join(sunucu, dosya)]),
      "config",
      "--format",
      "json",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        VERITABANI_YONETICI_SIFRESI: "uydurma",
        VERITABANI_PORTU: "5432",
        YEREL_ORTAM_PORTU: "8080",
      },
    },
  );
  if (sonuc.status !== 0) throw new Error(`docker compose config çalışmadı: ${sonuc.stderr}`);
  return JSON.parse(sonuc.stdout) as { services: Record<string, { restart?: string }> };
};

describe("kalıcı kutuların tanımı", () => {
  it("yerel ortamın veritabanı ve Caddy kutuları (sunucu/*.yaml)", () => {
    expect(yenidenBaslamaHatalari(composeAyari(["compose.yaml"]))).toEqual([]);
    const ortam = composeAyari(["compose.yaml", "yerel-ortam.yaml"]);
    expect(Object.keys(ortam.services).sort()).toEqual(["caddy", "posta-kutusu", "veritabani"]);
    expect(yenidenBaslamaHatalari(ortam)).toEqual([]);
  });

  it("yerel posta kutusunda dışarı gönderim ayarı yok, portu yalnız bu bilgisayara açık", () => {
    const metin = readFileSync(join(kok, "sunucu", "compose.yaml"), "utf8");
    const parca = metin.slice(
      metin.indexOf("  posta-kutusu:"),
      metin.indexOf("volumes:\n  veritabani:"),
    );
    expect(parca).toContain("image: axllent/mailpit:");
    expect(parca).not.toMatch(/environment:|env_file:|command:/);
    for (const dosya of ["sunucu/compose.yaml", "sunucu/yerel-ortam.yaml", ".env.example"]) {
      expect(readFileSync(join(kok, dosya), "utf8")).not.toMatch(/^\s*[^#\s].*MP_SMTP_RELAY/m);
    }
    for (const satir of parca.split("\n").filter((s) => /^\s+- "/.test(s))) {
      expect(satir).toMatch(/^\s+- "127\.0\.0\.1:/);
    }
  });

  it("site kutusu", () => {
    const servis = siteKutusu(
      "ornek-magaza",
      "/siteler/ornek-magaza",
      "altyapi-cekirdek:0.1.0",
      yerelKutuKullanicisi(1),
    );
    expect(yenidenBaslamaHatalari({ services: { site: servis } })).toEqual([]);
  });

  it("sunucudaki ön kapı", () => {
    expect(yenidenBaslamaHatalari(onKapiTanimi())).toEqual([]);
  });

  it("sunucudaki site kutusu", () => {
    expect(yenidenBaslamaHatalari(yayinKutusuTanimi("deneme", "ornek-magaza", 1, 1))).toEqual([]);
  });

  it("sunucudaki veritabanı", () => {
    expect(yenidenBaslamaHatalari(veritabaniTanimi("deneme", ["ornek-magaza"]))).toEqual([]);
  });

  it("sunucudaki hata izleme aracı", () => {
    expect(yenidenBaslamaHatalari(hataIzlemeTanimi("deneme"))).toEqual([]);
  });

  // Kalıcı tanımlar kuralı tek tanımdan alır; ayar dosyaları kuralı Docker'ın okumasıyla denetlenir.
  it.each(kaliciDosyalar)("%s kuralı tek tanımdan alıyor", (dosya) => {
    const metin = readFileSync(join(kok, dosya), "utf8");
    if (dosya.endsWith(".mts")) expect(metin).toContain("...kaliciKutu");
    else expect(metin).toContain(`restart: ${yenidenBaslama}`);
  });

  // Yeni bir kutu tanımı ya da kutu açılışı bu testin dışında kalmasın: projedeki her dosya
  // (kayda girmemiş yeni dosyalar da) taranır, kutu tanımlayan ya da açan her dosya iki
  // listeden birinde olmalıdır.
  it("bilinmeyen kutu tanımı yok", () => {
    const dosyalar = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: kok,
      encoding: "utf8",
    })
      .stdout.split("\n")
      .filter((dosya) => dosya && !/\.md$|\.test\.tsx?$|(^|\/)pnpm-lock\.yaml$/.test(dosya));
    expect(dosyalar.length).toBeGreaterThan(50);
    const kutuAcanlar = dosyalar.filter((dosya) => {
      try {
        return kutuIzi(readFileSync(join(kok, dosya), "utf8"));
      } catch {
        return false; // silinmiş ya da okunamayan dosya
      }
    });
    expect(kutuAcanlar.sort()).toEqual([...kaliciDosyalar, ...geciciDosyalar].sort());
  });
});

describe("kutu taraması bozuk örnekleri yakalar", () => {
  it.each([
    ["compose dosyası", "services:\n  site:\n    image: x\n"],
    ["compose JSON", '{ "services": { "a": {} } }'],
    ["nesne", "const t = { services: { a: {} } };"],
    ["kısa yazım", "const t = { services };"],
    ["değişkenle", "writeFileSync(d, JSON.stringify({ services: servisler }));"],
    ["sonradan ekleme", "tanim.services[ad] = kutu;"],
    ["betikte docker run", "docker run -d --name x busybox"],
    ["betikte docker create", "docker container create busybox"],
    ["dizi biçiminde docker run", 'spawnSync("docker", ["run", "-d", goruntu]);'],
    ["compose run", 'spawnSync("docker", ["compose", "run", "-d", "a"]);'],
    ["yardımcı işlevle, satırlara yayılmış", 'docker(\n  [\n    "run",\n    "-d",\n  ],\n);'],
  ])("%s", (_ad, metin) => {
    expect(kutuIzi(metin)).toBe(true);
  });

  it.each([
    ["yorum satırı", "# docker run -v a:b goruntu"],
    ["okuma", "for (const s of Object.values(tanim.services)) {}"],
    ["kutu açmayan docker komutu", 'spawnSync("docker", ["inspect", "x"]);'],
  ])("%s kutu sayılmaz", (_ad, metin) => {
    expect(kutuIzi(metin)).toBe(false);
  });
});

describe("kuralın denetimi bozuk tanımı yakalar", () => {
  it.each([
    ["kural yok", {}],
    ["kural farklı", { restart: "always" }],
    ["kural kapalı", { restart: "no" }],
  ])("%s kırmızıdır", (_ad, servis) => {
    const tanim = { services: { saglam: { restart: yenidenBaslama }, bozuk: servis } };
    expect(yenidenBaslamaHatalari(tanim)).toEqual([expect.stringMatching(/^bozuk: /)]);
  });

  it("kutusuz tanım kırmızıdır", () => {
    expect(yenidenBaslamaHatalari({ services: {} })).not.toEqual([]);
    expect(yenidenBaslamaHatalari({})).not.toEqual([]);
  });

  it("çalışan kutunun gerçek kuralı", () => {
    expect(kutuKuraliDogru("unless-stopped\n")).toBe(true);
    for (const gercek of ["no", "always", "on-failure", ""])
      expect(kutuKuraliDogru(gercek)).toBe(false);
  });
});
