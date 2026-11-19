# 0239 · Müşterinin iade talebi ve kendi iptali

## Amaç

Müşteri teslim aldığı siparişin iadesini hesabından ya da sipariş takibinden isteyebilmeli, mağaza sahibi talebi panelden onaylayıp iadeyi yapabilmeli (temel paket: Sipariş, Müşteri hesabı). Ayar açıksa müşteri henüz kargolanmamış siparişini kendisi iptal edebilmeli.

Bölüm: Sipariş ve müşteri hesabı. Önce 0235 ve 0238 bitmiş olmalı.

## Olmazsa olmazlar

- İade talebi: ürün ve adet seçimi, neden (kayıttaki nedenlerden), açıklama. Yalnız talebe açık durumdaki siparişte ve iade talebi süresi içinde (site ayarı, 0233 önerisiyle) açılabilir; zaten iade edilen adet yeniden istenemez.
- İade kargosunu kimin ödediği ("İade kargosunu kim öder" ayarı, `planlar/site-ayarlari.md`; bugün şemada yok, bu kartta girer) talep formunda müşteriye söylenir.
- Talebin durumları kayıtta (bekliyor, onaylandı, reddedildi); her değişiklik sipariş geçmişine yazılır. Onaylanan talepten iade kart 0235'in akışıyla yapılır; talep tutarı belirlemez, mağaza sahibi belirler.
- Müşterinin kendi iptali: site ayarı (0233 önerisiyle); yalnız ayarın izin verdiği durumda, kart 0235'in iptal akışıyla, geçmişte "müşteri" olarak yazılır. Kartla ödenmişse para kuruluş üzerinden döner.
- Üye olmayan müşteri talebi sipariş takibinden açar (numara ve e-postayla doğrulanmış oturum).
- Müşteri ve yönetici uçları: talep açma, talepleri listeleme, onay ve ret. Her müşteri ucunda başkasının siparişine talep açılamama senaryosu; robot koruması ve sınır.
- Testler gerçek veritabanıyla: süre sınırı (bir an önce ve sonra), talebe açık olmayan durum, iade edilmiş adedin yeniden istenmemesi, aynı anda iki talep, onay ve ret, müşteri iptalinin ayarın iki değeri ve durum sınırı, başkasının siparişi, iki site. Tarayıcıda klavyeyle talep, hatalı form, onaylanan talebin müşteride görünüşü, iki renkte ve üç genişlikte tarama. Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda.

## Sınırlar

- İade koşulları metninin gerçeği kart 0063'tedir.
- Talebin e-postaları kart 0240 ve 0241'dedir.
- İade kargosu etiketi ve kargo entegrasyonu yazılmaz.

## Bitti sayılır

- Müşteri iade talebi açıyor, mağaza sahibi onaylayıp iade yapıyor ya da reddediyor; müşteri sonucu görüyor (tarayıcı testi).
- Süre ve durum sınırı tutuyor (test).
- Müşteri iptali ayar açıkken ve yalnız izinli durumda çalışıyor (test).
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
