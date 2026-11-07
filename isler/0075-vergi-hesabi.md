# 0075 · Vergi hesabı

## Amaç

Vergi tek bir işlevle hesaplanır. Sepet, ödeme, sipariş, e-posta ve panel aynı işlevi kullanır (temel paket: Vergi).

Önce 0074 bitmiş olmalı.

## Olmazsa olmazlar

- Oran, ürünün vergi sınıfı ile bölgeden bulunur. Bölge bulunamazsa mağaza adresi kullanılır.
- Verginin teslimat, fatura ya da mağaza adresine göre hesaplanması mağaza sahibinin ayarıdır, varsayılanı teslimat adresidir.
- Fiyatlar vergi dahil ya da hariç girilir (ayar). İki durumda da vergi tutarı ve vergisiz tutar doğru çıkar.
- Yuvarlama satırda ya da ara toplamda yapılır (ayar, varsayılanı satır satır). Yuvarlama kuralı tek yerde tanımlanır.
- Kargo ücretinin vergi sınıfı ayarlanır.
- Sonuç oran oran vergi dökümüdür.
- Vergi kapalıysa vergi tutarı sıfırdır, döküm boştur.
- Tutarlar kuruş olarak tam sayıyla hesaplanır (`cekirdek/veritabani/turler.ts`).

## Sınırlar

- Sepet, sipariş ve iade akışları bu işlevi sonradan kullanır, bu kartta yazılmaz.

## Bitti sayılır

- Dahil ve hariç girişte, satır ve ara toplam yuvarlamasında, aynı bölgede iki oranda ve vergisiz üründe sonuç elle hesaplanmış örneklerle aynı.
- Bölgesi bulunamayan adreste mağaza adresinin oranı kullanılıyor.
- Kuruş farkı çıkabilecek örnekler (örneğin 3 adet × 33,33) testte.

## Durum

bitti
