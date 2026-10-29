// Tarayıcının ortak hata katmanı (kart 0014, karar 0025). Ekranda yakalanan her hata (bölüm
// sınırı, sayfa ve kök hata ekranı) buradan geçer. Tarayıcıdaki hata sunucunun günlüğüne
// gitmez; hata izleme aracı bağlanınca (kart 0022) tarayıcıdan doğrudan ona gider.
// Araç bağlanana kadar hata yalnız tarayıcının konsoluna yazılır.

export type IstemciHataIzlemeAraci = (hata: unknown) => void;

// Hata izleme aracının tarayıcıda bağlandığı tek yer.
let izlemeAraci: IstemciHataIzlemeAraci | undefined;

export const istemciHataIzlemeAraciniBagla = (arac: IstemciHataIzlemeAraci | undefined): void => {
  izlemeAraci = arac;
};

export const istemciHatasiniKaydet = (hata: unknown): void => {
  if (izlemeAraci === undefined) {
    console.error(hata);
    return;
  }
  try {
    izlemeAraci(hata);
  } catch {
    console.error(hata);
  }
};
