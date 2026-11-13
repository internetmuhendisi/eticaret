---
description: Katalogdaki bir eklentiyi tarifinden kurar. Tarifi okur, plan sunar, onayla kendi çalışma kopyasında kapalı başlatarak kurar, kontrollerden geçirir. Yayın yapmaz.
argument-hint: <eklentinin kod adı, örneğin sepette-kalan-hatirlatma>
disable-model-invocation: true
---

# Eklenti ekle: $ARGUMENTS

Eklentinin kod adı: `$ARGUMENTS`. Bu komut ilk eklentinin (stoğa gelince haber ver, kart 0144) elle kurulumundan çıkarıldı. Adımların ayrıntısı ve o kurulumda karşılaşılan tuzaklar kart 0144'ün "Notlar" bölümündedir. Her adımda o notun aynı numaralı maddesini de oku. Eklentinin yapısı ve bağlantı noktaları `.claude/rules/eklentiler.md` dosyasında, nedenleri karar 0117'dedir.

Adımları sırayla yap. Bir adımda dur dendiyse sonraki adımlara geçme. Aşağıda `<kod>` eklentinin kod adı, `<ad>` kodda kullanılan kısa addır (ör. `stokBildirimi`).

## 0. Ön denetim

Bu adımda hiçbir dosya yazma.

- Kod adı verilmediyse kullanıcıya söyle ve dur.
- Kod adı küçük harf, rakam ve tireden oluşmuyorsa söyle ve dur.
- `eklentiler/<kod>.md` yoksa dur. "Bu eklentinin tarifi yok" de ve önce tarifin yazılmasını öner: `eklentiler/README.md`'deki on iki başlıkla. Katalogda adı varsa satırını göster. Yoksa katalogda olmadığını söyle. Tarifi kullanıcı istemeden yazma.
- Tarifte on iki başlıktan biri eksikse eksikleri söyle ve dur.
- Tarif var ama kod katalogda yoksa bunu kullanıcıya söyle ve devam edip etmeyeceğini sor.
- Kod `cekirdek/kayitlar/eklentiler.ts`'teki `eklentiKodlari` listesinde zaten varsa ya da `cekirdek/eklentiler/<kod>/` klasörü varsa "eklenti kurulu" de ve dur.
- Ana klasörde kaydedilmemiş değişiklik varsa söyle ve dur.

## 1. Okuma

- Tarifi, `eklentiler/README.md`'yi, `temel-paket.md`'yi ve `.claude/rules/eklentiler.md`'yi oku.
- Tarifin "Veri", "Ekranlar" ve "Bildirimler" başlıklarının dokunduğu konuların kural dosyalarını oku (veritabanı, güvenlik, test, vitrin, yönetim paneli, yetki, formlar, metinler, ayarlar, kayıt dosyaları). Bu konulara değen karar kayıtlarını da oku (`kararlar/`).
- Tarifte ekran varsa taslakta karşılığını ara (`planlar/tasarim-yonu/`).
- Eklentinin hangi bağlantı noktalarına bağlanacağını belirle. Bugün olanlar: stok kancası, ürün sayfası yuvası, panel sayfası, e-posta, arka plan işi, izin, uç, metin. Gereken nokta yoksa (ör. sepet ya da sipariş) planda bunu ayrı madde olarak yaz. Nokta çekirdekte, kullanıcının onayıyla ve eklentiden önce kurulur.

## 2. Plan ve onay

- Planı `planlar/<kod>.md` dosyasına yaz: tariften bu siteye uyarlananlar, ayarlar, veri, ekranlar, bağlantı noktaları, testler. Bu dosya 4. adımda çalışma kopyasına taşınır.
- Kullanıcıya sade bir özet sun:
  - Tarifin "Ayarlar" başlığındaki her davranışı varsayılan değeriyle site ayarı olarak öner ve Örnek Mağaza için önerdiğin değeri söyle.
  - Ürün kararlarını sor: müşterinin göreceği ve yaşayacağı, tariften çıkmayan şeyler.
- Kullanıcı onaylamadan devam etme.
- Uygulama sırasında yeni bir ürün kararı çıkarsa dur ve sor. Var olan bir kararı ya da kuralı değiştiren davranış özellikle sorulur. 0144'te örneği şuydu: tükenmiş değer seçilebilir mi (karar 0108).

## 3. Kart

