# 0112 · Dışarıdan gelen kimlik küçük harfe çevrilir

## Tarih

2026-11-13

## Karar

Dışarıdan gelen her kayıt kimliği koda girmeden küçük harfe çevrilir (kart 0119).

- Şemalar kimliği yalnız `kimlikSemasi` ile doğrular (`cekirdek/veritabani/kimlik.ts`): UUID biçimini denetler, küçük harfe çevirir. Menüdeki `kimlikAlani`, kategori görseli, özellik ve marka logosundaki ayrı kopyalar bu tek parçaya taşındı.
- Şemadan geçmeyen kimlik (servisin kimlik değişkeni, düzenin sıralaması) kodda karşılaştırılmadan önce `kimligiDuzelt` ile çevrilir. Stok kalemlerindeki birim de çevrilir. Birden çok kimliği tek sorguyla okuyan işlevler (stok, fiyat, galeri, varyant) girdiyi çevirir, sonucu küçük harfli kimlikle verir. Kimliği elle küçük harfe çeviren yerler (`toLowerCase`) aynı işleve bağlandı.
- `kimlikMi` (kimlik biçiminde mi) aynı dosyaya taşındı. Karar 0063'te yeri `cekirdek/veritabani/turler.ts` olarak yazılıdır; o dosya veritabanı sütun türlerini taşır, ekranla paylaşılan şemalar ona bağlanmamalıdır.
- Ortak dosya dışında zod'un kimlik doğrulayıcısını çağırmak testte kırmızıdır (`cekirdek/testler/kimlik-semasi.test.ts`).

## Neden

- UUID büyük harfle de yazılabilir. Veritabanı iki yazılışı aynı sayar, kod ise kimlikleri metin olarak karşılaştırır: taşındı mı, kendisi mi, tekrar var mı, sıra tam mı. Gerçek veritabanıyla ölçülen sonuçlar:
  - kendi üstü büyük harfle verilen kategorinin ve menü öğesinin kardeşlerinin sonuna düşmesi;
  - büyük harfle kendisi seçilen ilgili ürünün beklenmeyen hata vermesi;
  - büyük harfle tekrarlanan etiket ve varyant değerinin yanlış hata koduyla dönmesi;
  - galeri ve vitrin bölümlerinin büyük harfle verilen doğru sıralamasının reddedilmesi;
  - büyük harfle verilen bölümün bulunamaması;
  - aynı marka ve etiketin büyük harfle verilmesinin değişiklik kaydına sahte satır yazması;
  - stok kalemlerinde aynı birimin iki yazılışının ayrı sayılması;
  - büyük harfle okunan varyantlı ürünün, özelliğin ve fiyatın eksik gelmesi;
  - büyük harfle verilen varyantlı ürünün silinememesi (beklenmeyen hata) ve aynı kargo vergi sınıfının büyük harfle yeniden seçilmesinin kayda girmesi (ikisi bağımsız kontrolün bulgusu).
- Kimliği girişte bir kez çevirmek, karşılaştıran her yeri ayrı ayrı düzeltmekten sağlamdır: yeni yazılan karşılaştırma da doğru çalışır.

## Düşünülen diğer yollar

- Büyük harfli kimliği reddetmek (yalnız küçük harf kalıbı): UUID standardı büyük harfe izin verir, dışarıdan gelen geçerli bir kimliği reddetmek gereksiz bir hata olurdu.
- Her karşılaştırmayı harf ayrımsız yapmak: karşılaştıran her yer bunu ayrıca hatırlamalıydı, unutulan yer hata olarak kalırdı.
- Karşılaştırmayı veritabanına bırakmak: bazı denetimler (sıranın tamlığı, tekrar, düzen kaydındaki kimlikler) kodda yapılır, veritabanına taşınamaz.

## Sonuçları

- Kart 0119'un ikinci iddiası ölçülerek doğrulanmadı: büyük harfle kendi altına taşınan kategori eskiden de "döngü" hatasıyla reddediliyordu, çünkü döngü denetiminin sorgusu veritabanında harf ayrımsız karşılaştırır. Test yine de kaldı.
- Servis işlevine doğrudan verilen kimliğin girişte çevrilmesinin kontrolü yoktur, yalnız disiplindir. Bugün kodda karşılaştırılan girişler çevrildi ve testlendi.
- Tarama noktayla çağrılan her `uuid`/`guid` doğrulayıcısını, zod'dan doğrudan alınan `uuid`'i ve `refine(kimlikMi)` ile yazılan kimlik alanını yakalar. Takma adla (`import { z as s }`) ya da ad alanıyla (`import * as`) alınmış zod ve kimliği kalıpla (`regex`) denetleyen alan tarama dışında kalır, yalnız disiplindir.
