# 0044 · Yöneticinin iki aşamalı girişi: ara adım, zamanlı kod, ayrı şifreleme anahtarı

## Tarih

2026-11-06

## Karar

- **Akış:** Şifre doğrulanınca oturum açılmaz, 10 dakikalık bir ara adım açılır (`yonetici_giris_adimlari`, `__Host-yonetici-giris-adimi` çerezi). Gerçek oturum ancak kod doğrulanınca ya da kurulum onaylanınca başlar (`cekirdek/moduller/oturum/iki-asamali-giris.ts`). Kurulumu bitmiş yönetici kod ekranına (`/yonetim/giris/kod`), bitmemiş yönetici kurulum ekranına (`/yonetim/giris/kurulum`) gider.
- **Herkes için zorunlu:** Bütün yöneticiler ve bütün siteler için zorunludur, site ayarı değildir (kullanıcı onayı). Her girişte kod istenir, "bu cihazı hatırla" yoktur (kullanıcı onayı).
- **Oturum damgası:** Yönetici oturumu `iki_asama_zamani` doluysa geçerlidir. Boş oturumu oturum doğrulama, sorma ve yenileme reddeder. Bu değişiklikten önce açılmış ve eski sürümün yalnız şifreyle açtığı bütün oturumlar böylece geçmez.
- **Eski sürüme dönüş:** Değişikliğin notu "yedekten"dir: `pnpm geri-don` 0.7.0'dan eskiye dönmez. Eski kod ikinci aşamayı bilmez, dönmek korumayı sessizce kapatırdı.
- **Kod:** RFC 6238: HMAC-SHA1, 6 hane, 30 saniye; önceki ve sonraki kod da geçer. Bir kod ikinci kez geçmez (`son_kod_adimi`). Yalnız Node'un yerleşik işlevleri kullanılır (0039).
- **Deneme sınırı:** Hesap başına 15 dakikada 5, bağlantı başına 15 dakikada 20 yanlış koddan sonra 15 dakika bekletilir (kullanıcı onayı, `ikiAsamaDenemeSiniri`). Yanlış yedek kod da sayılır. Şifreyle yeniden girmek sayacı sıfırlamaz, yalnız doğru kod sıfırlar.
- **Bekleyen gizli:** Kurulum bitene kadar gizli ara adımda durur, her şifre girişi yeni gizli alır, kalıcı satır yalnız onayda yazılır. Aynı adımda sayfa yenilemek karekodu bozmaz.
- **Gizli:** Veritabanında AES-256-GCM ile şifreli durur, hesabın kimliği doğrulanan ek veridir, etiket tam boyda olmalıdır. Anahtar veritabanının dışında, sitenin gizli bilgi dosyasındadır (`IKI_ASAMA_ANAHTARI`, `iki_asama_anahtari`, 0031). `pnpm sunucu-gizli --yenile` bu anahtara dokunmaz.
- **Yedek kodlar:** 10 tane, tek kullanımlık, 10 karakter (kullanıcı onayı). Yalnız aynı anahtarla HMAC-SHA256 özetleri durur, kurulum onayında bir kez gösterilir. Kullanılan satır silinmez, işaretlenir.
- **Karekod:** Sunucuda çizilir, kurulum adresi dış bir servise gitmez. `uqr` paketi kullanılır (bağımlılığı yok, MIT, yalnız kodlama yapar). Koyu temada da açık zeminde koyu durur.
- **Oturum açma yolu:** `oturumAc` yalnız iki aşamalı giriş dosyasından çağrılır, `girisYap` yalnız motor testleri içindir; `cekirdek/kapi/testler/iki-asamali-giris.test.ts` bunu denetler. `sinirliGirisYap` kaldırıldı, yerine oturum açmayan `sinirliSifreDogrula` geldi.

## Neden

- **Ara adım:** Oturumun içine "kod bekleniyor" işareti koymak, her uçta ve her sayfada bu işarete bakmayı gerektirirdi; unutulan bir yerden kodsuz girilirdi. Ara adım oturum değildir. Kurulumsuz kişinin panele ve yönetici uçlarına girmemesi var olan oturum kontrolünden kendiliğinden çıkar.
- **Ayrı şifreleme anahtarı:** Veritabanı ya da yedeği sızsa da gizli açılamaz, kodlar üretilemez. Anahtar veritabanı yedeğine girmez.
- **Bekleyen gizlinin adıma bağlı olması:** Tek gizli olsaydı çalınmış şifreyle kurulum ekranını açan biri anahtarı kopyalayıp çıkabilir, gerçek yönetici aynı anahtarla kurunca kod üretebilirdi. Bağımsız kontrol bunu ölçtü, testle kapatıldı.
- **Damga:** Yayında veritabanı değişikliği yeni kutudan önce uygulanır, eski kutu bir süre şifreyle oturum açmaya devam eder. Yenilenen oturumun ömrü sınırsızdır. Değişiklikte oturumları kapatmak bu aralığı kapsamazdı.
- **Şifreden sıkı sınır:** 6 haneli kod 1 milyon olasılıktır ve aynı anda üç kod geçerlidir, deneme başına başarı yaklaşık 3/1.000.000. Sınır saldırıyı yavaşlatır, imkânsız kılmaz: şifreyi bilen biri yöneticiyi kilitlemeden 15 dakikada 4 denemeyle bir yılda yaklaşık %34 şansa ulaşır (hesap). Sınır 5 kullanıcı onayıyla seçildi; yanlış kod uyarısı kart 0055'tedir.
- **Sayacın şifreyle sıfırlanmaması:** Şifreyi bilen biri yeniden girerek deneme hakkı kazanırdı.
- **Yedek kodda anahtarlı özet:** Kod 50 bittir; anahtarsız özet veritabanı sızınca çevrim dışı kırılabilirdi. Anahtarlı özette yavaş yönteme gerek yoktur.

