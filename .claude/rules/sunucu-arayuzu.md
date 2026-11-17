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
- Ödeme ve kargo bildirim uçlarını istek sınırından muaf tut, imzayla doğrula. Böyle uç `disKurulus` beyanıyla ve `bildirim` sınırıyla yazılır (kart 0215, karar 0142): başka siteden gelen form ya da sunucudan bildirim kabul eder, sahte istek denetimi uygulanmaz, doğruluk imzadan ya da kuruluşa sorgudan gelir. Tarayıcıyı yönlendiren uç `Yonlendirme` döndürür (yalnız sitenin kendi yolu).
- Mobil uygulama ya da dış entegrasyonun kullandığı bir alanı kaldırma, adını ya da türünü değiştirme. Önce yeni alanı ekle, eskisini kullanımını ölçerek kaldır.
- Her yeni ya da değişen ucu aynı değişiklikte uç belgesine yaz.

## Kapının yapısı (karar 0024)

- Her uç `ucTanimla` ile yazılır (`cekirdek/kapi/uc.ts`): giriş, şema, izin beyanı ve istek sınırı zorunludur. Adres dosyası (`app/kapi/.../route.ts`) yalnız ucu bağlar.
- Zarfla dönen her yanıt önbelleğe alınmaz (`Cache-Control: no-store`, `zarfOnbellegi`, karar 0139); yalnız dosya yanıtı kendi süresini taşır. Erişim testi her uçta her kişinin yanıtını bununla ölçer.
- Tarayıcıdan kapıya istek yalnız `kapiyaIstek` ile gider (`cekirdek/kapi/istemci.ts`, karar 0139): gövdeyi her zaman okur, okunmayan `no-store` gövdesi isteği bitmemiş bırakır. Doğrudan `fetch` denetimde hatadır.
- Yanıtlar yalnız `cekirdek/kapi/zarf.ts` ile kurulur. Tek istisna dosya veren uçtur: servis `DosyaYaniti` döndürür, kapı dosyanın kendisini doğru tür ve `nosniff` ile verir; hata yine zarfla döner (karar 0059). Hata kodları, HTTP karşılıkları ve istek sınırları `cekirdek/kayitlar/kapi.ts` dosyasındadır. Servis bilinen hatayı `BilinenHata` ile bildirir.
- Uç belgesi: `cekirdek/kapi/uclar.md`.
- Herkese açık uç tema demosundaki durumunu beyan eder (`temaDemosunda: "acik" | "kapali"`, karar 0127): hesap, sipariş, yorum, bildirim ya da e-posta doğuran uç kapalıdır. Müşteri girişindeki uç demoda her zaman kapalıdır, beyan yazılmaz.
