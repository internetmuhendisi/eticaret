# 0228 · Panelde arka arkaya sıralamada yenileme eski sırayı gösterebiliyor

## Amaç

Kart 0223'ün bağımsız kontrolü kod okumasıyla buldu (ölçülmedi): hemen kaydedilen sıralanabilir listeler (menüler `menuler/ekran.tsx:360`, banka hesapları `odeme-yontemleri/banka-hesaplari.tsx:123`, vitrin bölümleri `vitrin-bolumleri/ekran.tsx:233`) sunucunun listesi değişince yerel sırayı bırakır (`setYerel(null)`).

- A sıralaması yapılıp, A'nın yenilemesi gelmeden B yapılırsa A'nın yenilemesi liste kısa süre A sırasını gösterir; B'nin yenilemesi doğru sırayı getirir. Kullanıcı arada gösterilen eski sıradan yeni bir taşıma yaparsa B geri alınabilir.
- Sıralama istekleri beklenmeden üst üste gider (`void islem(...)`). Sunucuya ters sırada ulaşırlarsa son sıra kaybolabilir (varsayım).

Kart 0224 ile ödeme yöntemlerinin sıralaması da hemen kaydedilir. O ekranın istekleri sırayla gider (kuyruk) ve formu `useSunucuFormu` ile tutar; öteki listeler için örnek olabilir.

## Olmazsa olmazlar

- Önce tarayıcıda ölçülür: yenileme isteği tutularak iki sıralama arka arkaya yapılır; ekranda görünen sıra ve veritabanındaki son sıra okunur. İsteklerin ters sırada ulaşması ayrıca denenir.
- Düzeltme ortak yerde yapılır (örneğin `SiralanabilirListe`'yi kullananların yerel sıra kalıbı tek kancaya alınır): kaydın yankısı olan yenileme yerel sırayı bırakmaz, istekler sırayla gider.
- Dört liste de aynı kalıba geçer.

## Sınırlar

- Sıralamanın klavye ve sürükleme davranışı değişmez.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Yenileme tutularak kurulan tarayıcı testi düzeltmeyle yeşil, düzeltme geri alınınca kırmızı.
- Kontrol hattı yeşil.

## Durum

yapılacak
