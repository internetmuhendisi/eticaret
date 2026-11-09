// Marka ve etiket girdisinin ortak şemaları (kart 0078, karar 0064). Panelin ekranı ve uçlar aynı
// şemayı kullanır. Hata iletileri düz cümle değil koddur (grupHatalari); metni ekran çözer, her grup
// kendi metin anahtarlarını verir (marka/semalar.ts, etiket/semalar.ts).
import { z } from "zod";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { kayitMetni } from "../degisiklik-kaydi/deger.ts";

export const grupHatalari = [
  "kayda-uygun-degil",
  "adres-adi-bicimi",
  "adres-adi-tekrar",
  // Aynı adla iki grup (büyük küçük harf ayrımsız).
  "ad-tekrar",
  // Logo hazır bir görsel değil: dosya yok ya da silinmiş, kendisi bir boyut ya da boyutları eksik (kart 0111).
  "gorsel-gecersiz",
] as const;
export type GrupHatasi = (typeof grupHatalari)[number];

const hata = (kod: GrupHatasi) => kod;

const alanlar = {
  ad: kayitMetni(100),
  adresAdi: z.string().trim().max(adresAdiUzunlugu).regex(adresAdiKalibi, hata("adres-adi-bicimi")),
  aciklama: kayitMetni(10_000),
  // Dosya deposundaki görselin kimliği (kart 0111). Büyük harfle verilen kimlik küçük harfe çevrilir.
  logo: z.uuid().transform((kimlik) => kimlik.toLowerCase()),
};

// Grubun girilen ek alanları: açıklama markada, logo markada (kart 0111) girilir, etikette ikisi de yoktur.
export type GrupAlanlari = { aciklama: boolean; logo: boolean };

// Açıklamasız ya da logosuz grup (etiket) o alanı kabul etmez.
export const grupGirdisi = ({ aciklama, logo }: GrupAlanlari) =>
  z.strictObject({
    ad: alanlar.ad,
    adresAdi: alanlar.adresAdi.optional(),
    ...(aciklama ? { aciklama: alanlar.aciklama.optional() } : {}),
    ...(logo ? { logo: alanlar.logo.optional() } : {}),
  });
export type GrupGirdisi = {
  ad: string;
  adresAdi?: string | undefined;
  aciklama?: string | undefined;
  logo?: string | undefined;
};

// Yalnız verilen alan değişir; açıklamayı ya da logoyu kaldırmak için null.
export const grupDegisikligi = ({ aciklama, logo }: GrupAlanlari) =>
  z.strictObject({
    ad: alanlar.ad.optional(),
    adresAdi: alanlar.adresAdi.optional(),
    ...(aciklama ? { aciklama: alanlar.aciklama.nullable().optional() } : {}),
    ...(logo ? { logo: alanlar.logo.nullable().optional() } : {}),
  });
export type GrupDegisikligi = {
  ad?: string | undefined;
  adresAdi?: string | undefined;
  aciklama?: string | null | undefined;
  logo?: string | null | undefined;
};
