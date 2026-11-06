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

## Yapı (karar 0040)

- İzinler modülün `izinler.ts` dosyasında yazılır, `cekirdek/kayitlar/izinler.ts` toplar. Liste belgede: `cekirdek/moduller/ekip/izinler-ve-roller.md`; yeni izin ya da rol aynı değişiklikte belgeye yazılır, testi `cekirdek/moduller/ekip/testler/belge.test.ts`.
- Kapı izni her istekte denetler (`cekirdek/kapi/izin-kontrolu.ts`). Girişsiz istek `oturum-yok`, izni olmayan `yetki` alır.
- Uç hesabın kimliğini ve iznin kapsamını `isle` işlevinin dördüncü değerinden alır. Kapsama göre süzmek servisin işidir. Müşteri kaydına giden uç kimliği girdiden almaz.
- Başlangıç rolleri `cekirdek/moduller/ekip/baslangic-rolleri.ts` ve değişiklik dosyasındadır. Sınırlı role izin eklemek yeni bir değişiklik dosyası ve bu tanımda satır ister; ikisini `cekirdek/moduller/ekip/testler/servis.test.ts` karşılaştırır.
- Tam yetkili son yöneticinin rolü alınamaz, bu kural `rolAl` içindedir.
