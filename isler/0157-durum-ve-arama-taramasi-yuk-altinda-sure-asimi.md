# 0157 · Durum sayfaları ve arama taraması testleri yük altında süre sınırını aştı

## Amaç

Kart 0140'ın kapanış kontrolünde (2026-11-12), bütün tarayıcı takımında iki test 60 saniyelik sınırda kırmızı oldu:

- `cekirdek/testler/uctan-uca/durum-sayfalari.test.ts` satır 77: "olmayan vitrin adresi ve olmayan kayıt 404 ile, sitenin dilinde, üst ve alt kısımla açılır; iki renkte ve üç genişlikte taramadan geçer"
- `cekirdek/testler/uctan-uca/arama.test.ts` satır 142: "sonuç, sonuçsuz ve boş arama iki renkte ve üç genişlikte taramadan geçer; telefonda kutu satırın altındadır"

Bu çalışmada takımın 189 testinden 187'si geçti. Sunucu günlüğünde veritabanı bağlantı hatası yoktu.

Ölçülenler:

- İki test tek başına, ana dalda (kart 0140'sız) ve kart 0140'ın dalında geçti. En kısa süreler yakındı: ana dalda 21,8 ve 24,5 saniye, kart 0140'ın dalında 20,9 ve 26,0 saniye.
- İki dalın çalışmaları üst üste bindiğinde ana dalda da 41,9 ve 49,5 saniyeye çıktı.
- Yani testler yükte sınıra yaklaşıyor; kart 0140'a özgü bir yavaşlama ölçülmedi.

Bölüm: Vitrin. Kart 0140'ta görüldü, ona karıştırılmadı. Benzer kartlar: 0152 (katalog testleri yük altında), 0149, 0133.

## Olmazsa olmazlar

- Önce yeniden üretilir: iki test bütün takımla ya da yapay yükle tekrar tekrar çalıştırılır. Kaçta kaç düştüğü ve hangi adımda takıldığı yazılır.
- Kart 0152 ve 0149'la ortak bir sebep olup olmadığı ölçülür. Ortak sebep varsa kartlar birlikte kapanır.
- Sebebi ölçülmeden süre sınırı büyütülmez, tarama kısaltılmaz.
- Düzeltme kabul edilmeden önce eski hâlinin yük altında kırmızı, yeni hâlinin yeşil olduğu gösterilir.

## Sınırlar

- Durum sayfalarının ve aramanın davranışı değişmez. Bu iş yalnız testin kararlılığıdır. Gerçek bir ürün hatası çıkarsa ayrı kart açılır.

## Bitti sayılır

- İki test, kontrol hattında ve yerelde bütün takımla art arda en az beş kez geçer.
- Sebep ve ölçüm karta ya da karar kaydına yazılır.

## Durum

yapılacak
