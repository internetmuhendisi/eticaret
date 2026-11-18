# 0224 · Panelde ödeme yöntemlerinin sırası değişiyor ama kaydedilmiyor

## Amaç

Kullanıcının gözlemi (2026-11-17): panelin "Ödeme yöntemleri" ekranında yöntemlerin sırası değişiyor ama kaydedilmiyor, vitrinin ödeme adımında yöntemler eski sırada kalıyor.

Kod okumasıyla bilinenler (sebep ölçülmedi):
- Sıralama yalnız ekrandaki formu değiştirir (`cekirdek/yonetim-paneli/odeme-yontemleri/ekran.tsx`, `SiralanabilirListe`'nin `siralaninca`'sı `setForm`). Karar 0141'e göre yöntemler, kapıda ödemenin seçenekleri ve iptal süresi "Kaydet" düğmesiyle birlikte kaydedilir. Aynı ekrandaki banka hesaplarının sıralaması ise hemen kaydedilir; kütüphanenin kuralı da "kullanan yeni sırayı hemen verir, kaydı arkadan yapar"tır (`.claude/rules/bilesenler.md`).
- Panelin tarayıcı testi (`cekirdek/testler/uctan-uca/odeme-yontemleri.test.ts`) yöntemlerin sıralanıp kaydedilmesini denemez.

Ölçülecek adaylar:
1. "Kaydet"e basılmadan sayfadan çıkılıyor: sıra kaydedilmiyor, uyarı da yeterince görünmüyor (sıralamanın hemen kaydedilmediği belli değil).
2. "Kaydet"e basılıyor ama sıra sunucuya ulaşmıyor ya da sunucu yazmıyor: kart 0215 kaydı, sitede görünmeyen eklentili yöntemi listenin sonuna koruyarak yazar (`odemeYontemiServisi.yontemleriDegistir`); vitrin `kullanilabilirYontemler` ile okur.
3. Kayıttan sonra sayfanın yenilenmesi formu eski hâline döndürüyor (kart 0223 ile aynı kalıp).
4. Vitrin eski sırayı önbellekten ya da açık kalmış ödeme sayfasından gösteriyor.

## Olmazsa olmazlar

- Önce sebep ölçülür: kullanıcının yaptığı adımlar tarayıcıda yeniden üretilir (sıralama, varsa "Kaydet", vitrinin ödeme adımı); veritabanındaki `odemeYontemleri` ayarı her adımda okunur.
- Sebep 1 çıkarsa ürün kararı kullanıcıya sorulur: sıralama hemen mi kaydedilsin (banka hesapları gibi), yoksa "Kaydet"le mi kalsın ve bu ekranda daha belirgin söylensin mi.
- Sebep kod hatasıysa ortak yerde düzeltilir; aynı kalıp öteki panel ekranlarında aranır.
- Panelin tarayıcı testine sıralamanın kaydedilip vitrinin ödeme adımında yeni sırayla görünmesi eklenir.

## Sınırlar

- Ödeme yöntemlerinin açık-kapalı kuralları ve "en az bir yöntem" kuralı değişmez.
- Kaydettikten hemen sonra yazılan değerin yenilemeyle kaybolması kart 0223'ün işidir; sebep o çıkarsa iki kart birlikte düşünülür.

## Bitti sayılır

- Sebep ölçümle yazıldı.
- Panelde değiştirilen sıra kaydediliyor ve vitrinin ödeme adımında yeni sırayla görünüyor (tarayıcı testi).
- Düzeltme geri alınınca test kırmızıya düşüyor.
- Kontrol hattı yeşil.

## Ölçüm ve düzeltme (2026-11-18)

**Sebep: aday 1.** Tarayıcıda geçici bir ölçüm testiyle, her adımda veritabanı okunarak denendi:
- "Aşağı al" ile sıralandı. Ekran yeni sırayı gösterdi, veritabanı eski sırada kaldı. Bildirim yoktu; tek işaret açık "Kaydet" düğmesiydi.
- "Kaydet"e basılınca sıra veritabanına yazıldı. Sayfa yenilenince ve vitrinin ödeme adımında yeni sırayla göründü.

Adaylar 2, 3 ve 4 ölçümle elendi: kaydedilen sıra sunucuya ulaşıyor, yenileme onu bozmuyor, vitrin yeni sırayı gösteriyor.

**Ürün kararı (kullanıcı).** Sıra hemen kaydedilsin (karar 0144).

**Düzeltme.**
- Yeni uç `POST /kapi/yonetici/odeme-yontemleri-sirala` yalnız sırayı yazar (`yontemleriSirala`).
- Ekran sırayı hemen gösterir ve "Yöntemlerin sırası kaydedildi" bildirimi verir.
- Kaydedilmemiş anahtar, seçenek ve süre sıralamayla birlikte gitmez.
- Ekranın açıklaması yeni davranışı söyler.

**Bağımsız kontrolün bulgularıyla düzeltilenler.**
- Sıralama ayarı kilidin içinde okur. Mağaza ayarı servisinin `degistir`'i değeri işlev olarak da alır. Eski hâlde aynı anda kaydedilen anahtar değişikliği sıralamayla geri alınabiliyordu.
- Ekranın istekleri (sıralamalar ve "Kaydet") sırayla gider. "Kaydet" sırası geldiğinde formun o anki hâlini gönderir. Eski hâlde "Kaydet" sürerken yapılan sıralama geri alınabiliyordu.
- Sıralama düşerse ekran sunucuda olduğu bilinen sıraya döner.
- İstek sürerken "Vazgeç" kapalıdır.
- Çakışmanın kendi metni var.
- Servis dosyasının başındaki yanlış açıklama düzeltildi.

**Testler.**
- Servis: yalnız sıra, aynı sıra kayda girmez, görünmeyen yöntem sona korunur, çakışan listeler. Açık duran ayar işleminin arkasında kilitte bekleyen sıralama da sıra kurularak denendi.
- Tarayıcı:
  - "Kaydet"e basmadan sıra kaydedilir, kaydedilmemiş anahtar ekranda kalır, vitrinin ödeme adımı yeni sırayı gösterir.
  - Kaydet isteği tutulurken yapılan sıralamada ikisi de kaydedilir.
- Bozma denemeleri: ekranın eski davranışı, sona korunma, uzunluk denetimi, kilidin dışında okuma ve sıraya almanın kaldırılması ayrı ayrı denendi. Her biri kırmızıya düştü.
- "Ödeme yöntemleri" dosyası üç kez art arda 5/5. Vitrinin ödeme testi ve sepet testi yeşil.

**Ayrı karta yazılanlar.**
- Kart 0229: aynı servisin öteki işlevleri (`yontemleriDegistir`, banka hesabı ekleme, değiştirme, silme, sıralama) de ayarı kilidin dışında okuyup bütün değeri yazıyor.
- Kart 0228: arka arkaya sıralama, öteki hemen kaydedilen listeler.

**Kalan madde.** "Kontrol hattı yeşil" maddesi gönderimde görülecek.

## Durum

yapılacak
