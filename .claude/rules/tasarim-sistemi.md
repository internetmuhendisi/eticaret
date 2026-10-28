---
paths:
  - "**/*.css"
  - "**/*.scss"
  - "**/styles/**"
  - "**/theme/**"
  - "**/tema/**"
  - "**/tokens/**"
  - "**/tasarim/**"
  - "**/components/**"
  - "**/bilesenler/**"
  - "**/tailwind.config.*"
---

> Bu dosyanın paths satırları teknoloji kararından sonra projenin klasör düzenine göre güncellenir (Bölüm 4).

# Tasarım sistemi

Tasarım değeri, renk, yazı boyutu, boşluk gibi tasarımı oluşturan ve tek yerde tanımlanan değerdir.

- Renkler koda elle yazılmaz, tek bir yerden (tasarım değerlerinden) gelir.
- Renk, yazı tipi, yazı boyutu, boşluk, köşe yarıçapı, gölge ve katman sırasını tek dosyada tanımla. Tasarımı değiştirmek o dosyayı değiştirmek demektir.
- Rengi "birincil", "zemin", "yazı", "tehlike" gibi anlamlı adlarla kullan. Renk kodu ya da paletten ham renk yazma.
- Vitrin tasarımını sitenin seçtiği temadan al. Tema, tasarım değerlerinin tamamını ve koyu tema değerlerini tanımlar. Temasız site kurulmaz, yeni site bir temanın varsayılanlarıyla başlar.
- Temalar çekirdekte durur ve bütün sitelerde ortaktır. Yalnız tek bir siteye tasarlanan tema o sitenin klasöründe durur, o sitede "Mağaza sahibi temayı değiştirebilir" ayarı kapalıdır.
- Mağaza sahibi temanın yalnız açtığı değerleri değiştirir: renk, yazı tipi, köşe ve düğme biçimi, logo, ana sayfa düzeni. Tema her ayar için varsayılanı ve izin verilen seçenekleri tanımlar. Boşluk ölçeği, genişlik sınırları ve katman sırası gibi değerler her zaman temadan gelir, serbest kod ya da stil yazılamaz.
- Vitrinin son tasarımı temanın değerleri ile sitenin tema ayarlarının birleşimidir. Bu birleşimi tek yerde üret, bileşenler yalnız sonucu okur.
- Mağaza sahibinin seçtiği renkleri kaydetmeden önce kontrast kontrolünden geçir. Geçmezse yayınlamadan önce uyar ve okunur bir ton öner.
- Tema seçimi ve tema ayarı değişikliği önce taslak olarak kaydedilir, önizlemede görülür, yayınlanınca yeni bir sürüm olur. Her yayınlanan sürümü sakla, önceki sürüme tek adımda dönülebilsin. Tema değişikliği ürüne, içeriğe ve menülere dokunmaz.
- Yönetim paneli bütün sitelerde aynı görünür. Panel siteden yalnız logo ve ana rengi alır.
- Panelin siteden aldığı ana rengi kontrast kontrolünden geçir. Geçmezse okunur bir tonunu türet.
- Koyu tema değerlerini aynı dosyada ayrıca tanımla. Koyu temayı bileşen bileşen yamama.
- Uyarı, başarı ve hata renklerinin doygun tonunu yalnız zemin ve işarette kullan. Yazı için okunur tonunu kullan.
- Boşluk, genişlik ve yazı boyutunu tanımlı ölçekten seç. Rastgele piksel değeri yazma.
- Açılır pencere, menü ve bildirimin üst üste sırasını tanımlı katman sırasından al.
- Yalnız tanımlı köşe yarıçaplarını ve gölgeleri kullan.
- Telefon, tablet ve masaüstü genişlik sınırlarını tasarım değerlerinden al. Elle genişlik sınırı yazma.
- Bütün ikonları tek setten al. "Düzenle", "sil", "sepete ekle" gibi bir kavramın ikonu her yerde aynıdır ve tek ikon sözlüğünden okunur.
- Bir öğe değişirken animasyonu yalnız değişen özelliğe uygula.
- Tasarım değerleri değişince tasarım sistemi belgesini aynı değişiklikte güncelle.
