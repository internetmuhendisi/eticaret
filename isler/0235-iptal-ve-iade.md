# 0235 · İptal, tam ve kısmi iade

## Amaç

Mağaza sahibi siparişi iptal edebilmeli, siparişi tamamen ya da ürün ve adet bazında kısmen iade edebilmeli; kartla ödenen siparişte para ödeme kuruluşu üzerinden geri ödenmeli (temel paket: Sipariş; karar 0142: kartla iade bu bölümde).

Bölüm: Sipariş ve müşteri hesabı. Önce 0234 bitmiş olmalı.

## Olmazsa olmazlar

- İptal, tam iade ve kısmi iade tek akıştan yürür (iş kuralları). İade tutarı ve vergisi fiyat hesabıyla aynı işlevden gelir; vergi orana göre ayrılır, siparişteki oranlar kullanılır.
- Kısmi iade: ürün ve adet bazında; kargo dahil ya da hariç; elle tutar (siparişin iade edilebilir kalanını aşamaz). Bir siparişte birden çok kısmi iade olabilir; toplamı ödenen tutarı aşamaz.
- Stoğa geri koymak seçimlidir (kusurlu ürün geri konmaz); geri konan adet yalnız o siparişin düşürdüğü adet kadardır (`stokArtir`).
- Durum: tamamı iade edilen sipariş "iade edildi", kısmen iade edilen "kısmi iade"; iptal ödeme alınmadan ya da alındıktan sonra olabilir, geçişler kayıttaki gibidir.
- Kartla ödeme eklentisi açıkken (kart 0215): iptal ve iadede para ödeme kuruluşu üzerinden geri ödenir (aynı gün iptal ya da iade, kuruluşun kuralına göre); istek `disServiseIstek` ile, tekrarı önleyen kimlikle gider. Kuruluş reddeder ya da yanıt belirsizse sipariş iade edilmiş sayılmaz, durum beklemede kalır, yöneticiye bildirilir ve tarama sonucu sorar. Aynı iade iki kez gönderilmez. Sahte kuruluş (`sahte-kurulus.ts`) iade uçlarıyla genişler; gerçek deneme ortamında bir kez elle ölçülür.
- Havale ve kapıda ödemede para mağaza sahibince elle geri ödenir; iade kaydı tutarı ve nedeni saklar.
- Her iptal ve iade sipariş geçmişine ve değişiklik kaydına yazılır.
- Yönetici uçları ve en az panel ekranı (0233 taslağına göre): iptal ve iade penceresi.
- Testler gerçek veritabanıyla: elle hesaplanmış örneklerle tam ve kısmi iade (vergi dahil ve hariç gösterim, birden çok oran, kargo dahil ve hariç, elle tutar), iade toplamının ödenen tutarı aşamaması, aynı anda iki iade (sıra kurularak), stoğa geri koyma seçimi ve yalnız düşen adet, kartla iadede kuruluşun başarı, ret, belirsiz yanıt ve tekrar bildirimi, havale ve kapıda ödemede iade kaydı, iki site. Tarayıcıda panelden klavyeyle kısmi iade, iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda.

## Sınırlar

- Müşterinin iade talebi kart 0239'dadır; bu kart mağaza sahibinin yaptığı iptal ve iadedir.
- E-postalar kart 0240'tadır.
- Kupon ve kampanya indiriminin iadeye etkisi kampanya bölümüyle gelir.

## Bitti sayılır

- Mağaza sahibi siparişi iptal ediyor, tam ve kısmi iade yapıyor; tutar ve vergi elle hesaplanmış örneklerle aynı (test).
- Kartla ödenen siparişte iade ödeme kuruluşuna bir kez gidiyor, ret ve belirsiz yanıtta sipariş iade edilmiş sayılmıyor (test).
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
