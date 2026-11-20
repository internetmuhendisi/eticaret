# 0260 · Panelin tema ayarları ekranı

## Amaç

Mağaza sahibi temanın sınırlı ayarlarını (renk, yazı tipi, köşe ve düğme biçimi, logo) değiştirebilmeli (`CLAUDE.md`, karar 0080). Tema seçme ekranı var (kart 0148), ayarların servisi ve okunurluk kuralı var (kart 0105), ama ayarların ekranı yok; karar 0101 onu bu bölüme bıraktı.

Bölüm: Yönetim paneli. Önce 0257 (taslak), 0259 (form yapısı) ve logo için 0094 (yükleme ucu) bitmiş olmalı.

## Olmazsa olmazlar

- Temanın açtığı renkler, yazı tipi, köşe ve düğme biçimi seçenekleri tema şemasından çıkar; tema açmıyorsa alan görünmez.
- Okunmayan renk kaydedilmez, en yakın okunur ton önerilir ve tek basışla seçilir (kart 0105'in kuralı); bağlı renkler birlikte ölçülür.
- Logo yükleme ve kaldırma (kart 0094'ün ucuyla).
- Değişiklik doğrudan yayınlanır, önceki sürüme tek adımda dönülür (karar 0080); geri dönüş görülen sürümü ister (kart 0148).
- "Temayı değiştirebilir" kapalıyken ekran yalnız gösterir.

## Sınırlar

- Ana sayfa düzeni vitrin bölümleri ekranındadır.
- Altyapı sahibinin özel tema değişikliği kart 0117'dedir.

## Bitti sayılır

- Gerçek veritabanıyla kayıt, ret ve öneri; tarayıcıda klavyeyle renk seçimi, öneri, logo, dönüş; vitrinin yeni değerlerle çizildiği ölçülür; iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
