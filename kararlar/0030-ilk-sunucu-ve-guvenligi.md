# 0030 · İlk sunucu: Falkenstein'da 8 GB, anahtarla giriş, iki kat duvar

## Tarih

2026-11-05

## Karar

- **Yer:** Canlı sunucu Hetzner Cloud'un Falkenstein veri merkezinde (`fsn1`) durur. Nürnberg (`nbg1`) yedeklere bırakılır, böylece yedek canlıdan ayrı bir Alman veri merkezinde durur (0009).
- **Boyut:** Paylaşımlı işlemcili, x86, 4 işlemci ve 8 GB bellekli tip (`cx33`). Site başına yarım GB tahminiyle yaklaşık 10 siteyi taşır. Örnek Mağaza'da ölçülen bellekle yeniden bakılır, gerekince sunucu büyütülür (0013). Aylık fiyat açmadan önce Hetzner'den okunur ve kullanıcı onaylar.
- **İşletim sistemi:** Ubuntu 24.04, uzun destekli sürüm.
- **Giriş:** Yalnız `yonetici` kullanıcısıyla ve anahtarla girilir. Şifreyle giriş ve kökle giriş kapalıdır. Anahtar bu sunuculara özeldir ve altyapı sahibinin bilgisayarında `~/.ssh/altyapi_sunucu` dosyasında durur. Hetzner'e açık anahtar verildiği için kök şifresi hiç üretilmez.
- **Duvar:** İki kat. Dıştaki duvar Hetzner'dedir, içerideki duvar sunucudaki `ufw`'dur. İkisi de dışarıdan yalnız 22 (yönetim girişi), 80 ve 443 (web) kapılarını açar.
- **Kurulum:** Sunucu ilk açılışında kendini kurar (`sunucu/kurulum/ilk-acilis.yaml`, cloud-init). Hetzner'e projedeki komutla doğrudan bağlanılır (`pnpm sunucu-kur`), Hetzner'in kendi aracı kurulmaz. Docker resmi kaynağından kurulur. Ubuntu'nun güvenlik güncellemeleri kendiliğinden kurulur.
- **Denetim:** `pnpm sunucu-denetle` her şeyi dışarıdan gerçek bağlantıyla ölçer. Hetzner'deki yeri ve duvarı, önerilen giriş yöntemlerini, kökle girişi, sshd'nin geçerli ayarını, bütün TCP kapılarını ve Docker'ı denetler.
- **Kayıt:** Sunucunun gizli olmayan bilgileri (ad, tip, veri merkezi, adresler) `sunucu/sunucular.json` dosyasında durur. Hetzner anahtarı yalnız `.env`'de `HETZNER_ANAHTARI` adıyla durur.

## Neden

- Docker, kutulara açtığı kapılar için `ufw`'yu atlar. İçerideki duvar tek başına kalsaydı yanlışlıkla dışarıya açılan bir veritabanı kapısı açık kalırdı. Dıştaki duvar bunu sunucuya ulaşmadan durdurur. İçerideki duvar da dıştaki duvar yanlışlıkla gevşetilirse ikinci kattır.
- Şifreyle giriş, internetteki sürekli şifre denemelerine kapı bırakır. Anahtarla giriş bu denemeleri anlamsız kılar.
- Kökle giriş kapalı olunca saldırgan kullanıcı adını da bilmek zorunda kalır, yapılan işler adı olan bir kullanıcıya yazılır.
- İlk açılış ayarı tek dosyadır. Aynı dosyayla ikinci sunucu aynen kurulur, sunucunun nasıl kurulduğu kayıtta görünür.
- Komut TypeScript'tir, proje zaten bu dille çalışır. Hetzner'in aracını kurmak bir bağımlılık daha ekler ve onun sürümünü izlemek gerekirdi.
- Ubuntu 24.04, 2029'a kadar güvenlik güncellemesi alır. Docker'ın resmi belgelerinde de doğrudan desteklenir.
- x86 seçildi, çünkü çekirdeğin Docker görüntüsü bugün x86 için üretiliyor. Arm sunucu ucuzdur ama görüntünün iki mimari için üretilmesini gerektirir.
- Falkenstein Hetzner'in en büyük Alman veri merkezidir. Hangi Alman veri merkezinin canlıyı taşıyacağı ürün açısından fark yaratmaz.

## Düşünülen diğer yollar

- Yalnız içerideki duvar (`ufw`): Seçilmedi. Docker'ın açtığı kapıları durdurmaz.
- Yalnız Hetzner'in duvarı: Seçilmedi. Bir ayar hatasında ikinci kat kalmazdı.
- Yönetim girişini 22 dışında bir kapıya taşımak: Seçilmedi. Anahtarla girişte güvenliğe katkısı küçüktür, yalnız günlükteki gürültüyü azaltır. Her araçta ayrı ayar ister.
- Hetzner'in aracı (`hcloud`) ya da Terraform: Seçilmedi. Tek sunucu için bir araç ve bir durum dosyası daha getirir. Sunucu sayısı artınca yeniden bakılabilir.
- Daha küçük sunucu (4 GB): Seçilmedi. Veritabanı, Caddy ve sahip paneliyle birlikte yalnız birkaç siteyi taşır.
- Elle kurulum: Seçilmedi. Tekrar edilemez, ikinci sunucu farklı kurulur.

## Sonuçları

- Sunucu aylık ücretlidir. Ücret sunucu açıldığı andan başlar, sunucu silinene kadar sürer.
- Giriş anahtarı tek bilgisayardadır. O bilgisayar kaybolursa sunucuya Hetzner'in kurtarma konsolundan girilir. İkinci bir yedek anahtar ileride eklenmelidir.
- Docker paketleri Ubuntu'nun güvenlik güncellemelerine girmez, kendiliğinden güncellenmez. Docker'ın güncellenmesi sunucu bakımının parçasıdır.
- Kapı taraması dışarıdan bütün TCP kapılarını dener ve birkaç dakika sürer. Hızlı denetim (`--hizli`) yalnız bilinen kapılara bakar.
- Sunucunun adresi kayıtta açıktır. Bu gizli bilgi değildir, alan adı bağlandığında herkes görür.
