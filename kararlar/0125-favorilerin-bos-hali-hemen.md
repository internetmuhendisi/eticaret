# 0125 · Çerezsiz favoriler sayfası boş hâli hemen gösterir

## Tarih

2026-11-14

## Karar

Favoriler sayfasında sunucu çerezde hiç ürün görmezse (çerez yok ya da boş), "Henüz favoriniz yok" ekranı sunucuda hemen çizilir. Müşterinin hesap durumu bilinmeden iskelet gösterilmez. Hesabında favori olan üye bu cihazda ilk kez gelirse boş ekranı kısa bir an görür; listesi gelince sayfa bir kez yenilenir (karar 0110'daki yenileme kuralı). Çerezde ürün varken durum bilinene kadar iskelet görünür. Kullanıcı kararıdır (kart 0146).

## Neden

Yavaş telefon koşulunda sayfanın ana içeriği iskelet yüzünden 3,3 saniyede geliyordu; hedef 2,5 saniyedir (karar 0124). Boş hâl sunucuda çizilince 1,1 saniyeye indi (ölçüldü).

## Düşünülen diğer yollar

- **İskelet kalsın:** Kimse yanlış ekran görmezdi. Ama sayfa hız hedefini aşar, hedeften muaf tutulması gerekirdi.

## Sonuçları

- Hesabında favori olan üye, yeni bir cihazda favoriler sayfasını ilk açtığında bir an "favoriniz yok" görür, sonra sayfa yenilenir.