- Eklenti için açık bir kart yoksa `isler/sablon.md` ile bir kart aç. Kartın bitti sayılır listesi tarifin "Bitti sayılır" listesini içersin.

## 4. Çalışma kopyası

```
git worktree add .claude/worktrees/<kart> -b kart-<kart>
cd .claude/worktrees/<kart>
pnpm install --frozen-lockfile
ln -s ../../../.env .env
```

- Plan dosyasını çalışma kopyasına taşı. Bundan sonra her dosya çalışma kopyasında yazılır.
- `.env` bağlantıdır, kayda girmez.

## 5. Kurulum

Her madde tarifte karşılığı varsa yapılır. Sıra 0144'teki sıradır. Eklenti kapalı başlar: hiçbir sitenin `eklentiler` ayarına kendiliğinden eklenmez. Tek istisna 5.13'teki Örnek Mağaza satırıdır ve kullanıcı onayıyla yazılır.

İki kural her maddede geçerlidir:

- **Site adı:** `cekirdek/` ve `bilesenler/` altındaki hiçbir dosyada site adı ya da kod adı geçmez. Buna test yorumları ve sürüm notu da dahildir. Yerine "tarayıcı testlerinin sitesi" gibi genel bir ad yaz. Bunu `site-adi-yok.test.ts` yakalar. Bu kural 0144'te de, komutun denemesinde de ilk çalışmada kırmızı verdi.
- **Kullanım listesi:** Kütüphaneden bir parça (`BosHal`, `Kart`, `Baglanti`...) kullanan dosya eklenince ya da kalkınca `pnpm katalog-kullanimlari` çalıştırılır. Bu kural vitrin ve panel ekranları için de geçerlidir.

1. **Kayıt:** `cekirdek/kayitlar/eklentiler.ts`'teki `eklentiKodlari` listesine kodu ekle. Eklentinin durumları, sınırları ve sabitleri aynı dosyaya girer.
2. **Site ayarları:** `cekirdek/ayar-semasi/ayarlar.ts`'teki mağaza ayarlarına `<ad>…` önekiyle ayarlar, varsayılan değer ve açıklama anahtarıyla eklenir. Açıklamalar `tr.json`'da `ayar.aciklama.<ayar>` altına yazılır. Ayarlar `planlar/site-ayarlari.md`'nin "Eklentiler" bölümüne de girer. Varsayılanlar değişince `cekirdek/ayar-semasi/testler/site-klasoru.test.ts` güncellenir.
3. **Veri:** Tablo `cekirdek/eklentiler/<kod>/model.ts` dosyasına yazılır, aranan alanlar ve indeksler dosyanın başında belirtilir. Ardından `pnpm veritabani-degisikligi-uret --name <kisa-ad>` çalıştırılır ve dosyanın başına geri dönüş notu ile kart satırı yazılır. Son olarak `pnpm veritabani-guncelle siteler/ornek-magaza` çalıştırılır. Tablo yoksa bu madde atlanır.
4. **Servis ve şemalar:** `semalar.ts` çekirdeğin ortak şemalarını kullanır (`epostaSemasi`, `kimlikSemasi`, `robotCevabiSemasi`). `servis.ts` `<ad>Servisi(site)` olarak yazılır ve her işlemden önce `eklentiAcikMi` ile açıklığı sorar. E-posta gönderen eklenti, gönderen adresi olmayan sitede çalışmaz. Çekirdekte gereken işlev başka bir dosyanın içinde kalmışsa ortak yere taşınır, kopyalanmaz.
5. **Bağlantı noktaları:** Eklenti var olan noktanın listesine bir satır ekler:
   - Stok kancası: `cekirdek/eklentiler/stok-kancalari.ts`.
   - Ürün sayfası yuvası: `cekirdek/eklentiler/urun-sayfasi-yuvalari.tsx`.
   - Panel sayfası: sayfa ağacında `eklenti: "<kod>"` alanı.
   Yeni bir nokta gerekiyorsa dur ve kullanıcıya söyle.
