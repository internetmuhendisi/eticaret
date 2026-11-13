# Plan: Stoğa gelince haber ver eklentisi (kart 0144)

Durum: 2026-11-13'te kullanıcıya özetlendi ve onaylandı. Tarif: `eklentiler/stoga-gelince-haber-ver.md`. Eklentinin çekirdekteki yeri ve bağlantı noktaları: karar 0117.

## Kullanıcının onayladıkları

- Eklenti açık mı: altyapı sahibinin ayarı, varsayılan kapalı; Örnek Mağaza'da açık.
- Üye olmayan müşteri de isteyebilir: mağaza sahibinin ayarı, varsayılan evet.
- Talep 90 gün saklanır, sonra silinir: mağaza sahibinin ayarı.
- Formda onay kutusu yok: KVKK aydınlatma bağlantısı ve "yalnız bu bildirim için" cümlesi (hukukçuya kontrol ettirilecek).
- E-posta gidince talebin e-posta adresi silinir, yalnız birim ve tarih kalır.
- Panelin en küçük ekranı: "Stok bildirimleri" sayfası, birim başına bekleyen talep sayısı.

## Adımlar

1. Eklentinin yeri ve bağlantı noktaları (karar 0117): eklenti kayıt dosyası, `eklentiler` ayarı, `eklentiAcikMi`, stok kancası, ürün sayfası yuvası, panel sayfa ağacında eklentiye bağlı sayfa; e-posta şablonu, arka plan işi, izin ve metin çekirdeğin var olan kayıtlarına eklenir.
2. Veri: `stok_bildirimi_talepleri` tablosu ve değişiklik dosyası.
3. Servis: talep yazma, talep alınabilir birimler, bekleyenleri gönderme (kilitle ve stok denetimiyle, parti parti), panel sayıları, saklama temizliği.
4. Uçlar: üye olmayan için herkese açık (robot, sıkı sınır), giriş yapmış müşteri için müşteri ucu. Uç belgesi ve erişim testi.
5. Arka plan: stok kancasının koyduğu gönderim işi, günlük temizlik işi.
6. Vitrin: ürün sayfasında form (taslaktaki kutu), katalog sayfası.
7. Panel: "Stok bildirimleri" sayfası.
8. Örnek Mağaza'da eklentiyi aç.
9. Testler (gerçek veritabanı ve posta kutusu, tarayıcı), kendi kendini bozarak deneme, taslakla karşılaştırma, bağımsız kontrol.

## Sınırlar

Eklenti ekleme komutu (kart 0145), SMS ve panel bildirimi yok.
