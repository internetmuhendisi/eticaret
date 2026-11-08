# 0100 · Örnek Mağaza'nın varyantlı ürünleri ve özellikleri

## Amaç

Örnek Mağaza'da varyantlı ürün, ürün özelliği ve varyant görseli gerçek örneklerle görünsün. Kartlar 0085, 0086 ve 0087'nin açık kalan Örnek Mağaza maddesi bu kartla kapanır (kararlar 0071, 0072).

Bölüm: Katalog 2. Önce 0085, 0086 ve 0087 bitmiş olmalı.

## Olmazsa olmazlar

- Başlangıç kataloğunun dosya biçimi (`cekirdek/moduller/urun/baslangic-semasi.ts`) seçenekleri, birleşimleri (stok kodu, fiyat, stok, görsel), özellik tanımlarını ve ürünün özellik değerlerini taşır. Alanlar ve kurallar panelin girdi şemalarından ve servislerin işlevlerinden alınır, ayrıca yazılmaz. Katalog yine tek işlemde, bir kez ve servislerle kurulur.
- Özellikler (Örnek Mağaza):
  - Kumaş: listeden tek seçim (Pamuk, Polyester, Keten)
  - Gramaj: sayı, birimi g/m²
  - Makinede yıkanabilir: evet/hayır
  - Bakım notu: metin
- **Basic Tişört** (Giyim):
  - Beden S, M, L, XL; renk Siyah, Beyaz. 8 birleşim.
  - Fiyat 299,90; XL bedenler 329,90.
  - Her birleşimden 10 adet, M Beyaz 0 (tükenmiş).
  - Özellikler: Pamuk, 180 g/m², makinede yıkanabilir, "30 derecede ters yıkayın".
- **Kapüşonlu Sweatshirt** (Giyim):
  - Beden S, M, L; renk Gri, Lacivert. 6 birleşim.
  - Fiyat 649,90, her birleşimden 6 adet.
  - Lacivert birleşimler 15 Kasım 2026 00:00'dan 1 Aralık 2026 00:00'a kadar (İstanbul) 549,90.
  - Özellikler: Kumaş Pamuk, 320 g/m², makinede yıkanabilir, "Pamuk ve polyester karışımıdır. Kurutma makinesine atmayın." (kullanıcı kararı: Kumaş tek seçimli kalır, karışım bakım notunda yazar).
- **Keten Masa Örtüsü** (var olan ürün): Kumaş Keten, makinede yıkanabilir.
- Görseller öteki ürünlerdeki gibi projede üretilir: 1600 × 1600 PNG, yazısız, açık renkli düz zemin üzerine ürünü andıran basit biçim. Her rengin bir görseli olur, her birleşim kendi renginin görselini gösterir. Her görselin alternatif metni olur.
- Açıklamalar kullanıcının onayladığı metinlerdir.
- Fiyatlar KDV dahildir, %20 sınıfındadır (öteki ürünler gibi).
- `KURALLAR.md` tablosuna yeni durumlar eklenir. Her durumu `testler/katalog.test.ts` gerçek veritabanıyla dener.
- Yeni dosya biçimi için site doğrulamasına bozuk örnekler eklenir. Çekirdek sürümü artar, sürüm notu yazılır, kontrol tablosu güncellenir.

## Sınırlar

- Vitrinde seçenek seçimi, özellik tablosu ve filtre yazılmaz. Bunlar vitrin bölümüyle gelir.
- Panel ekranı yazılmaz.
- Kurulu kataloğa ürün eklenmez. Katalog yalnız hiç kurulmamışsa yazılır (karar 0070).
- Örnek Mağaza sunucuya yüklenmez, yayın yapılmaz.

## Bitti sayılır

- Basic Tişört'te 8, Sweatshirt'te 6 birleşim kendi stok kodu, fiyatı, stoğu ve renginin görseliyle kuruluyor (test).
- M Beyaz tükenmiş, ürünün geneli satılabilir; tişörtün fiyat aralığı 299,90–329,90 (test).
- Lacivert birleşimlerde indirim başlangıçtan bir an önce yok, başlangıçta ve sürerken var, bitişte yok; Gri birleşimler indirimsiz (test, sabit zamanla).
- Üç üründe özellik değerleri doğru tür ve doğru değerle okunuyor; Kumaş: Keten olan ürünler tek sorguyla geliyor (test).
- Bozuk birleşim, olmayan seçenek değeri, türüne uymayan özellik değeri ve olmayan görsel site doğrulamasında kırmızı (bozuk örnekler).
- Katalog yazılamayınca hiçbir parça (birleşim, değer, görsel) kalmıyor; ikinci çalıştırma bir şey değiştirmiyor (test).

## Durum

çalışılıyor
