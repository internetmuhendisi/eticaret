# 0052 · Şifre sıfırlama: bir saatlik tek kullanımlık bağlantı, anahtar adresin # sonrasında, oturum açmaz

## Tarih

2026-11-07

## Karar

- **Süre (kullanıcı kararı):** Bağlantı 1 saat geçerlidir. Değer bütün sitelerde aynıdır, site ayarı değildir (`sifreSifirlamaAyari`, `cekirdek/kayitlar/oturum.ts`).
- **Sonrası (kullanıcı kararı):** Yeni şifre oturum açmaz, kişi giriş sayfasına döner ve yeni şifresiyle girer.
- **Anahtar:** 256 bit rastgele, veritabanında yalnız SHA-256 özeti durur. Tablolar hesap türü başına ayrıdır (`musteri_sifre_sifirlamalari`, `yonetici_sifre_sifirlamalari`), biçimi ortaktır. Yeni istek hesabın önceki bağlantılarını siler.
- **Anahtarın yeri:** Adresin `#` sonrası. Sayfa anahtarı okuyunca adresten siler.
- **Sitenin adresi:** İstekten alınmaz. Sıra: kutunun `SITE_ADRESI` ortam değişkeni, kimlikteki canlı adres, deneme adresi (`cekirdek/ayar-semasi/site-adresi.ts`). Adres yoksa e-posta gitmez, hata izleme aracına olay düşer, cevap değişmez.
- **Aynı cevap:** Kayıtlı olsun olmasın 200 ve boş veri döner. Her cevap en az 500 ms sürer. Robot cevabı veritabanından önce denetlenir.
- **Hesap başına sınır:** 15 dakikada 3, günde 10 e-posta, kayıtlı olmayan adres de sayılır. Dolunca cevap aynıdır, e-posta gitmez. Sayaç bellektedir (karar 0042).
- **Şifre değişince:** Tek işlemde bağlantı harcanır, şifre yazılır, bütün oturumlar kapanır, "şifreniz değişti" e-postası kuyruğa girer. Yöneticide yarım giriş adımları da silinir ve `yonetici.sifre-sifirlandi` değişiklik kaydına yazılır.
- **Yarış:** Şifreden geçen girişin oturumu ya da ara adımı, hesap satırı paylaşımlı kilitliyken ve şifre değişmemişse açılır (`sifreDegismediyse`). Sıfırlama önce hesabı günceller, sonra ara adımları siler, sonra oturumları kapatır. Bağımsız kontrol eski sıranın sıfırlamadan sonra açık oturum bıraktığını ölçtü, bu yüzden test edilir. Aynı anda giden iki istek hesap kilidiyle sıraya girer, tek canlı bağlantı kalır. Şifre değişince hesabın öteki bağlantıları da silinir.
- **Anahtar sekmede durur:** Sayfa anahtarı adresten silip `sessionStorage`'a yazar. Sayfa yenilenince bağlantı "geçersiz" görünmez. Başarıda ve reddedilince silinir.
- **İki aşamalı giriş:** Sıfırlama `yonetici_iki_asama` ve yedek kodlara dokunmaz. Yönetici yeni şifreyle yine kod girer.
- **Panel:** `/yonetim/giris/sifremi-unuttum` ve `/yonetim/giris/sifre-yenile` girişsiz açılır. Girişli kişi de yönlendirilmez: yönlendirme adresin `#` kısmını kaybettirirdi.
- **Ortak parçalar:** Formlar vitrin ve panelde aynıdır (`moduller/oturum/sifirlama-formlari.tsx`). Robot gönderimi `useRobotluGonderim` ile, bağlantı `Baglanti` bileşeniyle tek yere taşındı, kayıt formu da bunları kullanır.

## Neden

- **`#` sonrası:** Tarayıcı bu kısmı sunucuya göndermez. Anahtar ön kapı kayıtlarına, uygulama günlüğüne ve başka siteye giden `Referer` başlığına düşmez. E-posta programları bağlantıyı önceden açsa da anahtar yalnız form gönderilince harcanır.
- **Adres istekten alınmaz:** `Host` başlığını yazan biri kurbanın e-postasına kendi sitesinin bağlantısını koyabilir, kurban tıklayınca anahtar ele geçerdi.
- **Oturum açmamak:** E-postası ele geçen hesap tek başına açılmaz, müşteride de bir adım korunmuş olur.
- **Hesap başına sınır:** Bağlantı başına istek sınırı çok adres kullanan birinin kurbanın posta kutusunu doldurmasını durdurmaz.
- **Bağlantı yeni istekle silinir:** Eski e-postalardaki bağlantı işe yaramaz.

