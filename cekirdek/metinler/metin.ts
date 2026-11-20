// Ekran metinlerini anahtarla okuyan tek yol (.claude/rules/metinler.md). Sunucu ve panel bütün dosyayı okur;
// vitrinin tarayıcı kodu yalnız vitrin metinlerini okur (istemci-metni.tsx, kart 0253).
// Anahtarlar "modül.bölüm.anahtar" biçimindedir ve Türkçe dosyadan türetilir;
// olmayan bir anahtar tür kontrolünde hata verir. Yeni dil, aynı anahtarlarla yeni bir dosyadır.
import { type Dil, diller, varsayilanDil } from "./dil.ts";
import { sozluktenOkuyucu } from "./okuyucu.ts";
import tr from "./tr.json" with { type: "json" };

type Sozluk = typeof tr;

type Anahtarlar<T, On extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${On}${K}` : Anahtarlar<T[K], `${On}${K}.`>;
}[keyof T & string];

export type MetinAnahtari = Anahtarlar<Sozluk>;

// Dillerin sözlükleri (vitrin metinlerinin üretimi de bunu okur).
export const sozlukler = { tr } satisfies Record<Dil, Sozluk>;

export { type Dil, diller, varsayilanDil };

export const metinOkuyucu = (dil: Dil) => sozluktenOkuyucu<MetinAnahtari>(sozlukler[dil], dil);
