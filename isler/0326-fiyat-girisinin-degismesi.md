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

- Kilitlerin yarış testleri (2026-11-28): bağımsız kontrolden sonra eklenen dört denetim sıra kurularak denenir. Açık duran kupon eklemesinin, kargo ayarının ve oran değişikliğinin arkasında bekleyen değişiklik çakışma verir. Değişiklik sürerken eski girişle gönderilen kupon ve kargo ayarı bekler, sonra çakışır. Siparişe dönmüş oturum değişikliği durdurmaz. Beş bozmanın (kupon, ayar ve vergi kilidi, kupon ucunun kilidi, sipariş koşulu) her biri kırmızıya düştü. Bağımsız kontrolün bulgularıyla düzeldi: eski girişle gönderilen kargo ayarının reddi yakalayıcıdan önce geliyordu, testler geçse de dosya "Unhandled Rejection" ile kırmızıydı (sonuç başlatılınca tutulur, üç çalışmada çıkış 0); kırmızı testte tutulan işlem bırakılmıyordu (temizlik önce bırakır). İkinci izin denetimi (`fiyat.degistir`) bugün denenemez, yalnız disiplindir.
- Eski fiyat testi ara sıra düşüyordu (yerelde dört tam çalışmanın birinde): yazıldığı milisaniyede okunan geçmiş satırı vitrinin süzgecinin dışında kalıyor, eski fiyat bulunamıyor. Bu kartın getirdiği değil, kart 0081'den beri böyle; kart 0338 açıldı. Test okumadan önce bir sonraki milisaniyeyi bekler (altı tam çalışmanın altısı yeşil).

## Durum

bitti
