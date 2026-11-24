# 0302 · Telefon çevirmesinde "00" boşluğu ve parantezli sıfır

## Amaç

Ödeme adımı, adres defteri ve mağaza bilgileri telefonu ortak `telefonuDuzelt` (`cekirdek/bolgeler/adres.ts`) ile uluslararası biçime çevirir. Kart 0278'in bağımsız kontrolü iki yazılışın yanlış çevrildiğini kodu okuyarak buldu (ölçülmedi):

- "00 90 312 000 00 00" → "+ 90 312 000 00 00": "+" işaretinden sonra boşluk kalır, ülke kodu tanınmaz, yine de geçerli sayılır.
- "+90 (0312) 000 00 00" → ülke kodundan sonraki ülke içi sıfır parantez içinde olduğu için atılmaz.

Bölüm: Sipariş ve müşteri hesabı. Kart 0278 sırasında bulundu, o karta karıştırılmadı.

## Olmazsa olmazlar

- Önce iki yazılış gerçek işlevle ölçülür.
- "00"dan sonraki boşluk atılır, ülke kodu tanınır; parantezli ülke içi sıfır atılır.
- Kayıtlı telefonlar bu değişiklikle bozulmaz (yalnız yeni yazılan değer çevrilir).

## Sınırlar

- Telefonun geçerlilik kuralı (`telefonGecerliMi`) bu iş dışında kalır, yalnız çevirme düzelir.

## Bitti sayılır

- İki yazılış ve öteki bilinen yazılışlar `cekirdek/bolgeler/testler/adres.test.ts`'te; düzeltme geri alınınca kırmızı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
