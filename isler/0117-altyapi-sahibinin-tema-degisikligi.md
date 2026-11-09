# 0117 · Altyapı sahibinin tema değişikliği

## Amaç

"Mağaza sahibi temayı değiştirebilir" ayarı kapalı olan sitede (özel tasarımlı mağaza) temayı ya da tema ayarlarını değiştirmenin hiçbir yolu yok. Tema servisi bu ayar kapalıyken kim isterse istesin yayını ve geri dönüşü reddeder. Sitenin `baslangic/tema.json` dosyası da yalnız ilk sürüm yazılırken okunur (kart 0105, karar 0080).

Altyapı sahibi böyle bir siteye özel temanın yeni bir hâlini (`ozel-v2` gibi) verip eskisini `temalar` listesinden çıkarırsa vitrin kalıcı olarak başlangıç temasına düşer. Hata süreç başına bir kez kaydedilir, ama düzeltecek yol yoktur. Kart 0105'in bağımsız kontrolünde bulundu.

Bölüm: Tasarım.

## Olmazsa olmazlar

- Altyapı sahibinin bir siteye yeni tema sürümü yayınlayabileceği bir yol olur: sahip paneli ya da komut. Bu yol "değiştirebilir" ayarına bakmaz, değişiklik kaydına altyapı sahibi olarak girer.
- Yol tema servisinin aynı kurallarından geçer: kullanılabilir temalar listesi, temanın açtığı değerler, okunurluk.
- Kayıtlı teması listeden çıkarılmış site için ne yapılacağı yazılır. İki seçenek var: yayında bu durum sahip panelinde uyarı olarak görünür, ya da yayın komutu bu durumda durur.

## Sınırlar

- Mağaza sahibinin panel ekranı bu kartta yazılmaz.

## Bitti sayılır

- "Değiştirebilir" kapalı sitede altyapı sahibi yeni sürüm yayınlayabiliyor, mağaza sahibi yine yayınlayamıyor (gerçek veritabanıyla test).
- Kayıtlı teması listede olmayan site için seçilen davranış testte.

## Durum

yapılacak
