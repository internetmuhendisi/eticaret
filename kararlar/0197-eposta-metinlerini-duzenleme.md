# 0197 · Mağaza sahibinin e-posta metinleri ve gönderen bilgileri

## Tarih

2026-11-27

## Karar

Mağaza sahibi panelin Ayarlar > E-postalar ekranında müşteriye giden e-postaların konusunu, giriş ve kapanış metnini, gönderen adını, yanıt adresini ve alt bilgiye ekini değiştirir (kart 0279; taslak `planlar/tasarim-yonu/panel-2.html`, karar 0185).

- **Hangi e-postalar:** sipariş e-postaları (karar 0153) ile Hoş geldiniz ve Şifre yenileme (kullanıcı kararı, taslaktaki gibi). Yönetici bildirimleri, ekibe davet ve şifre değişti e-postası düzenlenmez. Yöneticinin şifre yenileme ve şifre değişti e-postası kendi şablonuyla gider (`yonetici-sifre-sifirlama`, `yonetici-sifre-degisti`): mağaza sahibinin müşteriler için yazdığı metni ve alt bilgiye eki almaz. Birden çok hâli olan e-postanın her hâli ayrı düzenlenir: sipariş alındı (havale, kapıda ödeme, ödendi) ve sipariş iptali (ödeme süresi doldu, müşterinin isteği, mağaza). Kayıt tek yerdedir (`epostaMetinBirimleri`, `cekirdek/moduller/eposta/metin-birimleri.ts`): birimin şablonu, varsayılan metin anahtarları ve kullanabildiği bilgiler.
- **Ne değişir:** konu, giriş ve kapanış. Başlık, tablo, tutarlar, kargo kutusu, düğmeler, şifre e-postasının güvenlik uyarısı ve alt bilginin yasal satırları değişmez. Kapanış gövdenin sonundadır (düğmelerden sonra); boşsa yazılmaz. İade talebinin onay ve ret e-postalarının son cümlesi ve adres düzeltmesinin uyarısı kapanışın varsayılanı oldu.
- **Bilgiler:** köşeli parantezde sitenin dilindeki adıyla ("[Müşteri adı]", karar 0185); "Bilgi ekle" son bulunulan alanda imlecin yerine ekler, elle de yazılır, harf büyüklüğü fark etmez. Köşeli parantezli her ad bilgi sayılır: birimin kullanamadığı ad kayıtta `bilinmeyen-bilgi` alır (köşeli parantezli düz yazı yazılamaz, kartın "bilinmeyen yer tutucunun reddi"), ekran yazılan adları ve kullanılabilenleri söyler; önizleme onu yazı olarak çizer. Birimin bilgileri konu, giriş ve kapanışta aynı değerlerle dolar. Metin NFC'ye çevrilip parçalarla saklanır (yazı ve bilgi ayrı): mağaza sahibinin yazdığı "{ad}" ya da kapanmamış "[" bilgi sayılmaz, değer metnin içinde yeniden aranmaz, gönderimde HTML olarak kaçırılır; giriş ve kapanışın satır sonları korunur.
- **Varsayılan:** varsayılanla aynı alan kayda boş yazılır, çekirdeğin metni güncellenince e-posta da güncellenir. "Varsayılan metne dön" onay penceresiyle bütün alanları boşaltır.
- **Kuyruk:** e-posta kuyruğa girerken şablonun o anki metinleri kayda yazılır (`eposta_kayitlari.metinler`, `epostaGonder`), gönderilince silinir: sonraki değişiklik bekleyen e-postayı değiştirmez (karar 0153). Gönderen adı, yanıt adresi ve ek gönderim anında okunur (mağaza bilgileri gibi, karar 0175).
- **Gönderen:** gönderen adı (boşsa mağaza adı) ve yanıt adresi altyapı sahibinin ayarıyken mağaza sahibinin ayarı oldu (kullanıcı kararı); gönderen adresi altyapının gönderim adresidir, değişmez. Alt bilgiye ek mağazanın müşteriye giden e-postalarında satıcı bilgilerinden sonra satır satır yazılır; yöneticiye gidenlerde yoktur. Yanıt adresi ve ek değişiklik kaydına değeri yazılmadan girer.
- **Önizleme:** örnek sipariş ve örnek müşteriyle (`ornek.ts`; gerçek sipariş okunmaz), gönderimin işleviyle (`epostaIceriginiKur`), sitenin temasıyla; formun kaydedilmemiş metniyle yazdıkça yenilenir. Betiğe kapalı çerçevededir (`sandbox="allow-same-origin"`), boyu dışarıdan ölçülür. Bilgisayar ve telefon genişliği seçilir.
- **Deneme e-postası:** formun metniyle örnek siparişin e-postası yöneticinin kendi adresine kuyruktan gider (kullanıcı kararı); düğme yalnız e-posta gerçekten gidebiliyorsa görünür (`epostaGidebilirMi`), yoksa nedeni yazar. Sıkı sınırlıdır.
- **Kayıt ve izin:** birim başına bir satır (`eposta_metinleri`), her yazımda sürüm artar; ekran gördüğü sürümü gönderir, arada yazılmışsa `cakisma`. Değişiklik kaydına metin girmez (mağaza sahibi metne e-posta adresi yazabilir), değişen alanların adı girer. Görmek `magaza-ayarlari.gor`, değiştirmek `magaza-ayarlari.degistir`.

