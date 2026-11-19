# 0234 · Sipariş durumları, geçişleri ve geçmişi

## Amaç

Kart 0214 siparişi yalnız "ödeme bekleniyor", "hazırlanıyor" ve "iptal" ile kurdu. Sipariş baştan sona yönetilebilmeli: havale onaylanır, sipariş hazırlanır, kargoya verilir, teslim edilir; her değişiklik kim, ne zaman, neden ile geçmişe yazılır (temel paket: Sipariş, Kargo).

Bölüm: Sipariş ve müşteri hesabı. Önce 0233 bitmiş olmalı.

## Olmazsa olmazlar

- Durumlar ve geçişler tek kayıtta (`cekirdek/kayitlar/siparis.ts`): ödeme bekleniyor, hazırlanıyor, kargoda, teslim edildi, iptal, iade edildi, kısmi iade. Geçişler 0233'te verilen kararla; kayıtta olmayan geçiş serviste ve veritabanında reddedilir. Veritabanının durum denetimi kayıtla aynıdır (test).
- Durum yalnız sipariş servisinin tek işleviyle değişir; aynı anda iki değişiklikte biri kazanır, öteki görülen durum değiştiği için `cakisma` alır (sipariş satırı kilidi).
- Geçmiş: her değişiklik önceki ve yeni durum, neden (kayıttaki nedenlerden), kim (yönetici, müşteri, sistem) ve zamanla `gecmiseYaz` ile yazılır; geçmiş değiştirilemez.
- Havale: panelde siparişin havale bildirimleri görünür; yönetici havaleyi onaylar, sipariş "hazırlanıyor"a geçer. Onaylanan siparişi iptal taraması iptal etmez.
- Kapıda ödeme: ödeme teslimde alınır; "ödendi" bilgisinin hangi geçişte yazılacağı kayıtta tanımlıdır.
- Kargo: kargo firması (kayıttaki liste ya da site ayarı, 0233 kararıyla) ve takip numarası panelden elle girilir, sipariş "kargoda"ya geçer; takip adresi firmanın kalıbından kurulur.
- İç not ve müşteriye not: iç not yalnız panelde görünür; müşteriye not müşterinin sipariş ayrıntısında görünür (e-postası kart 0240).
- "Yalnız satın alanlar yorum yapabilir" denetimi (kart 0139) 0233'te kararlaştırılan durumla siparişe bağlanır; ayar açıkken satın almamış müşteri yazamaz, satın almış yazar.
- Sipariş ve ödeme oturumunun kişisel verisinin saklama süresi 0233'teki kararla uygulanır (karar 0141'in açık bıraktığı soru).
- Yönetici uçları: sipariş listesi (durum süzgeci, sayfa), sipariş ayrıntısı, durum değişikliği, havale onayı, kargo bilgisi, notlar. İzinler kayıtta, uç belgesinde ve erişim testinde; kişisel veri taşıyan yanıt önbelleğe girmez.
- En az panel ekranı (0233 taslağına göre): sipariş listesi ve ayrıntısı, bu karttaki işlemlerin düğmeleri ve pencereleri. Panel menüsünde yerini alır.
- Testler gerçek veritabanıyla: her geçişin kabulü ve kayıtta olmayan her geçişin reddi (serviste ve veritabanında), aynı anda iki değişiklik (sıra kurularak), geçmişin değiştirilemezliği, havale onayından sonra iptal taramasının dokunmaması, kargo bilgisi, notların görünürlüğü, yorum denetiminin iki değeri, saklama süresi, izinsiz rollerin reddi, iki site. Tarayıcıda panelden klavyeyle havale onayı ve kargoya verme, iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- İptal ve iade akışı kart 0235'tedir; bu kart yalnız durumların yerini ve geçişlerini kurar.
- E-postalar kart 0240 ve 0241'dedir.
- Panelin tam sipariş ekranları (gelişmiş süzgeç, toplu işlem, sipariş fişi, faturayı ekleme, ödeme öncesi düzeltme) on dördüncü bölümdedir.
- Kargo firması entegrasyonu eklentidir, yazılmaz.

## Bitti sayılır

- Yönetici havaleyi onaylıyor, siparişi kargoya veriyor ve teslim edildi yapıyor; her adım geçmişte kim, ne zaman, neden ile görünüyor (test).
- Kayıtta olmayan geçiş reddediliyor (test).
- Yorum denetimi siparişe bağlı (test).
- Taslakla karşılaştırma yapıldı.

## Durum

bitti
