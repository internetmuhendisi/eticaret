// Sitenin başlangıç kuponlarının şeması (baslangic/kuponlar.json, kart 0312, karar 0187). Site doğrulaması dosyayı bununla
// okur; kurulum (baslangic.ts) yalnız sitede hiç kupon satırı yokken bir kez yazar.
//
// - Kod harf, rakam ve tiredir; dosyada harf ayrımsız tekildir (veritabanındaki tekillikle aynı).
// - Değer türe göredir: yüzdede 1–100, tutarda kuruş (fiyat girişi biçiminde), ücretsiz kargoda 0.
// - Kapsam "urunler" ya da "kategoriler" ise kayıtlar başlangıç kataloğundaki adres adlarıdır; "hepsi"de kayıt yoktur.
// - Başlangıç ve bitiş sitenin saat diliminde yerel zamandır; bitiş başlangıçtan sonradır.
//
// Site doğrulaması bu dosyayı Node ile doğrudan okur: yalnız .ts uzantısıyla, Node'un çalıştırdığı dosyaları alır.
import { z } from "zod";
import {
  kuponKapsamlari,
  kuponKoduKalibi,
  kuponSinirlari,
  kuponTurleri,
} from "../../kayitlar/kampanya.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";

const sayi = (enAz: number, enCok: number) => z.int().min(enAz).max(enCok);

export const kuponBaslangicSemasi = z
  .array(
    z.strictObject({
      kod: z
        .string()
        .min(kuponSinirlari.kodEnAz)
        .max(kuponSinirlari.kodEnCok)
        .regex(kuponKoduKalibi),
      ad: z.string().trim().min(1).max(kuponSinirlari.adEnCok).optional(),
      tur: z.enum(kuponTurleri),
      deger: sayi(0, kuponSinirlari.tutarEnCok),
      kapsam: z.enum(kuponKapsamlari).default("hepsi"),
      kapsamAdresAdlari: z
        .array(z.string().max(adresAdiUzunlugu).regex(adresAdiKalibi))
        .max(kuponSinirlari.kapsamEnCok)
        .default([]),
      enAzTutar: sayi(0, kuponSinirlari.tutarEnCok).optional(),
      baslangic: z.string().optional(),
      bitis: z.string().optional(),
      toplamSinir: sayi(1, kuponSinirlari.kullanimEnCok).optional(),
      kisiBasiSinir: sayi(1, kuponSinirlari.kullanimEnCok).optional(),
      indirimdeGecmez: z.boolean().default(false),
      acik: z.boolean().default(true),
    }),
  )
  .max(50);
export type KuponBaslangici = z.output<typeof kuponBaslangicSemasi>;

// Kodun tekillik anahtarı: veritabanının ad anahtarıyla aynı (İ, I ve ı "i", sonra küçük harf; ad-anahtari.ts).
const kodAnahtari = (kod: string) => kod.replace(/[İIı]/g, "i").toLowerCase();

// Alanlar arası kurallar: tekil kod, türe uyan değer, kapsamın kayıtları (katalogda), geçerli zamanlar.
export const kuponBaslangicKurallari = (
  kuponlar: KuponBaslangici,
  katalog: { urun: ReadonlySet<string>; kategori: ReadonlySet<string> },
  saatDilimi: string,
): string[] => {
  const sorunlar: string[] = [];
  const kodlar = new Set<string>();
  kuponlar.forEach((kupon, sira) => {
    const yer = `${sira}`;
    const anahtar = kodAnahtari(kupon.kod);
    if (kodlar.has(anahtar))
      sorunlar.push(`${yer}.kod: aynı kod iki kez (harf büyüklüğü fark etmez).`);
    kodlar.add(anahtar);
    const degerGecerli =
      kupon.tur === "yuzde"
        ? kupon.deger >= kuponSinirlari.yuzdeEnAz && kupon.deger <= kuponSinirlari.yuzdeEnCok
        : kupon.tur === "tutar"
          ? kupon.deger > 0
          : kupon.deger === 0;
    if (!degerGecerli) sorunlar.push(`${yer}.deger: kuponun türüne uymuyor.`);
    if ((kupon.kapsam === "hepsi") !== (kupon.kapsamAdresAdlari.length === 0)) {
      sorunlar.push(
        `${yer}.kapsamAdresAdlari: "hepsi" kapsamında boş, öteki kapsamlarda dolu olmalı.`,
      );
    }
    const kayitlar = kupon.kapsam === "urunler" ? katalog.urun : katalog.kategori;
    for (const adresAdi of kupon.kapsam === "hepsi" ? [] : kupon.kapsamAdresAdlari) {
      if (!kayitlar.has(adresAdi)) {
        sorunlar.push(`${yer}.kapsamAdresAdlari: ${adresAdi} başlangıç kataloğunda yok.`);
      }
    }
    const zamanlar = (["baslangic", "bitis"] as const).map((alan) => {
      const yerel = kupon[alan];
      if (yerel === undefined) return undefined;
      const an = yerelZamandan(yerel, saatDilimi);
      if (an === undefined) sorunlar.push(`${yer}.${alan}: yerel zaman okunamadı.`);
      return an;
    });
    const [baslangic, bitis] = zamanlar;
    if (baslangic !== undefined && bitis !== undefined && bitis <= baslangic) {
      sorunlar.push(`${yer}.bitis: başlangıçtan sonra olmalı.`);
    }
  });
  return sorunlar;
};
