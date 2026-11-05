# Altyapı haritası

Altyapının hangi büyük parçalardan oluştuğunu, her parçanın ne iş yaptığını ve parçaların birbiriyle nasıl konuştuğunu anlatır. Kod bilmeyen biri için yazıldı, teknik ayrıntı en sondadır.

Durum: 2026-10-28 tarihinde kullanıcı onayıyla yazıldı. Aynı gün teknoloji kararıyla (0013) güncellendi.

## Tek cümleyle

Bütün mağazalar **aynı motoru** kullanır. Her mağazanın kendi **ayarları, görünüşü ve veri dolabı** vardır. Bütün mağazaları tek bir **sahip paneli** gözetler.

## Büyük resim

```
                 ┌──────────────────────┐
                 │     SAHİP PANELİ     │  ← yalnız altyapı sahibi
                 │ (bütün siteleri izler)│
                 └──────────┬───────────┘
                            │ her siteye ayrı ayrı sorar
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌────────────┐      ┌────────────┐      ┌────────────┐
  │ Örnek      │      │ Mağaza B   │      │ Mağaza C   │
  │ Mağaza     │      │            │      │            │
  └────────────┘      └────────────┘      └────────────┘

  Bir sitenin içi:

   Müşteri                         Mağaza sahibi
      │                                  │
      ▼                                  ▼
  ┌─────────┐                      ┌──────────────┐
  │ VİTRİN  │                      │ YÖNETİM      │
  │         │                      │ PANELİ       │
  └────┬────┘                      └──────┬───────┘
       │      ┌───────────────────┐       │
       └─────►│  KAPI (sunucu     │◄──────┘
              │  arayüzü)         │
              └────────┬──────────┘
                       ▼
              ┌───────────────────┐    ┌──────────────────┐
              │  ÇEKİRDEK         │───►│ SİTENİN AYARLARI │
              │  (ortak motor)    │    │ VE TEMASI        │
              └───┬──────────┬────┘    └──────────────────┘
                  ▼          ▼
        ┌──────────────┐  ┌─────────────────────────┐
        │ VERİTABANI   │  │ ARKA PLAN İŞLERİ        │
        │ (yalnız bu   │  │ e-posta, zamanlı işler, │
        │ sitenin)     │  │ yedek, hata izleme      │
        └──────────────┘  └─────────────────────────┘
```

## Parçalar ve yaptıkları işler

**1. Çekirdek (ortak motor).** Mağazanın beyni. Ürün, stok, fiyat, vergi, sepet, ödeme, sipariş, iade, kargo, kupon, müşteri hesabı, blog ve e-postalar burada çalışır. Bütün sitelerde aynı koddur. Bir siteye özel davranış gerekirse koda "bu siteyse şunu yap" diye yazılmaz, ayar olarak eklenir.

**2. Sitenin ayarları.** Her mağazanın kendi değerleri: para birimi, vergi oranları, kapıda ödeme açık mı, kargoya kaç günde verilir, iade kargosunu kim öder gibi. Çekirdek her işte önce bu ayarlara bakar. Örneğin Örnek Mağaza'da kapıda ödeme nakit ve kartla açıktır, ürün sayfasında "1 iş gününde kargoda" yazar. Ayarların listesi: `planlar/site-ayarlari.md`.

**3. Temalar ve ortak parça kütüphanesi.** Vitrinin görünüşü burada üretilir. Düğme, ürün kartı ve fiyat gösterimi gibi parçalar bir kez yapılır, her sitede kullanılır. Tema bu parçalara renk, yazı tipi ve köşe biçimini giydirir. Mağaza sahibi temanın izin verdiği kadarını değiştirir, önce önizler, sonra yayınlar, isterse geri alır.

**4. Vitrin.** Müşterinin gördüğü site: ana sayfa, kategoriler, ürün sayfası, sepet, ödeme, hesabım. Sepet, ödeme ve sipariş takibi her mağazada aynı çalışır, yalnız görünüşleri farklıdır.

**5. Yönetim paneli.** Mağaza sahibinin ürün eklediği, siparişleri yönettiği, ayarları ve temayı değiştirdiği yer. Bütün sitelerde aynı görünür, yalnız mağazanın logosunu ve ana rengini alır. Her kullanıcı yalnız yetkisi olan düğmeleri görür.

**6. Kapı (sunucu arayüzü).** Vitrin ve panel çekirdekle doğrudan konuşmaz, bu kapıdan konuşur. Kapı gelen her isteği iki açıdan kontrol eder: istek kurallara uygun mu, isteyenin buna yetkisi var mı? Dört ayrı girişi vardır: herkese açık, müşteri, mağaza yöneticisi, altyapı sahibi.

**7. Veritabanı.** Sitenin ürünlerinin, siparişlerinin ve müşterilerinin saklandığı dolap. **Her sitenin dolabı ayrıdır** (karar 0003). Bir mağaza başka bir mağazanın verisini hiçbir yoldan göremez. Her dolap ayrı yedeklenir ve tek başına geri yüklenebilir.

**8. Arka plan işleri.** Kimse tıklamadan kendi kendine çalışan işler:
- e-postaların gönderilmesi;
- 3 gün içinde ödenmeyen havale siparişinin iptali ve stoğun geri dönmesi;
- ödemede 15 dakika ayrılan stoğun süre dolunca serbest kalması;
- gece yedekleri;
- sitenin, ödemenin ve e-postanın düzenli kontrolü;
- hataların yakalanıp bize bildirilmesi.

**9. Sahip paneli.** Yalnız altyapı sahibinin girdiği kule. Her sitenin açık olup olmadığını, son yayınını, hatalarını, satış özetini ve hangi çekirdek sürümünde çalıştığını gösterir. Siteler ayrı dolaplarda durduğu için bu bilgiyi her siteye tek tek sorup toplar.

