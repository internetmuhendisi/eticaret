# 0245 · Ödeme kuruluşunda takılan iadenin çözümü

## Amaç

Kartla ödenen siparişin iadesi kuruluştan yanıt gelmeyince ya da raporda bulunmayınca "bekliyor"da kalır (karar 0147). Bir parçası dönüp öteki kalıcı reddedilen iade de bekler. Bu sürede siparişte ne durum işlemi ne yeni iade yapılabilir. Mağaza sahibinin bu durumdan çıkış yolu yok (kart 0235'in bağımsız kontrolünün bulgusu).

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Ürün kararı: mağaza sahibi kuruluşun panelinden baktıktan sonra iadeyi "para döndü" diye elle tamamlayabilir mi, "vazgeç" ile kapatabilir mi; ikisinin de kaydı ve gerekçesi.
- Kararın yolu da değişiklik kaydına ve sipariş geçmişine yazılır, aynı para iki kez dönmez.
- Bekleyen iadenin yöneticiye bildirimi kart 0241 ile birlikte düşünülür.

## Sınırlar

- Kuruluşun API'sinde iadenin sorgulanması kart 0243'ün ölçümünden sonra değerlendirilir.

## Bitti sayılır

- Karar verildi ve uygulandı; testleri gerçek veritabanıyla.

## Durum

yapılacak
