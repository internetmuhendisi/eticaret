# Kuralları koruyan kontroller

Bir kural yalnız yazılı kalırsa zamanla çiğnenir. Bu yüzden önemli her kuralı otomatik bir kontrole bağla. Kontrolü olmayan kuralı "yalnız disiplin" diye işaretle. Bir kural ancak yazım anında ya da yayından önce yakalanıyorsa korunmuş sayılır, gecelik tarama yalnız ikinci ağdır. Kontroller proje ilerledikçe kurulur, kontrolü henüz kurulmamış kurala da uy.

| Kontrol | Ne yapar | Ne zaman |
|---|---|---|
| Tür kontrolü | Kayıtta olmayan değeri, eksik alanı ve yanlış türü engeller. | Her yayında |
| Kod denetim kuralları | Ham renk, ham HTML öğesi, elle tablo, elle genişlik, elle biçimlendirme, şemasız uç, güvensiz sorgu gibi yasakları hata sayar. | Kod yazılırken ve her yayında |
| Kayıt öncesi kontroller | Kod biçimini, metin anahtarlarını, karar kaydı numaralarını kontrol eder, gizli bilgi yazılmışsa kaydı durdurur. | Her kayıtta |
| Testler | Birim, entegrasyon, yetki, veri ayrımı, hesaplama, ödeme, eşzamanlılık, iade ve sözleşme testleri. | Her yayında |
| Güvenlik kontrolleri | Güvenlik başlıkları, çerez ayarları, dosya yükleme ve dış paket açıkları. | Her yayında |
| Veritabanı değişikliği denemesi | Değişikliği canlının kişisel bilgileri silinmiş kopyasında uygular. | Veritabanı değiştiğinde |
| Belge ve bayatlık kontrolü | Belgenin ve yardım içeriğinin güncellendiğini, kural dosyasının satır sınırını aşmadığını kontrol eder. | Her yayında |
| Metin kontrolleri | Koda gömülü metni, yasak terimi, yasak iddiayı ve sabit sayıyı arar. | Her yayında |
| Hız ve boyut ölçümü | Sayfa hızını ve indirilen kod boyutunu ölçer. | Her yayında |
| Ekran ölçümü | Sayfaları üç genişlikte açar, yatay kaydırma, konsol hatası, erişilebilirlik ve görüntü farkı arar. | Yayından önce ve sonra |
| Çakışma kontrolü | Aynı dosyanın aynı anda iki işte değiştirilmesini durdurur. | Dosya değiştirilirken |
| Yayın komutu | Veritabanı değişikliğini sırayla uygular, sağlık kontrolü yapar, sorun çıkarsa önceki sürüme döner. | Her yayında |
| Site komutları | Yeni site kurma, site güncelleme ve siteyi mağaza sahibine teslim etmeyi kontrollerden geçirerek yapar. | Komut çalışınca |
| Zamanlanmış kontroller | Siteyi, ödemeyi, e-postayı ve kuyruğu izler, ödemeleri karşılaştırır, geri yükleme provası yapar. | Düzenli aralıklarla |
| Gecelik tarama | Kopya biçimleyici, eksik yetki, güvenlik açığı, yavaş sorgu gibi sınıfları bütün kodda arar, bulguyu iş olarak yazar. | Her gece |
| İhlal listesi | Eski ihlalleri adıyla tutar, yeni ihlali durdurur, düzeltilen ihlali siler. Liste yalnız küçülebilir. | Her yayında |
| Kendi kendini denetleme | Her kontrolün bilerek bozulmuş bir örneği yakaladığını gösterir. Hiç kırmızıya düşmeyen kontrol koruma sayılmaz. | Kontrol değişince ve düzenli aralıklarla |