## Düşünülen diğer yollar

- **Oturum tablosuna doğrulama alanı eklemek:** Seçilmedi. Gerekçesi yukarıda; tablo müşteriyle ortak biçimdedir.
- **"Bu cihazı hatırla":** Önerilmedi, kullanıcı onayladı. Çalınan cihazda koruma kalkardı, oturum zaten 24 saat açık kalır.
- **SMS ya da e-postayla kod:** Kart dışarıda bırakıyor. SMS numara taşımaya açıktır, e-posta şifreyle aynı saldırıya düşebilir.
- **Hazır paket (otplib, speakeasy):** Seçilmedi. Hesap birkaç satırdır, 0039'daki yaklaşımla aynı; standart örnekleri testte ölçüldü.
- **Karekodu dış servisle ya da tarayıcıda üretmek:** Seçilmedi. Dış servis gizliyi görürdü, tarayıcıda üretmek gizliyi koda taşımaktan fark etmezdi ama kurulum sunucuda zaten duruyor.
- **`qrcode` paketi:** Seçilmedi. Görüntü ve komut satırı için bağımlılık getirir, bize yalnız kodlama gerekir.
- **Anahtarı veritabanı şifresinden türetmek:** Seçilmedi. Şifre yenilenince bütün gizliler açılamaz olurdu.

## Sonuçları

- **Anahtar kaybolursa:** Bütün kurulu iki aşamalı girişler açılamaz, yöneticiler giremez. Anahtar yedeğe girmez: sunucu kaybında veritabanı yedeğiyle birlikte anahtar da gerekir, gizli bilgilerin yedeği henüz yok. Dosya kaybolursa sonraki yayın yeni anahtar üretir ve bunu kimse fark etmez, kod girişleri 500 döner, sağlık ucu yeşil kalır. Kart 0054'tedir, kurtarma kart 0053'tedir.
- **Eski sürüme hızlı dönüş yok:** 0.7.0'a geçen site `pnpm geri-don` ile geri dönemez, yedekten dönülür. Yayın sırasında eski kutu çalışırken açılan oturumlar yeni kutuda geçmez, o yöneticiler yeniden girer.
- **Yayın aralığında eski kutu:** Değişiklik uygulandıktan sonra eski kutu yeni kutu devralana kadar şifreyle girişe açıktır. Bu oturumlar yeni sürümde geçersizdir, ama o kısa süre içinde eski kod panel açar.
- **Bekleyen gizlinin görünmesi:** Ara adım çerezi 10 dakika boyunca şifre sormadan kurulum ekranını açar. Ortak bilgisayarda bırakılan ekran bu süre görülebilir; kabul edildi, çıkış düğmesi bu ekranda yoktur, giriş sayfasına dönmek adımı kapatmaz.
- **Devir (0014):** Site devredilirken bu anahtar da verilmelidir, ya da yöneticiler kurulumu yeniden yapar. `--yenile` anahtarı değiştirmediği için devirde elle düşünülmelidir.
- **Anahtar değiştirilemez:** Değiştirmek için gizlilerin yeniden şifrelenmesi gerekir, araç yoktur. Şifreli değerde sürüm öneki (`v1`) bunun için durur.
- **Telefon kaybı:** Telefonunu ve yedek kodlarını birlikte kaybeden yönetici giremez (kart 0053). Yedek kod ekranı kapatılırsa kodlar bir daha görülemez, yenilerini üretme yolu da kart 0053'tedir.
- **İlk kurulum:** Şifreyi ilk ele geçiren kurulumu kendi telefonuna yapabilir. Şifre bu yüzden güvenli teslim edilmelidir.
- **Bekletme:** Şifreyi ele geçiren biri yanlış kodlarla gerçek yöneticiyi 15 dakika bekletip bunu tekrarlayabilir (kullanıcı onayı). Sayaç bellektedir, uygulama yeniden başlayınca sıfırlanır (0042).
- **Karşılaştırma:** Kodun süresi hangi adımın tuttuğunu belli etmez, ama zamanlı kod ile yedek kod farklı yoldan geçer; kod biçimi saldırgan için sır değildir.
- **Süresi dolan ara adımlar:** Yalnız aynı hesap yeniden girince silinir. Hiç dönmeyen hesabın satırı kalır, içinde şifreli gizli olabilir; oturum temizliği kartına (0044) eklendi.
- **Oturum açma denetimi:** Test `cekirdek/` altında işlev adını metin olarak arar. Takma adı, tabloya doğrudan yazmayı, `komutlar/` ve `sahip-paneli/` klasörlerini görmez; o kısmı yalnız disiplindir. Damga sonraki savunmadır: damgasız oturum zaten geçmez.
- **Küçük bedeller:** Telefon saati ileride olup sonraki adımın kodu geçerse, telefon saati düzelene kadar 60 saniyeye kadar yeni kod yanlış sayılabilir. Güvenlik başlıkları (kurulum sayfası dahil) henüz yok, ayrı iştir.
- **Ek sorgu:** Oturumsuz panel isteğinde bir sorgu daha atılır.
- **Giriş sayfası:** Giriş sayfası ara adımı olan kişiye de açılır; baştan başka hesapla girilebilsin diye.
