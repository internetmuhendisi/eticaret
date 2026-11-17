// IBAN'ın gösterimi (kart 0214, karar 0141): dörder karakterlik gruplar ("TR42 0001 …"), okunurluk için; saklanan
// boşluksuzdur (iban.ts). Tarayıcıda da kullanılır: doğrulamanın bağımlılıklarını (ülke verisi, zod) çekmemek için
// ayrı dosyadadır.
export const ibanYazisi = (iban: string): string => iban.replace(/(.{4})/g, "$1 ").trim();
