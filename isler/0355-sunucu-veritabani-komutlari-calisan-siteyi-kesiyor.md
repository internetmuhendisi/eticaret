# 0355 · Sunucu veritabanı komutları çalışan siteyi kesiyor ve sormadan güncelliyor

## Amaç

Kart 0058'in bağımsız kontrolünde bulundu (2026-11-28, kod okunarak; ölçülmedi):

- `siteVeritabaniniHazirla` (`komutlar/sunucu-veritabani.mts`) her çağrıda `veritabaniKutusunuKur`'u çalıştırır. Yeni bir sitenin ağı eklenince kutunun tanımı değişir, kutu yeniden kurulur. `pnpm sunucu-veritabani-denemesi` bir çalışmada kutuyu iki üç kez yeniden kurar (iki geçici site ve temizlik). Yayındaki Örnek Mağaza o saniyelerde veritabanına bağlanamaz. Deneme yayın kilidini almaz: aynı anda bir yayın değişiklik uygularken kutu yeniden kurulabilir.
- `pnpm sunucu-veritabani <site> deneme` kimlikteki sürümün değişikliklerini yayındaki siteye sormadan uygular: kart 0058'in denemede kapattığı durum bu komutta duruyor. `sifreyiEsitle`'nin hata metni bu komutu önerir.
- `yedek-denemesi.mts` ve `sunucu-veritabani-ac.mts` görüntüyü sunucuya sürümün etiketiyle (`altyapi-cekirdek:<sürüm>`) gönderir; bilgisayardaki aynı adlı başka görüntü sunucudaki etiketi kaydırır. Çalışan kutular görüntü kimliğiyle çalıştığı için siteyi bozmaz, `yayin-denemesi` bu etikete bakar.
- Kart 0058'den sonra da deneme, görüntü yayındakiyle aynı çekirdekken Örnek Mağaza için `siteAcmaBetigi`'ni çalıştırır: izinler bilgisayardaki `komutlar/site-veritabani-ac.sql` ile yeniden yazılır. Bu dosya çekirdeğin parmak izinde değildir (karar 0205).

Bölüm: Yeni mağaza. Birden çok siteli sunucuda bu komutlar her siteyi etkiler.

## Olmazsa olmazlar

- Deneme ve komutlar yayındaki siteyi kesintiye uğratıyorsa bunu önler ya da önceden söyler; kesinti ölçülür.
- `pnpm sunucu-veritabani` yayındaki siteye yayındaki çekirdekten başka bir görüntünün değişikliğini sormadan uygulamaz (kart 0058'in kuralı, `yayindakiCekirdekMi`).
- Görüntü gönderen komutlar sunucudaki sürüm etiketini kaydırmaz.
- Her davranış bilerek bozularak denenir.

## Sınırlar

- Yayın komutunun kendi akışı değişmez.

## Bitti sayılır

- Denemenin çalışan siteye kesinti verip vermediği ölçüldü; varsa giderildi ya da kayda yazıldı.
- `pnpm sunucu-veritabani`'nın kuralı testte kırmızıya düşen bozuk örnekle denetleniyor.

## Durum

yapılacak
