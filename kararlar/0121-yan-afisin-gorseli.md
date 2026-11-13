# 0121 · Ürün vitrininin yan afişinde görselin yeri

## Tarih

2026-11-14

## Karar

**Kullanıcı kararları:**

- **Masaüstü:** Yan afiş ızgaranın boyuna uzar. Görsel yazının altında, afişin iç genişliği boyunca ve küçük köşelerle durur, kalan yüksekliği kırpılarak doldurur (`object-cover`). Afiş uzayınca görsel de büyür.
- **Telefon ve tablet:** Afiş ızgaranın üstündedir ve yataydır. Başlık, metin ve düğme solda, görsel sağda kendi oranıyla, kırpılmadan durur (telefonda üçte bir, tablette dörtte bir genişlik).

Görselin tarayıcıya bildirilen genişliği (`sizes`) bu yerleşime göredir (`gorselGenislikleri.panel`). Düğme başlık ve metinle aynı gruptadır.

Karar 0089'un yan afiş görselinin sağa yaslı küçük kare olduğu maddesinin yerine geçer.

## Neden

Müşteri gezisinde (2026-11-13) görüldü: yan afiş iki sıra kart kadar uzarken görsel sağ alt köşede afişin üçte ikisi genişliğinde küçük bir kare olarak kalıyordu (1280 px'te 139 px). Taslaktaki yerleşim kısa bir kutu ve dekupe bir ürün görseli içindi; mağaza sahibinin fotoğrafı orada kayboluyordu.

İlk uygulamada dar ekranlarda da görsel tam genişlikte 16:9 kırpılıyordu. Örnek Mağaza'nın dikey fotoğrafında konusu (gömlek ve çanta) kadrajdan çıktı, yalnız zemin göründü. Kullanıcı dar ekranda yatay afişi seçti.

## Düşünülen diğer yollar

- **Görsel bütün afişin zemini, yazı üstünde:** Kullanıcı seçmedi.
- **Taslaktaki gibi kalsın:** Kullanıcı seçmedi.
- **Dar ekranda tam genişlik, kırpmadan:** Kullanıcı seçmedi. Dikey görselde afiş telefonda yaklaşık 520 px uzar, ürünler aşağı kayar.
- **Dar ekranda tam genişlik, 16:9 kırparak:** Ölçülerek bırakıldı, konu kadrajdan çıkıyordu.

## Sonuçları

- Masaüstünde görsel afişin oranına göre kırpılır; dikey ya da yatay görselde kenarları kesilebilir, ortası görünür.
- Dar ekranda afiş kısalır (Örnek Mağaza'da telefonda 326'dan 187 px'e).
- Görünüş testi sınıfları, tarayıcı testi üç genişlikte görselin genişliğini, afişin boyunu ve oranı ölçer.
