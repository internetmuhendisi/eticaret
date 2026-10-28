// Ekran metinlerini anahtarla okuyan tek yol (.claude/rules/metinler.md).
// Anahtarlar "modül.bölüm.anahtar" biçimindedir ve Türkçe dosyadan türetilir;
// olmayan bir anahtar tür kontrolünde hata verir. Yeni dil, aynı anahtarlarla yeni bir dosyadır.
import tr from "./tr.json" with { type: "json" };

type Sozluk = typeof tr;

type Anahtarlar<T, On extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${On}${K}` : Anahtarlar<T[K], `${On}${K}.`>;
}[keyof T & string];

export type MetinAnahtari = Anahtarlar<Sozluk>;

const sozlukler = { tr } satisfies Record<string, Sozluk>;

export type Dil = keyof typeof sozlukler;

// Metin dosyası olan diller. Sitenin dil ayarı yalnız bunlardan biri olabilir.
export const diller = Object.keys(sozlukler) as [Dil, ...Dil[]];

export const metinOkuyucu = (dil: Dil) => {
  const sozluk: unknown = sozlukler[dil];
  return (anahtar: MetinAnahtari): string => {
    const deger = anahtar
      .split(".")
      .reduce<unknown>(
        (dal, parca) =>
          typeof dal === "object" && dal !== null
            ? (dal as Record<string, unknown>)[parca]
            : undefined,
        sozluk,
      );
    if (typeof deger !== "string") {
      throw new Error(`Metin bulunamadı: ${dil}.${anahtar}`);
    }
    return deger;
  };
};