**10. Eklentiler.** Temel pakette olmayan özellikler, örneğin kartla ödeme ya da Trendyol bağlantısı. Çekirdeğe sonradan takılır, her sitede ayrı açılır, ilk kurulduğunda kapalı başlar. Katalog: `eklentiler/README.md`.

**11. Koruyucular.** Kuralların çiğnenmesini engelleyen otomatik kontroller, testler ve tek komutla yayın. Bir güncelleme hiçbir siteye kendiliğinden gitmez, site site yapılır. Sorun çıkarsa site önceki sürüme tek komutla döner.

## Parçalar nasıl konuşuyor: bir sipariş örneği

Örnek Mağaza'da bir müşteri kapıda kartla ödeme seçip tişört alıyor:

1. Müşteri **vitrinde** "Siparişi tamamla"ya basar.
2. Vitrin bu isteği **kapıya** iletir. Kapı formun eksiksiz olduğunu kontrol eder.
3. **Çekirdek** işi devralır ve önce **sitenin ayarlarına** bakar: kapıda kart açık mı, KDV fiyata dahil mi, sipariş numarası nasıl başlar?
4. Çekirdek stoğu düşürür ve siparişi **bu sitenin veritabanına** ORN-1001 numarasıyla yazar.
5. **Arka plan işleri** müşteriye sipariş e-postasını, mağaza sahibine "yeni sipariş" bildirimini gönderir.
6. Mağaza sahibi siparişi **yönetim panelinde** görür, kargoya verir, takip numarasını girer. Müşteriye kargo e-postası gider.
7. **Sahip paneli** Örnek Mağaza'nın satış özetinde bu siparişi sayar.

## Nerede çalışıyor

Bütün siteler, verileri ve yedekleri Almanya'daki sunucularda durur. Yedekler canlı sunucudan ayrı bir veri merkezindedir (karar 0009).

## Ayrıntısı

Çekirdeğin, site klasörünün ve sahip panelinin ayrıntısı: `planlar/cekirdek-ve-siteler.md`. Sahip paneli bilgiyi her siteye ayrı ayrı sorarak toplar, veritabanlarına bağlanmaz (karar 0012).

## Teknoloji

Karar 0013 ile verildi: TypeScript, React ve Next.js, PostgreSQL, Docker, önde Caddy, sunucu Hetzner (Almanya). Başta bütün siteler ve sahip paneli tek sunucuyu paylaşır. Her site kendi kutusunda, kendi çekirdek sürümüyle, kendi veritabanı ve veritabanı kullanıcısıyla çalışır. Ayrılmak isteyen mağazanın sitesi bütünüyle devredilebilir (0014). Klasör düzeni: 0015.

## Teknik ayrıntı

- **Tek kod, sürümlü çalışma (0006):** Her çalışan site üç şeyin birleşimidir: çekirdeğin belirli bir sürümü, sitenin klasörü (marka, tema seçimi, ayar dosyası, gerekirse kendi vitrin parçaları) ve sitenin veritabanı. Sitenin hangi sürümde çalıştığı site klasöründeki kimlik dosyasında yazar (0011).
- **Ayar şeması:** Bütün site ayarları tek şemada tanımlıdır: türü, varsayılanı, açıklaması. Panelin ayar ekranları bu şemadan üretilir. Gizli bilgiler (anahtar, şifre) ayarlarda değil, bilgisayarda `.env` dosyasında, sunucuda sitenin kendi gizli bilgi dosyalarındadır (`.claude/rules/ayarlar.md`, karar 0031).
- **Modül yapısı:** Her çekirdek modülü aynı parçalardan oluşur: veri modeli, servis (iş kuralları), uçlar, izinler, metinler, testler.
- **Sunucu arayüzü** (`.claude/rules/sunucu-arayuzu.md`):
  - Her yanıt aynı zarfla döner.
  - Her girdi ekranla paylaşılan şemayla doğrulanır.
  - Uçlar yalnız yönlendirir, iş kuralı serviste yazılır.
  - Dört adres öneki vardır: herkese açık, müşteri, yönetici, sahip.
  - Her uç hangi izni istediğini belirtir.
  - Ödeme ve kargo bildirim uçları imzayla doğrulanır.
- **Tasarım** (`.claude/rules/tasarim-sistemi.md`): Görünüm, tasarım değerlerinden (renk, ölçü, köşe, gölge, katman) gelir. Vitrinin son görünümü "tema değerleri + sitenin tema ayarları" birleşimidir ve tek yerde üretilir. Tema değişiklikleri sürümlenir, geri alınabilir.
- **Metinler** (`.claude/rules/metinler.md`): Ekrandaki bütün metinler anahtarlı metin dosyalarındadır. Para, tarih ve sayı tek ortak biçimleyiciden geçer, böylece ikinci dile hazır kalır.
- **Veritabanı** (`.claude/rules/veritabani.md`):
  - Tahmin edilemeyen kimlikler kullanılır.
  - Tutarlar sabit ondalıklı tutulur.
  - Silinen kayıt önce silinmiş olarak işaretlenir.
  - Değişiklikler numaralı dosyalarla, kişisel bilgileri silinmiş kopyada denendikten sonra uygulanır.
- **İzleme** (`.claude/rules/hata-izleme.md`, `.claude/rules/yetki.md`):
  - Hatalar ortak bir katmanda yakalanır ve izleme aracına gider.
  - Site, ödeme ve e-posta düzenli olarak otomatik yoklanır.
  - Fiyat, stok, sipariş ve yetki değişikliklerinde kimin, ne zaman, neyi değiştirdiği kaydedilir.
