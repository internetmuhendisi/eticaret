# 0291 · Katalog kapı testi async düzeni eşzamanlı çağırıyor

## Amaç

Kart 0290 katalog düzenini (`cekirdek/uygulama/app/gelistirme/bilesenler/layout.tsx`) `async` yaptı: tema CSS'ini beklerken kapı hatası artık reddedilen söz olarak döner. `cekirdek/katalog/testler/kapilar.test.ts` ("katalog kapalıyken düzen, sayfalar ve sayfa bilgileri bulunamadı verir") düzeni hâlâ eşzamanlı hata bekliyor (`expect(() => KatalogDuzeni(...)).toThrow`): test kırmızı, ayrıca yakalanmamış söz reddi bırakıyor. Kart 0266'nın çalışma kopyasında ölçüldü (ana dalla aynı dosyalar); hat ödeme sorunuyla başlamadığı için hatta görülmedi.

## Olmazsa olmazlar

- Test düzeni bekleyerek denetler (`await expect(KatalogDuzeni(...)).rejects.toThrow("bulunamadi")`); kapı yine temanın okunmasından önce çağrılır.
- Kapı çağrısı düzenden kaldırılınca test kırmızıya düşer.

## Sınırlar

- Katalogun davranışı değişmez, yalnız test.

## Bitti sayılır

- `kapilar.test.ts` yeşil, yakalanmamış hata yok; bozma kırmızı.
- Bağımsız kontrol yapıldı.

## Notlar

- Aynı gözden kaçışın sebebi: kart 0290'da kapı testi çalıştırılmadı. Async'e çevrilen başka sayfa ya da düzeni çağıran test var mı, aranır.

## Durum

yapılacak
