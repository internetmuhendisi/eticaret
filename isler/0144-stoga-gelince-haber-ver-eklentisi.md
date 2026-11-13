# 0144 · İlk eklenti: stoğa gelince haber ver

## Amaç

Tükenen ürünün sayfasında müşteri e-postasını bırakır, ürün stoğa girince ona e-posta gider. Vitrine, panele ve e-postaya dokunan ilk eklentidir (`temel-paket.md`). Eklenti ekleme komutu henüz yok: bu eklenti `eklentiler/README.md`'deki adımlarla elle kurulur, komut sonra bu kurulumdan çıkarılır (kart 0145).

Bölüm: Vitrin. Önce 0138 bitmiş olmalı.

## Olmazsa olmazlar

- Önce tarif yazılır: `eklentiler/stoga-gelince-haber-ver.md`, katalogdaki tarif başlıklarıyla. Ayarlar ve varsayılanları kullanıcıya sunulur (üye olmayan müşteri de isteyebilir mi, talep ne kadar saklanır).
- Plan `planlar/` klasörüne yazılır, kullanıcı onaylar.
- Eklentinin çekirdekte nerede durduğu, nasıl açılıp kapandığı ve çekirdeğe hangi noktalardan bağlandığı (stok artışı, ürün sayfası, e-posta, panel) bir karar kaydına yazılır. Bağlantı noktaları siteye özel değil, her eklentinin kullanabileceği biçimde kurulur.
- Eklenti kurulunca kapalı başlar, site ayarından açılır.
- Talep kaydı: ürün ya da birleşim, e-posta, durum. Aynı e-posta aynı birleşime bir kez yazılır. Form robot korumalı ve istek sınırlıdır.
- Stok sıfırdan yukarı çıkınca e-postalar arka plan kuyruğundan gider, her talep bir kez. Stok aynı anda yeniden biterse kalan talepler bekler.
- E-posta onay ve aydınlatma kuralına uyar; e-posta adresi yalnız bu iş için kullanılır.
- Panelde ürünün bekleyen talep sayısı görünür (en küçük ekran, plan aşamasında kararlaştırılır).
- Kapatılınca vitrindeki form kalkar, talepler silinmez, e-posta gitmez.
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Eklenti ekleme komutu bu kartta yazılmaz (kart 0145).
- SMS ve panel bildirimi yapılmaz.

## Bitti sayılır

- Tarifin "bitti sayılır" listesi tek tek denendi.
- Stoğa giren üründe her talep sahibine bir e-posta gidiyor, aynı anda iki stok girişinde de bir kez (gerçek veritabanı ve posta kutusuyla test).
- Kapalı eklentide form yok ve e-posta gitmiyor (test).
- Taslakla karşılaştırma yapıldı.

## Notlar (2026-11-13): eklentinin elle kurulma adımları

Eklenti ekleme komutu (kart 0145) bu adımlardan çıkarılacak. Her adımda neyin elle yapıldığı, neyin kalıp olduğu ve komutun neyi sorması ya da denetlemesi gerektiği yazılı. Dosya yolları bu eklentininkidir; `<kod>` eklentinin kod adı (`stoga-gelince-haber-ver`), `<ad>` kodda kullanılan kısa ad (`stokBildirimi`).

**1. Okuma ve plan**

