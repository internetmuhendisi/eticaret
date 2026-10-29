// Bozuk örnek: hata günlüğü ve hata katmanı yerine doğrudan konsola yazmak.
export const kaydet = (hata: unknown) => console.error(hata);
