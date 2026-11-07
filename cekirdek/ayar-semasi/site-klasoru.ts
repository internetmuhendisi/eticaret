// Bir site klasörünü okur ve kimlik ile ayar şemasından geçirir (kart 0010).
// Doğrulama komutu (komutlar/site-dogrula.mts), testler ve çalışan uygulama aynı yolu kullanır.
// Komut bu dosyaları Node ile doğrudan çalıştırdığı için ayar-semasi/ ve onun aldığı dosyalar
// birbirini .ts uzantısıyla alır.
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { z } from "zod";
import {
  ayarSemasi,
  type MagazaAyarlari,
  magazaAyarSemasi,
  onekTuret,
  type SiteAyarlari,
} from "./ayarlar.ts";
import { type Kimlik, kimlikSemasi } from "./kimlik.ts";

// baslangic: mağaza sahibinin ayarlarının başlangıç değerleri, varsayılanları uygulanmış. Yalnız
// ayar veritabanında ilk kez yokken kullanılır (karar 0010, 0055); asıl değer veritabanındadır.
export type Site = { kimlik: Kimlik; ayarlar: SiteAyarlari; baslangic: MagazaAyarlari };

export type DogrulamaSonucu = { gecerli: true; site: Site } | { gecerli: false; hatalar: string[] };

const sorunlariYaz = (dosya: string, sorunlar: z.core.$ZodIssue[]): string[] =>
  sorunlar.map((sorun) => {
    const yer = sorun.path.length > 0 ? sorun.path.join(".") : "(dosyanın tamamı)";
    return `${dosya}: ${yer}: ${sorun.message}`;
  });

const jsonOku = (
  klasor: string,
  dosya: string,
  yoksa?: unknown,
): { deger: unknown } | { hata: string } => {
  const yol = join(klasor, dosya);
  if (!existsSync(yol)) {
    return yoksa === undefined ? { hata: `${dosya}: dosya yok.` } : { deger: yoksa };
  }
  try {
    return { deger: JSON.parse(readFileSync(yol, "utf8")) };
  } catch (hata) {
    return { hata: `${dosya}: geçerli JSON değil (${(hata as Error).message}).` };
  }
};

export const baslangicDosyasi = "baslangic/ayarlar.json";

// Bir ayar öteki sahibin dosyasına yazılmışsa doğru dosyayı söyler; şemanın "tanınmayan alan" hatası
// bunu söylemez.
const yanlisDosyadakiler = (
  dosya: string,
  deger: unknown,
  otekiDosya: string,
  otekiSema: z.ZodObject,
): string[] =>
  typeof deger === "object" && deger !== null && !Array.isArray(deger)
    ? Object.keys(deger)
        .filter((ad) => Object.hasOwn(otekiSema.shape, ad))
        .map(
          (ad) =>
            `${dosya}: ${ad}: bu ayar ${otekiDosya} dosyasına yazılır (ayarın sahibi o dosyanınkidir).`,
        )
    : [];

// Başlangıç dosyası yoksa bütün mağaza ayarları varsayılanla başlar. Şema testlerde değiştirilebilir:
// çekirdekte henüz mağaza sahibinin ayarı yoktur.
export const baslangicDosyasiniDogrula = <S extends z.ZodObject>(
  klasor: string,
  sema: S,
): { gecerli: true; deger: z.output<S> } | { gecerli: false; hatalar: string[] } => {
  const ham = jsonOku(klasor, baslangicDosyasi, {});
  if ("hata" in ham) return { gecerli: false, hatalar: [ham.hata] };
  const yanlislar = yanlisDosyadakiler(baslangicDosyasi, ham.deger, "ayarlar.json", ayarSemasi);
  const sonuc = sema.safeParse(ham.deger);
  if (yanlislar.length === 0 && sonuc.success) return { gecerli: true, deger: sonuc.data };
  return {
    gecerli: false,
    hatalar: [
      ...yanlislar,
      ...(sonuc.success ? [] : sorunlariYaz(baslangicDosyasi, sonuc.error.issues)),
    ],
  };
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
    hatalar.push(
      ...yanlisDosyadakiler("ayarlar.json", hamAyarlar.deger, baslangicDosyasi, magazaAyarSemasi),
    );
    const sonuc = ayarSemasi.safeParse(hamAyarlar.deger);
    if (sonuc.success) ayarlar = sonuc.data;
    else hatalar.push(...sorunlariYaz("ayarlar.json", sonuc.error.issues));
  }

  const baslangic = baslangicDosyasiniDogrula(klasor, magazaAyarSemasi);
  if (!baslangic.gecerli) hatalar.push(...baslangic.hatalar);

  if (kimlik !== undefined && kimlik.kodAdi !== basename(klasor)) {
    hatalar.push(
      `kimlik.json: kodAdi: klasörün adıyla aynı olmalı (kodAdi "${kimlik.kodAdi}", klasör "${basename(klasor)}").`,
    );
  }

  if (hatalar.length > 0 || kimlik === undefined || ayarlar === undefined || !baslangic.gecerli) {
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
  return {
    gecerli: true,
    site: { kimlik, ayarlar: { ...ayarlar, siparisOneki }, baslangic: baslangic.deger },
  };
};

// Klasör geçerli değilse bütün hataları sayarak durur.
export const siteKlasorunuOku = (klasor: string): Site => {
  const sonuc = siteKlasorunuDogrula(klasor);
  if (!sonuc.gecerli) {
    throw new Error(`Site klasörü geçersiz (${klasor}):\n${sonuc.hatalar.join("\n")}`);
  }
  return sonuc.site;
};
