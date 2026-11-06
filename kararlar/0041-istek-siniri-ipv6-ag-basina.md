# 0041 · İstek sınırı IPv6'da ilk 64 bitle sayar

## Tarih

2026-11-06

## Karar

- **Sayaç:** IPv4 istemci tam adresiyle, IPv6 istemci adresinin ilk 64 bitiyle sayılır (`sayacAdresi`, `cekirdek/kapi/istek-siniri.ts`). IPv4'ün IPv6 yazılışı (`::ffff:1.2.3.4`) IPv4 sayılır. Adres olmayan değer olduğu gibi kalır. Karar 0024'ün "istemci adresi başına" sayımını IPv6 için daraltır, kalanı geçerlidir.
- **Kodlanmış yol:** Kod değişmedi. Sınır doluyken `sa%67lik`, `k%61pi`, `%2f`, büyük harf, `//`, sonda `/` ve `/./` yazılışları ölçüldü: uca ulaşmıyor (404, 308) ya da aynı sayaca düşüyor (429). Ölçüm geliştirme modunda ve çekirdek görüntüsünde Caddy üzerinden yapıldı. `sa%67lik`, `k%61pi`, iki ayrı `%2f` yazılışı, büyük harf ve `/./` `pnpm yerel-ortam-testi` içinde kaldı; `//` ve sonda `/` yalnız bir kez ölçüldü.

## Neden

- Bir bağlantıya genelde en az bir /64 verilir. Tam adresle sayınca aynı /64'ten adres değiştiren her istek yeni sayaç açıyordu; bu ölçüldü (sınır doluyken komşu adres 200 aldı). Kart 0027'nin giriş sınırı bu sayaca dayanacak.
- /64, ağın adresleme birimidir: içindeki adresleri ayırmanın anlamı yoktur, daha geniş bir ağ ise ilgisiz müşterileri aynı sayaca koyabilir.
- Kodlanmış yol için sayacı uca bağlamak gereksiz değişiklik olurdu: bugün aşan yazılış yok. Ölçüm hatta kaldığı için Next.js güncellemesi bunu bozarsa yakalanır.

## Düşünülen diğer yollar

- **/56 ya da /48 ile saymak:** Seçilmedi. Aynı sağlayıcının ilgisiz müşterileri aynı sayaca düşebilir, kart /64 istiyor.
- **Hem /64 hem geniş ağ için iki sayaç:** Seçilmedi. Bu ölçekte fazla; hesap başına sınır kart 0027 ile gelir.
- **Sayacı uç kimliğine bağlamak:** Şimdilik seçilmedi, gerekçesi yukarıda. Ölçüm kırmızıya düşerse çözüm budur.

## Sonuçları

- Aynı /64'teki cihazlar (bir ev, bir ofis) sayacı paylaşır. IPv4'te bir evin zaten tek adresi olduğu için bu yeni bir durum değildir.
- Elinde birden çok /64 olan biri (/56, /48 alan bağlantılar) ağ değiştirerek sınırı yine aşabilir. Kabul edildi.
- Yöntem sayaçta ayrıdır: aynı adrese `HEAD` isteği `GET` sınırı doluyken geçer, yani `GET` uçlarının bütçesi en çok iki katına çıkar. Ölçüldü (200). Kabul edildi: `HEAD` veri döndürmez, giriş gibi sıkı sınırlı uçlar `POST`'tur.
- Kodlanmış yol ölçümü yerel Caddy üzerinden, `GET` ile ve yalnız sabit adresli sağlık ucundadır. Sunucudaki ön kapıda ayrıca ölçülmedi; ön kapının yolu değiştiren bir ayarı yoktur. Kart 0027'nin `POST` ucu kendi ölçümünü yapar, karta not düşüldü.
- Sayaç anahtarı yoldur. Değişken adresli bir uç gelince (`/urun/1`, `/urun/2`) her adres ayrı sayılır. İlk böyle uç yazılırken sayaç uç kimliğine bağlanır.
- `sayacAdresi` birim testinde ve kapıda elle yazılmış başlıkla denendi. Gerçek bir IPv6 istemcinin yayındaki sitede sınıra takılması ölçülmedi; IPv6 adresinin kutuya ulaştığını `pnpm sunucu-denetle` ayrıca ölçer.
- IPv4 gömülü özel yazılışlar (`64:ff9b::`, Teredo) ilk 64 bitle sayılır, ilgili ağ tek sayacı paylaşır. Başlığı ön kapı yazdığı için istemci bunu dayatamaz; önemsiz sayıldı.