1. Kart, `eklentiler/README.md` (tarif biçimi ve ekleme adımları), örnek tarif (`sepette-kalan-hatirlatma.md`), `temel-paket.md` okundu.
2. Kural dosyaları okundu: ayarlar, veritabanı, güvenlik, test, e-ticaret iş kuralları, kayıt dosyaları, vitrin, yönetim paneli, yetki, formlar, metinler, sunucu arayüzü.
3. İlgili kararlar okundu: 0090 (işleve bağlı bölümler, bülten), 0108 (ürün sayfası), 0068/0069 (stok), 0050 (e-posta), 0049 (kuyruk), 0102 (taslak).
4. Taslakta eklentinin ekranı arandı (`planlar/tasarim-yonu/sayfalar.html`, `.haber-ver` kutusu).
5. Kullanıcıya plan ve siteden siteye değişen davranışlar varsayılanlarıyla sunuldu (açık mı, üye olmayan, saklama süresi), ürün kararları soruldu (onay kutusu, gönderimden sonra adres). Onaydan sonra başlandı.
6. Uygulamaya geçince çıkan ürün kararı ayrıca soruldu: eklenti açıkken tükenmiş değer seçilebilir mi (karar 0108'deki kuralı değiştirdiği için).
- Komut için: tarifin "Ayarlar" başlığından ayar soruları, "Ekranlar" başlığından taslak araması üretilebilir. Ürün kuralını değiştiren karar (burada tükenmiş değer) tariften çıkmaz, insan sorar.

**2. Çalışma kopyası**

1. `git worktree add .claude/worktrees/<kart> -b kart-<kart>`.
2. Çalışma kopyasına paketler kuruldu (`pnpm install --frozen-lockfile`) ve kökteki `.env`'e bağlantı açıldı (`ln -s ../../../.env .env`): çalışma kopyasında ikisi de yoktu, testler çalışmıyordu.
- Komut için: bu iki adım her kartta aynıdır, komut ya da ayrı bir yardımcı yapar.

**3. Tarif ve plan**

1. `eklentiler/<kod>.md`, katalogdaki on iki başlıkla yazıldı (Ad, Ne işe yarar, Kimler için, Gerekenler, Ayarlar, Veri, Ekranlar, Bildirimler, Dış servis, Yasal notlar, Bitti sayılır, Kapatılınca).
2. `planlar/<kod>.md`: kullanıcının onayladıkları ve adımlar.
3. `eklentiler/README.md`'nin "Bu sürümde tarifi yazılmış eklentiler" listesine satır.

**4. Eklenti kaydı ve açıklık (ilk eklentiyle kuruldu, sonrakiler yalnız satır ekler)**

1. `cekirdek/kayitlar/eklentiler.ts`: `eklentiKodlari` listesine kod; eklentinin kendi kayıtları (durumlar, sınırlar, sabitler) aynı dosyada.
2. `cekirdek/ayar-semasi/ayarlar.ts`: altyapı sahibinin `eklentiler` ayarı (ilk eklentide eklendi).
3. `cekirdek/eklentiler/acik.ts`: `eklentiAcikMi(site, kod)` (ilk eklentide yazıldı).
- Komut için: kayda kodu ekler; sonraki eklentide 2 ve 3 vardır.

**5. Site ayarları**

1. `ayarlar.ts`'teki `magazaAyarSemasi`'na eklentinin ayarları (`<ad>…` önekiyle), varsayılan ve açıklama anahtarıyla.
2. `tr.json`'da `ayar.aciklama.<ayar>` metinleri.
3. `planlar/site-ayarlari.md`'ye "Eklentiler" bölümünde satırlar.
4. Etkilenen test: `cekirdek/ayar-semasi/testler/site-klasoru.test.ts` (boş ayar dosyasının varsayılanları: yeni altyapı ayarı eklenince beklenen nesne güncellendi).

**6. Veri modeli ve veritabanı değişikliği**

1. `cekirdek/eklentiler/<kod>/model.ts`: tablo, denetimler, indeksler; dosyanın başında aranan alanlar ve indeksler yazılı.
2. `drizzle.config.ts`'in şema listesine `./cekirdek/eklentiler/*/model.ts` (ilk eklentide eklendi) ve `.claude/rules/veritabani.md`'deki yol listesi.
3. `pnpm veritabani-degisikligi-uret --name <kisa-ad>`, sonra dosyanın başına geri dönüş notu ve kart satırı.
4. Yerel veritabanına uygulandı: `pnpm veritabani-guncelle siteler/ornek-magaza` (tarayıcı testinden önce gerekir).
- Komut için: üretme ve not satırları kalıptır; tablonun kendisi elle yazılır.

**7. Servis ve şemalar**

1. `semalar.ts`: formun ve uçların ortak şemaları (`epostaSemasi`, `kimlikSemasi`, `robotCevabiSemasi` gibi çekirdeğin şemalarından).
2. `servis.ts`: `<ad>Servisi(site)`; her işlem önce açıklığı sorar. Burada ayrıca gönderen adresi olmayan sitede çalışmama kuralı var (e-posta gönderen eklentiler için).
3. Ortak işlevlerin yeniden kullanılması gerekti: ürün sayfasının seçenek anahtarları `veri.ts`'ten `cekirdek/vitrin/urun-sayfasi/secenekler.ts`'e (`sayfaSecenekleri`) taşındı; `stokDurumlari` işlem içinde de okunabilsin diye türü genişletildi.

**8. Çekirdeğe bağlantı noktaları (ilk eklentiyle kuruldu)**

1. Stok kancası: `cekirdek/eklentiler/stok-kancalari.ts`; stok servisinde artırma ve elle düzeltmede `stokGeldi(islem, birimler)` çağrısı.
2. Ürün sayfası yuvası: `cekirdek/eklentiler/urun-sayfasi-yuvalari.tsx` (eklentinin satırı: kod, yuva işlevi, `tukenmisBirimIster`); `urun-ust.tsx`'te `yuvalar` alanı ve `SeciliBirimBaglami` (`secili-birim.tsx`); `sayfa.tsx` yuvayı `<Bolum>` içinde verir.
3. Panel: sayfa ağacında `eklenti` alanı, `menuyuKur`'a açıklık, `panelSayfasiniAc` ve `panelSayfaBilgisi`'nde açıklık denetimi.
- Komut için: eklenti hangi noktaya bağlanıyorsa o listeye bir satır ekler. Yeni bir bağlantı noktası gerekiyorsa (ör. sepet, sipariş) komut durur, insan çekirdekte noktayı kurar.

**9. Arka plan işleri**

1. `cekirdek/eklentiler/<kod>/isler.ts`: gönderim işi, zamanlı tarama (kancanın anı kaçtığında), saklama temizliği; işin girdisinde kişisel veri yok.
2. `cekirdek/arka-plan-isleri/isler.ts`: `kayitliIsler` ve `zamanliIsler` listelerine satır.
3. Arka plan süreci dosyaları Node ile doğrudan çalıştırır: işin ulaştığı her dosyanın içe aktarmaları uzantılı olmalı (`secenekler.ts`, `secim.ts`, `urun-listesi/adres.ts` düzeltildi). Hatayı `katalog-acilisi.test.ts` gerçek süreçle yakaladı.
- Komut için: uzantısız içe aktarmayı bulmak için `katalog-acilisi.test.ts`'i ilk adımlarda çalıştırmalı.

**10. E-posta**

1. `cekirdek/kayitlar/eposta.ts`'teki `epostaSablonlari`'na ad, `cekirdek/moduller/eposta/sablon.ts`'e tanım, `tr.json`'da `eposta.<ad>` metinleri.

**11. İzinler ve uçlar**

1. `cekirdek/eklentiler/<kod>/izinler.ts`; `cekirdek/kayitlar/izinler.ts`'te `modulIzinleri` ve `izinler`e satır (izin adı modül anahtarıyla başlar); `cekirdek/moduller/ekip/izinler-ve-roller.md`'ye satır. Yönetici ekranı için yeni izin açılmadı (`stok.gor` kullanıldı): sınırlı role izin eklemek veritabanı değişikliği isterdi.
2. Uçlar: `cekirdek/kapi/herkese-acik/<uc>.ts` ve `cekirdek/kapi/musteri/<uc>.ts`, adres dosyaları `cekirdek/uygulama/app/kapi/.../route.ts`. Herkese açık uçta sıra: açıklık, robot, ayar.
3. `cekirdek/kapi/uclar.md`'ye iki uç.
4. `cekirdek/kapi/testler/rol-uc-erisimi.test.ts`'e yeni müşteri ucunun senaryosu ve B'nin kaydına dokunmama testi.
5. Testlerin deneme sitesinde (`cekirdek/ayar-semasi/testler/ornek-siteler/gecerli/ayarlar.json`) eklenti açıldı ve gönderen adresi verildi.

**12. Metinler**

1. `tr.json`'da `eklenti.<ad>.…` altında form ve panel metinleri.
2. `cekirdek/kapi/testler/iki-asamali-giris.test.ts` metin olarak `girisYap` arar: aynı sözcükle başlayan metin anahtarı testi kırmızıya düşürdü, anahtar `girisBaglantisi` yapıldı.

**13. Vitrin ekranı**

1. `form.tsx` (tarayıcı parçası) ve `urun-sayfasi.tsx` (sunucu yuvası).
2. Kütüphanenin `SecenekGrubu` parçasına seçilebilir tükenmiş değer (`tukenmis`); `secim.ts`'te `tukenmisSecilebilir`.
3. Bir parçayı kullanan dosya eklenince `pnpm katalog-kullanimlari` çalıştırıldı (yoksa `kullanimlar.test.ts` kırmızı).
4. Var olan ürün sayfası tarayıcı testi değişen davranışa göre güncellendi (tükenmiş beden artık seçiliyor).

**14. Panel ekranı**

1. `sayfa-agaci.ts`'e sayfa (grup "Ürünler" ilk kez eklendi), `app/yonetim/(panel)/<sayfa>/page.tsx`, liste parçası `panel.tsx`, `tr.json`'da `yonetim.sayfa.<ad>` ve `yonetim.grup`.

**15. Örnek Mağaza**

1. `siteler/ornek-magaza/ayarlar.json`'daki `eklentiler` listesine kod.

**16. Testler**

1. Servis testi (gerçek veritabanı ve posta kutusu), uç testi, form testi (jsdom), panel testleri (`sayfa-agaci.test.ts`, `panel-yetkisi.test.tsx`), seçim testi, tarayıcı testi (`cekirdek/testler/uctan-uca/<kod>.test.ts`).
2. Eklentinin kapalı hâli birim testinde: tarayıcı testlerinin sitesinde eklenti açık. Kapalı site için çalışan sitenin ortak alanı testte geçici değiştirildi (`Symbol.for("cekirdek.calisanSite")`).
3. Eklenti dosyaları `pnpm tur-kontrolu` kapsamında değil (kart 0056): geçici bir `tsconfig` ile `pnpm exec tsc --noEmit -p <geçici>` çalıştırıldı, iş bitince silindi.

**17. Bilerek bozma**

1. Her denetim tek tek bozulup ilgili test çalıştırıldı, sonra geri alındı (betik dosyayı yedekleyip değiştirir, testi çalıştırır, yedeği geri koyar). Otuzdan fazla bozma denendi; yeşil kalan üçü için testler güçlendirildi ya da denetimin gereksiz olduğu görüldü, bu sırada bir açık bulundu (silinmiş birleşim).
- Komut için: bozma listesi elle yazılır, çalıştıran betik kalıptır.

**18. Taslakla karşılaştırma**

1. Geçici bir tükenmiş ürün açıldı, taslağın sayfası (`?sayfa=urun&hal=canta&tema=…&gorunum=…`) ve vitrin sayfası Playwright ile iki temada, telefon ve bilgisayarda görüntülendi, hesaplanan stiller karşılaştırıldı, ürün silindi.
2. Elle açılan geliştirme sunucusu tarayıcı testlerinde yeniden kullanıldı ve dosya klasörü ayarı farklı olduğu için görselli testler düştü: karşılaştırmadan sonra sunucu kapatılmalı.

**19. Bağımsız kontrol ve belgeler**

1. İşi yapmayan bir ajan kartı, tarifi ve değişiklikleri denetledi; altı bulgudan beşi gerçekti, düzeltildi, testleri eklendi.
2. Karar kaydı (`kararlar/0117-…`), kural dosyası (`.claude/rules/eklentiler.md`), `CLAUDE.md`'nin eklenti satırı, `klasor-duzeni.md`, `vitrin.md`, `yonetim-paneli.md`, `bilesenler.md`, `kurallari-koruyan-kontroller.md` (Testler ve Güvenlik satırları).
3. Sürüm: `cekirdek/surum.ts`, `cekirdek/surum-notlari/<sürüm>.md`, `siteler/ornek-magaza/kimlik.json`. Çekirdekte site adı yazılamaz (`site-adi-yok.test.ts`): sürüm notunda ve test yorumlarında "Örnek Mağaza" yerine genel ad kullanıldı.

**20. Son kontroller ve kapanış**

1. `pnpm bicimle`, `pnpm denetim`, `pnpm denetim-kendi-testi`, `pnpm tur-kontrolu`, `pnpm site-dogrula`, `pnpm birim-testleri`, `pnpm tarayici-testleri`.
2. Kayıt, ana dala alma (`git merge --ff-only`), çalışma kopyasını ve dalı kaldırma; kapanış `/is-bitti`.

## Durum

yapılacak
