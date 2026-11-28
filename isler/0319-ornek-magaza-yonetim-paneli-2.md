# 0319 · Örnek Mağaza panelin ikinci kısmıyla yayında

## Amaç

Bölümün sonunda Örnek Mağaza yeni çekirdek sürümüne geçer: mağaza sahibi kupon açar, ürünlerini toplu ve Excel ile düzenler ve kopyalar, panelde arar, vergi ayarlarını görür, raporlarını görür, e-posta metinlerini düzenler ve panelde bildirim alır. "Canlı" bugünkü deneme adresidir (karar 0101); gerçek alan adına geçilmez.

Bölüm: Yönetim paneli 2. Bölümün son işi. Önce bu bölümün öteki kartları bitmiş olmalı.

## Olmazsa olmazlar

- Yayından önce kullanıcıya sorulur: Örnek Mağaza'da Excel eklentisinin açılıp açılmayacağı, örnek kuponların başlangıç verisine girip girmeyeceği, bu bölümde önerilen site ayarlarının Örnek Mağaza değerleri.
- Örnek Mağaza demo sitedir: gerçek ödeme almaz, arama motorlarına kapalı kalır (karar 0007).
- Kimlik yeni çekirdek sürümüne çıkar, sürüm notu yazılır, sitenin testleri çalışır; yeşil hattan geçmiş kayıtla yayınlanır.
- Veritabanı değişiklikleri yayın komutuyla uygulanır; yeni ayarların kurulu veritabanına girişi ölçülür (kart 0069'un kuralı). Başlangıç verisi yalnız ilk kurulumda yazıldığı için canlı demoya girmesi gerekenler ayrıca ele alınır (kart 0276'nın "Kurumsal" sütunu dersi).
- Yayından sonra sağlık kontrolü, sunucu denetimi ve deneme adresinde tarayıcıyla gezinti, telefon ve bilgisayarda: kupon açma, sepette kullanma, siparişte, e-postada ve fişte aynı indirim, kuponlu siparişin kısmi iadesi; toplu fiyat değişikliği ve vitrinde görülmesi; Excel ile dışa ve içe aktarma (eklenti açıksa); siparişleri dışa aktarma; dört rapor; e-posta metninin değiştirilip varsayılana dönmesi; panelde yeni sipariş, havale bildirimi, iade talebi ve düşük stok bildirimi; pano; ürün kopyalama; panelde sipariş, ürün, stok kodu ve müşteri araması; vergi ayarının değişip vitrinde görülmesi ve eski hâline dönmesi.
- Sunucunun belleği ve işlemcisi başka projelerle paylaşılıyor: aynı anda yalnız bir ağır test ya da tarayıcı çalışır, sistem yükünü bekleyen döngü kurulmaz.

## Sınırlar

- Gerçek alan adına geçilmez, gerçek mağazalara dokunulmaz.

## Bitti sayılır

- Deneme adresinde gezintinin her adımı çalışıyor (karta yazılı).
- Sağlık ve sunucu denetimi yeşil.
- Geri dönüş komutunun bu sürümde çalıştığı biliniyor (yayın denemesi).

## Sonuç

