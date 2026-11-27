# 0191 · Panelde arama

## Tarih

2026-11-27

## Karar

Panelin her sayfasında tek arama kutusu vardır (kart 0321): masaüstünde ana bölgenin üstündeki şeritte, telefon ve tablette üst çubuktaki büyüteçle tam genişlikte açılır; Ctrl K (Mac'te yalnız Cmd K: orada Ctrl K metin alanının "satır sonuna kadar sil" kısayoludur) kutuya götürür, telefonda menü açıksa onu kapatıp kutuyu açar. Yazdıkça siparişler (numara, müşterinin adı, e-postası), ürünler (ad, stok kodu, barkod; birleşiminki de ürünü bulur) ve müşteriler (ad, e-posta) türlerine göre gruplu gelir, her grupta en çok 5 sonuç. Ok tuşları gezer (seçim yokken yukarı ok son sonuca), Enter sonucu açar (seçim yoksa ilkini), Escape listeyi, telefonda ikinci Escape kutuyu kapatır. Yazma durmadan basılan Enter eski metnin sonucunu açmaz: yeni sonuçlar gelince ilkini açar (barkod okuyucu kodu yazıp hemen Enter gönderir). Sipariş ve müşteride 5'ten fazla sonuç varsa söylenir; ürünlerde "Bütün ürünlerde ara" ürün listesini aramayla açar.

- Her tür kendi ucunda ve kendi izniyle aranır (`panel-siparis-ara` `siparis.gor`, `panel-urun-ara` `urun.gor`, `panel-musteri-ara` `musteri.gor`). Düzen yöneticinin izni olan türleri çerçeveye verir; ekran ötekilerin isteğini göndermez, grubu yoktur. İzni olan tür yoksa arama çizilmez.
- Harf kuralı listelerinkidir (`aramaAnahtari`): Türkçe harfsiz ve büyük harfle bulur, `%` ve `_` düz harftir. Üç türün arama koşulu listeyle tek işlevdir (`siparisAramaKosulu`, müşteride `aramaKosulu`, üründe `aramaKosulu`). Ürün listesinin araması bu kartla barkodu da arar (bağımsız kontrolün bulgusu: "Bütün ürünlerde ara" barkodla aranınca listede karşılığı yoktu). Aranan metnin en çok uzunluğu ürün listesininkidir.
- Kişisel bilgisi silinmiş siparişin adı ve e-postası temizlikte silinir; sipariş yalnız numarasıyla bulunur, satırda yalnız numara yazar.
- Taslak, gizli ve arşivdeki ürün bulunur (panel listesi gibi); silinmiş ürün, silinmiş birleşimin kodu ve silinmiş hesap bulunmaz.
- Sınır her uçta `genel`dir (dakikada 120): yazma durunca (250 ms) istek gider, insan yazarken sınıra yaklaşılmaz; sınır dolunca "Çok sık arama yapıldı" söylenir.
- Aranabilen türler, uçları, izinleri ve sınırları `cekirdek/kayitlar/panel-arama.ts` kaydındadır; satırlar sunucuda sitenin biçimiyle kurulur (`cekirdek/yonetim-paneli/arama/veri.ts`).

## Neden

- Telefondaki müşteriye cevap veren mağaza sahibi önce hangi listede arayacağını seçmek zorunda kalmamalı (taslak).
- Tür başına uç, izin kuralını kapının kendi denetimine bırakır (karar 0040): izni olmayan türün sorgusu hiç çalışmaz, ikinci bir izin listesi yazılmaz. Rol erişim testi her ucu her kişiyle kendiliğinden dener.
- Arama koşulunu listeyle tek işlev yapmak, panelde iki aramanın farklı sonuç vermesini önler.

## Düşünülen diğer yollar

- Tek uç, içinde türleri izne göre süzmek: ucun kendi izni olmalıydı (kapı izinsiz uç kabul etmez), "herhangi bir yönetici" izni yoktur; süzgeç servise kalırdı, izni olmayan türün sorgusunun çalışmaması yalnız disiplin olurdu.
- Arama sonuçları sayfası (Enter'la tam sayfa): taslak açılır listeyi istiyor; listeler zaten kendi aramasıyla tam sonucu verir. Ürünlerde fazlası varsa "Bütün ürünlerde ara" ürün listesini aramayla açar. Sipariş ve müşteri listesinin araması adrese yazılmaz (kişisel bilgi, karar 0145): onlara bağlantı verilmez.
- Kendi istek sınırı (ör. dakikada 30): ayrı sınır yalnız taşkına karşıdır, `genel` bunu yapar; yeni bir sınır adı gerekmez.

## Sonuçları

- Taslaktaki eşleşen harflerin işaretlenmesi (sarı zemin) yoktur: eşleşme harf kuralıyla (Türkçe harfsiz, büyük harf) sunucuda yapılır, tarayıcıda aynı yerleri bulmak kuralın ikinci bir kopyasını isterdi.
- Taslaktaki "Bütün siparişlerde ara" bağlantısı yoktur (yukarıda).
- Bir türün isteği düşerse öteki türlerin sonuçları kalır, düşen türün adıyla söylenir; aynı metin (istek sınırı) bir kez söylenir.
- Grupta 5'ten fazla sipariş ya da müşteri varsa yalnız en yeni 5'i görünür, fazlası olduğu söylenir; aramayı daraltmak gerekir.
- Müşteri araması Müşteriler listesinin sorgusunu kullanır: her aramada bütün müşterilerin özetleri (sipariş sayısı, toplam, son siparişin adı) hesaplanır. 5–30 mağazalık ölçekte sorun beklenmez, ölçülmedi.
- Bildirim zili (taslakta şeridin sağında) bu kartta yoktur, şerit ona yer bırakır.
