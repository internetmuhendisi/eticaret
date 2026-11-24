---
paths:
  - "cekirdek/kapi/**"
  - "**/izinler.ts"
  - "cekirdek/moduller/ekip/**"
  - "cekirdek/moduller/degisiklik-kaydi/**"
  - "**/middleware.ts"
  - "cekirdek/yonetim-paneli/**"
  - "sahip-paneli/**"
---

# Yetki ve roller

- Her işlem için bir izin tanımla. Rolleri bu izinlerden oluştur. Rol adına göre kontrol yazma.
- Sunucudaki her uç hangi izni istediğini açıkça belirtsin. İzni belirtilmemiş uç yayına çıkmaz.
- İznin kapsamını belirle: kullanıcının kendi kayıtları, ekibi ya da tümü.
- Her rolün her uçta neye erişebildiğini gerçek veritabanıyla test et. Uç listesini uygulamanın kendisinden oku (`cekirdek/kapi/testler/rol-uc-erisimi.test.ts`, karar 0047). Uç belgesindeki izin beklentinin kaynağıdır, ucu değiştirince belgeyi de değiştir. Müşteri girişine yeni uç yazınca testteki `musteriSenaryolari`'na başka müşterinin kaydını isteyen senaryosunu ekle.
- Fiyat, stok, sipariş ve yetki değişikliklerini kim, ne zaman, neyi değiştirdi diye kaydet.

## Yapı (karar 0040)

- İzinler modülün `izinler.ts` dosyasında yazılır, `cekirdek/kayitlar/izinler.ts` toplar. Liste belgede: `cekirdek/moduller/ekip/izinler-ve-roller.md`; yeni izin ya da rol aynı değişiklikte belgeye yazılır, testi `cekirdek/moduller/ekip/testler/belge.test.ts`.
- Kapı izni her istekte denetler (`cekirdek/kapi/izin-kontrolu.ts`). Girişsiz istek `oturum-yok`, izni olmayan `yetki` alır.
- Uç hesabın kimliğini ve iznin kapsamını `isle` işlevinin dördüncü değerinden alır. Kapsama göre süzmek servisin işidir. Müşteri kaydına giden uç kimliği girdiden almaz.
- Başlangıç rolleri `cekirdek/moduller/ekip/baslangic-rolleri.ts` ve değişiklik dosyasındadır. Sınırlı role izin eklemek yeni bir değişiklik dosyası ve bu tanımda satır ister; ikisini `cekirdek/moduller/ekip/testler/servis.test.ts` karşılaştırır.
- Tam yetkili son yöneticinin rolü alınamaz, hesabı kapatılamaz; kural `rolAl` ve `yoneticiHesabiKapat` içindedir, ikisi aynı kilidi alır.
- Değişiklik kaydı yalnız `degisikligiKaydet` ile, değişiklikle aynı veritabanı işleminde yazılır (`cekirdek/moduller/degisiklik-kaydi/`, karar 0045). Yeni işlem adı `cekirdek/kayitlar/degisiklik-islemleri.ts` kaydına eklenir. Değerler maskelenmez; şifre, anahtar ve e-posta taşıyan alan işi durdurur, kişiyi kimliğiyle yaz.
- Roller hazırdır (karar 0178): mağaza sahibi, görevli, sipariş görevlisi, içerik editörü. Mağaza rol tanımlamaz, yalnız verir ve alır. Rolleri ekran birlikte gönderir (`rolleriAyarla`): en az bir rol kalır, yönetici kendi rollerini değiştiremez, kendi hesabını kapatamaz ve kendi iki aşamalı girişini sıfırlayamaz (`kendi-hesabi`).
- Rol erişim testinde katalog, fiyat ve stok kuralları "katalog rolleri" (ürünü değiştirebilen roller) içindir; öteki rollerin izinleri ayrı senaryoda yazılıdır.
