# 0300 · Müşteri hesabını kapatma ve kişisel verisinin silinmesi

## Amaç

Bugün müşteri hesabını kapatan ya da silen bir yol yok. Karar 0157'ye göre hesap kapatma müşterinin kendi isteğiyle, KVKK başvurusu olarak ayrı ele alınacak. Kart 0271'in "müşteri silinince notları da silinir" maddesi bugün yalnız veritabanı bağıyla tutuyor: müşterinin satırı kalıcı silinince notları da gider (`musteri_notlari`, `onDelete: cascade`). Hesap yalnız silindi diye işaretlenirse (`silinme_zamani`) notlar ve metinleri süresiz kalır.

Bölüm: belirlenecek (kart 0271'in bağımsız kontrolünde bulundu).

## Olmazsa olmazlar

- Müşterinin hesabını kapatma yolu (müşterinin isteğiyle; panelden mi, başvuruyla mı olacağı ürün kararıdır).
- Hesap kapanınca mağazanın notları, adres defteri, onaylar dışındaki kişisel bilgiler ve oturumlar silinir; siparişlerin kişisel bilgisi saklama süresi kuralıyla (karar 0150) kalır.
- Notların silindiği gerçek veritabanıyla testte.

## Sınırlar

- Siparişlerin kişisel veri temizliği zaten var (kart 0234); bu kart onu değiştirmez.

## Bitti sayılır

- Kapatılan hesabın notları, adresleri ve oturumları veritabanında yok (test).
- Karar kaydı yazıldı.

## Durum

yapılacak
