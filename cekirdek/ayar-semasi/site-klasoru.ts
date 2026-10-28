// Bir site klasörünü okur ve kimlik ile ayar şemasından geçirir (kart 0010).
// Doğrulama komutu (komutlar/site-dogrula.mts), testler ve çalışan uygulama aynı yolu kullanır.
// Komut bu dosyaları Node ile doğrudan çalıştırdığı için ayar-semasi/ ve onun aldığı dosyalar
// birbirini .ts uzantısıyla alır.
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { z } from "zod";
import { ayarSemasi, onekTuret, type SiteAyarlari } from "./ayarlar.ts";
import { type Kimlik, kimlikSemasi } from "./kimlik.ts";

export type Site = { kimlik: Kimlik; ayarlar: SiteAyarlari };

export type DogrulamaSonucu = { gecerli: true; site: Site } | { gecerli: false; hatalar: string[] };

const sorunlariYaz = (dosya: string, sorunlar: z.core.$ZodIssue[]): string[] =>
  sorunlar.map((sorun) => {
    const yer = sorun.path.length > 0 ? sorun.path.join(".") : "(dosyanın tamamı)";
    return `${dosya}: ${yer}: ${sorun.message}`;
  });

const jsonOku = (klasor: string, dosya: string): { deger: unknown } | { hata: string } => {
  const yol = join(klasor, dosya);
  if (!existsSync(yol)) return { hata: `${dosya}: dosya yok.` };
  try {
    return { deger: JSON.parse(readFileSync(yol, "utf8")) };
  } catch (hata) {
    return { hata: `${dosya}: geçerli JSON değil (${(hata as Error).message}).` };
  }
};

export const siteKlasorunuDogrula = (klasor: string): DogrulamaSonucu => {
  if (!existsSync(klasor)) return { gecerli: false, hatalar: [`${klasor}: klasör yok.`] };

  const hatalar: string[] = [];
  const hamKimlik = jsonOku(klasor, "kimlik.json");
  const hamAyarlar = jsonOku(klasor, "ayarlar.json");

  let kimlik: Kimlik | undefined;
  if ("hata" in hamKimlik) {
    hatalar.push(hamKimlik.hata);
  } else {
    const sonuc = kimlikSemasi.safeParse(hamKimlik.deger);
    if (sonuc.success) kimlik = sonuc.data;
    else hatalar.push(...sorunlariYaz("kimlik.json", sonuc.error.issues));
  }

  let ayarlar: z.output<typeof ayarSemasi> | undefined;
  if ("hata" in hamAyarlar) {
    hatalar.push(hamAyarlar.hata);
  } else {
    const sonuc = ayarSemasi.safeParse(hamAyarlar.deger);
    if (sonuc.success) ayarlar = sonuc.data;
    else hatalar.push(...sorunlariYaz("ayarlar.json", sonuc.error.issues));
  }

  if (kimlik !== undefined && kimlik.kodAdi !== basename(klasor)) {
    hatalar.push(
      `kimlik.json: kodAdi: klasörün adıyla aynı olmalı (kodAdi "${kimlik.kodAdi}", klasör "${basename(klasor)}").`,
    );
  }

  if (hatalar.length > 0 || kimlik === undefined || ayarlar === undefined) {
    return { gecerli: false, hatalar };
  }

  const siparisOneki = ayarlar.siparisOneki ?? onekTuret(kimlik.gorunenAd);
  if (siparisOneki.length < 2) {
    return {
      gecerli: false,
      hatalar: [
        "ayarlar.json: siparisOneki: görünen addan en az iki harf türetilemedi, öneki yazın.",
      ],
    };
  }
  return { gecerli: true, site: { kimlik, ayarlar: { ...ayarlar, siparisOneki } } };
};

// Klasör geçerli değilse bütün hataları sayarak durur.
export const siteKlasorunuOku = (klasor: string): Site => {
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) {
    throw new Error(`Site klasörü geçersiz (${klasor}):\n${sonuc.hatalar.join("\n")}`);
  }
  return sonuc.site;
};
