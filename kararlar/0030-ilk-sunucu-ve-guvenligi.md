# 0030 · İlk sunucu: Falkenstein'da 8 GB, anahtarla giriş, iki kat duvar, gece yeniden başlatma

## Tarih

2026-11-05

## Karar

- **Yer:** Canlı sunucu Hetzner Cloud'un Falkenstein veri merkezinde (`fsn1`) durur. Nürnberg (`nbg1`) yedeklere bırakılır, böylece yedek canlıdan ayrı bir Alman veri merkezinde durur (0009).
- **Boyut:** Paylaşımlı işlemcili, x86, 4 işlemci ve 8 GB bellekli tip (`cx33`). Site başına yarım GB tahminiyle yaklaşık 10 siteyi taşır. Örnek Mağaza'da ölçülen bellekle yeniden bakılır, gerekince sunucu büyütülür (0013). Aylık fiyat açmadan önce Hetzner'den okunur ve kullanıcı onaylar.
- **İşletim sistemi:** Ubuntu 24.04, uzun destekli sürüm.
- **Giriş:** Yalnız `yonetici` kullanıcısıyla ve anahtarla girilir. Şifreyle giriş ve kökle giriş kapalıdır. Anahtar bu sunuculara özeldir ve altyapı sahibinin bilgisayarında `~/.ssh/altyapi_sunucu` dosyasında durur. Hetzner'e açık anahtar verildiği için kök şifresi hiç üretilmez.
- **Duvar:** İki kat. Dıştaki duvar Hetzner'dedir, içerideki duvar sunucudaki `ufw`'dur. İkisi de dışarıdan yalnız 22 (yönetim girişi), 80 ve 443 (web) kapılarını açar.
- **Güncellemeler:** Ubuntu'nun güvenlik güncellemeleri her gün kendiliğinden kurulur. Çekirdek gibi yeniden başlatma isteyen bir güncelleme kurulduysa sunucu o gece Türkiye saatiyle 04:00'te (01:00 UTC) kendiliğinden yeniden başlar. Bütün siteler o gece 1–2 dakika açılmaz. Bu ürün kararını kullanıcı verdi. Bekleyen yeniden başlatma iki günden eskiyse denetim kırmızıdır.
- **Silme koruması:** Hetzner'de sunucunun silme ve yeniden kurma koruması açıktır.
- **Kurulum:** Sunucu ilk açılışında kendini kurar (`sunucu/kurulum/ilk-acilis.yaml`, cloud-init). Hetzner'e projedeki komutla doğrudan bağlanılır (`pnpm sunucu-kur`), Hetzner'in kendi aracı kurulmaz. Docker resmi kaynağından kurulur. Ubuntu'nun güvenlik güncellemeleri kendiliğinden kurulur.
- **Denetim:** `pnpm sunucu-denetle` her şeyi dışarıdan gerçek bağlantıyla ölçer:
  - Hetzner'de: yer, silme koruması, duvarın bağlı olduğu ve duvardaki kurallar.
  - Girişte: önerilen giriş yöntemleri, kökle giriş, sshd'nin geçerli ayarı.
  - Kapılarda: IPv4'te bütün TCP kapıları, IPv6'da ilk 1024 kapı ve bilinen kapılar.
  - Sunucuda: güncellemeler, yeniden başlatma ve Docker.
  Ağ hatası ya da tarama sırasında bağlantı kesintisi sonucu güvenilmez yapar, denetim kırmızı biter.
- **Kayıt:** Sunucunun gizli olmayan bilgileri (ad, tip, veri merkezi, adresler) `sunucu/sunucular.json` dosyasında durur. Hetzner anahtarı yalnız `.env`'de `HETZNER_ANAHTARI` adıyla durur.

## Neden

- Docker, kutulara açtığı kapılar için `ufw`'yu atlar. İçerideki duvar tek başına kalsaydı yanlışlıkla dışarıya açılan bir veritabanı kapısı açık kalırdı. Dıştaki duvar bunu sunucuya ulaşmadan durdurur. İçerideki duvar da dıştaki duvar yanlışlıkla gevşetilirse ikinci kattır.
- Şifreyle giriş, internetteki sürekli şifre denemelerine kapı bırakır. Anahtarla giriş bu denemeleri anlamsız kılar.
- Güncelleme kurulup sunucu yeniden başlamazsa çekirdekteki açık kapanmaz. Gece yeniden başlatma açığı en geç bir gün içinde kapatır, kesinti de ziyaretçinin en az olduğu saate düşer.
- Duvardaki kurallar ayrıca Hetzner'den okunur, çünkü denetimin çalıştığı ağ bazı kapılara çıkışı engelleyebilir. Ayrıca dinleyeni olmayan bir kapı dışarıdan açık görünmez, onu ancak kural gösterir.
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
- Kendiliğinden yeniden başlatmamak: Seçilmedi. Siteler hiç kesilmezdi, ama güvenlik açığı elle yeniden başlatılana kadar açık kalırdı. Kullanıcı gece yeniden başlatmayı seçti.

## Sonuçları

- Sunucu aylık ücretlidir. Ücret sunucu açıldığı andan başlar, sunucu silinene kadar sürer.
- Giriş anahtarı tek bilgisayardadır. O bilgisayar kaybolursa sunucuya Hetzner'in kurtarma konsolundan girilir. İkinci bir yedek anahtar ileride eklenmelidir.
- Docker paketleri Ubuntu'nun güvenlik güncellemelerine girmez, kendiliğinden güncellenmez. Docker'ın güncellenmesi sunucu bakımının parçasıdır.
- Yeniden başlatma isteyen bir güncelleme geldiğinde bütün siteler gece 04:00'te 1–2 dakika açılmaz. Sitelerin kutuları yeniden başlayınca kendiliğinden açılmalıdır, bu iş kart 0038'dedir.
- Kapı taraması dışarıdan bütün TCP kapılarını dener ve yaklaşık 6 dakika sürer. Hızlı denetim (`--hizli`) yalnız bilinen kapılara bakar. UDP kapıları taranmaz, UDP'yi Hetzner duvarındaki kural denetimi kapsar.
- Denetimi çalıştıran bilgisayarda IPv6 yoksa IPv6 taraması ağ hatası verir ve denetim kırmızı biter.
- Hetzner anahtarı okuma ve yazma yetkilidir, denetim de aynı anahtarı kullanır. Ayrı bir okuma anahtarı ileride düşünülebilir.
- `yonetici` kullanıcısı şifresiz sudo hakkına sahiptir ve Docker grubundadır. Giriş anahtarı ele geçerse sunucu da ele geçer. Anahtarın korunması bu yüzden önemlidir.
- Sunucunun adresi kayıtta açıktır. Bu gizli bilgi değildir, alan adı bağlandığında herkes görür.
