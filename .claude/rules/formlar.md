---
paths:
  - "**/forms/**"
  - "**/form/**"
  - "**/formlar/**"
  - "**/*form*.*"
  - "**/fields/**"
  - "**/validation/**"
  - "**/schemas/**"
  - "**/upload*/**"
  - "**/import*/**"
---

> Bu dosyanın paths satırları teknoloji kararından sonra projenin klasör düzenine göre güncellenir (Bölüm 4).

# Formlar ve alanlar

Şema, bir verinin hangi alanlardan oluştuğunu ve hangi kurallara uyması gerektiğini anlatan tanımdır.

- Bütün giriş alanlarının yüksekliğini, kenarını, köşesini ve yazı boyutunu tek iskeletten al. Elle yükseklik yazma.
- E-posta, telefon, tarih, saat, para, adres, renk, açık-kapalı ve çok dilli metin için o türün kendi bileşenini kullan.
- Fiyat alanında tutarı para birimiyle birlikte al. Ondalık ayracını dile göre göster.
- Her alanın etiketini, açıklamasını ve hata mesajını aynı form alanı sarmalayıcısıyla göster.
- Bir formun kurallarını tek şemada yaz. Ekran ve sunucu aynı şemayı ya da ondan üretilen kopyasını kullanır.
- Kaydetme biçimine uy: tek alanlı düzenleme alandan çıkınca, uzun metin kendiliğinden, ayar ve oluşturma formları Kaydet düğmesiyle kaydedilir.
- Birden çok bölümlü sayfada her bölümün kendi Kaydet ve Vazgeç düğmesi olsun. Bu düğmeler yalnız o bölüm değişince görünsün.
- Form gönderilirken ikinci tıklamayı dikkate alma.
- Kaydedilmemiş değişiklik varken sayfadan çıkmak isteyene uyarı göster.
- Bir alanın içinden yeni kayıt eklenirken o kaydın tam oluşturma penceresini aç. Satır içi mini form kullanma.
- Görsel ve dosya yüklemesini tek ortak yükleme bileşeniyle yap. İlerleme ve iptal her yerde olsun.
- Düğmeye "Kaydet", "Siparişi onayla" gibi eylem yaz. Sonucu bildirimle ver.
- Ürün ve müşteri içe aktarmayı önizleme, satır satır hata raporu ve geri almayla tek altyapıdan yürüt.
