# 0279 · Sipariş e-postalarının metinlerini panelden düzenleme

## Amaç

Sipariş e-postalarının metinleri, gönderen adı ve alt bilgisi bugün çekirdeğin metinlerinden geliyor (kart 0240, karar 0153). Mağaza sahibi kendi sesine göre değiştiremiyor.

Bölüm: Yönetim paneli 2. Kullanıcının kararıyla on dördüncü bölümden bu bölüme bırakıldı. Önce 0311 (taslak) ve 0301 (Ayarlar grubu) bitmiş olmalı.

## Olmazsa olmazlar

- Her e-posta türü için düzenlenebilir alanlar (konu, giriş metni, kapanış), yer tutucularla (müşteri adı, sipariş numarası); tablo, tutar ve yasal satırlar düzenlenmez.
- Önizleme telefon ve bilgisayar genişliğinde, örnek siparişle; "varsayılana dön".
- Yer tutucu kaçışı ve bilinmeyen yer tutucunun reddi; metin gönderimde kaçırılır.
- Değişiklik kuyrukta bekleyen e-postayı değiştirmez (karar 0153).

## Sınırlar

- Gerçek gönderim kart 0060'tadır; gerçek yasal metin kart 0063'tedir.

## Bitti sayılır

- Gerçek veritabanı ve posta kutusuyla düzenlenmiş metnin gitmesi, kaçış, varsayılana dönüş; tarayıcıda klavyeyle, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Sonuç

- Ayarlar > E-postalar (karar 0197): gönderen adı, yanıt adresi ve alt bilgiye ek (kullanıcı kararıyla altyapı sahibinden mağaza sahibine geçti) ve müşteriye giden 19 e-postanın (sipariş e-postaları, Hoş geldiniz, Şifre yenileme; kullanıcı kararı) konusu, giriş ve kapanış metni; köşeli parantezli bilgiler, "Bilgi ekle", yazdıkça yenilenen önizleme (bilgisayar ve telefon), "Varsayılan metne dön", e-posta gidebiliyorsa deneme e-postası (kullanıcı kararı).
- Metin parçalarla saklanır; e-posta kuyruğa girerken o anki metin kayda yazılır, değerler gönderimde kaçırılır. Veritabanı değişikliği 0069.
- Testler ve bozmalar `.claude/rules/kurallari-koruyan-kontroller.md`'de (kart 0279): 33 denetimin hepsi bozulunca kırmızı.
- Bağımsız kontrolün yedi bulgusu düzeldi: konu ve kapanışta bilgilerin boş kalması, yöneticinin şifre e-postasının müşteri metnini alması, satır sonları, ayrışık harf, deneme e-postasının bildirimi ve hataları, gönderen kartında sınır metni.

## Durum

yapılacak
