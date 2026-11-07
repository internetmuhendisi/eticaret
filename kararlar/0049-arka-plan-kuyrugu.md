# 0049 · Arka plan kuyruğu kendi yazımımız, ikinci kutu aynı görüntüden

## Tarih

2026-11-07

## Karar

- **Kuyruk:** Sitenin veritabanında tek tablo (`arka_plan_isleri`), kod `cekirdek/arka-plan-isleri/` altında. Durumlar ve değerler `cekirdek/kayitlar/arka-plan.ts` dosyasındadır.
- **İşi alma:** Süreç işi `FOR UPDATE SKIP LOCKED` ile kilitleyerek alır. Yalnız kendi sürümünün tanıdığı türleri alır, çünkü yayın sırasında eski ve yeni süreç bir süre birlikte çalışır.
- **Süreç ölürse:** Kilidin süresi (6 dakika) dolunca iş yeniden alınır. Kilidi kaybeden sürecin sonucu yazılmaz.
- **Yeniden deneme:** En çok 5 deneme, bekleme 1 dakikadan başlar, her seferinde iki katına çıkar, en çok 1 saat. Son denemede iş `hata` kalır ve `hatayiKaydet` ile hata izleme aracına gider. Ara denemeler yalnız günlüğe uyarı yazar. Bir iş en çok 5 dakika sürer.
- **Zamanlı işler:** Kodda `zamanliIs(is, girdi, { herDakika })` ile tanımlanır. Her zaman dilimi tekillik anahtarıyla tek kayıt açar. Süreç kapalıyken geçen dilim sonradan çalıştırılmaz.
- **Temizlik:** Biten işler 30 gün sonra silinir. Hatalı işler silinmez.
- **İkinci kutu:** `<site kutusu>-arka-plan`, site kutusuyla aynı görüntü, kısıtlar, ağ ve gizli bilgiler; yalnız komutu ve sağlık yoklaması farklıdır. Süreç görüntüde tek dosyadır (`arka-plan/surec.mjs`). Yoklama nabız dosyasının yaşına bakar.
- **Komutlar:** Yayın ve geri dönüş iki kutuyu compose ile birlikte açar ve kapatır. Kutu yenileme ikisini de yeniden başlatır. Yedekten geri yükleme önce siteyi, sonra arka plan kutusunu durdurur. Sunucu denetimi 0.9.0 ve sonraki yayınlarda ikinci kutuyu da ölçer.
- **Elle bakım:** Bakım sayfası yalnız ön kapıdadır, arka plan süreci bakımda da çalışır.

## Neden

