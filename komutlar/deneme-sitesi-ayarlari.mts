// Komutların kurduğu geçici deneme sitelerinin ayarlar.json içeriği (yerel ortam denemesi, yayın
// denemesi). Tek yerde: para biriminin çekirdekte varsayılanı yoktur (kart 0081, karar 0067), her
// deneme sitesi de yazar. Şemadan geçtiğini komutlar/testler/deneme-sitesi-ayarlari.test.ts denetler.
export const denemeSitesiAyarlari = { paraBirimi: "TRY" } as const;

export const denemeSitesiAyarDosyasi = (): string =>
  `${JSON.stringify(denemeSitesiAyarlari, null, 2)}\n`;
