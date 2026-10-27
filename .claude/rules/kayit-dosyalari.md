---
paths:
  - "**/registry/**"
  - "**/registries/**"
  - "**/kayitlar/**"
  - "**/enums/**"
  - "**/constants/**"
  - "**/statuses/**"
  - "**/types/**"
  - "**/permissions/**"
  - "**/icons/**"
  - "**/models/**"
---

> Bu dosyanın paths satırları teknoloji kararından sonra projenin klasör düzenine göre güncellenir (Bölüm 4).

# Kayıt dosyaları ve tek ad

Kayıt dosyası, sistemin türlerinin ve durumlarının tek yerde tanımlandığı dosyadır.

- Ürün türlerini, sipariş durumlarını, ödeme yöntemlerini, kargo durumlarını, kullanıcı rollerini ve izinleri tek kayıt dosyalarında tanımla. Bir durum adını kodda elle yazma.
- Bir kavramı kodun her yerinde aynı adla yaz.
- Veritabanına yazılmış bir tür ya da durum adını ancak eski kayıtları dönüştüren bir veri değişikliğiyle ve onayla değiştir.
- Siparişin hangi durumdan hangisine geçebileceğini tek bir durum tanımında yaz. Panel, e-posta ve rapor bu tanımı kullanır.
- Temel paketteki sipariş durumları: ödeme bekleniyor, hazırlanıyor, kargoda, teslim edildi, iptal, iade edildi, kısmi iade. Ürünün yayın durumları: taslak, yayında, zamanlanmış, gizli, arşiv.
- Durumların, rollerin ve eylemlerin ikonunu ve rengini tek dosyadan oku.
- Yeni bir kayıt türü eklerken kayıt dosyasını, liste tanımını, sunucu ucunu, yetkiyi ve metinleri birlikte ekle. Bir adımı atlama.
