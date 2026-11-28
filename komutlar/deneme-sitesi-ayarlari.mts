// Komutların kurduğu geçici deneme sitelerinin ayarlar.json içeriği (yerel ortam denemesi, yayın
// denemesi). Tek yerde: para biriminin çekirdekte varsayılanı yoktur (kart 0081, karar 0067), her
// deneme sitesi de yazar. Şemadan geçtiğini komutlar/testler/deneme-sitesi-ayarlari.test.ts denetler.
export const denemeSitesiAyarlari = { paraBirimi: "TRY" } as const;

// Gönderen adresi verilirse deneme sitesi e-posta da gönderir (kart 0132: Örnek Mağaza'nın yerine açılan deneme sitesi).
export const denemeSitesiAyarDosyasi = ({
  epostaGonderenAdresi,
}: {
  epostaGonderenAdresi?: string;
} = {}): string =>
  `${JSON.stringify({ ...denemeSitesiAyarlari, ...(epostaGonderenAdresi ? { epostaGonderenAdresi } : {}) }, null, 2)}\n`;
