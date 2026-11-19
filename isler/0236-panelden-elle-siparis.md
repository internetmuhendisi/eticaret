# 0236 · Panelden elle sipariş

## Amaç

Mağaza sahibi telefonla ya da yüz yüze aldığı siparişi panelden girebilmeli (temel paket: Sipariş). Elle sipariş, vitrinden gelen siparişle aynı kuralla kurulur.

Bölüm: Sipariş ve müşteri hesabı. Önce 0234 bitmiş olmalı.

## Olmazsa olmazlar

- Elle sipariş sepetle aynı hesaptan geçer (`sepetiHesapla`, `kargoHesapla`, vergi): tutar sunucuda hesaplanır, tarayıcıdan gelen tutar kullanılmaz.
- Siparişi kuran tek yol `siparisServisi.siparisiKur`'dur; elle sipariş de stoğu aynı işlemde "yeterliyse düş" ile düşürür ve başka oturumların ayırmalarını sayar.
- Müşteri: var olan üye seçilir ya da üye olmayan müşteri bilgisi girilir; teslimat ve fatura bilgisi ödeme adımının şemasıyla doğrulanır.
- Ödeme yöntemi ve başlangıç durumu: havale, kapıda ödeme ya da "ödendi" (elle tahsil); kartla ödeme panelden alınmaz.
- Geçmişte siparişi kimin girdiği ve "panelden" nedeni yazılır; değişiklik kaydına girer.
- Sözleşme onayları elle siparişte nasıl saklanır kullanıcıya sorulur (ön bilgilendirme mesafeli satışta zorunludur).
- Yönetici ucu ve en az panel ekranı (0233 taslağına göre): ürün arama, adet, müşteri, adres, yöntem, özet.
- Testler gerçek veritabanıyla: tutarın vitrin siparişiyle aynı çıkması, stok ve ayırma, son ürünün iki kez satılmaması, tarayıcıdan gelen tutarın yok sayılması, izinsiz rollerin reddi, iki site. Tarayıcıda klavyeyle elle sipariş, iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma yapılır.

## Sınırlar

- Sipariş e-postasının elle siparişte gidip gitmeyeceği kart 0240'ta, panelde seçimle.
- Ödeme öncesi sipariş düzeltme on dördüncü bölümdedir.

## Bitti sayılır

- Mağaza sahibi panelden sipariş giriyor, tutar ve stok vitrin siparişiyle aynı kuralla (test).
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
