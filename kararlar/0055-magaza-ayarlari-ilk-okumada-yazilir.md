# 0055 · Mağaza sahibinin ayarları ilk okumada, ayar ayar yazılır

## Tarih

2026-11-07

## Karar

Mağaza sahibinin ayarları sitenin veritabanındaki `magaza_ayarlari` tablosunda, her ayar ayrı bir satırda durur (kart 0069). Başlangıç değerleri site klasöründeki `baslangic/ayarlar.json` dosyasındadır. Uygulama bir ayarın satırını bulamazsa, onu başlangıç değeriyle (dosyada yoksa şemanın varsayılanıyla) bir kez yazar. Sonra hep veritabanındakini okur.

- **Tek şema, iki sahip:** `ayarSemasi` altyapı sahibinin, `magazaAyarSemasi` mağaza sahibinin ayarlarıdır. İkisi aynı dosyada (`cekirdek/ayar-semasi/ayarlar.ts`), her ayar sahibinin şemasında durur. Bir ayar öteki sahibin dosyasına yazılırsa site doğrulaması durur.
- **Yarış:** Tekil anahtar, aynı anda açılan ikinci sürecin yazmasını atlatır. Değişiklik kaydına yalnız gerçekten yazan düşer.
- **Bozuk değer:** Kayıtlı değer şemaya uymuyorsa okuma hata verir, varsayılana dönmez. Düzeltme bir veri değişikliğiyle ya da servisle yapılır.
- **Kayıt:** Başlangıç yazımı `sistem: baslangic-ayarlari` adıyla, değişiklik yapanın kimliğiyle değişiklik kaydına girer. Değeri değişmeyen ayar kayda girmez.

## Neden

- Sunucuda site klasörünü yalnız çalışan uygulama görür. Veritabanı güncellemesi site klasörü olmayan ayrı bir kutuda çalışır (karar 0034). Başlangıç değerini uygulamanın yazması sunucuya yeni bir adım eklemez.
- Kurulum ve sonradan eklenen ayarlar aynı yoldan yazılır. Çekirdeğe yeni bir mağaza ayarı gelince kurulmuş sitede yalnız o ayar başlangıç değerini alır, eskiler değişmez.
- Karar 0010'un istediği gibi yazılmış değer başlangıç dosyası değişse de değişmez, dosya ile veritabanı yarışmaz.
- Her ayarın ayrı satırda durması, aynı anda değişen iki ayarın birbirini ezmesini önler.

## Düşünülen diğer yollar

- **Başlangıç değerini veritabanı güncellemesinde yazmak:** Seçilmedi. Sunucudaki güncelleme kutusuna site klasörünü bağlamak gerekirdi, yayından önce çalıştığı için o anki yayının klasörü henüz sunucuda olmayabilir.
- **Ayrı bir kurulum komutu:** Seçilmedi. Site komutları henüz yok. Komutu çalıştırmayı unutan site varsayılanla çalışırdı, sonradan eklenen ayarlar için de yine ayrı bir adım gerekirdi.
- **Değeri hiç yazmayıp okurken dosyaya düşmek:** Seçilmedi. Kurulumdan sonra dosyanın değişmesi mağazanın davranışını değiştirirdi, karar 0010'a aykırı.
- **Bütün ayarları tek satırda tek JSON olarak tutmak:** Seçilmedi. Aynı anda değişen iki ayar birbirini ezerdi.

## Sonuçları

- Okuma yolu yazabilir: bir ayarın ilk okunduğu istekte kısa bir yazma işlemi olur. Bu yalnız ayar başına bir kez olur.
- Varsayılan da yazılır. Çekirdekte bir ayarın varsayılanı sonradan değişirse kurulmuş siteler eski değerde kalır, değişiklik ancak veri değişikliğiyle gider. Bu bilerek seçildi: çekirdek değişikliği siteye kendiliğinden gitmez.
- Ayarın şeması sonradan daralırsa (örneğin bir seçenek kalkarsa) eski değer okumayı durdurur. Şemayı daraltan değişiklik kayıtlı değerleri dönüştüren bir veri değişikliğiyle gelir.
- Değişiklik kaydı e-posta taşıyan değeri reddeder (karar 0045). Mağazanın iletişim e-postası gibi bir ayar geldiğinde (kart 0071) kaydın bunu nasıl yazacağı o kartta çözülür.
- Mağaza sahibinin henüz ayarı yoktur. Servis deneme şemasıyla gerçek veritabanında test edilir.