- Kullanıcı kararları (2026-11-28): Excel ile toplu ürün işlemleri eklentisi Örnek Mağaza'da açık; dört örnek kupon (HOSGELDIN10, GIYIM50, KARGOBEDAVA, YILBASI20) başlangıç verisinde kalır, canlı demoda hiç kupon olmadığı için yeni sürümün ilk açılışında bir kez yazılır; bu bölümün site ayarları önerilen değerlerde (rapor son 30 gün, ücretsiz kargo sınırı indirimden sonra; kupon kodu harf ayrımsız, Excel 5.000 satır, okunan bildirim 30 gün), `ayarlar.json`'a ayrıca bir şey yazılmaz.
- Yayından önce kontrol hattı bu bölümde her çalışmada kırmızıydı (yönetici şifre sıfırlama testi eski şablonu arıyordu): kart 0339 ile düzeldi.
- Çekirdek ve Örnek Mağaza 0.81.0, sürüm notu `cekirdek/surum-notlari/0.81.0.md`.
- **Yayın.** e5328447'den (hat 46112490434 yeşil), 0.80.0'dan 0.81.0'a, yayın 17. Kilitler ve hızlı sunucu denetimi geçti, sağlık kontrolü yeşil.
- **Sunucu denetimi.** Tam denetim yeşil; sağlık ucu dışarıdan 0.81.0 ve ayakta veritabanı, deneme adresi IPv4 ve IPv6'da `noindex`, dışarıdan yalnız 22, 80, 443.
- **Yayın denemesi.** 17/17 yeşil: bozuk sürümde site eski yayınıyla açık, geri dönüş siteyi ve arka plan sürecini önceki yayına döndürüyor.
- **Panel denemesi.** Yeşil; açılış başlığı panonun selamı ("Günaydın", kart 0336'nın beklediği).
- **Yeni ayarların ve başlangıç verisinin kurulu veritabanına girmesi.** Dört kupon ilk açılışta yazıldı (HOSGELDIN10, GIYIM50, KARGOBEDAVA etkin; YILBASI20 zamanlanmış), raporların varsayılan dönemi "Son 30 gün", Excel düğmesi Ürünler'de (eklenti açık).
- **Gezinti** (deneme adresinde gerçek tarayıcıyla, bilgisayar 1280 ve telefon 390 px; betik kayda girmedi, geçici yönetici açılıp kapatıldı, şifresi 401; son çalışmada 46/46):
  - Kupon: panelden %10 kupon; sepette, ödeme özetinde, sipariş alındı sayfasında, panel ayrıntısında ve fişte aynı indirim (−136,96, toplam 1.232,62). Havaleyle ORN-1013, onay, kargo, teslim; müşterinin iade talebi onaylanıp 1 kupanın kısmi iadesi (170,91), ayrıntıda iade satırı. Kupon sonunda kapatıldı.
  - Toplu fiyat %10 artış: önizleme 449,90 → 494,89 ve 479,90 → 527,89, uygulanınca vitrinde yeni fiyat. Ürün kopyalama taslak kopya iki birleşimle, sonra silindi.
  - Excel: dışa aktarılan dosyada gezinti ürününün iki satırı; içe aktarmada yalnız bir birleşimin stoğu değişti (4 → 6), önizleme yalnız onu gösterdi, uygulandı. Siparişleri dışa aktarma: indirilen CSV'de ORN-1013.
  - Dört rapor bugünü gösterdi (satış cirosu arttı, ürün 2 adet, müşteri listesinde gezinti müşterisi, kupon 1 kullanım 136,96), dördünün CSV'si indi.
  - E-posta metni: konu değişti, önizlemede ve listede "Değiştirildi"; varsayılana dönünce eski konu ve "Varsayılan metin".
  - Zilde yeni sipariş, havale bildirimi, düşük stok ve iade talebi; her biri doğru sayfaya gidiyor. Panoda bakılması gerekenler ve sayı kutuları. Ctrl K ile sipariş numarası, ürün adı, stok kodu ve müşteri e-postası bulundu.
  - Vergi: fiyat gösterimi hariçe alınınca Porselen Kupa vitrinde 189,90 KDV dahilden 158,25 KDV hariçe; geri alınınca vitrin birebir eski hâline döndü (fiyat girişine dokunulmadı).
  - Telefonda vitrin ve panelin sayfaları (kuponlar, raporlar, e-postalar, vergi, Excel dahil) 200; 66 sayfa ölçümünde yana kayma yok, beklenmeyen konsol hatası ve 400+ yanıt yok (tek 404 silinen gezinti ürününün adresi).
  - Ölçülemeyen: e-postadaki indirim (sunucuda e-posta gönderen yok).
- Demoda kalan: ORN-1011, ORN-1012, ORN-1013 (kısmi iade; birer kupa stoğa döndü, Porselen Kupa net 3 azaldı), üç gezinti müşteri hesabı, kapalı üç gezinti kuponu (GZ2FFC1A, GZ12D604, GZA695BB), silinmiş gezinti ürünlerinin yüklenmiş görselleri (temizliği kart 0093), Excel ve sipariş dışa aktarma dosyaları (saklama süresi dolunca silinir).

## Durum

bitti
