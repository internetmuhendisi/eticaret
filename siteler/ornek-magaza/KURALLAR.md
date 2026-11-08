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

Tarihler gerçektir: 1 Aralık 2026'dan sonra demoda indirim görünmez, Kupa Seti yayındadır. Varyantlı ürünler ve özellikler Katalog 2 ile gelir (kartlar 0085, 0086).

## Görseller ve video (kart 0087)

Görseller `baslangic/gorseller/` klasöründedir, katalogdaki ürünün `galeri` alanı onları adıyla sıralar. Katalog kurulurken dosya deposuna yüklenir, her birinin dört boyutu üretilir. Durumları `testler/katalog.test.ts` dener.

| Durum | Ürün | Nasıl |
|---|---|---|
| Tek görsel | Yün Atkı, Keten Masa Örtüsü, Porselen Kupa, Yılbaşı Kupa Seti, USB-C Şarj Kablosu 1 m | Ana görsel o görseldir |
| Birden çok görsel | Pamuklu Bez Çanta | İki görsel, sırasıyla |
| Videolu galeri | Kablosuz Kulaklık | Üç görsel, ikinci sırada YouTube videosu; ana görsel ilk görseldir |
| Görselsiz ürün | Hediye Paketleme | Ana görseli yok |

**Kaynaklar:**

- Görseller projede üretildi (kullanıcı kararı): 1600 × 1600 piksel, yazısız PNG. Her biri açık renkli düz bir zemin üzerine ürünü andıran basit bir biçimdir (çanta, şerit, kare, kupa, kulaklık, daire, kablo). SVG olarak çizilip `sharp` ile PNG'ye çevrildi. Telif ya da lisans gerektirmez.
- Video: "Big Buck Bunny", Blender Foundation, Creative Commons Attribution 3.0 lisanslı (https://peach.blender.org). YouTube'da Blender'ın resmî kanalındaki yükleme: https://www.youtube.com/watch?v=aqz-KE-bpKQ (2026-11-08'de YouTube'un oEmbed yanıtıyla var olduğu doğrulandı). Ürünle ilgisi yoktur, yalnız galeride videonun nasıl göründüğünü göstermek içindir. Lisansın istediği atıf alternatif metindedir.
