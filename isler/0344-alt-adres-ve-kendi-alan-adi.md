# 0344 · Sitenin alt adresi ya da kendi alan adı

## Amaç

Bugün her site yalnız deneme adresinde açılır (`<kod-adi>.deneme.eticaretmagazasi.com`, karar 0032). Bu bölümün sonunda bir seramik mağazası `seramik.eticaretmagazasi.com`'da açılacak (kart 0352), "Yeni site kur" komutu da alt adres ya da mağazanın kendi alan adını soracak (kart 0350). Karar 0032 `<kod-adi>.eticaretmagazasi.com` biçimini deneme adresleri için seçmemişti; bu, deneme dışındaki asıl adresin biçimi olarak ayrıca kararlaştırılır.

Bölüm: Yeni mağaza. Önce 0343 bitmiş olmalı.

## Olmazsa olmazlar

- Kullanıcıya sorulur ve bir karar kaydına yazılır (karar 0032'nin yerine geçmez, onu tamamlar):
  - alt adresin biçimi ve ayrılmış adlar (`deneme`, `kapi--yoklama`, `www`, `panel` gibi; hangi adın hiçbir siteye verilemeyeceği);
  - alt adreste açılan sitenin arama motorlarına açık mı kapalı mı başladığı (deneme adresinin kuralı ön kapıdadır);
  - deneme adresinin site alt adres alınca kalıp kalmadığı, kalırsa alt adrese yönlenip yönlenmediği;
  - kendi alan adında kaydı kimin yaptığı (mağaza sahibi mi, Cloudflare anahtarımızla biz mi) ve `www` ile çıplak adın hangisinin asıl olduğu.
- Cloudflare kaydı: alt adres için sitenin kendi A ve AAAA kaydı (vekil kapalı, karar 0032'nin nedeniyle), `pnpm alan-adi`'nın kuralıyla: önce ne değişeceğini söyler, onayla yazar, yalnız kendi kaydına dokunur, aynı adda başka kayıt varsa durur. Joker kayıt yoktur; yeni bir alt adres alan adı değişikliğidir ve onay ister.
- Kendi alan adı: komut gereken kayıtları söyler, herkese açık ad sunucularından sunucuya çözüldüğünü ölçmeden ön kapıya eklemez (sertifika sınırı, karar 0032 "Sonuçları").
- Ön kapı: sitenin adres listesinden satır üretir (deneme adresi ve asıl adres), sertifika adres adres alınır. Kimlikteki `adresler` ile ön kapının ürettiği satır aynı olmalı (`kimlikAdresiHatasi`'nın kuralı asıl adrese genişler).
- Sunucu denetimi asıl adresi de ölçer: çözülme, sertifika ve süresi, yönlendirme, arama motoru kuralı (kararın seçtiği hâliyle), tanınmayan adın hiçbir yere gitmemesi.
- Yayın komutu, yedek, hata izleme ve e-posta bağlantıları (şifre sıfırlama, sipariş e-postaları) asıl adres varsa onu kullanır; hangi adresin "sitenin adresi" olduğu tek yerde tanımlıdır.

## Sınırlar

- Teslim (satışa açma, mağaza sahibi hesabı, teslim e-postası) yapılmaz.
- Seramik mağazasının adresi bu kartta açılmaz, kart 0352'de açılır. Bu kartın asıl adres denemesi geçici bir alt adresle yapılır ve kaldırılır.
- Cloudflare vekili açılmaz.

## Bitti sayılır

- Karar kaydı yazıldı, kullanıcı onayladı.
- Geçici bir alt adres kayıt, ön kapı ve sertifikayla açıldı, sunucu denetimi ölçtü, sonra kayıt ve satır kaldırıldı; denetim kaldırmadan sonra da yeşil.
- Kendi alan adının çözülmeden eklenmediği bozuk örneğiyle testte.
- Ayrılmış adların reddi ve kimlik ile ön kapı satırının aynılığı testte.

## Durum

yapılacak
