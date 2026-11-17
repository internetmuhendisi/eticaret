// Posta adresinin ve telefonun ortak şeması (kart 0071). Mağaza adresi, ileride teslimat ve fatura
// adresi aynı şemayı kullanır. Bölge bolgeyiDogrula ile denetlenir; il listesi olan ülkede il ve
// ilçe zorunludur, posta kodu ülkenin biçimine uyar.
//
// Hata iletileri düz cümle değil koddur (bolgeHatalari ve adresHatalari); metni ekran çözer.
import { z } from "zod";
import {
  bolgeyiDogrula,
  ilListesiVarMi,
  postaKoduGecerliMi,
  postaKoduZorunluMu,
  ulkeTelefonKodu,
} from "./bolgeler.ts";

export const adresHatalari = [
  "il-gerekli",
  "ilce-gerekli",
  "posta-kodu-gerekli",
  "posta-kodu-bicimi",
  "telefon-bicimi",
] as const;
export type AdresHatasi = (typeof adresHatalari)[number];

const adresHatasi = (kod: AdresHatasi) => kod;

export const postaAdresiSemasi = z
  .strictObject({
    ulke: z.string().trim(),
    il: z.string().trim().optional(),
    ilce: z.string().trim().optional(),
    adres: z.string().trim().min(1).max(250),
    // Posta kodu biçimi bilinen ülkede zorunludur. Ötekilerde boş kalabilir: posta kodu olmayan
    // ülkeler vardır.
    postaKodu: z.string().trim().min(1).max(20).optional(),
  })
  .superRefine((adres, ctx) => {
    const bolge = bolgeyiDogrula(adres);
    if (!bolge.gecerli) {
      ctx.addIssue({ code: "custom", message: bolge.hata, path: [bolgeAlani(bolge.hata)] });
      return;
    }
    if (ilListesiVarMi(adres.ulke)) {
      if (adres.il === undefined) {
        ctx.addIssue({ code: "custom", message: adresHatasi("il-gerekli"), path: ["il"] });
      }
      if (adres.ilce === undefined) {
        ctx.addIssue({ code: "custom", message: adresHatasi("ilce-gerekli"), path: ["ilce"] });
      }
    }
    if (adres.postaKodu === undefined) {
      if (postaKoduZorunluMu(adres.ulke)) {
        ctx.addIssue({
          code: "custom",
          message: adresHatasi("posta-kodu-gerekli"),
          path: ["postaKodu"],
        });
      }
    } else if (!postaKoduGecerliMi(adres.ulke, adres.postaKodu)) {
      ctx.addIssue({
        code: "custom",
        message: adresHatasi("posta-kodu-bicimi"),
        path: ["postaKodu"],
      });
    }
  });
export type PostaAdresi = z.output<typeof postaAdresiSemasi>;

const bolgeAlani = (hata: string): "ulke" | "il" | "ilce" =>
  hata.startsWith("ulke") ? "ulke" : hata.startsWith("il-") ? "il" : "ilce";

// Telefon ülke koduyla yazılır (+90 ...), ülke kodu sıfırla başlamaz. Boşluk, tire ve parantez
// serbesttir; rakam sayısı uluslararası numaranın sınırlarındadır (10-15). Numaranın gerçekten var
// olduğu denetlenmez.
export const telefonGecerliMi = (telefon: string): boolean => {
  const temiz = telefon.trim();
  if (!/^\+[0-9 ()-]+$/.test(temiz)) return false;
  const rakamlar = temiz.replace(/[^0-9]/g, "");
  return !rakamlar.startsWith("0") && rakamlar.length >= 10 && rakamlar.length <= 15;
};

// Müşterinin ülke içindeki yazılışı (0555 000 00 00) ülkenin telefon koduyla uluslararası biçime çevrilir
// (+90 555 000 00 00, kart 0213): müşteri numarasını alıştığı gibi yazar, kayıtta tek biçim durur. "00" ile başlayan
// uluslararası yazılış "+" olur; ülke kodundan sonra yazılan ülke içi sıfır atılır. Kodu bilinmeyen ülkede değer
// olduğu gibi kalır ("00" dışında).
export const telefonuDuzelt = (ulke: string, telefon: string): string => {
  const temiz = telefon.trim();
  const uluslararasi = temiz.startsWith("00") ? `+${temiz.slice(2)}` : temiz;
  const kod = ulkeTelefonKodu(ulke);
  if (kod === undefined) return uluslararasi;
  // Ülke kodundan sonra yazılan ülke içi sıfır atılır (+90 0555 → +90 555).
  if (uluslararasi.startsWith(`+${kod}`)) {
    const kalan = uluslararasi.slice(kod.length + 1).trimStart();
    return kalan.startsWith("0") ? `+${kod} ${kalan.slice(1).trimStart()}` : uluslararasi;
  }
  if (!uluslararasi.startsWith("0")) return uluslararasi;
  return `+${kod} ${uluslararasi.slice(1).trimStart()}`;
};

export const telefonSemasi = z
  .string()
  .trim()
  .refine(telefonGecerliMi, { message: adresHatasi("telefon-bicimi") });
