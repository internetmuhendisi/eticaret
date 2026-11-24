---
paths:
  - "cekirdek/kapi/**"
  - "cekirdek/moduller/odeme/**"
  - "cekirdek/moduller/oturum/**"
  - "cekirdek/moduller/musteri/**"
  - "cekirdek/moduller/ekip/**"
  - "cekirdek/moduller/yasal-metinler/**"
  - "**/middleware.ts"
  - "**/*yukle*"
  - "**/next.config.*"
  - "sunucu/**"
  - "**/package.json"
  - "**/.env.example"
---

# Güvenlik

- Şifreleri güncel ve güvenli bir şifre özetleme yöntemiyle sakla. Eski yöntemleri kullanma.
- Oturumu kısa ömürlü bir anahtar ve onu yenileyen ikinci bir anahtarla yürüt. Anahtarları güvenli çerezde tut. Motor `cekirdek/moduller/oturum/`, çerezler `cekirdek/kapi/oturum-cerezi.ts`, sahte istek kontrolü `cekirdek/kapi/sahte-istek.ts`; süreler ve sınırlar `cekirdek/kayitlar/oturum.ts` (karar 0039).
- Şifre, anahtar ve kart bilgisini kayıtlara (günlüğe) yazma. E-posta ve telefonu kısaltarak yaz.
- Tarayıcıda çalışan kod yalnız açık olması güvenli değişkenleri okusun.
- Kart bilgisi ödeme kuruluşunun formunda girilsin ve sitenin sunucusundan geçmesin. Kartla ödeme eklentisinde form kuruluşun sayfasındadır, sonuç kuruluşa imzalı sorguyla sorulur (kart 0215, karar 0142).
- Bir hizmetin verdiği anahtar (ödeme kuruluşu) dışarıdan gelen gizli bilgidir: kaydı `cekirdek/kayitlar/disaridan-gizli-bilgiler.ts`, okuması yalnız `disaridanGizliBilgi`. Yoksa hizmet o sitede kullanılamaz; kayda ve günlüğe yazılmaz.
- Yüklenen dosyanın türünü, boyutunu ve içeriğini yükleme anında sunucuda kontrol et. Belge (PDF, karar 0170) görselden ayrı türdür: yalnız `belgeKaydet` ve `belgeOku` ile yazılır ve okunur, görsel yolları onu görmez; tarayıcıya yalnız indirilecek dosya olarak (`DosyaYaniti`'nin `indirme`'si: ekli dosya, sandbox, önbelleksiz) verilir.
- Siteyi yalnız şifreli bağlantıyla aç. Güvenlik başlıklarını aç. Başka sitelerden gelen sahte istekleri kabul etme.
- Yönetici girişinde iki aşamalı doğrulama ve giriş deneme sınırı olsun. Deneme sınırı `cekirdek/moduller/oturum/giris.ts`, değerleri `cekirdek/kayitlar/oturum.ts` (karar 0042). Yeni bir giriş ucu `sinirliSifreDogrula` kullanır. İki aşamalı giriş `cekirdek/moduller/oturum/iki-asamali-giris.ts`, karar 0044: yönetici oturumu yalnız oradan açılır, başka yerden `oturumAc` çağırmak testte kırmızıdır, iki aşamadan geçmemiş oturum reddedilir. Şifreleme anahtarı `IKI_ASAMA_ANAHTARI` değişirse kurulu girişler açılamaz.
- Sunucuda yönetici yalnız `pnpm sunucu-yonetici-ac` ile açılır (karar 0054): şifre sunucuda üretilir, kutunun günlüğü kapalıdır. Bu çıktıyı kayda, günlüğe ya da sohbete kopyalama.
- Telefonunu ve yedek kodlarını kaybeden yöneticinin iki aşamalı girişini mağaza sahibi panelden sıfırlar; son mağaza sahibininkini altyapı sahibi `pnpm sunucu-yonetici-iki-asama-sifirla` ile, kişiyi mağazanın kayıtlı numarasından kendisi geri arayıp doğruladıktan sonra (karar 0178). E-posta ya da SMS ile kendi kendine kurtarma yoktur. Yedek kodları yönetici telefonundaki kodla "Hesabım"da yeniler.
- Şifre sıfırlama `cekirdek/moduller/oturum/sifre-sifirlama.ts`, değerleri `sifreSifirlamaAyari` (karar 0052). E-postadaki bağlantının adresini istekten alma, `siteAdresi` kullan. Tek kullanımlık anahtarı adresin `#` sonrasında taşı. Şifreden geçen kişinin oturumunu ya da ara adımını `sifreDegismediyse` içinde aç.
- Geçmişi silen ve dosyaları toptan silen komutlar proje ayar dosyasındaki yasak listesiyle kapalıdır. Bu yasakları aşmaya çalışma.
- Gizli bilgi dosyası `.env` kayda girmez, GitHub'a ve sunucuya gitmez.
- Toplu e-posta, gerçek ödeme ve alan adı değişikliği gibi geri alınamaz işleri kullanıcının onayıyla yap.
- Çerez izni ve pazarlama izni tek yerde tanımlı olsun, müşterinin verdiği izin kaydedilsin. Onaylar `cekirdek/kayitlar/musteri-onaylari.ts` kaydında, satırlar değiştirilemez `musteri_onaylari` tablosunda; metin değişince sürümü artır (karar 0051).
- Ürün açıklaması, yorum ve form girdilerini ekrana yazmadan önce zararlı koddan temizle. Ürünün uzun açıklaması yalnız `aciklamayiTemizle` (`cekirdek/moduller/urun/aciklama.ts`) ile, izinli etiketler listesiyle temizlenir (karar 0108). Biçimli metin yazan başka bir alan da aynı yoldan geçer.
- Kayıt, yorum, iletişim ve şifre sıfırlama formlarında bot koruması kullan. Yol `cekirdek/moduller/robot-korumasi/`, değerleri `cekirdek/kayitlar/robot-korumasi.ts`: uç `robotCevabiniDogrula` çağırır, form `useRobotluGonderim` ile gönderir (karar 0051). Veri dış hizmete gitmez.
- Kullanılan dış kütüphanelerin bilinen güvenlik açıklarını her yayında tara.
- Geliştirme, deneme ve canlı ortamın verisini ve anahtarlarını ayrı tut. Deneme ortamı gerçek ödeme almaz ve arama motoruna kapalıdır.
