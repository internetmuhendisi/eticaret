# 0074 · Vergi sınıfları ve oran tablosu

## Amaç

Site kendi vergi sınıflarını ve oranlarını tanımlar. Yapı ülkeye bağlı değildir, Türkiye yalnız başlangıç değeridir (temel paket: Vergi).

Önce 0069 ve 0070 bitmiş olmalı.

## Olmazsa olmazlar

- `vergi` modülü: model, servis, izinler, metinler, testler.
- Vergi açık ya da kapalı, vergi adı: mağaza sahibinin ayarı.
- Site vergi sınıflarını tanımlar. Oran tablosunun her satırında sınıf, bölge (ülke, isteğe bağlı il ya da eyalet, posta kodu), oran, vergi adı ve sıra durur. Aynı bölgede birden çok oran olabilir.
- Oran sabit ondalıklı tutulur, küsuratlı sayı kullanılmaz.
- Türkiye'de kurulan site "KDV" adıyla, %20, %10, %1 ve %0 sınıflarıyla başlar. Bu değerler çekirdeğin kodunda değil, başlangıç verisinde durur; yeri karar kaydına yazılır.
- Kullanılan bir sınıfın silinmesi ürünleri sınıfsız bırakmaz. Silme silinmiş işaretiyle yapılır.
- Sınıf ve oran değişiklikleri değişiklik kaydına yazılır.

## Sınırlar

- Vergi hesabı 0075'tedir.
- Siparişe o anki oranın yazılması ve iadede vergi ayrımı sipariş bölümüyle gelir.
- Ekran yazılmaz.

## Bitti sayılır

- Örnek Mağaza KDV ve dört sınıfla açılıyor.
- Çekirdekte "KDV" ve oran değerleri kodda geçmiyor, bunu bir test denetliyor.
- Kullanılan sınıfın silinmesi testte reddediliyor ya da işaretle yapılıyor.
- İki site birbirinin vergi tablosunu görmüyor.

## Durum

bitti
