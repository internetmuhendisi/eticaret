---
paths:
  - "cekirdek/yonetim-paneli/**"
  - "cekirdek/uygulama/app/yonetim/**"
  - "sahip-paneli/**"
---

# Yönetim paneli düzeni

- Her panel sayfasını aynı iskeletle kur: üstte komut çubuğu, altında içerik.
- Liste, tablo, pano ve rapor ekranlarını tam genişlikte aç.
- Form, ayar ve detay pencerelerini küçük, orta ya da geniş standart genişliklerden birinde aç.
- Komut çubuğuna "Yeni ürün", "Dışa aktar", "Ayarlar" gibi eylemleri koy. Arama ve filtre altındaki şeritte durur.
- Komut çubuğunda dolu renkli tek düğme olsun, o da sayfanın asıl eylemi.
- Aynı eylem her sayfada aynı ikon, aynı ad ve aynı yerde dursun. Eylem tanımlarını tek dosyadan oku.
- Yan menüyü, sayfa yolunu ve sayfa başlıklarını tek sayfa ağacından üret.
- Ayar ve rapor alt sayfalarında ana sayfanın komut çubuğunu kullan, yalnız seçili öğe değişsin.
- Kullanıcının yetkisi olmayan düğme, menü ya da bağlantıyı hiç gösterme. Yetki bilgisini sunucudan oku, ikinci bir liste yazma.
- Panelin ana ekranında günün satışını, bekleyen siparişleri ve uyarıları tek bakışta göster.
- Her ayar penceresinin başına ne işe yaradığını söyleyen bir iki cümlelik açıklama koy.
- Bir düğmeyi yalnız fare üzerine gelince görünür yapma.

## Panelin kapısı (karar 0042)

- Girişsiz panel adresi `cekirdek/uygulama/proxy.ts` ile giriş sayfasına yönlenir, `(panel)` düzeni anahtarı değiştirmeden ikinci kez sorar. Yeni panel sayfası `app/yonetim/(panel)/` altına yazılır; yalnız giriş sayfası dışarıda durur.
- Sayfa çizerken `istektenOturumAl` çağrılmaz; oturum anahtarı değiştirmeden okunur: `oturumAcikMi`, yöneticinin kendisi gerekiyorsa `panelOturumu` (`oturumunHesabi`, kart 0141). Bu ve yukarıdaki yer kuralını `cekirdek/kapi/testler/panel-katmanlari.test.ts` denetler (adres dosyaları ve `cekirdek/yonetim-paneli/`).
- Girişten sonraki dönüş adresi yalnız `guvenliDonus` ile kullanılır (`cekirdek/yonetim-paneli/adresler.ts`).

## Çerçeve ve sayfa ağacı (karar 0111)

- Panelin sayfaları `cekirdek/yonetim-paneli/sayfa-agaci.ts` dosyasındadır. Yeni ekran önce ağaca yazılır, sonra `app/yonetim/(panel)/` altına; sayfa `<PanelSayfasi kod="...">` ile çizilir. Ağaç ile sayfa dosyalarının aynı olmasını `cekirdek/yonetim-paneli/testler/sayfa-agaci.test.ts` denetler.
- Menüdeki ve sayfadaki izin ağaçtaki `izin` alanından okunur, yöneticinin izinleri `panelOturumu` ile istek başına bir kez gelir. İzni olmayan sayfa bulunamadı verir (`panelSayfasiniAc`).
- Komut çubuğunun eylemleri `EylemDugmesi` ve `EylemBaglantisi` ile, kodu `cekirdek/yonetim-paneli/eylemler.ts` kaydında yazılır. Asıl eylem `asil` alır.
- Elle sıralanan küçük listeler `SiralanabilirListe` ile, metinleri `siralamaMetinleri` ile yazılır.
