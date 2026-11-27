# 0326 · Fiyat girişinin "vergi dahil" ile "vergi hariç" arasında değişmesi

## Amaç

Karar 0185'e göre mağaza sahibi fiyat girişini değiştirince kayıtlı fiyatlar çevrilir, müşterinin gördüğü fiyat değişmez. Kart 0322'de ölçüldü (%20 KDV, projenin yuvarlaması, 1–1.000.000 kuruş): olası vergi dahil fiyatların altıda biri (%16,7) hiçbir hariç tutarla aynı kalamaz, vitrinde 1 kuruş değişir (ör. 0,03 → 0,04). Örnek Mağaza'nın 22 fiyatının hiçbiri değişmez. Kullanıcı kararıyla (kart 0322) çevirme vergi ekranından ayrı bu kartta yapılır; kart 0322'de fiyat girişi yalnız gösterilir.

Bölüm: Yönetim paneli 2. Önce 0322 bitmiş olmalı.

## Olmazsa olmazlar

- Değişiklikten önce önizleme: kaç fiyatın çevrileceği ve 1 kuruş değişecek fiyatlar ürünleriyle listelenir; mağaza sahibi onaylar. Liste uzunsa sayı ve indirilebilir liste.
- Çevrilen her tutar: birimlerin satış ve indirimli fiyatı, kargo ücreti ve ücretsiz kargo sınırı (ileride kupon tutarları da). Oran, vitrinin fiyatı gösterirken kullandığı bölgenin ve ürünün sınıfının oranıdır; vergisiz ürün değişmez.
- Fiyat geçmişi değiştirilemez: geçmişin her satırının hangi girişle yazıldığı bilinir (ör. satırda giriş alanı, değişiklik dosyasıyla eski satırlara o anki ayar) ve "son 30 günün en düşük fiyatı" satırları aynı girişe çevirerek karşılaştırır.
- Ayar, fiyatlar ve geçmiş tek işlemde; yarıda kalırsa hiçbir şey değişmez. Aynı anda gelen fiyat değişikliği kilitle sıraya girer. Değişiklik kaydına girer.
- Verilen siparişler değişmez.

## Sınırlar

- Vergi ekranı, sınıflar ve oranlar kart 0322'dedir.

## Bitti sayılır

- Gerçek veritabanıyla: çevirme ve geri çevirme, 1 kuruş değişen fiyatın önizlemede olması, vergisiz ve %10 sınıflı ürün, kargo ücreti ve sınırı, çevrilmiş geçmişle eski fiyat (30 gün), yarıda kalan işlem, aynı anda gelen fiyat değişikliği, iki site.
- Tarayıcıda klavyeyle önizleme ve onay; iki renkte ve üç genişlikte tarama.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Bağımsız kontrol yapıldı.

## Sonuç

- Vergi ekranında fiyat girişinin yanında "Değiştir": yan pencerede önizleme (çevrilecek fiyat sayısı, müşteriye 1 kuruş farklı görünecek fiyatlar ilk 20 satır ve CSV, kargo ücreti ve sınırı, kuponlar, sınır ve kuponların çevrildiği sınıf), onay penceresi, uygulama (karar 0201).
- Kullanıcı kararları: kupon tutarları (kullanılmışlar da) çevrilir; birden çok oranlı tutarlar en çok ürünü olan sınıfın oranıyla.
- Bağımsız kontrolün bulgularıyla: süren ödeme varken uygulanmaz; kargo ekranı, ürünün fiyatları ve kupon formu gördükleri girişi gönderir, giriş arada değiştiyse kayıt çakışır; kilitler genişledi (kupon tablosu, mağaza ayarları, vergi tablosu); silinmiş kargo sınıfı, indirimli fiyatın önizlemesi ve bölgesi bulunamayan sitede eski fiyat düzeldi. "Müşterinin gördüğü fiyat değişmez" birim fiyat içindir: çok adetli satırda sepet toplamı birkaç kuruş değişebilir, pencere bunu söyler. Excel'in yeni ürün satırları kart 0337'de.
- Hız ölçümü çalıştırılmadı: vitrine giden tarayıcı kodu değişmedi, vitrin yalnız indirimdeki ürünlerde sunucuda bir sorgu daha yapar.

## Kalan (2026-11-28, kullanıcı kararı: sonraki oturum)

- "Her yeni denetim bozularak kırmızı" maddesi eksik: bağımsız kontrolden sonra eklenen dört denetim için sırayı kuran yarış testi yazılıp bozulacak: kupon tablosunun kilidi (uygulama sürerken eklenen kupon bekler ve yeni girişle yazılır ya da çakışır), mağaza ayarlarının kilidi (arada kaydedilen kargo ayarı ezilmez), vergi tablosunun kilidi (arada değişen oran), siparişe dönmüş ödeme oturumu değişikliği durdurmaz. İkinci izin denetimi (`fiyat.degistir`) bugün denenemez, yalnız disiplin kalır.
- Sonra `/is-bitti 0326`.

## Durum

yapılacak