6. **Arka plan işleri:** `cekirdek/eklentiler/<kod>/isler.ts` yazılır, satırlar `cekirdek/arka-plan-isleri/isler.ts`'teki `kayitliIsler` ve `zamanliIsler` listelerine girer. İşin girdisinde kişisel veri olmaz. Kancaya bağlı iş yapan eklentinin, kancanın anı kaçtığında çalışan zamanlı bir taraması da olur. Kişisel veriyi silen saklama işi eklenti kapalıyken de çalışır. İşin ulaştığı dosyalarda içe aktarmalar uzantıyla yazılır. Bunu ilk iş yazılır yazılmaz `katalog-acilisi.test.ts` ile dene.
7. **E-posta:** Şablon adı `cekirdek/kayitlar/eposta.ts`'teki `epostaSablonlari`'na, tanımı `cekirdek/moduller/eposta/sablon.ts`'e yazılır. Metinler `tr.json`'da `eposta.<ad>` altına girer.
8. **İzinler ve uçlar:**
   - İzinler `cekirdek/eklentiler/<kod>/izinler.ts` dosyasına yazılır, `cekirdek/kayitlar/izinler.ts`'e ve `cekirdek/moduller/ekip/izinler-ve-roller.md`'ye satır eklenir. Var olan bir izin yetiyorsa onu kullan: sınırlı role yeni izin eklemek veritabanı değişikliği ister.
   - Uçlar `cekirdek/kapi/<giriş>/` altına, adres dosyaları `cekirdek/uygulama/app/kapi/` altına yazılır. Uçlar `cekirdek/kapi/uclar.md`'ye de girer. Herkese açık uçta denetim sırası şudur: açıklık, robot, ayar.
   - Müşteri ucu için `rol-uc-erisimi.test.ts`'e senaryo ve başkasının kaydına dokunmama testi eklenir.
   - Testlerin deneme sitesinde (`cekirdek/ayar-semasi/testler/ornek-siteler/gecerli/ayarlar.json`) eklenti açılır.
9. **Metinler:** `tr.json`'da `eklenti.<ad>.…` altına yazılır. Anahtar adı, testlerin metin olarak aradığı işlev adlarıyla başlamasın. 0144'teki örnek: `girisYap` anahtarı `iki-asamali-giris.test.ts`'i kırmızıya düşürdü.
10. **Vitrin ekranı:** Parça önce ortak kütüphanede aranır. Var olan bir davranış değişirse var olan testi de güncellenir.
11. **Panel ekranı:** Sayfa `cekirdek/yonetim-paneli/sayfa-agaci.ts`'e `eklenti` alanıyla eklenir. Ekran `app/yonetim/(panel)/<sayfa>/page.tsx` dosyasına yazılır. Sayfa önce `panelSayfasiniAc` ile açılır, başlığını `panelSayfaBilgisi`'nden alır ve `PanelSayfasi` ile çizilir. Metinler `tr.json`'da `yonetim.sayfa.<ad>` altına girer.
12. **Belge:** Tarif, `eklentiler/README.md`'nin "Bu sürümde tarifi yazılmış eklentiler" listesinde "kuruldu" diye işaretlenir.
13. **Örnek Mağaza:** Kullanıcı onaylarsa `siteler/ornek-magaza/ayarlar.json`'daki `eklentiler` listesine kod eklenir. Tarayıcı testlerinin sitesi Örnek Mağaza olduğu için eklenti tarayıcıda yalnız açıkken denenebilir.

## 6. Testler

Eklentinin testleri `cekirdek/eklentiler/<kod>/testler/` altında, tarayıcı testi `cekirdek/testler/uctan-uca/<kod>.test.ts` dosyasındadır.

- **Kapalı ve açık hâl:** Eklenti kapalıyken servis hiçbir şey yapmaz, uç bulunamadı verir, panel sayfası menüde yoktur ve açılmaz, vitrin yuvası çizilmez, iş çalışmaz. Açıkken hepsi vardır. Kapalı hâl birim testiyle denenir: testte çalışan sitenin ortak alanı (`Symbol.for("cekirdek.calisanSite")`) geçici olarak değiştirilir. Panel sayfası gerçek sayfa ağacıyla denenir (`panelSayfasiniAc("<sayfa>")`, deneme ağacıyla değil).
- **Kapalı hâl gerçek uygulamada (bir kez):** Bu ölçüm testte kalmaz. Adımları:
  1. Örnek Mağaza'nın `ayarlar.json`'ından kodu geçici olarak çıkar.
  2. Geçici bir tarayıcı testiyle, eklentinin her ekranının kapalıyken görünmediğini ölç: menüde yok, adres 404, yuva yok.
  3. Ayarı geri koy. Aynı geçici test bu sefer kırmızıya düşmeli; düşmüyorsa ölçüm boştur.
  4. Geçici testi sil.
  Çalışan bir geliştirme sunucusu varsa önce kapat: ayar süreç başına bir kez okunur, tarayıcı testleri açık sunucuyu yeniden kullanır.
