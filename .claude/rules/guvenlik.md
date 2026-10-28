---
paths:
  - "cekirdek/kapi/**"
  - "cekirdek/moduller/odeme/**"
  - "cekirdek/moduller/musteri/**"
  - "cekirdek/moduller/ekip/**"
  - "cekirdek/moduller/yasal-metinler/**"
  - "**/middleware.ts"
  - "**/*yukle*"
  - "**/next.config.*"
  - "sunucu/**"
  - "**/package.json"
  - "**/.env.example"
---

# Güvenlik

- Şifreleri güncel ve güvenli bir şifre özetleme yöntemiyle sakla. Eski yöntemleri kullanma.
- Oturumu kısa ömürlü bir anahtar ve onu yenileyen ikinci bir anahtarla yürüt. Anahtarları güvenli çerezde tut.
- Şifre, anahtar ve kart bilgisini kayıtlara (günlüğe) yazma. E-posta ve telefonu kısaltarak yaz.
- Tarayıcıda çalışan kod yalnız açık olması güvenli değişkenleri okusun.
- Kart bilgisi ödeme kuruluşunun formunda girilsin ve sitenin sunucusundan geçmesin.
- Yüklenen dosyanın türünü, boyutunu ve içeriğini yükleme anında sunucuda kontrol et.
- Siteyi yalnız şifreli bağlantıyla aç. Güvenlik başlıklarını aç. Başka sitelerden gelen sahte istekleri kabul etme.
- Yönetici girişinde iki aşamalı doğrulama ve giriş deneme sınırı olsun.
- Geçmişi silen ve dosyaları toptan silen komutlar proje ayar dosyasındaki yasak listesiyle kapalıdır. Bu yasakları aşmaya çalışma.
- Gizli bilgi dosyası `.env` kayda girmez, GitHub'a ve sunucuya gitmez.
- Toplu e-posta, gerçek ödeme ve alan adı değişikliği gibi geri alınamaz işleri kullanıcının onayıyla yap.
- Çerez izni ve pazarlama izni tek yerde tanımlı olsun, müşterinin verdiği izin kaydedilsin.
- Ürün açıklaması, yorum ve form girdilerini ekrana yazmadan önce zararlı koddan temizle.
- Kayıt, yorum, iletişim ve şifre sıfırlama formlarında bot koruması kullan.
- Kullanılan dış kütüphanelerin bilinen güvenlik açıklarını her yayında tara.
- Geliştirme, deneme ve canlı ortamın verisini ve anahtarlarını ayrı tut. Deneme ortamı gerçek ödeme almaz ve arama motoruna kapalıdır.
