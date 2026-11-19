# 0241 · Yönetici bildirimleri

## Amaç

Mağaza sahibi yeni sipariş, havale bildirimi, iade talebi, iptal, düşük ve tükenen stok ve onay bekleyen yorumdan e-postayla haberdar olmalı (temel paket: E-postalar). Kartla ödeme karşılaştırmasının uyuşmazlığı da yöneticiye bildirilmeli (iş kuralları, karar 0142: bugün yalnız hata izlemede görünür).

Bölüm: Sipariş ve müşteri hesabı. Önce 0240 bitmiş olmalı.

## Olmazsa olmazlar

- Bildirimler: yeni sipariş, havale bildirimi, iade talebi, iptal (müşterinin ya da taramanın yaptığı), düşük stok ve tükenen stok (eşiği geçerken bir kez), onay bekleyen yorum, kartla ödeme günlük karşılaştırmasının uyuşmazlığı, iadesi kuruluşta beklemede kalan sipariş (kart 0235).
- Alıcılar ve hangi bildirimin açık olduğu site ayarıdır (0233 önerisiyle; varsayılan alıcı mağaza sahibi rolündeki yöneticiler ya da iletişim e-postası). Ayar şemaya ve `planlar/site-ayarlari.md` tablosuna girer.
- Kart 0240'ın şablon sistemiyle; bildirim olayla aynı işlemde kuyruğa girer, aynı olay için bir kez gider. Yönetici e-postası müşterinin kişisel verisini gerekenden fazla taşımaz.
- Ayarın en az panel ekranı (alıcılar ve açık bildirimler), değişiklik kaydına girer.
- Testler gerçek veritabanı ve yerel posta kutusuyla: her bildirimin doğru olayda bir kez gittiği, kapalı bildirimin gitmediği, stok eşiğinin bir kez tetiklediği (aynı anda iki düşürmede de), geri alınan işlemde gitmediği, iki site. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma yapılır (e-posta ve ayar ekranı).

## Sınırlar

- Panelin içindeki bildirimler (zil, liste) on dördüncü bölümdedir.
- Hatalı arka plan işlerinin ekranı ve bildirimi kart 0059'dadır.

## Bitti sayılır

- Listelenen her bildirim doğru olayda bir kez gidiyor, kapalıyken gitmiyor (test).
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
