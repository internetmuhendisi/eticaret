# 0136 · Sepet sayfası boş hâli çerezdeki kalem sayısıyla hemen gösterir

## Tarih

2026-11-17

## Karar

Tarayıcıdaki sepet, depoya her yazımda ve vitrinin her sayfasında durum kurulunca sepetteki kalem sayısını küçük bir çereze de yazar (`sepet-sayisi`, yalnız `/sepet` yoluna gider, 400 gün sürer, sepet boşalınca silinir). Çerez yalnız sayı taşır; birim, adet ya da fiyat taşımaz. Okuma ve yazma yalnız sepetin deposundadır (`cekirdek/vitrin/sepet/depo.ts`). Sepet sayfası çerezde kalem görmezse "Sepetiniz boş" ekranını sunucuda hemen çizer; görürse iskeleti çizer, tutarlar yine yalnız sunucunun hesabından gelir. Sepet yine yalnız tarayıcının deposundadır (karar 0135). Kart 0218, kullanıcı onayıyla.

## Neden

Sunucu sepeti bilmediği için sayfa iskeletle çiziliyor, boş hâl ancak sayfanın kodu tarayıcıda çalışınca geliyordu. Yavaş telefon koşulunda boş sepet sayfasının ana içeriği 4400 ms'de geliyordu (yerelde, hattın koşuluyla ölçüldü; hatta 4452 ms); hedef 2500 ms'dir (karar 0124).

Favorilerdeki çözümün (karar 0125) aksine kimse yanlış ekran görmez: sepet zaten bu tarayıcıdadır, çerez onunla aynı yerde yazılır.

## Düşünülen diğer yollar

- **İskelet kalsın, sayfa bilinen aşım listesine girsin:** Liste yalnız küçülür (karar 0124); boş sepet müşterinin en sık göreceği hâllerden biridir.
- **Çerezde sepetin kendisi (birimler ve adetler):** Sunucu satırları da hemen çizebilirdi, ama çerez her istekte o yola büyük veri taşır ve sepetin saklandığı yer ikiye bölünürdü (karar 0135). Kartın sınırı da saklama yerinin değişmemesiydi.
- **Oturum çerezi (tarayıcı kapanınca silinir):** Dolu sepetle ertesi gün doğrudan sepet sayfasına gelen müşteri bir an boş ekran görürdü.

## Sonuçları

- Çerez silinip depo kalırsa (ya da bu değişiklikten önce dolmuş sepetle doğrudan sepet sayfasına gelinirse) müşteri bir an boş hâli görür, sonra iskelete ve satırlara geçilir. Vitrinin herhangi bir sayfası açılınca çerez yeniden eşitlenir.
- Sepet sayfası çerez okuduğu için her istekte sunucuda çizilir (zaten öyleydi).
- Ödeme sayfası (kart 0213) aynı bilgiye gerek duyarsa çerezin yolu genişletilir; bugün yalnız sepet sayfasına gider.
