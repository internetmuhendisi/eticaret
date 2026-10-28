---
paths:
  - "**/*.test.*"
  - "**/testler/**"
  - "**/playwright.config.*"
  - "**/vitest.config.*"
---

# Test

Birim testi tek bir parçayı, entegrasyon testi parçaların birlikte çalışmasını otomatik olarak dener.

- Giriş, yetki, site verisi ayrımı, fiyat hesabı, ödeme, sipariş ve stok için otomatik test yaz.
- Yazılan her test yayın kontrolünde çalışsın. Kırmızı test yayını durdurur.
- Veri ayrımı ve yetki testlerini taklit değil gerçek veritabanıyla yap.
- Her test kendi verisini hazırlasın ve başka teste bağlı olmasın.
- Önemli akışları tarayıcıda gerçek kullanıcı gibi tıklayarak dene.
- Bir işin bitip bitmediğini işi yapmayan ikinci bir kontrol onaylasın. İşi yapan kendi işini onaylamaz.
