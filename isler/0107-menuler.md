# 0107 · Menüler ve alt bilgi bağlantıları

## Amaç

Üst kısımdaki menüler ve alt kısımdaki bağlantı sütunları mağaza sahibinin düzenlediği veridir. Üst ve alt kısım bölümleri bunları buradan okur (temel paket: Vitrin yönetimi).

Bölüm: Tasarım. Önce 0106 bitmiş olmalı.

## Olmazsa olmazlar

- Bir sitenin birden çok menüsü olabilir (ana menü, kategori menüsü, alt bilgi sütunları).
- Menü öğesi kategoriye, markaya, ürüne, sayfaya ya da dış adrese bağlanır. Bağlı kayıt silinince öğe vitrinde görünmez, panelde işaretlenir.
- Öğeler sıralanır ve bir alt düzey açılır menü kurulabilir. Derinlik sınırı tek yerde tanımlıdır.
- Kategori menüsü kategori ağacından kendiliğinden kurulabilir.
- Menü değişikliği değişiklik kaydına girer. Siteler birbirinin menüsünü görmez.
- Başlangıç menüleri site klasöründe başlangıç değeri olarak durur.

## Sınırlar

- Panel ekranı yazılmaz.
- Düz sayfalar (hakkımızda, iletişim) bu kartta değil; bağlantı hedefi olarak yeri ayrılır.

## Bitti sayılır

- Menü öğesi her hedef türüne bağlanıyor, silinen hedefin öğesi vitrinde görünmüyor (gerçek veritabanıyla test).
- Sıralama ve derinlik sınırı tutuyor.
- Kategori menüsü ağaçla aynı.
- İki site ayrı kalıyor.

## Durum

yapılacak
