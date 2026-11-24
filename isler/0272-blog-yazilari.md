# 0272 · Blog yazıları

## Amaç

Vitrinin blog bölümü işlevi yazılmadığı için çizilmiyor (kart 0112, `islevler.ts`: `blog: false`). Mağaza sahibi yazı yazıp yayınlayabilmeli, müşteri vitrinde okuyabilmeli.

Bölüm: Yönetim paneli. Önce 0258 ve 0259 bitmiş olmalı.

## Olmazsa olmazlar

- İçerik modülü (`cekirdek/moduller/icerik`): yazı (taslakta kararlaştırılan alanlarla), adres adı ve eski adres yönlendirmesi (kart 0135), yayın durumu ve zamanı, silme; değişiklik kaydı; biçimli metin vitrinde temizlenir.
- Panelde yazı listesi ve yazı formu; görsel kapak 0266'nın yükleme ucuyla.
- Vitrinde blog listesi ve yazı sayfası (sayfa bilgisi, sayfa yolu, `noindex` olmayan); ana sayfanın blog bölümü çizilir hâle gelir.
- Blogun açık olup olmadığı site ayarıdır (taslakta önerilir).
- Uçlar izinleriyle, rol erişim testi; vitrin sayfaları ekran ve hız ölçümüne girer.

## Sınırlar

- Yazıya yorum yoktur.

## Bitti sayılır

- Gerçek veritabanıyla görünürlük (taslak, zamanlanmış, silinmiş), adres yönlendirmesi, temizlik; tarayıcıda yazı yazılıp vitrinde okunur; panel ve vitrin iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
