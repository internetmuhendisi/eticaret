# 0101 · Vitrin bölümünün ürün kararları

## Tarih

2026-11-11

## Karar

On birinci bölümün (Vitrin) kartları açılırken kullanıcı dört ürün kararı verdi:

1. **Canlıya çıkış:** Bölümün sonunda Örnek Mağaza'nın vitrini bugünkü deneme adresine yayınlanır (kart 0147). Gerçek alan adına geçilmez.
2. **Slider:** Panelde kayan afiş bölümünün adı "Slider"dır. Panelin ana menüsünde onun formunu doğrudan açan bir kısayol vardır (kart 0142):
   - Ana sayfada slider yoksa yeni slider formu açılır, kaydedilince ana sayfanın en üstüne eklenir.
   - Birden çok slider varsa sıradaki ilki açılır, formun üstünde kaç tane olduğu yazar.
   - Gizli slider açılırsa bu formda yazar, görünür yapma düğmesi durur.
3. **Yorum ayarı:** "Yalnız satın alanlar yorum yapabilir" ayarının varsayılanı açık kalır, Örnek Mağaza'da kapalıdır (kart 0139).
4. **Tema ekranı:** Panelin tema seçme ekranı (liste, demo bağlantısı, seçme, geri dönüş) bu bölümde yazılır (kart 0148). Tema ayarlarının ekranı on dördüncü bölümde kalır.

## Neden

- Örnek Mağaza demo sitedir: gerçek satış yapmaz, arama motorlarına kapalıdır (karar 0007). Gerçek alan adı ona bir şey katmaz, alan adı değişikliği de geri alınamaz işlerdendir.
- Mağaza sahibinin en sık değiştireceği bölüm slider'dır. Kısayol her durumda bir form açar, mağaza sahibini önce bölüm eklemeye zorlamaz.
- Sipariş modülü henüz yok. Ayar açıkken kimse yorum yazamaz, demo yorum gösteremezdi.
- Tema ekranı olmadan demolar hazır olsa da mağaza sahibi onlara panelden ulaşamazdı. Değişiklik ve geri dönüş servisi kart 0113'te yazıldığı için ekran küçük bir iştir.

## Düşünülen diğer yollar

- Gerçek alan adına geçmek: demo için gereksiz ve geri alınamaz; ilk gerçek mağazanın teslimine bırakıldı.
- Panelde "Kayan afiş" adı: terim sözlüğünün Türkçe adı; kullanıcı "Slider"ı seçti.
- Slider yokken kısayolu gizlemek ya da bölümler ekranına göndermek: mağaza sahibine fazladan adım; seçilmedi.
- Örnek Mağaza'da da ayarı açık bırakmak: yorum bölümü siparişler gelene kadar boş kalırdı.
- Tema ekranını on dördüncü bölüme bırakmak: demolar o güne kadar panelden görünmezdi.

## Sonuçları

- Panelde bu bölüm "Slider", vitrin kodunda ve katalogda "kayan afiş" adını taşır. İki ad terim sözlüğünde eşleştirilir.
- Örnek Mağaza'da giriş yapan her müşteri yorum yazabilir; yorumlar yine onaydan sonra yayınlanır.
- Alan adı geçişi ayrı bir iş olarak bekler.
