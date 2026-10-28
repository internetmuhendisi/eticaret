---
paths:
  - "cekirdek/kapi/**"
  - "**/izinler.ts"
  - "cekirdek/moduller/ekip/**"
  - "**/middleware.ts"
  - "cekirdek/yonetim-paneli/**"
  - "sahip-paneli/**"
---

# Yetki ve roller

- Her işlem için bir izin tanımla. Rolleri bu izinlerden oluştur. Rol adına göre kontrol yazma.
- Sunucudaki her uç hangi izni istediğini açıkça belirtsin. İzni belirtilmemiş uç yayına çıkmaz.
- İznin kapsamını belirle: kullanıcının kendi kayıtları, ekibi ya da tümü.
- Her rolün her uçta neye erişebildiğini gerçek veritabanıyla test et. Uç listesini uygulamanın kendisinden oku.
- Fiyat, stok, sipariş ve yetki değişikliklerini kim, ne zaman, neyi değiştirdi diye kaydet.