## Düşünülen diğer yollar

- **Anahtarı sorgu parametresinde taşımak:** Seçilmedi, gerekçesi yukarıda.
- **15 dakikalık süre:** Kullanıcı 1 saati seçti: geç gelen e-postada müşteri mağdur olmasın.
- **Sıfırlamadan sonra doğrudan oturum:** Kullanıcı seçmedi.
- **İşi yanıttan sonra arkada yapmak:** Süre farkını tamamen kapatırdı, ama veritabanı hatası kullanıcıya söylenemezdi ve test edilmesi zorlaşırdı. Sabit en kısa süre seçildi.
- **Anahtarı kuyruğa koymadan e-postayı anında göndermek:** Seçilmedi: e-posta yolu tektir (karar 0050).

## Sonuçları

- **Sunucuda çalışmaz:** Kart 0060'a kadar e-posta gitmez; ziyaretçi aynı cevabı görür, e-posta `gonderilmedi` olur, hata izleme aracına olay düşer. Ulaşma yerel posta kutusunda ölçüldü, gerçek adrese ulaşma ölçülmedi.
- **Müşteride gizlilik sınırlı:** Kayıt ekranı e-postanın kayıtlı olduğunu söyler (karar 0051). Aynı cevap asıl korumayı yönetici hesaplarına verir.
- **Süre farkı tamamen kapanmaz:** E-postayı kuyruğa yazmak 500 ms'den uzun sürerse (aşırı yük, kilit) kayıtlı adres daha geç döner. Ölçüm yalnız en kısa süreye bakar, gerçek ağda istatistiksel ölçüm yapılmadı.
- **Anahtar kısa süre açık durur:** E-posta gidene kadar bağlantı `eposta_kayitlari.degiskenler` içinde düz durur, gönderilince silinir. Veritabanını okuyabilen biri bu aralıkta bağlantıyı görebilir. Eski sürüme dönüşte iş `bekliyor` kalabilir (karar 0050); bağlantı 1 saat sonra zaten geçersizdir.
- **E-posta hesabı ele geçirilirse:** Müşteri hesabı doğrudan ele geçer. Yöneticide kod gerekir; ama iki aşamalı girişi kurmamış yöneticinin hesabında saldırgan kendi kurulumunu yapabilir. Şifresi ele geçirilmiş hesapta da durum aynıdır (karar 0044).
- **Posta kutusu sınırı:** Bir adrese günde en çok 10 e-posta gider; aynı adres iki hesap türünde varsa 20. Günlük sınır dolunca gerçek sahibi de 24 saate kadar bağlantı alamaz: saldırganın bu sayıda robot sorusu çözmesi ve adresi bilmesi gerekir. Sayaç yeniden başlayınca sıfırlanır.
- **Sekmede anahtar:** Anahtar sekme açıkken `sessionStorage`'dadır. Sitede zararlı kod çalışırsa okunabilir; o durumda oturum dışında her şey zaten açıktır. Bağlantı en çok 1 saat geçerlidir.
- **Saldırgan da kilitleyebilir:** Hesap başına sınır dolunca gerçek sahibi de 15 dakika bağlantı alamaz, ekranda bunu göremez. Sıfırlama, giriş deneme kilidini de kaldırmaz: yeni şifreyle de bekleme sürer (kart 0066).
- **Sayaç yeniden başlayınca sıfırlanır:** Her yayında hesap başına bütçe tazelenir.
- **Satırlar birikir:** Kullanılmış ve süresi dolan satırlar silinmez, temizliği kart 0044'tedir.
- **Canlı ve deneme birlikte olunca:** Sunucudaki kutu `SITE_ADRESI` almaz. Kimlikte canlı adres yazılınca deneme kutusu da canlı adrese bağlantı üretir, anahtar orada tutmaz, güvenli tarafa düşer ama deneme ortamında sıfırlama çalışmaz. Canlı ortam gelince yayın komutu bu değişkeni ortama göre verir.
- **Yeni şifre iki kez sorulmaz:** Yanlış yazılan şifre sıfırlamayla düzeltilir. Şifre yöneticilerine engel olmamak için de tek alandır.
- **Otomatik kontrast taraması yoktur,** Firefox ve Safari testte değildir. Panel sayfaları bu kartta o tarayıcılarda ölçülmedi.
