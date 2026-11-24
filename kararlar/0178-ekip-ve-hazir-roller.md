# 0178 · Ekip ekranı, hazır roller ve iki aşamalı girişin kurtarılması

## Tarih

2026-11-24

## Karar

- **Hazır roller:** Mağaza rol tanımlamaz, yalnız hazır rolleri verir ve alır (taslaktaki seçim, kart 0274). Bugünkü iki role (mağaza sahibi, görevli) iki rol eklenir: **Sipariş görevlisi** (siparişleri görür ve yönetir, havaleyi onaylar, müşterileri ve ödeme yöntemlerini görür; iade yapamaz) ve **İçerik editörü** (blog ve sayfalar, vitrin bölümleri, menüler; menüye ürün ve kategori bağlayabilmek için ürünleri yalnız görür). Yeni ihtiyaç çıkarsa yeni hazır rol çekirdeğe eklenir. Rollerin izin tablosu ekranda yalnız okunur.
- **Ekip ekranı:** Panelin "Ayarlar" grubunda (taslaktaki yer; öteki ayar ekranları bu gruba kart 0301'de taşınır). Kullanıcılar sekmesi, Roller sekmesi (izin tablosu) ve kullanıcının ekranı (roller, giriş, hesabı kapat). Kullanıcı listesi kısa olduğu için liste motoruna girmez.
- **Rol değiştirme:** Ekran bir kullanıcının bütün rollerini birlikte gönderir; servis eksik olanı verir, fazlasını alır, her değişiklik kayda (`rol.verildi`, `rol.alindi`) girer. En az bir rol kalır (`rol-gerekli`): artık çalışmayacak kişinin hesabı kapatılır. Yönetici kendi rollerini değiştiremez, kendi hesabını kapatamaz ve kendi iki aşamalı girişini sıfırlayamaz (`kendi-hesabi`). Son mağaza sahibinin kuralı (karar 0040) aynıdır, ekranda kutusu kapalıdır ve nedeni yazar.
- **İzinler:** `ekip.hesap-kapat` ve `ekip.iki-asama-sifirla` (tam yetki), `ekip.kendi-hesabi.degistir` (her rolde): kendi yedek kodlarını yenilemek. Görevli bu izni değişiklik dosyasıyla alır.
- **İki aşamalı girişin sıfırlanması (kart 0053):** Kurulum, yedek kodlar, açık ara adımlar, açık şifre bağlantıları ve oturumlar silinir. Kurulumu olmayan yöneticide yapılmaz (`kurulu-degil`). Kayda `yonetici.iki-asama-sifirlandi` girer.
  - **Şifre de sıfırlanır (kullanıcı kararı):** eski şifre geçmez olur (yerine kimsenin bilmediği rastgele bir şifrenin özeti yazılır). Yönetici yeni şifreyi e-postasına gelen bağlantıyla koyar, sonra girişte kurulum ekranına düşer. Telefon şifreyle birlikte çalındıysa (telefondaki şifre yöneticisi) şifreyi bilen kişi gerçek yöneticiden önce kurulum yapamaz.
  - Öteki yöneticilerinkini mağaza sahibi panelden sıfırlar; ardından yöneticinin e-postasına şifre bağlantısı gider. Bağlantı gidemezse (sınır, sitenin adresi yok) sıfırlama yine geçerlidir, ekran yöneticinin "Şifremi unuttum"u kullanacağını söyler.
  - Son mağaza sahibi kendi telefonunu ve yedek kodlarını kaybederse altyapı sahibi sunucudan sıfırlar: `pnpm sunucu-yonetici-iki-asama-sifirla <site klasörü> <ortam> <e-posta>`. Sunucu aracı e-posta göndermez; yönetici giriş sayfasındaki "Şifremi unuttum"u kullanır. Kayda `sunucu-yonetici` adıyla girer, yalnız o sitenin veritabanına dokunur.
  - **Kimlik doğrulaması (kullanıcı kararı):** Altyapı sahibi sıfırlamadan önce kişiyi mağazanın kayıtlı telefon numarasından (sözleşmede ya da mağaza bilgilerinde yazan) kendisi geri arar; adını ve hesabın e-postasını doğrular. Gelen aramaya, e-postaya ya da mesaja dayanarak sıfırlanmaz.
- **Yedek kodları yenileme (kart 0053):** Yönetici "Hesabım" ekranında telefonundaki güncel kodla yeni yedek kodlar üretir; eskilerin hepsi geçmez olur, yeni kodlar yalnız o ekranda bir kez görünür. Yanlış kod giriş kodunun deneme sınırına sayılır, aynı zamanlı kod ikinci kez geçmez. Kayda yalnız kodların sayısı girer.

## Neden

- Hazır roller: 5–30 mağazalık ilk yılda rol tanımlamak mağaza sahibine bir iş daha, yanlış izin seçmek de güvenlik açığıdır. Dört rol bugünkü işleri karşılar; rol eklemek çekirdekte tek değişiklik dosyasıdır.
- Rollerin birlikte gönderilmesi ekranın kutularıyla birebirdir; tek tek ver-al uçları ekranda yarım kalmış bir değişiklik bırakabilirdi.
- Kendi hesabını değiştirememek: yöneticinin kendi rolünü alıp panelden yanlışlıkla düşmesi ve kendi oturumunu kapatması önlenir; başka bir yönetici yapar.
- Kendi kendine kurtarma (e-posta, SMS) yok: şifresi ele geçmiş hesapta ikinci aşamayı atlatan yol açardı (kart 0053). Kurtarmayı her zaman başka bir kişi yapar.
- Şifrenin de sıfırlanması: kurtarma telefonu kaybetmiş yönetici içindir; telefon çalındıysa şifre de çalınmış olabilir. Yeni şifre e-postayla konunca hesabı kurtaran, e-postasına erişen gerçek kişidir.
- Geri arama: gelen arama ya da e-posta taklit edilebilir; kayıtlı numarayı arayan altyapı sahibi kiminle konuştuğunu bilir. En az zahmetli güvenli yol budur.
- Yedek kodu yenilemek telefondaki kodu ister: açık kalmış bir oturumu ele geçiren kişi kodları yenileyip kalıcı giriş elde edemez.

## Düşünülen diğer yollar

- **Mağazanın kendi rolünü tanımlaması (taslağın geniş seçeneği):** Seçilmedi; yukarıdaki neden. Karar 0040'taki "siteler kendi rollerini kuracaktır" beklentisi bu kararla şimdilik ertelenir.
- **Şifreyi sıfırlamamak ya da sıfırlayana seçtirmek:** Kullanıcı seçmedi; çalınan telefonda kalan şifre saldırgana ilk kurulumu yaptırabilirdi, seçim de unutulabilirdi.
- **Geri arama ile birlikte e-posta onayı, ya da görüntülü kimlik:** Kullanıcı seçmedi; geri arama yeterli güvenlik verir, ötekiler her seferinde zahmetlidir.
- **Sıfırlamayı yalnız altyapı sahibinin yapması:** Seçilmedi; mağaza sahibi kendi görevlisinin telefonu için altyapı sahibini beklememeli.
- **Ekibi liste motoruyla çizmek:** Seçilmedi; on kişilik listede süzgeç, sıralama ve sayfa gereksizdir.

## Sonuçları

- Rol ekranı yalnız rol verir; mağazaya özel bir rol ihtiyacı çekirdekte yeni hazır rol ve değişiklik dosyası ister.
- Davet (kart 0275) gelene kadar yeni yönetici yalnız sunucudan açılır (karar 0054); yöneticinin adı yoktur, listede e-postası görünür.
- Geri aramanın doğru numarayla yapılması yalnız disiplindir; numaranın kayıtlı olması teslim komutunun işidir.
- Panel ekranının sıfırlama düğmesi yalnız kurulumu olan yöneticide görünür; kurulumu olmayan zaten bir sonraki girişte kurar.
- Kurtarılan yönetici e-postasına erişebilmelidir; e-postası da kaybolmuşsa altyapı sahibi önce hesabın e-postasını değiştirmelidir (bugün komutu yok).
