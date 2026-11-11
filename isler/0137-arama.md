# 0137 · Arama

## Amaç

Müşteri üst kısımdaki arama kutusundan ürün arar. Türkçe harfleri yazmadan da bulabilmeli: "gomlek" yazan "Gömlek"i, "sisli" yazan "Şişli"yi bulur. Arama düğmesi bugün işlevine bağlı ve gizli (karar 0083); bu kartla açılır.

Bölüm: Vitrin. Önce 0136 bitmiş olmalı.

## Olmazsa olmazlar

- Arama ürün adında, stok kodunda, markada ve kategoride arar. Hangi alanların sayılacağı ve sırası testte yazılır.
- Türkçe harfler ve büyük-küçük harf ayrımı yok sayılır (ı-i, ş-s, ğ-g, ü-u, ö-o, ç-c, İ-I); aranan metin ve ürün aynı kuralla çevrilir. Kural tek yerde yazılır ve veritabanıyla uygulama aynı sonucu verir (ad anahtarında olduğu gibi, kart 0078).
- Sonuç sayfası kategori sayfasının liste, filtre ve sıralamasını kullanır; ek sıralama "en uygun"dur.
- Sonuç yoksa boş hâl ve öneri (kategoriler) görünür.
- Arama sayfası arama motorlarında dizine girmez.
- Arama isteği istek sınırına bağlıdır.
- Arama düğmesinin işlevi açılır, üst kısımdaki arama kutusu telefonda ve bilgisayarda çalışır.
- Taslaktaki "bulunamadı" sayfasının arama kutusu bu işlevle gelir (`cekirdek/vitrin/bulunamadi-sayfasi.tsx`, kart 0120, karar 0104).
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Yazarken öneri listesi (otomatik tamamlama) ve yazım hatası düzeltme yapılmaz; gerekirse ayrı kart.
- Dış arama servisi kullanılmaz.

## Bitti sayılır

- Türkçe harfsiz ve büyük harfli yazılış aynı sonucu veriyor (gerçek veritabanıyla, her harf için test).
- Görünmeyen ürün aramada gelmiyor.
- Tarayıcıda arama klavyeyle yapılıyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
