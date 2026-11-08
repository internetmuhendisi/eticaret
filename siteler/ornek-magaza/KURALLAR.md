# Örnek Mağaza

İlk demo sitesi (karar 0007).

- Her yeni özellik ve her yeni çekirdek sürümü önce burada denenir.
- Gerçek satış yapılmaz, gerçek ödeme alınmaz. Site arama motorlarına kapalıdır.
- Mağaza sahibi hesabı ve yurt dışı aktarım belgeleri gerekmez, site kimseye teslim edilmez.
- Ürünler sahtedir: Giyim, Ev ve Yaşam, Elektronik Aksesuar (`planlar/site-ayarlari.md`).

## Örnek ürünler (kart 0084)

Ürünler `baslangic/katalog.json` dosyasındadır, katalog hiç kurulmamışsa arka plan süreci açılırken bir kez yüklenir. Hepsi basit üründür, fiyatları KDV dahildir ve %20 sınıfındadır. Her durumu `testler/katalog.test.ts` gerçek veritabanıyla dener; zaman testte sabit verilir.

| Durum | Ürün | Nasıl |
|---|---|---|
| Yayında, sıradan | Keten Masa Örtüsü | 449,90, stok 15 |
| Tükenmiş | Pamuklu Bez Çanta | 129,90, stok 0: satılmaz; listede görünür, tükenen ürün gizlenirse yalnız sayfası açılır |
| Birden çok kategoride | Pamuklu Bez Çanta | Giyim ve Ev ve Yaşam |
| Taslak | Yün Atkı | 349,90, stok 10, vitrinde görünmez |
| Zamanlanmış | Yılbaşı Kupa Seti | 399,90, stok 20, 1 Aralık 2026 00:00'da (İstanbul) yayına girer |
| Gizli | Hediye Paketleme | Listede yok, sayfası bağlantıyla açılır; kategorisi yok |
| Stok takibi kapalı | Hediye Paketleme | 49,90, her zaman satılabilir |
| Kargo gerektirmez | Hediye Paketleme | Kargo gerektirmeyen tek ürün |
| Düşük stoklu | USB-C Şarj Kablosu 1 m | 149,90, stok 2: genel eşik 5, müşteriye "Son 2 ürün" |
| Tarihli indirim | Kablosuz Kulaklık | 1.299,00, 1 Aralık 2026 00:00'a kadar 999,00, stok 8. İndirimden önce fiyat geçmişi olmadığı için eski fiyat görünmez (karar 0067) |
| Markası ve etiketleri olan | Kablosuz Kulaklık | Marka Örnek Ses (uydurma ad), etiketler kablosuz ve yeni |
| En az ve en çok alım adedi | Porselen Kupa | 189,90, stok 40, en az 2, en çok 6 |
| Elle seçilmiş ilgili ürün | Porselen Kupa | Keten Masa Örtüsü ve Yılbaşı Kupa Seti; Kupa Seti yayına girene kadar atlanır |

Tarihler gerçektir: 1 Aralık 2026'dan sonra demoda indirim görünmez, Kupa Seti yayındadır. Varyantlı ürünler, özellikler ve görseller Katalog 2 ile gelir (kartlar 0085, 0086, 0087).
