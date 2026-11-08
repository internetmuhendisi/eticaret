# 0098 · Çekirdekteki ülkeye bağlı varsayılanlar

## Amaç

Kart 0081'de para biriminin ve simgesinin varsayılanı çekirdekten çıkarıldı: site artık `ayarlar.json` dosyasında yazıyor (karar 0067). Ayar şemasında (`cekirdek/ayar-semasi/ayarlar.ts`) ülkeye bağlı başka varsayılanlar da duruyor: satış ve teslimat ülkesi `["TR"]`, saat dilimi `Europe/Istanbul`, dil `tr`, para biçimi (binlikte nokta, ondalıkta virgül, simge sonda), ağırlık ve boyut birimi. CLAUDE.md "kod yine de ülkeye bağlı yazılmaz" diyor. Kart 0081 sırasında görüldü, kapsamı dışında olduğu için yapılmadı.

## Olmazsa olmazlar

- Her ülkeye bağlı varsayılan için karar verilir: çekirdekten çıkıp site dosyasına mı taşınır (para birimi gibi), yoksa varsayılan olarak kalıp gerekçesi mi yazılır.
- Taşınan her ayar Örnek Mağaza'nın, örnek site klasörlerinin ve komutların deneme sitelerinin (`komutlar/deneme-sitesi-ayarlari.mts`) dosyalarına yazılır.
- Yeni site kurma komutu bu ayarları sorar (komut henüz yok, karta not düşülür).

## Sınırlar

- Para birimi ve simgesi kart 0081'de yapıldı.
- Bölge listesi (kararlar 0056, 0057) bu kartın işi değildir.

## Bitti sayılır

- Ülkeye bağlı her varsayılan bir listede yazılı, her biri için karar ve gerekçe var.
- Taşınanlar için "varsayılanı yok" testi var, bozulunca kırmızıya düşüyor.

## Durum

yapılacak
