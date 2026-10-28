# 0020 · Next.js'in kullanım bilgisi gönderimi kapalı

## Tarih

2026-10-28

## Karar

Next.js'in geliştiricisine adsız kullanım bilgisi göndermesi her yerde kapalıdır. Uygulamanın komutları (`gelistir`, `derle`, `baslat`) `NEXT_TELEMETRY_DISABLED=1` ile çalışır. Docker görüntüsü ve sunucu da aynı değişkenle kurulur.

## Neden

- Next.js bu bilgiyi varsayılan olarak ABD'deki geliştiricisine (Vercel) gönderir. Veri ve hizmetlerin Almanya'da kalması kararına (0009) ve bağımlılık sınırına (0013) uymaz.
- Gönderimin bize bir yararı yok.

## Düşünülen diğer yollar

- Açık bırakmak: Seçilmedi. Gerekçesi yukarıda.
- `next telemetry disable` komutuyla bilgisayarın genel ayarından kapatmak: Seçilmedi. Yalnız o bilgisayarda geçerli olur, yeni bir bilgisayarda ya da Docker kutusunda unutulur.

## Sonuçları

- Docker görüntüsü yazılırken (kart 0015) bu değişken görüntüye de eklenmelidir.
