---
paths:
  - "cekirdek/kapi/**"
  - "**/uclar.ts"
  - "**/semalar.ts"
  - "**/servis.ts"
  - "**/route.ts"
---

# Sunucu arayüzü (API)

Uç, ekranın ya da başka bir yazılımın sunucudan veri istediği adrestir.

- Sunucunun bütün yanıtlarını aynı zarfla döndür: başarılı yanıtta veri, hatalı yanıtta hata kodu ve ayrıntısı.
- Doğrulama, yetki, bulunamadı, çakışma ve iş kuralı hatalarını sabit kodlarla döndür.
- Sunucuya gelen her girdiyi ekranla paylaşılan şemayla doğrula. Şemasız uç yazma.
- İstekleri karşılayan katman yalnız yönlendirsin. İş kurallarını servis katmanına yaz.
- Herkese açık, müşteri, yönetici ve sahip uçlarını ayrı adres önekleriyle başlat.
- Her uca makul bir istek sınırı koy. Giriş ve şifre sıfırlama gibi hassas uçlara sıkı sınır uygula.
- Ödeme ve kargo bildirim uçlarını istek sınırından muaf tut, imzayla doğrula.
- Mobil uygulama ya da dış entegrasyonun kullandığı bir alanı kaldırma, adını ya da türünü değiştirme. Önce yeni alanı ekle, eskisini kullanımını ölçerek kaldır.
- Her yeni ya da değişen ucu aynı değişiklikte uç belgesine yaz.

## Kapının yapısı (karar 0024)

- Her uç `ucTanimla` ile yazılır (`cekirdek/kapi/uc.ts`): giriş, şema, izin beyanı ve istek sınırı zorunludur. Adres dosyası (`app/kapi/.../route.ts`) yalnız ucu bağlar.
- Yanıtlar yalnız `cekirdek/kapi/zarf.ts` ile kurulur. Tek istisna dosya veren uçtur: servis `DosyaYaniti` döndürür, kapı dosyanın kendisini doğru tür ve `nosniff` ile verir; hata yine zarfla döner (karar 0059). Hata kodları, HTTP karşılıkları ve istek sınırları `cekirdek/kayitlar/kapi.ts` dosyasındadır. Servis bilinen hatayı `BilinenHata` ile bildirir.
- Uç belgesi: `cekirdek/kapi/uclar.md`.
