# 0057 · Mağaza adı, iletişim bilgileri ve adresi mağaza sahibinin ayarıdır

## Tarih

2026-11-07

## Karar

- **Mağaza adı (kullanıcı kararı):** Vitrinde, panelde ve e-postalarda görünen ad mağaza sahibinin ayarıdır (`magazaAdi`), panelden değişir. Başlangıç değeri verilmezse kimlikteki görünen addır. Kimlikteki ad altyapının iç adı olarak kalır: komutlar, ön kapının bakım sayfası ve sipariş önekinin türetilmesi onu kullanır. Ad değişse de sipariş öneki değişmez, önek ayrıca kayıtlıdır. Ad yalnız kendi ayarından okunur. Okunamazsa (veritabanı yok, değer bozuk) kimlikteki ad gösterilir ve hata kaydedilir: ad görünüştür, vitrin, panel girişi ve e-posta onun yüzünden düşmez. Kimlikten gelen ad da ayarın kuralından geçer, geçmezse site doğrulaması durur. Adda "@" olamaz, çünkü değişiklik kaydı e-posta biçimindeki değeri reddeder.
- **İletişim ve adres:** İletişim e-postası, telefonu ve mağaza adresi mağaza sahibinin ayarıdır. Varsayılanları boştur. Adres tek ayar olarak ülke, il, ilçe, açık adres ve posta kodundan oluşur. Ortak şema `cekirdek/bolgeler/adres.ts` dosyasındadır, teslimat ve fatura adresi de bunu kullanacaktır. İl listesi olan ülkede il ve ilçe zorunludur. Posta kodu biçimi bilinen ülkede zorunludur, ötekilerde boş kalabilir. Telefon ülke koduyla yazılır, ülke kodu sıfırla başlamaz, 10-15 rakam olur.
- **Kayıtta gizli değer:** E-posta, telefon ve adresin değeri değişiklik kaydına yazılmaz, yalnız hangi ayarın değiştiği yazılır. Ayar şemasında `kayittaGizli` ile işaretlenir.
- **Ülke listeleri:** Satış ve teslimat ülkeleri iki ayrı listedir, altyapı sahibinin ayarıdır (karar 0010), her kod ülke listesinden geçer. Varsayılanları planda olduğu gibi Türkiye'dir.
- **Satıcı bilgileri (kullanıcı kararı):** Ticari unvan, vergi numarası gibi mesafeli satış sözleşmesinin istediği bilgiler bu karara girmez, kart 0091'dedir.

## Neden

- Mağaza adını değiştirmek mağaza sahibinin günlük işidir, altyapı sahibini beklememeli. Kimlikteki adın ayrı kalması, bakım sayfası gibi veritabanı olmadan çalışan yerlerin bir ada sahip olmasını sağlar.
- Küçük mağazada iletişim e-postası, telefon ve adres çoğu zaman sahibin kişisel bilgisidir. Kural kişisel veriyi değişiklik kaydına yazdırmaz (karar 0045). Kayıt kimin ne zaman değiştirdiğini yine gösterir.
- Adresin tek şemada durması, mağaza adresi ile müşteri adresinin aynı kurallarla doğrulanmasını sağlar.

## Düşünülen diğer yollar

- **Mağaza adı yalnız altyapı sahibinde:** Kullanıcı seçmedi. Her ad değişikliği bir yayın isterdi.
- **Değeri kayda maskelenmiş yazmak:** Seçilmedi. Maske kayıtta sonradan düzeltilemez ve değeri tahmin ettirebilir. Ad yeterli bilgidir.
- **Adresi ayrı ayrı ayarlarda tutmak (il, ilçe, posta kodu):** Seçilmedi. Bölgenin tutarlılığı tek ayarda tek şemayla denetlenir. Ayrı ayarlar yarım değişikliğe izin verirdi.
- **Ülke listelerinin varsayılanını kaldırmak:** Seçilmedi. Planda Türkiye varsayılanı onaylıydı, öteki ayarlar (dil, para birimi, saat dilimi) da aynı biçimde Türkiye değerleriyle başlıyor.

## Sonuçları

- Vitrin, panel girişi, iki aşamalı giriş kurulumu ve e-posta adı veritabanından okur. Veritabanına ulaşılamazsa ya da ad bozuksa kimlikteki ad görünür ve hata, hata izlemeye gider. Mağaza adı değiştirilmişse o sırada ziyaretçi eski adı görür. Bakım sayfası ön kapıda ve veritabanı olmadan çalıştığı için hep kimlikteki adı gösterir.
- Ana sayfa her istekte adı iki kez okur (sayfa başlığı ve sayfa). Tek satırlık bir okumadır, önbellek gerekirse sonra eklenir.
- Ülke listelerinin ve dil, para gibi ayarların Türkiye varsayılanı çekirdekte yazılıdır. "Çekirdekte ülke sabit yazılmaz" kuralıyla gerilim taşır. Site kurma komutu gelince varsayılanlar komutun önerisine taşınabilir.
- Kayıtta gizli ayarın eski değeri kayıttan geri alınamaz. Değer yalnız veritabanında ve yedekte durur.
- İletişim bilgileri ve adres boş başlar. Gerçek mağaza açılmadan önce dolu olduğunu denetleyen bir kontrol yok, site komutları (`planlar/komutlar.md`) gelince eklenir.
