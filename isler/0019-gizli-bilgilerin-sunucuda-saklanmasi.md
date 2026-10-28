# 0019 · Gizli bilgilerin sunucuda saklanması

## Amaç

Her sitenin veritabanı şifresi gibi gizli bilgileri sunucuda korumalı durur, kayda ve GitHub'a girmez. `planlar/komutlar.md` dosyasında açık kalan "gizli bilgiler sunucuda nasıl saklanacak" sorusu kapanır.

Önce 0018 bitmiş olmalı.

## Olmazsa olmazlar

- Saklama yöntemi seçilir ve karar kaydına yazılır.
- Her sitenin gizli bilgileri ayrı durur, bir sitenin kutusu ötekinin gizli bilgisini okuyamaz.
- Gizli bilgiyi üreten ve yerine yazan bir yol. Değer ekrana ve günlüğe basılmaz.
- Geliştirme, deneme ve canlı ortamın anahtarları ayrıdır.
- Devirde gizli bilgilerin yenilenebileceği gösterilir (karar 0014).

## Sınırlar

- Yayın komutu bu işe girmez (0021).

## Bitti sayılır

- Örnek Mağaza'nın gizli bilgileri sunucuda duruyor ve kayıtta hiçbir yerde geçmiyor.
- Bir sitenin kutusundan ötekinin gizli bilgisine ulaşılamadığı denendi.
- Saklama yönteminin karar kaydı yazıldı, `planlar/komutlar.md` dosyasındaki açık konu kapandı.

## Durum

yapılacak
