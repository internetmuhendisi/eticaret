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

## Durum

yapılacak
