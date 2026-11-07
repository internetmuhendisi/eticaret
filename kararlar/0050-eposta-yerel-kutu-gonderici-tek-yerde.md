# 0050 · E-posta yerel posta kutusuyla kuruldu, gönderici tek dosyada, gerçek hizmet açılışta

## Tarih

2026-11-07

## Karar

- **Hizmet şimdilik yok (kullanıcı kararı):** Hesap açılmadı. Gerçek gönderim açılışta bağlanacak (kart 0060). Kullanıcıya Amazon SES Frankfurt önerildi, Lettermint seçenek olarak söylendi; seçim yapılmadı.
- **Tek yer:** Hizmet yalnız `cekirdek/moduller/eposta/gonderici.ts` dosyasında bağlanır. Kodun gerisi `EpostaGondericisi` türünü bilir. Hizmet değişince bu dosya değişir, gerekirse gizli bilgi kaydı ve alan adı kayıtları eklenir.
- **Yalnız yerel adres:** Gönderici bugün yalnız `posta-kutusu`, `localhost` ve `127.0.0.1` adreslerine bağlanır. Başka adres verilirse gönderici yoktur.
- **Yerel kutu:** Mailpit, `sunucu/compose.yaml` içinde, sürümü özetiyle sabit. Portları yalnız bu bilgisayara açık, dışarı gönderim ayarı yok. `pnpm veritabani-baslat` ile birlikte açılır. Gelenler `http://localhost:<POSTA_KUTUSU_PORTU>` adresinde görünür.
- **Gönderim yolu:** E-posta yalnız `epostaGonder` ile gönderilir: kayıt açılır, iş kuyruğa girer, ikisi aynı işlemdedir. Arka plan süreci gönderir.
- **Kayıt:** `eposta_kayitlari` alıcıyı, şablonu ve durumu tutar, içeriği tutmaz. Değişkenler gönderilince silinir. Kuyruk işinde yalnız kaydın kimliği durur. Kayıtlar 1 yıl sonra silinir. Alıcı günlükte kısaltılır.
- **Gönderici ya da adres yoksa:** Kayıt `gonderilmedi` olur, yeniden denenmez, hata izleme aracına bir olay düşer.
- **Tekrar:** Kayıt `bekliyor` değilse gönderilmez. Mesaj kimliği kayıttan üretilir, her denemede aynıdır.
- **Site ayarları:** Gönderen adı, gönderen adresi, yanıt adresi, logo adresi. Varsayılanda gönderen adresi yoktur.
- **Şablon:** Mağazanın adı ya da logosu, metin dosyasından metinler, düz metin karşılığı. Bütün değerler HTML'de kaçırılır.

## Neden

- **SMTP:** Yerel kutu ve bilinen hizmetler aynı yolu konuşur. Yerelde denenen kod açılışta da çalışır, hizmet değiştirmek kod değil ayar ve bağlantı işidir. Hizmet kendi yöntemini isterse değişiklik yine tek dosyadadır.
- **Allowlist:** "Geliştirmede gerçek kişilere gitmez" kuralı yalnız ayara bırakılmadı. Yanlış bir `.env` satırı e-postayı dışarı gönderemez.
- **Gönderilmedi durumu:** Hizmet yokken yeniden denemek işe yaramaz, hata aracını beş kez doldururdu. Bir olay görünür kalmayı sağlar.
- **Kuyrukta adres yok:** Hatalı kuyruk işleri silinmez (0049). Adres yalnız süresi olan e-posta kaydında durur.
- **nodemailer:** E-posta biçimi, başlık kodlaması ve başlık enjeksiyonu elle yazılacak iş değildir. Paketin bağımlılığı yoktur. Paket yalnız gönderim anında yüklenir.

## Düşünülen diğer yollar

- **Şimdiden Amazon SES ya da Lettermint bağlamak:** Kullanıcı istemedi. Bugün gerçek müşteri yok, hesap ve alan adı işi açılışa kalır.
- **Hizmete özel programlama arayüzü:** Seçilmedi. Hizmeti koda bağlardı, yerelde denenemezdi.
- **Yerelde e-postayı dosyaya yazmak:** Seçilmedi. Gerçek gönderim yolu denenmemiş olurdu.
- **Hizmet yokken kayıt açmamak:** Seçilmedi. E-postanın gitmediği hiçbir yerde görünmezdi.

## Sonuçları

- **Kart 0032'nin kapsamı değişti:** E-postanın gerçek adrese ulaşması, istenmeyen kutusu ölçümü, hizmet seçimi, alan adı kayıtları ve anahtar kart 0060'a taşındı. Bu maddeler ölçülmedi.
- **Sunucuda e-posta gitmez:** 0.10.0 yayınlanırsa `EPOSTA_SUNUCUSU` verilmediği için e-postalar `gonderilmedi` olur. Karttaki "deneme sitesinde ulaşıyor" gibi maddeler (0033) kart 0060 olmadan ölçülemez, yerel kutuda ölçülür.
- **Örnek Mağaza'nın gönderen adresi** `posta.eticaretmagazasi.com` altındadır, bu alan adı henüz doğrulanmadı. Yalnız yerel kutuya gider.
- **Sürüm farkı:** Kimlik 0.10.0, sunucudaki site 0.9.0. Fark kapanana kadar `pnpm sunucu-veritabani-denemesi` çalıştırılmamalı (kart 0058).
- **Tekrar sınırı:** Hizmet e-postayı kabul edip kayıt yazılamadan süreç ölürse e-posta ikinci kez gider. Mesaj kimliği aynı kalır, hizmetin bunu tanıyıp tanımadığı hizmete bağlıdır.
- **Tasarım değerleri yok:** Şablonda renk yoktur, e-posta programının varsayılanı kullanılır. Değerler gelince şablon onları okur.
- **Yerel ortamda yeni portlar:** `.env` dosyasına üç satır eklendi. Eski bir `.env` ile `pnpm veritabani-baslat` hata verir ve eksik adı söyler.
