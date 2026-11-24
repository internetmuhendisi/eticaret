# 0175 · Panelin Mağaza bilgileri ekranı

## Tarih

2026-11-24

## Karar

Panelde "Mağaza bilgileri" ekranı açıldı (kart 0278; taslak ve ürün kararları karar 0157). Mağaza sahibi mağaza adını, iletişim telefonunu ve e-postasını, mağaza adresini, sosyal hesaplarını ve satıcı bilgilerini tek formda değiştirir. Bu bilgiler bugüne kadar yalnız sitenin başlangıç dosyasından geliyordu (kartlar 0071, 0091, 0108).

- **Kurallar ayar şemasındadır** (`magazaAyarSemasi`): telefonun biçimi, il ve ilçenin tutarlılığı, posta kodu, sosyal hesabın kalıbı ve tekrarı, satıcının vergi ya da kimlik numarası (kontrol hanesiyle), MERSİS ve KEP alan adı. Ekran kural taşımaz.
- **Servis** (`cekirdek/moduller/magaza-ayarlari/bilgiler.ts`, `magazaBilgileriniDegistir`): uç alanları yazı olarak alır, her alanı ayarın şemasıyla denetler. Hatayı alanın yolu ("magazaAdresi.il", "saticiBilgileri.vergiNumarasi", "sosyalHesaplar.<sıra>.hesap") ve şemanın koduyla döndürür; hata varken hiçbir ayar yazılmaz. Kapı şemanın kendi kodunu taşımadığı için (kart 0285) denetim uçta değil serviste yapılır.
- **Boş yazı ayarı boşaltır.** Adresin ya da satıcı bilgilerinin bütün alanları boşsa ayar silinir; bir alanı doluysa zorunlu alanlar istenir (adres; unvan). Mağaza adı boş bırakılamaz.
- **Telefon** ülke içi yazılışla da girilir ve ödeme adımındaki gibi uluslararası biçime çevrilir (`telefonuDuzelt`). Çevirmede mağaza adresinin ülkesi, yoksa sitenin ilk satış ülkesi kullanılır.
- **Sosyal hesaplar:** her site için önünde sitenin adresi olan bir alan vardır; yalnız kullanıcı adı yazılır. Boş alan atılır, baştaki "@" kullanıcı adına girmez. Kayıtlı veride aynı siteden birden çok hesap varsa her biri kendi alanında görünür, sessizce kaybolmaz.
- **Satıcı bilgileri:** işletme türü (şirket ya da şahıs) numaranın adını ve kuralını seçer (vergi kimlik numarası ya da kimlik numarası). Ülke, sitenin tek satış ülkesiyse yazı olarak görünür, birden çoksa seçilir. Vergi dairesi ve numaraları isteğe bağlı kalır (karar 0138).
- **İzinler:** görmek `magaza-ayarlari.gor`, değiştirmek `magaza-ayarlari.degistir` (yalnız mağaza sahibi). İzni olmayan yönetici alanları okur, kaydet çubuğunu görmez.
- **Değişiklik kaydı:** telefon, e-posta, adres ve satıcı bilgileri değeri yazılmadan girer (kayıtta gizli, kart 0071); mağaza adı ve sosyal hesaplar değeriyle.
- **Etkisi:** vitrin bağlamı, hata sayfası, sipariş fişi ve e-posta ayarları her istekte okuduğu için değişiklik hemen görünür. Kuyruktaki e-postada karar 0153 geçerlidir: siparişin verisi olay anında yazılmıştır ve değişmez; mağaza adı ve alt bilgideki unvan, adres ve telefon gönderim anında okunur, kuyrukta bekleyen e-postada da yeni değerle gider.
- **Menüdeki yeri:** Satış grubunda, öteki ayar ekranlarının (sipariş ayarları, ödeme yöntemleri, kargo) yanında. Taslaktaki ayrı "Ayarlar" grubu kart 0301'dedir.

Taslaktan bilerek ayrılanlar:

- Vergi dairesi ve vergi numarası taslakta zorunlu, burada isteğe bağlı: karar 0138'in kuralı (hangilerinin zorunlu olduğu yasal metinlerle, kart 0063).
- Numaraların altındaki "10 hane", "16 hane" ipuçları yok: hane sayısı ülkenin veri dosyasına bağlıdır, metne yazılmaz.
- Form panelin öteki ayar formları gibi metin genişliğindedir (`max-w-metin`); taslakta tam genişlik.
- İl, ilçe ve adres alanları ödeme adımının parçalarıdır; etiketlerinde "(isteğe bağlı)" eki yoktur.

## Neden

Satıcı bilgileri ve iletişim bilgileri yasal metinlerde, e-postalarda ve sipariş fişinde kullanılıyor; mağaza sahibi bunları değiştirmek için altyapı sahibine muhtaç olmamalı. Kuralları ayar şemasında tek yerde tutmak, panelin ve başlangıç dosyasının doğrulamasının ayrışmamasını sağlar.

## Düşünülen diğer yollar

- **Denetimi uç şemasında yapmak:** kapı şemanın kendi kodunu (vergi numarasının kontrol hanesi gibi) yanıta taşımıyor (kart 0285); alanın altında yalnız genel "geçerli değil" yazardı.
- **Her bölümü ayrı kaydetmek:** taslak tek formu ve tek kaydet çubuğunu gösteriyor; çıkış koruması da tek form içindir.
- **Sosyal hesapları liste olarak (site seç, hesap yaz, ekle) almak:** taslak site başına alanı gösteriyor ve mağazalar çoğunlukla her siteden bir hesap kullanır.

## Sonuçları

- Kuyrukta bekleyen sipariş e-postası, gönderilene kadar yapılan mağaza bilgisi değişikliğini gösterir (karar 0153'ün bugünkü davranışı).
- Aynı anda iki yönetici kaydederse son kayıt kazanır (kargo ekranı gibi); arada yazılanla çakışma denetimi yoktur. Ekranı bugün yalnız mağaza sahibi görür.
- Satış ülkesi birden çok olan sitede adres ve satıcı ülkesi seçilir; bu yol bugün testte yalnız birim düzeyinde vardır (Örnek Mağaza tek ülkelidir).
