# 0100 · Demo site geri yüklemeyle aynı yoldan boş veritabanına sıfırlanır

## Tarih

2026-11-11

## Karar

`pnpm site-sifirla <site klasörü> <ortam>` (kart 0128) yalnız kimliğinde türü `demo` olan sitenin verisini siler ve siteyi yayındaki sürümüyle boş veritabanından açar. Arka plan süreci açılırken başlangıç verisini (katalog, menüler, düzen; karar 0070, 0094) yeniden kurar.

- **Yol:** Geri yüklemenin akışı (`komutlar/yedek.mts`, karar 0037) ortak bir yer değiştirme işlevine ayrıldı; sıfırlama yan veritabanını yedekten değil boş açar. Sıra: boş yan veritabanı (sitenin kullanıcısına ait, herkese kapalı, üst bilgi izinleri kapalı), kutuyu durdurma, o anki verinin yedeği (`sifirlama-oncesi`), tek işlemde yer değiştirme, şifre yenileme, değişikliklerin yayındaki görüntüyle uygulanması, kutuyu açma ve sağlık, eski veritabanının silinmesi. Yer değiştirmeden sonra bir adım tutmazsa eski veri yerine döner. Sonuç yedek kaydına `sifirlama` türüyle yazılır.
- **Sıra:** Önce yeni sürüm olağan yolla yayınlanır, sonra sıfırlanır. Böylece boş veritabanını yalnız yeni sürüm görür; eski sürümün arka plan süreci eski kataloğu kuramaz.
- **Yalnız yayındaki site:** Değişiklikleri yayındaki kutunun görüntüsü uygular; yayında olmayan site hiçbir şeye dokunulmadan reddedilir (bağımsız kontrolün bulgusu: yoksa tablosuz veritabanı başarılı sayılırdı).
- **Dosya klasörüne dokunulmaz:** Eski görsel ve logolar diskte kayıtsız kalır. Dosyaların yedeği yoktur (kart 0093), taşımak ya da silmek geri alınamaz bir adım eklerdi.
- **Onay:** Komut sitenin kod adını yazdırarak onay ister (`--onay=<kod adı>`), geri yüklemedeki gibi.

## Neden

- Geri yükleme akışı yedeği, kutunun durdurulmasını, yer değiştirmeyi ve geri dönüşü her adımın bozulmasıyla sınanmış hâlde yapıyor. Sıfırlamayı ayrı adımlarla yazmak aynı korumaları ikinci kez yazmak olurdu.
- Gerçek mağazanın verisi bu yolla silinmemeli: yalnız demo tür denetimi bunu kodda tutar.

## Düşünülen diğer yollar

- **Sunucuda elle veritabanını silip `pnpm sunucu-veritabani` ile yeniden açmak:** Denetlenmez, yedek ile silme arasında koruma yoktur, bir dahaki sefere yeniden yazılır.
- **Veritabanını silip yeniden açan ayrı bir komut:** Silme anında geri dönüş yolu olmazdı; sağlık geçmezse site boş ve kapalı kalırdı.
- **Sıfırlamada dosya klasörünü yanına taşımak:** Geri dönüşte dosyaların da geri taşınması gerekirdi; kayıtsız dosyanın zararı yalnız disk yeridir.

## Sonuçları

- Sıfırlamada müşteri ve yönetici hesapları da silinir; panel için `pnpm sunucu-yonetici-ac` yeniden çalıştırılır.
- Eski dosyalar diskte kalır, temizliği kart 0093 ile gelir.
- Akış geri yüklemeyle ortak olduğu için geri yüklemedeki bir değişiklik sıfırlamayı da etkiler; ikisi aynı sahte sunucu testinde ölçülür.
- Sıfırlama yarım kalırsa kurtarma geri yüklemenin seçenekleridir (`pnpm yedek-geri-yukle ... --eskiye-don` ya da `--eskiyi-sil`).
