# 0280 · Panelin içindeki bildirimler

## Amaç

Yönetici bildirimleri bugün yalnız e-postayla gidiyor (kart 0241, karar 0154); sunucuda gerçek gönderim olmadığı için (kart 0060) mağaza sahibi şimdilik hiçbirini görmüyor. Panelde bir zil ve bildirim listesi olmalı.

Bölüm: Yönetim paneli 2. Kullanıcının kararıyla on dördüncü bölümden bu bölüme bırakıldı. Önce 0311 (taslak) bitmiş olmalı.

## Olmazsa olmazlar

- Karar 0154'ün olaylarıyla (yeni sipariş, havale bildirimi, iade talebi, iptal, düşük ve tükenen stok, onay bekleyen yorum) panelde bildirim: zil, okunmamış sayısı, liste, okundu işareti, ilgili ekrana bağlantı.
- Bildirim alıcısı kişidir; izni olmayan yöneticiye o olayın bildirimi gösterilmez.
- Bildirimlerin açık-kapalı ayarı e-postayla ortak mı ayrı mı, kart açılırken kullanıcıya sorulur.
- Okunan bildirimin saklama süresi; kişisel veri taşımaz (kart 0241'in kuralı).

## Sınırlar

- Hatalı arka plan işlerinin bildirimi kart 0059'dadır.
- Tarayıcı ya da telefon bildirimi (push) yoktur.

## Bitti sayılır

- Gerçek veritabanıyla her olayın bildirimi, izne göre süzülmesi, okundu; tarayıcıda klavyeyle zil ve liste, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Sonuç

- Panelin üst şeridinde zil (telefon ve tablette üst çubukta), okunmamış sayısı, en yeni 20 bildirimin listesi, okundu ve "Hepsini okundu yap", ilgili ekrana bağlantı, okunan bildirimin saklama süresi ve "Bildirim ayarları" bağlantısı (karar 0198).
- Bildirim ayarının e-postayla ortak mı ayrı mı olduğu sorulmadı: onaylı taslağın kararı (0185) panel bildirimini her zaman açık, ayarı yalnız e-posta için saymıştı.
- Alıcı kişidir: olay anında olayın iznine sahip yöneticilere yazılır, okurken izin yeniden sorulur. Kartla ödemenin uyuşmazlığı ve takılan iade yalnız mağaza sahibine (kullanıcı kararı). Satır kişisel veri taşımaz, yazı kayıttan kurulur. Veritabanı değişikliği 0070; okunan bildirim altyapı sahibinin `panelBildirimiSaklamaGun` ayarıyla (30 gün) silinir.
- Testler ve 24 bozma `.claude/rules/kurallari-koruyan-kontroller.md`'de (kart 0280). Bağımsız kontrolün altı bulgusu düzeldi: zilin eski sayıya dönmesi ve iki zilin ayrı sayısı, yenilemede ve sorgu değişince sayı, rozetin sınırı, kapatılmış hesabın birikmesi, stok bildiriminin yedek adresi.

## Durum

bitti