- **Panel sayfası:** `sayfa-agaci.test.ts`'te ağaç ile sayfa dosyaları aynı olmalı. `panel-yetkisi.test.tsx`'te sayfa kapalıyken menüde yok ve bulunamadı veriyor, açıkken var.
- **Gerçek veritabanı:** Servis gerçek veritabanıyla, e-posta varsa gerçek posta kutusuyla denenir. Yarışlar sıra kurularak denenir. İki site ayrı kalmalı.
- **Tür kontrolü:** Eklenti dosyaları `pnpm tur-kontrolu` kapsamında değildir (kart 0056). Geçici bir `tsconfig` ile `pnpm exec tsc --noEmit -p <geçici>` çalıştırılır, iş bitince silinir.
- **Tarayıcı:** Klavye, iki renk, üç genişlik ve tarama denenir. Yana kayma ve konsol hatası olmamalı.

## 7. Kontroller

1. **Bilerek bozma:** Her denetim tek tek bozulur, ilgili test çalıştırılır, sonra bozma geri alınır. Yeşil kalan bozmada testi güçlendir ya da denetimin gereksiz olduğunu göster. Sonucu karta yaz. Her eklentide şu bozmalar zorunludur:
   - Her `eklentiAcikMi` denetimi kaldırılır.
   - Panel sayfası varsa ağaçtaki `eklenti` alanı kaldırılır.
   Bu bozmalarda kapalı hâl testi kırmızıya düşmeli.
2. **Taslakla karşılaştırma:** Ekran varsa taslakla iki temada, telefonda ve bilgisayarda karşılaştır. Karşılaştırma için açtığın geliştirme sunucusunu sonra kapat: tarayıcı testleri onu yeniden kullanır ve görselli testler düşer.
3. **Bitti sayılır listesi:** Tarifin ve kartın bitti sayılır listesini tek tek ölç. Tahminle "tamam" deme.
4. **Bağımsız denetim:** İşi yapmayan bir ajana kartı, tarifi ve değişiklikleri ver. Bulguları düzelt ve testini ekle.
5. **Son kontroller:** Çalışma kopyasında sırayla:

```
pnpm bicimle
pnpm denetim
pnpm denetim-kendi-testi
pnpm tur-kontrolu
pnpm site-dogrula
pnpm birim-testleri
pnpm tarayici-testleri
```

## 8. Belgeler ve sürüm

- Karar kaydı yazılır (`kararlar/sablon.md`), yalnız eklentide birden çok yol arasından seçim yapıldıysa.
- Değişen kural dosyaları güncellenir: `.claude/rules/eklentiler.md`, `vitrin.md`, `yonetim-paneli.md`, `bilesenler.md`, `kurallari-koruyan-kontroller.md`. Sonuncusunda Testler ve Güvenlik satırlarına yeni testler yazılır.
- Sürüm üç dosyada güncellenir: `cekirdek/surum.ts`, `cekirdek/surum-notlari/<sürüm>.md`, `siteler/ornek-magaza/kimlik.json`. Çekirdekte site adı geçmez: sürüm notunda ve yorumlarda genel ad kullan.

## 9. Kayıt

- İşi kart dalında kaydet ve ana dala al (`git merge --ff-only`). Ardından çalışma kopyasını ve dalı kaldır (`git worktree remove`, `git branch -d`).
- Kartın durumuna, tarihçeye ve GitHub'a dokunma. Kullanıcıdan `/is-bitti <kart>` istemek yeter.
- Yayın yapma. Eklentiyi canlıya çıkarmak ve bir sitede açmak kullanıcının ayrı onayıyla olur.

## 10. Sonucu söyle

Önce sonucu yaz: eklenti kuruldu mu, hangi sitede açık. Sonra kullanıcının yapması gerekenleri yaz: `/is-bitti`, yayın onayı, açılacak siteler. Ardından bitti listesinin eksiklerini yaz. Ayrıntıyı kullanıcı sorarsa anlat.
