# 0015 · Çekirdeğin Docker görüntüsü

## Amaç

Çekirdeğin her sürümü sürüm numarasıyla etiketlenmiş bir Docker görüntüsü olur. Aynı görüntü bir site klasörü ve bir veritabanıyla birleşince o site çalışır (kararlar 0011, 0013).

Önce 0014 bitmiş olmalı.

## Olmazsa olmazlar

- Çekirdek uygulamasını üreten `Dockerfile`. Görüntüde site klasörü ve gizli bilgi yoktur.
- Görüntü çekirdek sürüm numarasıyla etiketlenir. Sürüm numarası tek yerden okunur.
- Site klasörü ve gizli bilgiler görüntüye çalışırken dışarıdan verilir.
- Görüntü kök kullanıcıyla çalışmaz.

## Sınırlar

- Caddy, sunucu ve yayın komutu bu işe girmez.
- Arka plan işlerinin ikinci süreci kuyruk yazılınca eklenir (0031).

## Bitti sayılır

- Görüntü tek komutla üretiliyor ve sürüm etiketini taşıyor.
- Görüntü Örnek Mağaza klasörü ve yerel veritabanıyla çalıştırılınca sağlık ucu doğru sürümü söylüyor.
- Görüntünün içinde `.env`, site klasörü ya da gizli bilgi olmadığı kontrol edildi.

## Durum

yapılacak
