# 0347 · Açık bir mağazaya demo içe aktarma ve demolar arası geçiş

## Amaç

Kart 0345'in paketi bugün yalnız boş veritabanına kurulur. Açık bir mağaza da bir demoyu içe aktarabilmeli, örnek verilerle ya da onlarsız; mağazanın ayarları ve kendi içerikleri her zaman korunmalı, demolar arasında ve önceki hâline geri geçilebilmeli. Davranış kart 0346'nın karar kaydındaki gibidir.

Bölüm: Yeni mağaza. Önce 0345 ve 0346 bitmiş olmalı; görselleri yazdığı için 0093 (dosyaların yedeği).

## Olmazsa olmazlar

- İçe aktarma tek işlemdir: bir parça yazılamazsa hiçbir şey kalmaz, yazılan görseller silinmiş işaretlenir (kart 0084, 0087'nin kuralı).
- Aktarılan her kayıt hangi demodan ve hangi içe aktarmadan geldiğini taşır; "(örnek)" eki ve örnek işareti kart 0346'nın kararıyla. Ek tek yerde (metin dosyasında) tanımlıdır, sitenin dilindedir.
- Mağaza sahibinin ayarları (karar 0346'nın listesi: ad, logo, bilgiler, ödeme, kargo, vergi, e-posta metinleri, ekip) ve kendi eklediği kayıtlar içe aktarmada da geçişte de değişmez; testte her biri ölçülür.
- Adres adı çakışması (mağazanın aynı adresli kaydı, eski adresler; karar 0193) demonun kaydına sayı vererek çözülür, mağazanın kaydı değişmez.
- Demolar arası geçiş ve önceki hâline dönüş kararın tarif ettiği gibi; örnek ürün sipariş, yorum ya da favori almışsa siparişin kalemi, yorum ve geçmiş bozulmaz.
- Aynı anda iki içe aktarma ve içe aktarma sürerken yapılan panel değişiklikleri sıra kurularak denenir (kilit sırası katalog kurulumuyla aynı, kart 0084, 0107, 0114).
- Değişiklik kaydı: içe aktarmanın kendisi ve geçiş tek satır, ayrıntı ölçülü (binlerce satır yazmaz).
- Uzun süren içe aktarma arka plan işi olur; durumu sorulabilir, yarıda kalan iş sonraki açılışta temizlenir.
- Uçlar: başlatma, durum, geri dönüş; izni kararın seçtiği rolde; erişim testinde beklentiden; tema demosunda kapalı.
- Gerçek veritabanı ve klasörle testler; her kural ayrı ayrı bilerek bozularak kırmızıya düşer (projenin kuralı).

## Sınırlar

- Ekran kart 0348'dedir.
- Paketin biçimi değişmez (değişmesi gerekirse kart 0345'e not düşülür, kullanıcıya söylenir).
- Yeni siteyi kurmak kart 0350'dedir.

## Bitti sayılır

- Örnek verili ve örnek verisiz içe aktarma, geçiş ve geri dönüş gerçek veritabanıyla testte.
- Korunan her ayar ve mağaza sahibinin kaydı testte değişmiyor.
- Yarış, tek işlem ve yarıda kalan iş testte.
- Uçların izinleri erişim testinde, uç belgesinde.

## Durum

yapılacak
