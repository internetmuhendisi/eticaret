# 0198 · Panelin içindeki bildirimler

## Tarih

2026-11-27

## Karar

Yönetici bildirimleri (karar 0154) e-postanın yanında panelin içinde de görünür (kart 0280): üst şeritte zil, okunmamış sayısı, en yeni 20 bildirimin listesi, okundu işareti ve ilgili ekrana bağlantı.

- Panel bildirimi her zaman açıktır, e-postanın açık-kapalı ayarı ve alıcı adresleri onu etkilemez (karar 0185'in onaylı taslağı; kart bu soruyu kullanıcıya sordurmak istiyordu, taslak kararı cevapladığı için yeniden sorulmadı).
- Alıcı kişidir: olay anında, olayla aynı işlemde, o olayın iznine sahip her silinmemiş yöneticiye bir satır yazılır (`panel_bildirimleri`, değişiklik 0070). İzinler kayıttadır (`yoneticiBildirimTanimlari`'nın `izin`'i): sipariş olayları `siparis.gor`, stok `stok.gor`, yorum `yorum.gor`; kartla ödemenin uyuşmazlığı ve kuruluşta takılan iade `siparis.iade` (kullanıcı kararı: yalnız mağaza sahibi, para işidir).
- Okurken ve okundu yaparken izin yeniden sorulur: rolü alınan yönetici o bildirimleri görmez, satır yerinde kalır.
- Satır kişisel veri taşımaz: olayın türü, ilgili kaydın kimliği (sipariş, yorum, birim) ve kişisel olmayan özet (tutar, adet, neden, miktar). Başlık, alt yazı ve adres okunurken kayıttan sunucuda kurulur; müşterinin adı kısaltılır, kişisel bilgisi silinmiş siparişte yoktur.
- Stok uyarısı e-postada saatte bir toplanır; panelde her uyarı hemen ayrı bildirimdir (taslaktaki gibi).
- Okunan bildirim okunduğu andan altyapı sahibinin `panelBildirimiSaklamaGun` ayarı kadar (varsayılan 30 gün) sonra günlük işle silinir; okunmamış silinmez.
- Uçlar `panel-bildirimleri`, `panel-bildirim-sayisi`, `panel-bildirimi-okundu`; izin beyanı yöneticinin kendi hesabıdır (`ekip.kendi-hesabi.gor`, `.degistir`; bütün rollerde vardır). Zil sayıyı sayfa değişince sorar; anlık itme yoktur (kartın sınırı).

## Neden

- Sunucuda gerçek e-posta gönderimi yokken (kart 0060) mağaza sahibi bildirimlerin hiçbirini görmüyordu; panel bildirimi gönderime bağlı değildir.
- Satırı olay anında kişiye yazmak, sayıyı ve okundu işaretini kişi başına tek indeksli sorguyla verir; okurken izni yeniden sormak, rolü değişen yöneticinin artık göremeyeceği olayı göstermez.
- Metni okurken kurmak kişisel bilgiyi ikinci bir tabloya kopyalamaz: siparişin saklama süresi dolunca bildirimde de görünmez, ayrı temizlik gerekmez.
- Kartla ödemenin iki bildirimi parayla ilgilidir, görevlinin yapabileceği bir şey yoktur.

## Düşünülen diğer yollar

- **Bildirimi olay başına bir satır yazıp okundu işaretini kişi başına ayrı tabloda tutmak:** Yeni gelen yönetici eski bildirimleri de görürdü, ama sayım iki tabloyu birleştirmek ve izinleri sorguda çözmek isterdi; saklama süresi hem olaya hem kişiye bağlanırdı. Seçilmedi.
- **Metni olay anında yazmak (e-postanın verisi gibi):** Okuma tek sorgu olurdu, ama müşterinin adı panel tablosuna kopyalanırdı ve kişisel veri temizliğinin ikinci bir yeri olurdu. Seçilmedi.
- **Her olayın e-postası ve panel bildirimi için iki ayrı anahtar, ya da tek anahtar:** Karar 0185'te seçilmedi; panel bildirimi kimseyi rahatsız etmez, kapatılırsa iş gözden kaçar.
- **Kartla ödeme bildirimlerini siparişleri gören herkese göstermek:** Kullanıcı seçmedi.
- **Sayıyı belirli aralıkla yoklamak:** Açık panelde sayı kendiliğinden güncellenirdi, ama her açık sekme dakikada bir istek gönderirdi. Sayfa değişince sormak yeterli bulundu.

## Sonuçları

- Bir olayın bildirimi yazılırken o iznin yöneticileri bulunur (`izniOlanYoneticiler`); olay işlemi bunun için bir sorgu daha yapar. Rol sonradan verilen yönetici eski bildirimleri görmez.
- `yoneticiBildirimiYaz` artık ilgili kaydı da ister (`kayit`); kuyruğa giren iş ve panel satırları bir iç işlemde birlikte yazılır.
- Stok uyarısının birim bilgisi (ad, seçim, stok kodu) e-posta ve panel için tek işlevdedir (`birimBilgileri`).
- Göreli zaman ("5 dk. önce", "dün") biçimleyicide ayrı ve yalnız sunucunun kullandığı bir işlevdir (`goreliZaman`): site biçimleyicisinin içine konmadı, çünkü panelin tarayıcıdaki kodu o işlevi kullanır ve derleyici modülü vitrine de birlikte götürürdü (karar 0172).
- Tasarım değerlerine ilk yükseklik sınırı eklendi (`max-h-acilir-liste`, 26rem): açılır paneldeki uzun liste kendi kutusunda kayar.
- Satıra basınca önce okundu isteği gider, sonra ekran açılır; Ctrl ya da orta tuşla yeni sekmede açılan bildirim okundu yapılmaz.
- Panel bildiriminin metni düzenlenmez (karar 0185); hatalı arka plan işlerinin bildirimi kart 0059'dadır.
