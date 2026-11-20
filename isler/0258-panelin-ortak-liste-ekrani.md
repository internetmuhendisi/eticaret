# 0258 · Panelin ortak liste ekranı

## Amaç

Panelin bütün listeleri (ürünler, siparişler, müşteriler, yazılar, sayfalar, ekip) aynı davranmalı: arama, süzgeç, sıralama, sayfalama, satır seçip toplu işlem. Bugün sipariş listesi ve stok bildirimleri kendi listelerini elle kuruyor. Kurallar listenin tek yerde tanımlanmasını ister; "elle tablo" denetimi de liste motoru yazılınca kurulacaktı (`.claude/rules/kurallari-koruyan-kontroller.md`, kod denetim kuralları).

Bölüm: Yönetim paneli. Önce 0257 (taslak) bitmiş olmalı.

## Olmazsa olmazlar

- Tek liste parçası ve tek sunucu tarafı sorgu kuralı: liste tanımı (sütunlar, aranacak alanlar, süzgeçler, sıralamalar, toplu işlemler, izinler) bir yerde yazılır, ekran ve uç ondan çıkar.
- Arama, süzgeç, sıralama ve sayfa adreste durur; geri dönünce liste aynı yerde açılır, adres paylaşılabilir.
- Satır seçimi (tek tek, sayfanın hepsi), seçimle toplu işlem, işlemden önce onay, sonuçta kaç satırın işlendiği ve işlenemeyenlerin nedeni. Toplu işlem sunucuda tek tek yetkiyle denetlenir.
- Telefonda tablo yerine liste; klavyeyle bütün işlemler; seçim ve sonuç ekran okuyucuya duyurulur.
- Boş, sonuçsuz, yükleniyor ve hata hâlleri.
- Sipariş listesi ve stok bildirimleri ekranı bu parçaya taşınır.
- "Elle tablo" kod denetim kuralı bozuk örneğiyle kurulur, kural tablosu güncellenir.

## Sınırlar

- On beşinci bölümün toplu işlemleri (toplu fiyat, Excel) bu kartın işi değil; parça onların eklenebileceği biçimde yazılır.
- Listelerin kendi süzgeçleri kendi kartlarındadır.

## Bitti sayılır

- İki liste (siparişler, stok bildirimleri) yeni parçayla çalışıyor, eski elle kurulmuş listeler kalktı.
- Adresteki durum, toplu işlemin sunucudaki yetki denetimi ve sayfa sınırları gerçek veritabanıyla testte; tarayıcıda klavyeyle arama, süzgeç, seçim ve toplu işlem, iki renkte ve üç genişlikte tarama.
- "Elle tablo" denetimi bozuk örneğiyle kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
