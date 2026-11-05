// Kalıcı kutuların yeniden başlama kuralı (kart 0038, karar 0033). Her kalıcı kutu tanımı kuralı
// tek tanımdan (kutu-kurali.mts) almalıdır; kuralı eksik bir tanım kırmızıya düşer.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kutuKuraliDogru, yenidenBaslama, yenidenBaslamaHatalari } from "../kutu-kurali.mts";
import { onKapiTanimi } from "../on-kapi.mts";
import { siteKutusu } from "../yerel-ortam.mts";

const kok = join(import.meta.dirname, "..", "..");
const sunucu = join(kok, "sunucu");

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
        PATH: process.env["PATH"],
        HOME: process.env["HOME"],
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
    expect(Object.keys(ortam.services).sort()).toEqual(["caddy", "veritabani"]);
    expect(yenidenBaslamaHatalari(ortam)).toEqual([]);
  });

  it("site kutusu", () => {
    const servis = siteKutusu("ornek-magaza", "/siteler/ornek-magaza", "altyapi-cekirdek:0.1.0");
    expect(yenidenBaslamaHatalari({ services: { site: servis } })).toEqual([]);
  });

  it("sunucudaki ön kapı", () => {
    expect(yenidenBaslamaHatalari(onKapiTanimi())).toEqual([]);
  });

  // Yeni bir kutu tanımı bu testin dışında kalmasın: sunucu/ altındaki her compose dosyası ve
  // komutlardaki her compose tanımı burada bilinen bir yerdir.
  it("bilinmeyen kutu tanımı yok", () => {
    const ayarlar = readdirSync(sunucu).filter((dosya) => /\.ya?ml$/.test(dosya));
    expect(ayarlar.sort()).toEqual(["compose.yaml", "yerel-ortam.yaml"]);
    const tanimlayanlar = readdirSync(join(kok, "komutlar"))
      .filter((dosya) => dosya.endsWith(".mts"))
      .filter((dosya) => /\bservices: \{/.test(readFileSync(join(kok, "komutlar", dosya), "utf8")));
    // sunucu-gizli-denemesi.mts geçici deneme kutularıdır, kuralı bilerek almaz.
    expect(tanimlayanlar.sort()).toEqual(["on-kapi.mts", "sunucu-gizli-denemesi.mts"]);
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
