# 0196 · Ürün, müşteri ve kupon raporları

## Tarih

2026-11-27

## Karar

Raporlar ekranına Ürünler, Müşteriler ve Kuponlar sekmeleri eklendi (kart 0318; taslak `planlar/tasarim-yonu/panel-2.html`, karar 0185). Hepsi satış raporunun sayma kuralını ve dönemini kullanır (karar 0195); kural artık tek dosyadadır (`cekirdek/moduller/rapor/kural.ts`: satış ödeme gününde, iade tamamlandığı günde, yalnız sitenin para birimi). İzin `rapor.gor`, yalnız mağaza sahibi (kullanıcı kararı, kart 0317).

- **Ürün raporu:** ürün ve birleşim başına adet, tutar ve iade adedi. Tutar kalemin sipariş anındaki tutarıdır, kupon payı düşülmez (karar 0185). İade adedi dönemde tamamlanan iadelerin kalemleridir; yalnız ödenmiş siparişin iadesi sayılır (ödenmeden iptal edilen sipariş, süresi dolan havale de, tutarı 0 ve bütün kalemli bir iade satırı yazar; ortak kuralda). Ad, dönemdeki en son satış ya da iadedeki addır (birleşimden bağımsız); silinmiş ürün siparişteki adıyla ve "Silinmiş" işaretiyle kalır, ürün ekranına bağlantısı yoktur. Seçenekli ürünün birleşimleri ürünün altında yazar. Sıra tutar ya da adet (adreste `sirala=adet`).
- **Müşteri raporu:** yeni müşteri dönemde ödenmiş siparişi olup ondan önce ödenmiş siparişi olmayan üye, dönen müşteri dönemden önce de ödenmiş siparişi olan üyedir. Üye olmadan verilen siparişler yalnız sayılır. En çok alışveriş yapanlar dönemdeki satışlarının toplamıyla (iade düşülmez) sıralanır; ad üyenin kişisel bilgisi silinmemiş son siparişinin teslimat adıdır, kalmadıysa "Adı silinmiş" yazar, sipariş sayılara yine girer. Ad müşteri ayrıntısına bağlantıdır, kapatılmış hesapta bağlantı yoktur.
- **Kupon raporu:** kupon başına kullanım (kullanımı iptal ya da tam iadeyle geri verilen sipariş sayılmaz: kuponun sayfasıyla aynı kural, kart 0313), verilen indirim (ücretsiz kargo kuponunun verilmeyen kargo ücreti dahil), kuponlu satış ve iade sonrası. Kupon siparişe bağlanan kullanımdan bulunur; kod kuponun sayfasına bağlantıdır. "İade sonrası" o siparişlerin dönemden bağımsız bütün tamamlanmış iadeleri düşülmüş tutardır (bir siparişin iadeleri toplamını aşmaz): kuponun getirdiğini gösterir, kuponun sayfasıyla aynıdır (kart 0313).
- Sekmeler aynı sayfadadır (`/yonetim/raporlar?rapor=urunler`): komut çubuğu aynı kalır, dönem ve karşılaştırma sekmeler arasında korunur. Tablolar sayfa sayfadır (`panelSayfaBoyu`).
- CSV dört rapor için tek uçtur (`rapor-csv?rapor=`, satış raporunun `rapor-satis-csv` ucu yerine; uç henüz yayına çıkmamıştı). Müşteri raporunun dosyası üyelerin adlarını taşır: her indirmesi değişiklik kaydına girer (`rapor.musteriler-indirildi`: dönem ve satır sayısı), siparişleri dışa aktarmayla aynı gerekçe (karar 0194).
- Sekme şeridi ikinci kez gerektiği için ortak kütüphaneye taşındı (`SekmeBaglantilari`); ekip ekranı da onu kullanır.
- Sorgu hızı 100 bin siparişte (yerel, beş çalışmanın ortancası): 30 günlük ürün 16, müşteri 37, kupon 5 ms; bir yıllık 63, 47, 43 ms. Yeni indeks gerekmedi.

## Neden

- Sayma kuralının tek dosyada olması dört raporun aynı siparişi aynı günde saymasını sağlar.
- Kuponun getirdiği, o siparişlerden sonradan yapılan iadelerle anlamlıdır; satış raporunun gün kuralı kuponun dönemlik karşılaştırmasını bozmaz, kutular yine dönemin siparişleridir.
- Müşteri adı kişisel veridir: kişisel bilgisi silinmiş siparişin adı gösterilmez, adlı dosyanın indirilmesi kayda girer.

## Düşünülen diğer yollar

- **Sekmeleri ayrı sayfalar yapmak:** Her sekmenin kendi başlığı ve sayfa yolu olurdu; panelin kuralı rapor alt sayfalarında aynı komut çubuğunu ister. Seçilmedi.
- **Kupon raporunda iadeyi tamamlandığı dönemde düşmek:** Kupon başına net getiri, iadesi sonraki döneme düşen siparişte yanlış olurdu. Seçilmedi.
- **Her rapora ayrı CSV ucu:** Aynı istek çözümü ve izin dört kez yazılırdı. Seçilmedi.

## Sonuçları

- Taslaktan ayrılan yerler: sekme şeridi panelin ortak görünüşündedir (ekip ekranıyla aynı küçük yazı); ürün raporunun sıralaması açılır menü değil iki bağlantılı şerittir; birleşimler açılıp kapanmaz, ürünün altında hep görünür; tablolar telefonda kart değil kendi kutusunda yana kayan tablodur (sayfa kaymaz).
- En çok alışveriş yapanların tutarı iadeyi düşmez (taslaktaki "Tutar"); müşteri listesindeki toplam (iade düşülmüş, bütün zamanlar) ile karıştırılmamalı, ekranın notu söyler.
- Kuponu olmayan kod (kullanım kaydı bulunmayan eski sipariş) koduyla gruplanır, bağlantısı yoktur.
- Ürün raporu önceki dönemle karşılaştırma yapmaz; ürün sekmesinde karşılaştırılan dönem yazılmaz.
- Bağımsız kontrolün bulgularıyla düzeltildi: ödenmemiş siparişin iptalinin ürün raporunda iade sayılması, kupon raporunun geri verilen kullanımı sayması, ürün adının rastgele birleşimden alınması, müşteri raporunun notunun tutarın iadeyi düşmediğini söylememesi.
