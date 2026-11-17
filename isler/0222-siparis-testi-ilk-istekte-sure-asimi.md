# 0222 · Ödeme testinde ilk sipariş isteği 5 saniyede dönmüyor

## Amaç

Kart 0214'ün gönderimindeki kontrol hattı (çalışma 44079499012) yalnız bir tarayıcı testinde kırmızı bitti: `cekirdek/testler/uctan-uca/odeme.test.ts:262`, "üye olmayan müşteri formu klavyeyle doldurur, kapıda nakit seçer; sipariş oluşur, sepet boşalır". Tarayıcı testlerinin sonucu 276 geçti, 1 düştü, 3 çalışmadı. Hız ölçümü, görüntü ve yerel ortam adımları çalışmadı.

Hattın izinde (`tarayici-testleri-izi`) "Siparişi onayla"dan sonra `POST /kapi/herkese-acik/odeme` isteği testin sonuna kadar, yaklaşık 7 saniye, dönmedi. Sayfa "Siparişiniz onaylanıyor" durumunda kaldı. `basariBekle` içindeki `toHaveURL` 5 saniyelik beklemede düştü. Hata cevabı ya da yanlış sonuç yok. Bu, o çalışmada ödeme ucunu çağıran ilk testti. Aynı dosyanın sonraki sipariş testleri (havale dahil) geçti. Yerel son doğrulamada (hat koşulu, temiz veritabanı) test geçmişti.

Tahmin, ölçülmedi: geliştirme sunucusu ucu ilk istekte derliyor ve hattın makinesinde bu 5 saniyeyi aşıyor. Testlerden önceki hazırlık (`cekirdek/testler/uctan-uca/hazirlik.ts`) ödeme ucunu önceden açmıyor. Ödeme işleminin bir kilitte beklemesi (stok satırı, sipariş numarası) de olasıdır.

## Olmazsa olmazlar

- Önce sebep ölçülür. Hattın izinden ve sunucu günlüğünden isteğin nerede beklediği bulunur: derleme mi, veritabanı kilidi mi, başka bir şey mi. Sebep iddiası ölçümle doğrulanmadan düzeltme yazılmaz.
- Düşüş yerelde yeniden üretilmeye çalışılır: hattın koşulu, temiz veritabanı, sunucu baştan açılarak, ödeme dosyası tek başına ve bütün takımla. Kaç denemede kaç düşüş olduğu yazılır.
- Sebep ilk derlemeyse düzeltme ortak hazırlıkta yapılır, tek testin beklemesi uzatılarak yapılmaz. Aynı sorunun ilk kez çağrılan öteki uçlarda da olup olmadığına bakılır.
- Sebep kilit ya da yavaş sorguysa bu bir ürün hatasıdır. Düzeltme ödeme ve sipariş servisinde yapılır, gerçek müşterinin bekleme süresi ölçülür.

## Sınırlar

- Ödeme ve sipariş akışının davranışı, metinleri ve ekranı değişmez (sebep ürün hatası çıkmadıkça).
- Tarayıcı testlerinin genel süre sınırları ve eylem sınırı kart 0198'in işidir, bu karta karışmaz.
- Testlere yeniden deneme eklenmez.

## Bitti sayılır

- Düşüşün sebebi ölçümle yazıldı.
- Düzeltmeyle, düşüşün üretildiği koşulda art arda en az on çalışmada test yeşil. Düşüş üretilemediyse bu açıkça yazıldı.
- Düzeltme bilerek geri alınınca, düşüşün üretildiği koşulda test kırmızıya düşüyor. Ya da bunun neden denenemediği yazıldı.
- Kontrol hattı yeşil.

## Durum

yapılacak
