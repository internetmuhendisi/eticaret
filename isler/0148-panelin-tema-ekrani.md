# 0148 · Panelin tema ekranı

## Amaç

Tema demoları (kart 0116) hazır olunca mağaza sahibi onlara panelden ulaşmalı, temayı seçip yayınlayabilmeli ve önceki hâline dönebilmeli. Tema değişikliği, geri dönüş ve uçları var (kart 0113); eksik olan ekran (karar 0101).

Bölüm: Vitrin. Önce 0141 ve 0116 bitmiş olmalı.

## Olmazsa olmazlar

- Ekran sitenin kullanabileceği temaları listeler; her temada "Demoyu gez" bağlantısı, "Bu temayı kullan" düğmesi ve seçili temanın işareti olur. Siteye özel tema yalnız o sitede görünür.
- "Demoyu gez" Tema Galerisi'ne (karar 0127) temanın koduyla gider: `<demonun adresi>/?tema=<kod>`. Demonun adresi tek yerde tanımlanır (Tema Galerisi'nin kimliği ya da altyapı ayarı); siteye özel temanın demosu yoktur, bağlantısı da yoktur.
- Tema değişirken düzenin taşınması ya da korunması seçimi kart 0113'teki gibi sorulur.
- Masaüstünde ürün listesindeki filtrenin yeri (solda sütun ya da üstte) mağaza sahibinin tema ayarı olarak seçilir; bugün temanın görünümüdür (kart 0136, karar 0105, `planlar/site-ayarlari.md`).
- "Önceki hâline dön" düğmesi tek adımda geri döner.
- "Mağaza sahibi temayı değiştirebilir" kapalıysa düğmeler görünmez, nedeni yazar.
- Yalnız tema izinleri olan rol ekranı görür (`tema.gor`, `tema.degistir`).
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Renk, yazı tipi, köşe ve düğme biçimi ayarlarının ekranı on dördüncü bölümdedir.
- Panelde canlı önizleme yapılmaz (karar 0080).

## Bitti sayılır

- Mağaza sahibi tarayıcıda demoya gidiyor, temayı değiştiriyor ve geri dönüyor; değişiklik vitrinde görünüyor (tarayıcı testi).
- Ayar kapalı sitede düğmeler yok, görevli ekranı görmüyor (test).
- Ekran klavyeyle kullanılıyor, iki temada ve üç genişlikte taramadan geçiyor.
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
