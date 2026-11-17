// Satıcı bilgilerinin kaydı (kart 0091, karar 0138). Mesafeli satış sözleşmesi ve ön bilgilendirme formu satıcının
// unvanını ve vergi kimlik bilgilerini ister; bilgiler mağaza sahibinin ayarıdır (saticiBilgileri), şeması
// cekirdek/bolgeler/satici.ts'tedir. Numaraların biçimi ve kontrol hanesi ülkenin veri dosyasındadır
// (cekirdek/bolgeler/<ülke>.json, saticiKimligi): kod ülkeye bağlı yazılmaz.

// İşletmenin türü: vergi numarasının biçimi türe göre değişir (şirkette vergi kimlik numarası, şahıs işletmesinde
// kişinin kimlik numarası).
export const isletmeTurleri = ["sirket", "sahis"] as const;
export type IsletmeTuru = (typeof isletmeTurleri)[number];

// Kontrol hanesi hesapları; ülkenin veri dosyası numaranın hangisiyle denetleneceğini adıyla yazar.
export const numaraDenetimleri = ["vergi-kimlik-numarasi", "kimlik-numarasi"] as const;
export type NumaraDenetimi = (typeof numaraDenetimleri)[number];

// Şemanın hata kodları; metni ekran çözer (adres hatalarındaki gibi, ekran gelince metinleri eklenir).
export const saticiHatalari = [
  "ulke-gecersiz",
  "vergi-numarasi-bicimi",
  "vergi-numarasi-kontrol",
  "mersis-numarasi-bicimi",
  "kep-adresi-bicimi",
] as const;
export type SaticiHatasi = (typeof saticiHatalari)[number];
