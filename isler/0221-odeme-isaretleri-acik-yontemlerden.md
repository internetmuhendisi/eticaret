# 0221 · Alt kısmın ödeme işaretleri açık ödeme yöntemlerinden gelsin

## Amaç

Alt kısmın "ödeme işaretleri" bölümü ödeme işlevine bağlıdır (`cekirdek/kayitlar/islevler.ts`, `odeme: false`) ve bugün hiçbir sitede çizilmez. Kayıt, işaretlerin sitede gerçekten açık olan ödeme yöntemlerinden gelmesini söyler (kullanıcı kararı, karar 0083; `cekirdek/kayitlar/odeme.ts`, `odemeIsaretleri`). Kart 0214 havale ve kapıda ödemeyi, ödeme yöntemlerinin açıklığını ve sırasını getirdi (karar 0141); işaretler artık bu ayardan üretilebilir. Kart 0214'ün sınırı dışında kaldığı için ayrı iş olarak yazıldı.

## Olmazsa olmazlar

- Vitrin bağlamının `odemeIsaretleri` alanı açık ve kullanılabilir yöntemlerden (`kullanilabilirYontemler`) kurulur: havale işareti yalnız banka hesabı varken, kapıda ödeme işareti açıkken, kart işareti kartla ödeme eklentisi açıkken (kart 0215) ya da kapıda kartla ödeme açıkken (bu ikincisi ürün kararıdır, sorulur).
- `odeme` işlevi açılır; bölüm açık yöntem yoksa çizilmez (boşluk kaydı, kart 0172).
- Örnek Mağaza'nın alt kısmında işaretler görünür; mağaza sahibi bir yöntemi kapatınca işareti kalkar.
- Testler: bağlamın yöntemlerden kurulması (havale hesapsız, kapalı yöntem, sıra), boş bölüm, tarayıcıda alt kısım iki renkte ve üç genişlikte taramadan geçer.

## Sınırlar

- Kart markalarının logoları kartla ödeme eklentisiyle gelir (kart 0215).
- Ödeme yöntemlerinin kendisi ve paneli değişmez.

## Bitti sayılır

- Alt kısımdaki ödeme işaretleri sitenin açık yöntemleriyle aynıdır (test).
- Bir yöntem kapatılınca işareti vitrinden kalkar (test).

## Durum

yapılacak
