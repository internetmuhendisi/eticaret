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

## Sonuç

- **Kullanıcı kararları (2026-11-28), karar 0202.**
  - Alt adres `<ad>.eticaretmagazasi.com`; komut kod adını önerir, değiştirilebilir.
  - Asıl adres ön kapıya girince deneme adresi ona 308 ile yönlenir; sağlık ucu ve `robots.txt` deneme adresinde kalır.
  - Kendi alan adının kayıtlarını mağaza sahibi açar, komut söyler.
  - Asıl adres www'suzdur, `www.` ona yönlenir.
  - Site ayarı `aramaMotorlarinaAcik`: varsayılanı kapalı, seramik için önerilen değer kapalı, satışa açılışta açılır.
  - Teknik kararlar: ayrılmış adlar, her alt adresin kendi kaydı (joker yok), silme `--sil` ister, kimlikteki asıl adres çözülmeden yayın yok, seramik bu bölümde deneme ortamında.
- **Kod.**
  - Ön kapı (`komutlar/on-kapi.mts`): asıl adresin biçimi ve ayrılmış adlar (`asilAdresiCoz`, `altAdHatasi`). Asıl adres satırı ve arama kuralı (`(arama-kapali)` parçası, `sunucu/on-kapi/Caddyfile`). Deneme adresinin yönlendirme satırı (sağlık ucunun hata yolu dahil), www satırı. Çözülme ölçümü (`adCozumuBetigi`, `cozulenleriSec`). Kimlik denetimi (`kimlikAdresiHatasi`) ve iki sitenin aynı asıl adresi taşımaması.
  - Alan adı: plan (`komutlar/alan-adi-plani.mts`), Cloudflare istemcisi (`komutlar/cloudflare.mts`), `pnpm alan-adi` sitelerin alt adres kayıtlarını ve kendi alan adının açılacak kayıtlarını yazar.
  - Denetim (`asilAdresiOlc`, `komutlar/on-kapi-olcumleri.mts`), yayın kilidi (`asilAdresKilidi`).
  - Kuruluş tarifinde `asilAdres` girdisi ve "alan-adi" adımı. Gerçek deneme komutu `pnpm alan-adi-denemesi`.
- **Gerçek deneme.** Geçici altyapı adresi `kapi--deneme.eticaretmagazasi.com` iki kez baştan sona yeşil. Her çalışmada:
  - Cloudflare kaydı açıldı, sunucunun çözücüsünde ve herkese açık ad sunucularında çözüldü.
  - Ön kapı yeni satırları Caddy doğrulamasından geçirip kurdu, sertifika alındı.
  - IPv4 ve IPv6'da adres açıldı, sertifikanın en az 14 günü vardı, arama motorlarına kapalıydı, `robots.txt` kapalıydı, `http://` yönlendi.
  - Deneme adresi 308 ile yönlendi, sağlık ucu deneme adresinde kaldı.
  - Sonra satır ve iki kayıt kaldırıldı ve ölçüldü. Kaldırmadan sonra `pnpm sunucu-denetle --hizli` yeşil, `pnpm alan-adi` "değişiklik yok".
  - İlk çalışma ön kapının satır adı denetiminde durdu (yalnız iki altyapı adını tanıyordu). Temizlik o çalışmada da kaydı ve satırı kaldırdı; denetim iki tireli altyapı adlarını kabul edecek biçimde düzeltildi.
- **Testler.** `komutlar/testler/asil-adres.test.ts`, `alan-adi-plani.test.ts`, `kurulus-tarifi.test.ts`, `on-kapi.test.ts` (projedeki sitelerin kimliği ve asıl adres çakışması). 26 denetim ayrı ayrı bilerek bozularak denendi, her biri kırmızıya düştü. Tek düzeyli alt adres denetimi ikinci katman çıktı, kaldırıldı. Komut, ayar ve metin testleri 908/908, tür kontrolü ve denetim temiz.
- **Bağımsız kontrolün bulgularıyla düzeltilen.**
  - Ad çözücünün anlık takılması açık mağazanın asıl adresini ön kapıdan düşürürdü; ölçüm hatası da adresleri çözülmemiş sayardı.
  - Bir sitenin asıl adres sorunu öteki sitelerin yayınını durdururdu.
  - Asıl adres açılmadan e-postalar o adrese giderdi (yayın kilidi).
  - Kendi alan adının açılacak kayıtları yazılmıyordu.
  - Denemenin temizliği yarıda kalabilirdi.
  - Deneme adresinin sağlık ucunun hata yolu yoktu.
  - `--sil`'siz silme, asıl adreste hedef denetimi, ek satır çakışması, `::ffff:` cevabı, aynı asıl adres, punycode, deneme adresinin ortak kuralı, tarifte adımın yeri.
- **Ölçülmeyen.**
  - Üretilen Caddy satırları yerel Caddy ile doğrulanmadı (komuta izin verilmedi); sunucunun doğrulamasından iki kez geçti.
  - `cozulenAdlar`'ın ölçüm hatasında durması, `asilAdresiOlc` ve denetimin asıl adresli dalı birim testinde yok, gerçek denemeyle ölçüldü.
  - Kendi alan adı gerçek bir alan adıyla denenmedi.
  - Bugün asıl adresi olan site yok: seramik kart 0352'de.

## Durum

yapılacak
