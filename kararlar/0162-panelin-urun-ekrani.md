# 0162 · Panelin ürün ekranı: genel bilgiler ve özellikler

## Tarih

2026-11-21

## Karar

Panelde ürün eklenir ve düzenlenir (kart 0263). Ekran tek sayfadır (karar 0157). Bölümler alt alta durur: genel bilgiler, sınıflandırma, satış bilgileri, özellikler, ilgili ürünler. Masaüstünde yanda "Bu sayfada" bağlantıları, yayın ve "Ürünü kaldır" kartları vardır. Varyant, fiyat, stok ve galeri sonraki kartlarda (0264–0266) aynı sayfaya eklenir.

- **Adresler:** yeni ürün `/yonetim/urunler/yeni`, ürün `/yonetim/urunler/urun?kimlik=…`. İkisi de sayfa yolunda Ürünler'in altındadır. Listede "Ürün ekle" asıl eylemdir; satırdaki ad ürün ekranına gider.
- **Tek form, tek kayıt:** bütün bölümler "Kaydet" ile birlikte gider; hata ve odak ortak form yapısındadır (karar 0159).
- **Yeni ürün** yalnız adla kaydedilir ve taslak başlar. Vergi sınıfı sitenin ilk sınıfıdır, değiştirilebilir. Kaydedilince ürünün kendi ekranı açılır. Fiyat kart 0265'le gelir; fiyatsız ürün vitrinde tükenmiş görünür ve satılamaz (karar 0133).
- **Uçlar:** `urun-ekle`, `urun-degistir` (`urun.degistir`) ve `urun-sil` (`urun.sil`, görevli silemez). Uç yalnız zarfı denetler; alanların kuralları ürün servisindedir.
- **Sayılar sitenin biçimiyle:** ağırlık sitenin ağırlık biriminde (`agirlikBirimi`), sayı türündeki özellik değeri sitenin sayı biçiminde metin olarak gider. Metni sunucu okur (`panelGirdisiniCevir`, kargo ekranının kuralı, karar 0135). Okunamayan ya da sınırı aşan değer alanın koduyla döner; o istekte hiçbir şey yazılmaz.
- **Sınıflandırma:** kategori, marka, etiket ve ilgili ürünler kayıt arayarak seçilir. Kayıt arama etiketi de arar. Birden çok seçim için `CokluKayitSecimi` kullanılır: seçilenler kaldırılabilir. İlgili ürünler en çok 4'tür (`ilgiliUrunSiniri`, kayıtta); ürünün kendisi seçilemez.
- **Açıklama biçimli metindir:** bileşen kütüphanesinde Tiptap (ProseMirror) üstüne yazılmış `BicimliMetinAlani` kullanılır. Araç çubuğunda kalın, eğik, ara başlık, madde ve sıralı liste, bağlantı vardır. Bağlantının kuralı vitrindeki temizlikle tek yerdedir (`aciklamaBaglantisiGecerliMi`). Vitrin açıklamayı yine `aciklamayiTemizle` ile çizer.
- **Yayın:** yayında, zamanla (sitenin saatiyle tarih ve saat), taslak ve gizli seçilebilir. Arşiv "Ürünü kaldır"dan yapılır. "Arşive al" kaydedilmemiş değişiklik varken kapalıdır. Silme onay penceresiyle sorulur.

## Neden

- Tek sayfa ve tek kayıt kullanıcının seçtiği yerleşimdir (karar 0157). Mağaza sahibi ürünü baştan sona görür, hatalı alana odak gider.
- Sayıyı sunucunun okuması kargo ekranıyla aynı yoldur. Ekran sitenin sayı biçimini ve birim çevirisini kendisi yazmaz, kural tek yerde kalır.
- Hazır, bakımı süren ve klavyeyle ekran okuyucuya uygun bir düzenleyici (Tiptap) elle yazılmış bir düzenleyiciden güvenilirdir. Çıkardığı HTML vitrinin izinli etiketleriyle sınırlandırıldı.

## Düşünülen diğer yollar

- Açıklamayı düz metin alanıyla almak: kart biçimli metin istiyor, vitrin biçimli metni zaten çiziyor.
- Sayıyı tarayıcıda çevirip sayı göndermek: sitenin biçimi tarayıcıya taşınırdı, kargo ekranından farklı bir yol olurdu.
- Yeni ürünü pencerede açmak: taslak tek sayfa ekranı öneriyor; yeni ürün de aynı ekrandır.

## Sonuçları

- Bileşen kütüphanesine bir bağımlılık (Tiptap 3.33.0) girdi; güvenlik taramasından geçer.
- Düzenleyicinin yazı alanını React değil ProseMirror çizer. Tarayıcı testlerinin "sayfa hazır" beklemesi o alanın içini saymaz.
- Ağırlık ons biriminde iki ondalıkla gösterilir; gramdan çevrilince en çok yarım birim yuvarlanır.
