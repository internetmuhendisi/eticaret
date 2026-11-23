# 0295 · Vitrinin kodu 305 KB sınırının üstünde

## Amaç

Hat 45112363642'de (kart 0293 bitti kaydı, 9395fae) hız ölçümü kırmızıya düştü. Üç sayfa, sıkıştırılmış JavaScript için konan 305 KB sınırını aştı (`cekirdek/testler/hiz/hedefler.ts`). Bu sayfaların hız, kayma ve tepki değerlerinin hepsi hedefin içinde:

| Sayfa | Son yeşil hat 44851382823 (kart 0252, 21 Kasım) | Hat 45112363642 (23 Kasım) |
|---|---|---|
| Ürün | 301 KB | 306 KB |
| Havale bildirimi | 301 KB | 307 KB |
| Sipariş takibi | 300 KB | 305 KB (yuvarlanmış, sınırın üstünde) |

Ara hatlar hız ölçümüne gelmeden daha önceki adımlarda durdu. Bu yüzden büyüme 21 Kasım'dan beri görülmedi. Arada ana dala giren kartlar: 0258–0266, 0094, 0290–0293. Büyümeyi hangisinin yaptığı ölçülmedi.

Bölüm: Vitrin.

## Olmazsa olmazlar

- Önce ölçülür: 44851382823 ile 9395fae arasında vitrin sayfalarına hangi parçanın girdiği (derleme çıktısı ve tarayıcıdaki istekler, kayıt kayıt ya da ikiye bölerek).
- Büyüme panel ya da ortak kod yüzünden vitrine sızdıysa sızıntı kapatılır ve bir testle korunur; yeniden sızınca test kırmızıya düşer (kart 0253'ün metin testine benzer).
- Büyüme vitrinin gerçekten kullandığı koddansa küçültme yolu seçilir; sınır gevşetilmez (sınır kart 0253'te 320 KB'tan 305 KB'a indi).

## Sınırlar

- Kod sınırı değiştirilmez.
- Kodu genel olarak küçültmek kart 0194'ün işidir; bu kart yalnız 21 Kasım'dan sonraki büyümeyi geri alır.
- Davranış ve görünüş değişmez.

## Bitti sayılır

- Büyümenin kaynağı ölçüldü, karta yazıldı.
- Hız ölçümü yerelde hattın koşulunda yeşil; her sayfanın kod boyutu karta yazıldı.
- Sızıntıysa koruyan test, düzeltme geri alınınca kırmızı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