## Neden

- Mağaza sahibinin sesi giriş ve kapanıştadır; tutar, tablo ve yasal satırlar siparişin kaydıdır, değişirse e-posta siparişle tutarsız olur.
- Parçalı saklama kaçış sorununu kökten çözer: bilgi ile yazı karışmaz, dil değişse de kayıt bilgiyi koduyla tutar.
- Varsayılanı boş tutmak, çekirdeğin düzelttiği bir metnin değiştirilmemiş sitelere kendiliğinden gitmesini sağlar.
- Gönderen adı ve yanıt adresi mağazanın kimliğidir; gönderim adresi alan adının güvenilirliğine (SPF, DKIM) bağlıdır, altyapıda kalır.

## Düşünülen diğer yollar

- **Metni `{musteri_adi}` gibi kodla yazmak:** karar 0185'te seçilmedi.
- **İptal e-postasını tek metinle düzenlemek (taslaktaki gibi):** üç nedenin cümlesi farklıdır; tek metin müşteriye yanlış neden söylerdi. Seçilmedi.
- **Metni mağaza ayarı olarak saklamak:** sürüm, değiştiren ve birim başına çakışma denetimi ayrı tabloyla daha basit. Seçilmedi.
- **Önizlemeyi tarayıcıda çizmek:** şablon ve metin dosyası panelin koduna girerdi, gönderilenle aynı olduğu ayrıca denetlenmeliydi. Seçilmedi.

## Sonuçları

- Sürüm notu: `epostaGonderenAdi` ve `epostaYanitAdresi` altyapı ayarından mağaza ayarına geçti; sitenin `ayarlar.json`'ında yazılıysa doğrulama durdurur, değer `baslangic/ayarlar.json`'a taşınır (bugün hiçbir sitede yazılı değil). Yeni ayar `epostaAltBilgiEki`. Veritabanı değişikliği 0069.
- Taslaktan ayrılan yerler: metin alanları biçimsiz yazı alanıdır, bilgi köşeli parantezle görünür (taslaktaki renkli işaret yok); "Bilgi ekle" 44 px'lik düğmelerdir; iptal ve iade talebi e-postalarının her hâli ayrı satırdır; önizlemenin genişliği seçenek grubuyla seçilir.
- Bağımsız kontrolün bulgularıyla düzeltildi: konu ve kapanışta kargo firması, takip no, tutar ve ödeme seçeneği boş kalıyordu; yöneticinin şifre e-postası müşteri metnini ve eki alıyordu; giriş ve kapanışın satır sonları HTML'de kayboluyordu; ayrışık harfle yapıştırılan ad tanınmıyordu; deneme e-postasının bildirimi ve hataları yanlış metin söylüyordu; gönderen kartının uzunluk hatası sınırı söylemiyordu.
- Tarayıcı testlerinde tarama önizleme çerçevesine girmez (betiğe kapalı çerçevede tarayıcının betiği bekler); önizlenen e-posta ayrı sayfada taranır.