- **Kendi yazımımız:** Hazır kuyruk paketleri kendi tablolarını kendileri kurup değiştirir. Bu, "tablo değişikliği numaralı dosyayla" kuralını deler ve yedek, denetim ve geri dönüş notlarının dışında kalır. İhtiyaç tek tablo ve bir kilitli sorgudur.
- **Aynı işlemde ekleme:** `isEkle` bir veritabanı işleminin içinden çağrılabilir. Sipariş kaydıyla e-posta işi birlikte girer ya da hiç girmez.
- **Sağlık yoklaması veritabanına bakmaz:** Kesintide kutu yeniden başlatılmaz, veritabanının sağlığını site kutusunun yoklaması ve yayın ölçümleri ölçer.
- **Kesinti başına tek hata:** Veritabanı kapalıyken her turda hata göndermek hata izleme aracını doldururdu (kart 0050'deki sorunun aynısı).
- **Sürüm sınırı denetimde:** Sunucudaki 0.6.1 yayınının ikinci kutusu yoktur. Sürüme bakılmasaydı `pnpm yayinla`'nın ön denetimi ilk yayını durdururdu.

## Düşünülen diğer yollar

- **Hazır paket (pg-boss, Graphile Worker):** Seçilmedi. Gerekçe yukarıda.
- **Ayrı kuyruk sunucusu:** Seçilmedi (0013).
- **Süreci site kutusunun içinde ikinci süreç olarak açmak:** Seçilmedi. Birinin ölmesi ötekini etkilerdi, Docker'ın yeniden başlatması ve sağlık yoklaması ayrı ölçemezdi. Kartın "ikinci süreç aynı görüntüden" maddesi ayrı kutuyla sağlanır.
- **Takvim biçimli zamanlama (cron):** Seçilmedi. Bugünkü işler için aralık yeter, saat dilimi kararı getirmez. "Her gün şu saatte" gereken iş çıkınca eklenir.
- **Hatalı işleri de silmek:** Seçilmedi. İncelenmeden kaybolurlardı.

## Sonuçları

- **İki kez çalışma sınırı:** İki süreç aynı işi aynı anda alamaz. Süreç iş ortasında ölürse ya da iş süresini aşıp durmazsa iş yeniden çalışabilir. Dış servise giden iş `isKimligi` ile tekrarı önlemelidir (kart 0032).
- **Hatalı işlerin girdisi kalır:** Silinmedikleri için kişisel bilgi taşıyan girdi de kalır. Hatalı işleri görecek ekran ve silme yolu kart 0059'dadır. Yöneticiye bildirim de oradadır (`.claude/rules/e-ticaret-is-kurallari.md`). Bugün hatayı yalnız altyapı sahibi araçta görür.
- **Geri dönüşte kalan işler:** Eski sürüme dönülürse yeni sürümün tanıdığı türler `bekliyor` durumunda kalır, yeniden yükseltilince çalışır. Bunları gösteren bir denetim yoktur.
- **Bellek:** Her site için ikinci bir süreç çalışır. Yayından kısa süre sonra sunucuda ölçüldü: arka plan kutusu yaklaşık 30 MB, site kutusu yaklaşık 50-60 MB. 30 sitede arka plan kutuları yaklaşık 900 MB eder. Uzun süreli ölçüm yapılmadı.
- **Tek işlik süreç:** Süreç işleri sırayla çalıştırır, uzun bir iş sırayı bekletir. Şimdilik yeterlidir, ölçülmedi.
- **Kapanış:** Kapatılırken işe durması söylenir ve 8 saniye beklenir. Sinyale uyup duran iş deneme hakkı yemeden sıraya döner. Durmayan işte süreç kapanır, iş kilit süresi dolunca yeniden denenir ve bir deneme hakkı gider.
- **Biten işin yazılamaması:** İş bitip sonucu yazılamazsa (veritabanı kesintisi) kilit süresi dolunca iş yeniden çalışır.
- **Geri yükleme:** Yedekteki `bekliyor` işler geri yüklemeden sonra yeniden çalışır, sonradan bitmiş olsalar da. Bu da `isKimligi` ile önlenir.
- **Kesintide olay sayısı:** Döngü kesinti başına tek hata gönderir. Bağlantı havuzunun kendi olayı (`veritabani-havuzu`) buna dahil değildir, gerçek kesintide en az iki olay beklenir. Gerçek veritabanı durdurmasıyla ölçülmedi, sahte bağlantıyla ölçüldü.
- **Nabız:** Yoklama döngünün değil sürecin canlılığını gösterir. Takılmış bir sorguda kutu sağlıklı görünür, sorgularda zaman aşımı yoktur.
- **Maske:** Rakam dizisi kuralı benzersiz kimlikleri bozuyordu (yüzde 9 kadar). Kimlikler bu kuraldan muaf oldu; bu, bütün günlük ve araç kayıtlarını etkiler. Kimlik biçiminde yazılmış bir değer rakam kuralından geçmez, adı gizli alanda ise yine gizlenir.
- **Deneme işleri görüntüdedir:** `deneme-basarili` ve `deneme-hatali` kayıtlı işlerdir, yalnız kutunun içinden tetiklenir, veri yazmaz.
- Tablodaki durum listesi değişiklik dosyasında elle yazılıdır. Kayıttaki değerlerle aynı olduğunu `kuyruk.test.ts` denetler; kayda yeni durum eklenirse test kırmızı olur, tersi yönde (tabloda fazla durum) denetim yoktur.
