// Fiyat girişinin değişikliğinin iş kuralı hataları (kart 0326): servis atar (giris-degisikligi.ts), panelin ekranı
// metnini seçer. Bağımsız küçük dosya: tarayıcıdaki ekran servisi içe aktarmaz.
export const fiyatGirisiHatalari = ["ayni-giris", "vergi-bolgesi-yok", "acik-odeme"] as const;
export type FiyatGirisiHatasi = (typeof fiyatGirisiHatalari)[number];
