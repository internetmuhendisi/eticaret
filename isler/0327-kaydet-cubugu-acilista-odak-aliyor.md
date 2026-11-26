# 0327 · Kaydet çubuğu açılışta odağı alıyor

## Amaç

Panelin sayfadaki ayar formlarında (`KaydetCubugu` ile `durumYazisi` ve `degisiklikGerekli`: kargo, ödeme yöntemleri, vergi ve öteki ayar sayfaları) sayfa açılınca odak "Değişiklik yok" yazısına geçiyor ve odak çerçevesi görünüyor. Çubuk, kayıttan sonra kapanan Kaydet'teki odak kaybolmasın diye odağı durum yazısına verir (kart 0259); açılışta odak gövdede olduğu için bu kural açılışta da çalışıyor. Klavye kullanıcısının ilk Tab'ı sayfanın başından değil çubuktan başlıyor. Kart 0322'nin ekran görüntüsünde görüldü (vergi ekranı), ölçülmedi.

## Olmazsa olmazlar

- Açılışta odak yerinde kalır; yalnız kayıttan sonra kapanan Kaydet'teki odak durum yazısına geçer.
- Aynı kuralın başka yerlerde (yan pencere çubukları) olup olmadığına bakılır.
- Tarayıcıda bir ayar sayfası açılınca odağın gövdede olduğu ölçülür; eski hâlde kırmızı.

## Sınırlar

- Kaydet çubuğunun öteki davranışları değişmez.

## Bitti sayılır

- Açılışta odağın durum yazısına geçmediği jsdom ve tarayıcı testinde ölçüldü, düzeltme geri alınınca kırmızı.
- Kayıttan sonra odağın durum yazısına geçtiği var olan testler yeşil.

## Durum

yapılacak
