// Bir sözlükten anahtarla metin okuyan işlev (tek tanım): sunucunun okuyucusu (metin.ts) bütün dosyayla, vitrinin
// tarayıcıdaki okuyucusu (istemci-metni.tsx) yalnız vitrin metinleriyle kullanır (kart 0253). Olmayan anahtar hata verir.
export const sozluktenOkuyucu =
  <Anahtar extends string>(sozluk: unknown, dil: string) =>
  (anahtar: Anahtar): string => {
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
