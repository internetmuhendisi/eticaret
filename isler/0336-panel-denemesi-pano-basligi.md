# 0336 · Sunucudaki panel denemesi açılış sayfasının başlığını "Karşılama" bekliyor

## Amaç

Kart 0324'ün bağımsız kontrolünde bulundu: `komutlar/panel-denemesi.mts` (satır 119, "panelin başlığı görünüyor") kurulumdan sonra açılış sayfasının başlığının `yonetim.sayfa.karsilama.ad` ("Karşılama") olmasını bekliyor. Kart 0186'dan (karar 0199) beri açılış sayfası panodur, başlığı günün selamıdır; ölçüm sunucuda kırmızı olur. Kart 0186 tarayıcı testlerini selama çevirdi (`panoBasligi`, `cekirdek/testler/uctan-uca/yonetici.ts`), komutları taramadı.

Bölüm: Yönetim paneli 2.

## Olmazsa olmazlar

- Ölçüm başlığın günün selamlarından biri olduğunu bekler; selamların listesi tek yerden gelir (tarayıcı testleriyle aynı kural).
- Komutlarda ve sunucu betiklerinde açılış sayfasının başlığını ya da "Karşılama"yı sayfanın başlığı olarak bekleyen başka ölçüm aranır.

## Sınırlar

- Panel denemesi sunucuya bağlanır; yerelde betiğin karar kuralı testle denenir, sunucuda çalıştırmak kullanıcının onayıyla.

## Bitti sayılır

- Ölçümün kuralı testte, eski beklenti geri konunca kırmızı.

## Sonuç

- Selamların listesi panonun tanımında (`panoSelamlari`, `panoBasligiMi`, `cekirdek/yonetim-paneli/pano/tanim.ts`); pano, tarayıcı testleri (`panoBasligi`) ve sunucudaki panel denemesi onu kullanır.
- Komutlarda başka eski beklenti yok: `yerel-ortam-testi.mts`'teki "Karşılama" girişsiz sayfada menünün adının görünmediğini ölçer, ad menüde kaldığı için doğrudur.
- Kural ve betiğin onu kullanması `komutlar/testler/panel-denemesi.test.ts`'te; eski beklenti, eksik selam ve her yazıyı kabul bozulunca kırmızı. Kullanıcı kararıyla düzeltilmiş deneme sunucuda ilk yayında çalışır, bu kartta çalıştırılmadı. Bağımsız kontrolün bulgusu: canlıdaki 0.80.0'da açılış sayfası henüz pano değil, düzeltilmiş deneme ancak panoyu taşıyan yayından sonra çalıştırılmalı (betik sürüme bakmaz). Tanım dosyasının Node ile doğrudan açıldığı da testte.

## Durum

bitti
