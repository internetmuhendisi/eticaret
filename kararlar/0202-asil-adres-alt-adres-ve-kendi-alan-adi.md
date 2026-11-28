# 0202 · Sitenin asıl adresi: alt adres ya da kendi alan adı

## Tarih

2026-11-28

## Karar

Karar 0032 deneme adreslerini kurdu (`<kod-adi>.deneme.eticaretmagazasi.com`); bu karar onu tamamlar, yerine geçmez. Bir site deneme adresinin yanında bir **asıl adres** alabilir. Asıl adres kimlikte `adresler.canli`'dir; uygulama sitenin adresini zaten oradan okur (`siteAdresi`).

- **Alt adres (kullanıcı kararı):** `<ad>.eticaretmagazasi.com`. Komut sitenin kod adını önerir (seramik → `seramik.eticaretmagazasi.com`), kurulumda başka bir ad seçilebilir. Ad kod adının kuralına uyar (küçük harf, rakam, tek tire) ve bir kez verilince değişmez.
- **Ayrılmış adlar (teknik karar):** `deneme`, `www`, `panel`, `yonetim`, `sahip`, `admin`, `api`, `kapi`, `posta`, `mail`, `smtp`, `imap`, `altyapi`, `destek`, `durum`, `yardim`, `cdn`, `statik`, `ns1`, `ns2` hiçbir siteye alt adres olarak verilemez. Altyapının kendi adresleri ya iki tire taşır (`kapi--yoklama`) ya da `deneme` altındadır; listedekiler ileride altyapının işlerine ve e-postaya ayrılır. İki site aynı asıl adresi alamaz.
- **Cloudflare kaydı (teknik karar):** Her alt adresin kendi A ve AAAA kaydı vardır, vekil kapalıdır (karar 0032'nin nedeni: ziyaretçi doğrudan Almanya'daki sunucuya bağlanır). Joker kayıt yoktur: yeni bir alt adres alan adı değişikliğidir, `pnpm alan-adi` önce ne değişeceğini söyler, onayla (`--onayli`) yazar. Komut kendi kayıtlarını açıklamalarından tanır (`altyapi: site <kod adı>`); hiçbir sitenin istemediği kendi kaydını aynı onayla siler, başka kayda dokunmaz.
- **Kendi alan adı (kullanıcı kararı):** Kayıtları mağaza sahibi kendi alan adı sağlayıcısında açar; `pnpm alan-adi` açılacak kayıtları (www'suz ve www'lu adın A ve AAAA kaydı, vekilsiz) ve bugünkü durumlarını yazar. Mağazanın alan adının anahtarı bizde durmaz. Asıl adres www'suz addır (`seramikdukkani.com`); `www.` hâli ona kalıcı olarak yönlenir (kullanıcı kararı). İkisinin de sunucuyu göstermesi gerekir. Türkçe harfli alan adı kimliğe punycode biçiminde yazılır (`xn--…`, teknik karar).
- **Silme ayrıca istenir (teknik karar):** Artık hiçbir sitenin istemediği kendi kaydını `pnpm alan-adi` yalnız `--onayli --sil` ile siler: yanlış daldan ya da eksik çalışma kopyasından çalışan komut açık bir mağazanın kaydını silmesin.
- **Yayından önce çözülür (teknik karar):** Kimlikte asıl adres varsa yayın komutu adres herkese açık ad sunucularında sunucuyu göstermeden yayın yapmaz (`asilAdresKilidi`): uygulama e-postalardaki bağlantıları bu adresle kurar, açılmamış adrese bağlantı gitmemelidir. Sıra: kimliğe asıl adres yazılır ve kaydedilir, alt adreste `pnpm alan-adi --onayli` (kendi alan adında mağaza sahibi kayıtları açar), adres çözülünce yayın.
- **Çözülmeden eklenmez:** Ön kapı her kuruluşta asıl adresin (kendi alan adında `www.` hâlinin de) sunucunun ad çözücüsünde sunucunun IPv4 ve IPv6 adresine çözüldüğünü ölçer; çözülmeyen adresin satırı yazılmaz, uyarı yazılır, öteki adresler etkilenmez. Sertifika yalnız çözülen adres için istenir (Let's Encrypt sınırı, karar 0032 "Sonuçları"). Ön kapıda zaten karşılanan ad, o an hiç cevap alınamıyorsa kalır (ad çözücünün anlık takılması açık mağazayı düşürmesin); başka bir adrese çözülen ad çıkar. Ölçüm yapılamazsa (ssh, betik) kuruluş durur, çalışan ön kapıya dokunulmaz. İki site aynı asıl adresi taşırsa ikincisi deneme adresinde kalır (iki tanım bütün ön kapıyı durdururdu).
- **Deneme adresi (kullanıcı kararı):** Asıl adres çözülüp ön kapıya girince deneme adresi asıl adrese kalıcı olarak (308) yönlenir, yol ve sorgu korunur. Yalnız sağlık ucu (`/kapi/herkese-acik/saglik`) ve `robots.txt` deneme adresinde kalır: yayın ve sunucu denetimi siteyi deneme adresinden ölçmeye devam eder. Kutu kapalıyken sağlık ucu bakım zarfıyla 503 alır.
- **Arama motorları (site ayarı):** `aramaMotorlarinaAcik`, altyapı sahibinin ayarı, varsayılanı kapalı. Kapalıyken asıl adres de deneme adresinin kuralını alır (`X-Robots-Tag: noindex, nofollow`, `robots.txt` bütün siteyi kapatır); açıkken ön kapı asıl adrese kural eklemez. Deneme adresi her zaman kapalıdır. Ayar satışa açılışta (teslim) açılır; seramik mağazası için önerilen değer kapalı. Elle bakımın 503 cevabı ayar açıkken de `noindex` taşır (bakımın geçici olduğunu söyler).
- **Ortam (teknik karar):** Asıl adres sitenin bugünkü ortamındaki aynı kutuya gider. Seramik mağazası bu bölümde deneme ortamında kalır; gerçek ödemeli canlı ortama geçiş satışa açılışın parçasıdır (Açılış bölümü).
- **Denetim:** Sunucu denetimi asıl adresi olan her yayındaki sitenin asıl adresini IPv4 ve IPv6'da ölçer: çözülme, şifreli açılma, sertifikanın geçerliliği ve en az 14 günü, `http://` yönlenmesi, arama motoru kuralının ayarla aynılığı, kendi alan adında `www.` yönlenmesi, deneme adresinin asıl adrese yönlenmesi ve sağlık ucunun deneme adresinde kalması. Asıl adres ön kapıda değilse bunu kırmızı söyler, deneme adresini olağan ölçer. Asıl adresin ölçümleri öteki sitelerin yayınını durdurmaz (`yayiniDurdurmayanSatir`): o sitenin adres sorunu başka sitenin yayınıyla değişmez.

## Neden

- Mağaza müşteriye tek bir adresle görünmeli; iki adres aynı mağazayı gösterirse bağlantılar ve arama sonuçları dağılır. Yönlendirme eski deneme bağlantılarını da asıl adrese taşır.
- Sağlık ucu deneme adresinde kalınca yayın komutunun ve denetimin ölçümü siteden siteye değişmez, asıl adresin bir sorunu yayını kör etmez.
- Joker kayıt (`*.eticaretmagazasi.com`) altyapının bütün alt adlarını sunucuya bağlardı; ileride başka işe verilecek bir ad da sunucuya çözülürdü. Her alt adresin kendi kaydı hangi adresin kime ait olduğunu alan adında da gösterir.
- Mağazanın alan adının anahtarını tutmak, o alan adının e-posta ve öteki kayıtlarından da sorumlu olmak demekti. Sorumluluk mağazada kalır, bizden yalnız iki kayıt istenir.
- Çözülmeyen adres ön kapıya girerse Caddy sertifikayı alamaz ve giderek seyrekleşen aralıklarla dener; haftalık sınır boşa harcanır, adres açılınca sertifika geç gelir.
- Arama motoru kuralı uygulamada değil ön kapıda durur (karar 0032): bir sürümdeki uygulama hatası satışa açılmamış mağazayı dizine açamaz.

## Düşünülen diğer yollar

- Alt adres her zaman kod adı, ayrıca sorulmaz: seçilmedi (kullanıcı kararı). Kod adı teknik addır, mağazanın istediği ad başka olabilir.
- Her seferinde serbest ad, öneri yok: seçilmedi (kullanıcı kararı).
- Deneme adresi açık kalsın ya da kapansın: seçilmedi (kullanıcı kararı). Açık kalınca iki adres aynı mağazayı gösterir; kapanınca yayın ve denetim ölçümü asıl adrese bağlanırdı.
- Alan adı bize devredilsin, kayıtları komut açsın: seçilmedi (kullanıcı kararı).
- www'lu adres asıl olsun ya da mağaza başına seçilsin: seçilmedi (kullanıcı kararı). Kısa adres akılda kalır; mağaza başına seçim bugün bir ihtiyaç değil.
- `*.eticaretmagazasi.com` joker kaydı: seçilmedi, nedeni yukarıda.
- Çözülme ölçümünü herkese açık ad sunucularına (1.1.1.1, 8.8.8.8) bilgisayardan yaptırmak: ön kapıyı kuran işlev eşzamanlıdır ve yedi komuttan çağrılır; ölçüm sunucunun kendi çözücüsüyle yapılır. Sunucu denetimi asıl adresi ayrıca herkese açık ad sunucularından ölçer.

## Sonuçları

- Yeni bir alt adres her seferinde alan adı değişikliğidir ve onay ister; karar 0032'deki "yeni site için alan adına dokunulmaz" artık yalnız deneme adresleri için geçerlidir.
- Kayıt açıldıktan sonra çözülmesi birkaç dakika sürebilir; yayın komutu o arada durur, kayıt çözülünce yeniden çalıştırılır.
- Sunucunun çözücüsü önbellekten eski cevap verebilir; adres çözüldüğü hâlde bir kuruluşta girmeyebilir. Bilerek kabul edildi: yanlış adrese sertifika istenmez, bir sonraki kuruluşta düzelir.
- Kendi alan adında mağaza sahibi kaydı sonradan başka bir adrese çevirirse ön kapı adresi bir sonraki kuruluşta çıkarır ve deneme adresi yeniden kendi başına açılır; denetim asıl adresi kırmızı gösterir, e-postalar o arada açılmayan adrese gider.
- `aramaMotorlarinaAcik` yalnız ön kapıdaki kuralı belirler; uygulamanın sayfa bilgisi (site haritası, `noindex` etiketi) satışa açılışta ayrıca ele alınır.
- Asıl adresin canlı ortamla ilişkisi (kimlikteki `canli` adı) Açılış bölümünde yeniden ele alınır: bugün asıl adres deneme ortamındaki kutuya gider.
