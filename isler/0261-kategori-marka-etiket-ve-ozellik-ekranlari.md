# 0261 · Kategori, marka, etiket ve özellik ekranları

## Amaç

Ürün ekranında kategori, marka, etiket ve özellik seçilebilmesi için bunların panelden açılıp düzenlenebilmesi gerekir. Servisleri var (kartlar 0077, 0078, 0086, 0110, 0111), ekranları yok.

Bölüm: Yönetim paneli. Önce 0258 (liste) ve 0259 (form) bitmiş olmalı. Kullanıcının bölüm listesinde ayrıca yazmıyor; ürün yönetiminin ön koşulu olarak önerildi.

## Olmazsa olmazlar

- Kategori ağacı: ekleme, düzenleme, taşıma (klavyeyle ve sürükleyerek), silme (altların bir üste çıktığı söylenir), kategori görseli.
- Marka ve etiket: liste, ekleme, düzenleme, silme; markanın açıklaması ve logosu.
- Özellik: dört tür, birim, liste seçenekleri ve sırası, "filtrede kullanılsın"; değeri olan özelliğin türü değiştirilemez (servisin kuralı ekranda söylenir).
- Uçlar izinleriyle (`kategori.*`, `marka.*`, `etiket.*`, `ozellik.*`), uç belgesi ve rol erişim testi.

## Sınırlar

- Ürünün kendi ekranı 0262–0266'dadır.

## Bitti sayılır

- Her ekran gerçek istekle ve tarayıcıda klavyeyle, iki renkte ve üç genişlikte taramayla denendi.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
