# 0322 · Panelin vergi ayarları ekranı

## Amaç

Temel paketin Yönetim paneli satırında vergi ayarları var. Vergi sınıfları, oranlar ve hesap kuralları bugün yalnız servisle ve başlangıç verisiyle kuruluyor (kart 0074, 0075); mağaza sahibi bunları panelden göremiyor ve değiştiremiyor.

Bölüm: Yönetim paneli 2 (kullanıcının kararıyla bu bölüme eklendi). Önce 0311 ve 0301 (Ayarlar grubu) bitmiş olmalı.

## Olmazsa olmazlar

- Ayarlar grubunda "Vergi" ekranı: vergi açık ya da kapalı, fiyatların vergi dahil ya da hariç girilmesi, fiyatın yanındaki ek metin, verginin hangi adrese göre hesaplandığı, yuvarlamanın yeri, kargonun vergi sınıfı.
- Vergi sınıfları: liste, ekleme, ad değiştirme, sıralama, silme (oranlı sınıfın kalıcı silinmemesi ve silinmiş sınıfın kuralları kart 0074'teki gibi); her sınıfın oran tablosu (bölge, il, posta kodu, oran, vergi adı, sıra).
- Her değişiklik var olan servisle, değişiklik kaydıyla; verilen siparişlerin tutarı değişmez.
- Fiyatların dahil-hariç girişi değişince ne olacağı (kayıtlı fiyatlar çevrilir mi, olduğu gibi mi kalır) kart 0311'de kullanıcıya sorulur; ekran sonucunu değişiklikten önce söyler.
- İzin: vergi görme ve değiştirme.

## Sınırlar

- Ülkeye özel otomatik vergi servisi ve ek vergiler eklentidir.

## Bitti sayılır

- Gerçek istekle ayarların, sınıfların ve oranların değiştirilmesi, alanın yoluyla hata, verilen siparişin değişmemesi; görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçinin reddi; uçlar erişim testinde beklentiden.
- Tarayıcıda klavyeyle sınıf ve oran ekleme, hata ve odak, vitrinde fiyatın yeni ayarla görünmesi; iki renkte ve üç genişlikte tarama.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Sonuç

- **Ekran.** Ayarlar'da Kargo'dan sonra "Vergi" (`cekirdek/yonetim-paneli/vergi/`): solda genel ayarlar tek formda (vergi açık-kapalı, vergi adı, fiyatın vitrindeki gösterimi, fiyatın yanındaki metin: vergi adından, metinsiz ya da kendi metni; verginin adresi, yuvarlama, kargonun vergi sınıfı), sağda sınıflar (sıralanabilir liste, yan pencerede ad ve oran tablosu, oran formu, onaylı silme). Fiyat girişi yalnız gösterilir; değişmesi kart 0326'da (kullanıcı kararı). İzin `vergi.gor` ve `vergi.degistir`.
- **Uçlar ve servis.** Sekiz uç (`cekirdek/kapi/yonetici/vergi.ts`, uç belgesinde). Servise `siniflariSirala` (silinmemiş sınıfların tam kümesi, yalnız sırası değişen kayda girer) ve `sinifUrunSayilari`; genel ayarlar `vergiAyarlariniDegistir` (`cekirdek/moduller/vergi/ayarlar.ts`): önce bütün alanlar ve kargo sınıfı denetlenir, hata alanın adı ve koduyla döner, hiçbir şey yazılmaz. Vergi, sınıf ve oran adı anahtar ya da e-posta biçiminde olamaz (değişiklik kaydı onu reddedip beklenmeyen hataya düşürüyordu). Boş vergi adı ayarı kaldırır.
- **Testler.** Gerçek istekle uçlar, hata yolları ve dört kişinin sekiz uçta reddi (`vergi-uclari.test.ts`); servis (`cekirdek/moduller/vergi/testler/panel.test.ts`), vergi değişikliğinin verilmiş siparişi ve kalemlerini değiştirmemesi dahil; jsdom (`cekirdek/yonetim-paneli/testler/vergi.test.tsx`, 10 test); tarayıcıda klavyeyle sınıf ve oran, hata ve odak, iki renkte ve üç genişlikte tarama, vitrinde fiyatın yeni gösterimde vergi hesabıyla çevrilmiş tutar ve yeni vergi adıyla metin (`cekirdek/testler/uctan-uca/vergi.test.ts`). Fiyat gösterimi bütün vitrini değiştirdiği için tarayıcı testi tema testinden sonra kendi aşamasında çalışır (`vitrin-ayari`). 23 denetim ayrı ayrı bilerek bozularak denendi, her biri kırmızıya düştü; uç izni uç testinde yeşil kaldı (görevlide `vergi.gor` da yok), rol erişim testi yakaladı.
- **Taslakla karşılaştırma.** Bilgisayar ve telefonda görüntüyle yapıldı: sütunlar 3'e 2, adres, yuvarlama ve kargo sınıfı seçim kutusu, oranlar tablo, kargo işareti özette. Bilerek farklı: taslaktaki "Ürüne bağlı sınıf silinemez" ipucu yerine var olan kural (karar 0060, işaretle silme; onay bağlı ürün sayısını ve kargo sınıfıysa bunu söyler); fiyatın gösterimi ve ek metnin üç türü taslakta yok, site ayarlarından geldi.
- **Bağımsız kontrol.** Dokuz bulgunun sekizi düzeltildi: adı olmayan sitede kayıt, oran ekleme, düzenleme, Vazgeç ve silmeden sonra odak, ayarlarla kargo sınıfının yazım sırası, silinmiş kargo sınıfının seçim kutusunda görünmesi, oran formunun kapatma sorusu ve kendi "Oranı kaydet" adı, bölge ve posta kodu hatalarının metni, yeni sınıftan sonra pencerenin beklemesi ve odağın "Oran ekle"ye geçmesi, metindeki sayı, izinsiz yöneticide üstü çizili seçenekler, tarayıcı testinin klavyesi ve her çalışmada gerçek kaydı.
- **Açık kalan.** Oranların sırası ekranda yok (servis ve uç kabul eder; oranlar ülke, il ve posta koduyla toplandığı için sıra hesabı değiştirmez): yalnız gösterim sırasıdır, ihtiyaç doğarsa ayrı kart. Genel ayarlar ile kargo sınıfı iki ayrı işlemde yazılır: aynı anda kaydeden iki yönetici karışık sonuç bırakabilir, yalnız disiplindir. Ayar sayfalarında kaydet çubuğunun açılışta odağı alması kart 0327'de.
- **Kapanışta bulunan.** `/is-bitti` sırasında "oran silinince odak 'Oran ekle'ye geçer" testi ana dalda altı denemenin beşinde düştü (bitti denirken 10/10 sanılmıştı, şans eseriydi). Sebep ölçüldü: tıklama düğmeye odak vermediği için onay penceresi açılırken odak sınıf adı alanındaydı, pencere kapanınca odağı oraya geri veriyor, bu ekranın "Oran ekle"ye verdiği odakla yarışıyordu (Safari de fareyle basılan düğmeye odak vermez). Sınıf ve oran silme düğmeleri basılınca odağı kendine alır; test pencerenin odak dönüşünün bitmesini bekler. Düzeltmeyle 8/8 ve 10/10 yeşil, geri alınınca 6/6 kırmızı; tarayıcı testi yeşil.

## Durum

yapılacak
