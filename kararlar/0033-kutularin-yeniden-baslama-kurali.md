# 0033 · Kalıcı kutular elle durdurulmadıysa yeniden başlayınca açılır

## Tarih

2026-11-05

## Karar

- Sunucuda ve yerel ortamda sürekli çalışan her kutu Docker'ın `unless-stopped` kuralıyla kurulur: veritabanı, Caddy, ön kapı ve yoklama kutusu, her site. Docker ya da sunucu yeniden başlayınca kutu kendiliğinden açılır. Elle durdurulmuş kutu (`docker stop`) açılmaz.
- Kuralın tek tanımı `komutlar/kutu-kurali.mts` dosyasıdır. Ön kapı ve site kutuları kuralı oradan alır. Kod okuyamayan iki ayar dosyası (`sunucu/compose.yaml`, `sunucu/yerel-ortam.yaml`) kuralı aynen yazar. Aynı olduklarını Docker'ın kendi okumasıyla (`docker compose config`) test denetler.
- Test (`komutlar/testler/kutu-kurali.test.ts`) kutu tanımlayan ya da açan dosyaların listesini de tutar: kalıcı ve geçici. Projedeki bütün dosyalar (kayda girmemiş yeni dosyalar da) compose tanımı, `docker run` ve `docker create` için taranır. Listede olmayan bir dosya kutu tanımlar ya da açarsa test kırmızıdır.
- Geçici deneme kutuları bu kuralı almaz (gizli bilgi denemesi, görüntü denetimi). Yarıda kalan bir denemenin kutusu açılışta geri gelmemelidir.
- Docker'ın sunucu açılışında başladığını, ön kapı kutularının gerçek kuralını `pnpm sunucu-denetle` ölçer. Yerel ortamın kutularının gerçek kuralını `pnpm yerel-ortam-testi` ölçer.

## Neden

- Sunucu gereken bir güvenlik güncellemesinde gece 04:00'te yeniden başlar (0030). Kural olmadan bütün siteler biri elle açana kadar kapalı kalırdı. Ölçüldü: kural gelmeden önce ön kapının iki kutusunda kural yoktu (`no`).
- `unless-stopped`, bakım için bilerek durdurulan kutuyu açılışta geri getirmez. Bakımdaki bir kutunun gece kendiliğinden açılması yarım bir işi canlıya çıkarabilirdi.
- Tek tanım, yeni bir kutu türü eklenirken kuralın unutulmasını önler. Dosya taraması, kuralı tek tanımdan okumayan yeni bir dosyayı da yakalar.

## Düşünülen diğer yollar

- `always`: Seçilmedi. Elle durdurulan kutuyu da Docker yeniden başlayınca açar. Bakım sırasında istenmeyen açılışa yol açar.
- `on-failure`: Seçilmedi. Yalnız kutu hatayla kapanınca yeniden açar. Docker ya da sunucu yeniden başlayınca kutuyu açmaz, asıl sorunu çözmez.
- Kutuları açan ayrı bir sistem servisi (systemd): Seçilmedi. Docker bunu kendisi yapar. İkinci bir araç, sunucu kurulumuna bir dosya ve bir bakım yükü daha ekler.
- Kuralı yalnız ayar dosyalarına yazıp denetlememek: Seçilmedi. Bir dosyada unutulan kural ilk gece yeniden başlatmasına kadar fark edilmezdi.

## Sonuçları

- Docker yeniden başlayınca kutuların birbirini bekleme kuralı (`depends_on`) işlemez, kutular aynı anda açılır. Ölçüldü: yalıtılmış bir Docker'da yerel ortam iki siteyle yeniden başlatıldı, dört kutu aynı anda açıldı, iki site de sağlık ucunda veritabanını ayakta gösterdi. Sunucu yeniden başlatıldı, ön kapının iki kutusu açılıştan yaklaşık 10 saniye sonra çalışıyordu, tam denetim yeşildi. Site kutusu veritabanından önce açılırsa sağlık ucu kısa bir süre veritabanını kapalı gösterebilir. Veritabanı açıldıktan sonra bu durum kendiliğinden düzelmelidir. Veritabanının siteden sonra açıldığı sıra ayrıca ölçülmedi, iki denemede de kutular aynı anda açıldı.
- Bozuk bir ayarla açılamayan kutu, Docker tarafından giderek uzayan aralıklarla yeniden açılmaya çalışılır. Kutu hiç durmadan yeniden başlar. Bunu sağlık kontrolü ve hata izleme göstermelidir (kart 0021, 0022).
- Sunucuda bugün yalnız ön kapının iki kutusu çalışır. Sunucudaki veritabanı ve site kutuları henüz yok; onları kuran komut (kart 0021, 0023) kutuyu `kaliciKutu` ile kurar ve dosyasını testin kalıcı listesine ekler.
- Tarama metin kalıplarıyla yapılır. Kalıplara uymayan bir yazım (örneğin `docker compose -f <dosya> run`) yakalanmaz. Listede zaten olan bir dosyaya eklenen yeni bir kutu da yakalanmaz, onu o dosyanın kendi tanım testi denetler.
