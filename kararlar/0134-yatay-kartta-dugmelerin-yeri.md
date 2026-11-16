# 0134 · Yatay ürün kartında düğmelerin yeri

## Tarih

2026-11-16

## Karar

Yatay (kompakt) ürün kartında sepet ve favori düğmeleri kart genişse fiyatın sağında durur; kart darsa fiyat bütün satırı alır, düğmeler fiyatın altına iner ve sağa yaslanır (kart 0193, kullanıcı kararı).

- "Dar", ekranın değil kartın kendi genişliğidir: kart kapsayıcıdır (`@container`), içeriğinin genişliği 22rem'in altındaysa düğmeler alta iner (`@max-kart:`). Telefonda tek sütunlu kart da, masaüstünde dört sütunlu ızgaradaki kart da aynı kuralla çizilir.
- Genişlik tasarım değerlerindedir: yeni değer ailesi `kapsayicilar` (`bilesenler/tasarim-degerleri/degerler.ts`), ilk değeri `kart: 22rem`. Tailwind ayarı onu kapsayıcı genişliği olarak tanır (`containers`).
- Klavye sırası (ad, sepet, favori), düğmelerin 44 px dokunma alanı, dikey ve büyük görselli kart ve fiyatın yazılışı (kart 0190) değişmez.

## Neden

- Düğmeler fiyatın yanındayken 320 px'te fiyata 70 px kalıyor, "225,00 ₺" bile simgesiyle bölünüyordu (ölçüldü).
- Geniş kartta düğmelerin fiyatın yanında kalması kartı kısa tutar; yalnız gereken yerde kart uzar.
- Ekran genişliğine bakmak yetmez: aynı yatay kart telefonda tek sütunda, masaüstünde dört sütunlu ızgarada da dardır.
- Fiyatın doğal genişliğine göre satırı kaydırmak denendi: fiyat bileşeni "Vergiler dahil" satırını da taşıdığı için geniş kartta da düğmeleri alta itti (görüntüde görüldü); kapsayıcı sorgusuna geçildi.

## Düşünülen diğer yollar

- Her zaman altta: bütün yatay kartlar aynı görünür, ama geniş kartta da kart uzar; seçilmedi.
- Yalnız sepet kalsın: favori yatay karttan kalkar, aralıklı fiyat 320 px'te yine iki satıra iner; seçilmedi.
- Favori görselin köşesinde: 80 px'lik görselin bir kısmını örter; seçilmedi.

## Sonuçları

- Kapsayıcı sorgusu projede ilk kez kullanılıyor; yeni kapsayıcı genişliği gerekirse `kapsayicilar`'a eklenir, serbest değer yazılmaz.
- Sepet işlevi açılınca (kart 0212) sekmeli vitrin ve "Kategoriye göre" gibi yatay kart kullanan bölümlerde düğmeler bu kuralla durur.
- Taslağın kompakt kartında düğme yoktur; taslakla fark yalnız düğmelerin yeridir.
