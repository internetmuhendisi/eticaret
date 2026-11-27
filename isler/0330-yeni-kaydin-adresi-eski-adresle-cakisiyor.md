# 0330 · Yeni kaydın adres adı başka kaydın eski adresini alabiliyor

## Amaç

Kart 0320'nin bağımsız kontrolünde bulundu. Ürün eklenirken adres adı adından üretilir (`adresAdiBul`, `cekirdek/moduller/urun/servis.ts`), aday yalnız yaşayan ürünlerin adres adlarında aranır; eski adresler tablosu (`eski_adresler`) sayılmaz. Yeni ürün başka bir ürünün eski adresini alırsa o ürünün eski bağlantıları artık yeni ürüne gider (adı taşıyan silinmemiş kayıt kazanır, kart 0135), taslaksa 404 verir. Kopyalamada (kart 0320) eski adresler kullanılmış sayılır (`bosAdresAdiBul`); öteki üretimlerde sayılmaz. Kategori, marka, etiket, blog yazısı ve sabit sayfanın üretimi de aynı kalıptadır, ölçülmedi.

## Olmazsa olmazlar

- Adres adı üreten her yerde (ürün, kategori, marka, etiket, blog yazısı, sabit sayfa) aynı türün eski adresi kullanılmış sayılır; kural tek yerde yazılır.
- Mağaza sahibinin elle verdiği adres adı başka kaydın eski adresiyse ne olacağı (reddedilir mi, eski adres mi düşer) kullanıcıya sorulur.
- Gerçek veritabanıyla her türde: eski adresi olan bir kaydın adıyla yeni kayıt açılınca adres sayı alır, eski bağlantı yönlenmeye devam eder.

## Bitti sayılır

- Her türde testi yazıldı, kural bozulunca kırmızı.
- Bağımsız kontrol yapıldı.

## Durum

bitti
