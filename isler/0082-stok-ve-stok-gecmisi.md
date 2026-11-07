# 0082 · Stok ve stok geçmişi

## Amaç

Her satılabilir birimin tek depoda stoğu olur. Stok yalnız tek bir servisle değişir, her değişiklik kimin, ne zaman ve neden yaptığıyla geçmişe yazılır (temel paket: Stok).

Önce 0076 bitmiş olmalı.

## Olmazsa olmazlar

- `stok` modülü. Stok satılabilir birime bağlıdır; varyantlar (0085, Katalog 2) aynı yolu kullanır.
- Ürün bazında stok takibi açık ya da kapalı.
- Stoğu düşüren işlev "yeterliyse düş" koşuluyla çalışır ve çağıranın veritabanı işleminin içinde yürür. Aynı anda gelen iki istek son ürünü iki kez düşmez.
- İptal ve iadede stoğu artıran işlev hazırdır, sipariş bölümü kullanır.
- Elle stok düzeltme sebeple yapılır. Sebepler kayıt dosyasındadır.
- Her değişiklik stok geçmişine aynı işlemde yazılır: kim, ne zaman, neden, önceki ve sonraki miktar. Geçmiş güncellenemez ve silinemez.

## Sınırlar

- Ödeme sırasında stok ayırma sepet ve ödeme bölümüyle gelir.
- Düşük stok e-postası e-postalar bölümüyle gelir.
- Toplu stok güncelleme panel bölümüyle gelir.

## Bitti sayılır

- Stoğu 1 olan birime aynı anda giden iki düşürme isteğinden yalnız biri geçiyor (gerçek veritabanıyla, gerçekten aynı anda).
- İşlem geri alınınca stok ve geçmiş birlikte geri dönüyor.
- Takibi kapalı üründe düşürme stoğu değiştirmiyor.
- Geçmişi güncelleme ve silme reddediliyor.

## Durum

yapılacak
