// Değişiklik kaydına yazılamayan metin değerinin tek tanımı (karar 0045). Servis bu değeri görünce işi
// durdurur; serbest metin alan modüller (ürün adı, açıklama) aynı işlevle girdiyi şemada reddeder,
// böylece mağaza sahibinin yazdığı bir metin beklenmeyen hataya dönmez.
//
// Kalıp değerin tamamına bakar (baştaki ve sondaki boşluk atılır): e-posta adresi, giriş başlığı ya da
// JWT'nin kendisi. Cümle içinde geçen adres takılmaz.
import { z } from "zod";

const epostaKalibi = /^[^\s@]+@[^\s@]+$/;
const bearerKalibi = /^bearer\s/i;
const jwtKalibi = /^eyJ[\w-]+\.[\w-]+\./;
// "Basic " başlığı yalnız ardından "kullanıcı:şifre"nin base64 hâli gelirse yakalanır (kart 0076):
// "Basic Kazak" gibi bir ürün adı giriş başlığı değildir. Dolgu (=) zorunlu değildir.
const basicKalibi = /^basic\s+([A-Za-z0-9+/]+={0,2})$/i;

// Çözülen değer geçerli UTF-8 (Türkçe harfli şifre de olur), denetim karakteri yok ve içinde ":" var.
// atob ve TextDecoder tarayıcıda da çalışır: ürün şeması ekranla ortaktır.
const basicBasligiMi = (deger: string): boolean => {
  const kodlu = basicKalibi.exec(deger)?.[1];
  if (kodlu === undefined) return false;
  let cozulen: string;
  try {
    const baytlar = Uint8Array.from(atob(kodlu), (harf) => harf.charCodeAt(0));
    cozulen = new TextDecoder("utf-8", { fatal: true }).decode(baytlar);
  } catch {
    return false;
  }
  return cozulen.includes(":") && !/\p{Cc}/u.test(cozulen);
};

// Alan adının bu sözcüklerden birini taşıması yasaktır: şifre, anahtar ve kişisel veri kayda girmez.
// Kişiyi kimliğiyle yaz. Alan adı sözcüklerine bölünür: "fiyat_kart_komisyonu" gibi adlar takılmaz.
const yasakSozcukler = new Set([
  "sifre",
  "parola",
  "password",
  "pass",
  "pwd",
  "anahtar",
  "anahtari",
  "anahtarlar",
  "token",
  "secret",
  "jwt",
  "ozet",
  "hash",
  "cvv",
  "cvc",
  "yedek",
  "eposta",
  "email",
  "telefon",
]);

const sozcukler = (alan: string): string[] =>
  alan
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/);

// Alan adı kayda yazılamaz mı? Kayda başka modüllerden gelen alan adları (bölüm tarifinin alan kodları,
// kart 0106) da önceden bununla denetlenir.
export const kayitAlaniYasakMi = (alan: string): boolean =>
  sozcukler(alan).some((sozcuk) => yasakSozcukler.has(sozcuk));

export const kayitDegeriYasakMi = (ham: string): boolean => {
  const deger = ham.trim();
  return (
    epostaKalibi.test(deger) ||
    bearerKalibi.test(deger) ||
    jwtKalibi.test(deger) ||
    basicBasligiMi(deger)
  );
};

// Kayda girecek serbest metnin şeması: kırpılır, boş olamaz, en çok verilen uzunlukta, değerin tamamı
// kayda yazılamayan bir değer olamaz. NFC biçimine çevrilir: aynı görünen iki yazılış (birleşik ve
// ayrık "Ş") aynı metin olarak saklanır ve karşılaştırılır (kart 0078). Hata kodu modüllerin hata
// listesinde de yazar.
export const kayitMetniHatasi = "kayda-uygun-degil";
export const kayitMetni = (enCok: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(enCok)
    .refine((deger) => !kayitDegeriYasakMi(deger), kayitMetniHatasi)
    .transform((deger) => deger.normalize("NFC"));
