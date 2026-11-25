# 0183 · Sipariş özeti gelmeden "Siparişi onayla" basılamaz ve nedenini söyler

## Tarih

2026-11-25

## Karar

Ödeme adımında sepetin özeti ve hesap durumu tarayıcıya gelene kadar "Siparişi onayla" kapalı görünür (`aria-disabled`), klavyeyle odak alır ve altında nedenini yazar: "Sipariş özeti yükleniyor. Özet görününce siparişi onaylayabilirsiniz." Neden düğmeye bağlıdır (ekran okuyucu düğmeyle birlikte okur). Özet alınamazsa neden sepetin hata metnidir ("Sepet şu an gösterilemiyor…"). Basılırsa hiçbir şey gönderilmez, form denetlenmez. Özet gelince düğme açılır ve neden kalkar. Kullanıcı kararı (kart 0308).

## Neden

Form özet ve hesap durumu gelmeden basılan düğmeyi sessizce yok sayıyordu, düğme ise etkin görünüyordu. Hattın 45644376937 numaralı çalışmasında sunucu öteki işçinin sayfasını çizerken özet ~1,5 saniye gecikti; test özetten önce bastı, hiçbir şey olmadı. Yavaş bağlantıda müşteri de aynı şeyi yaşar: basışı hiçbir iz bırakmadan kaybolur. Basılamaz görünen ve nedenini söyleyen düğme müşteriye beklemesi gerektiğini anlatır.

## Düşünülen diğer yollar

- **Düğme "yükleniyor" gösterir, basış saklanır ve özet gelince sipariş kendiliğinden gönderilir.** Müşteri bir kez basar; ama özetteki toplamı görmeden onaylamış olur (sunucu görülen toplamı karşılaştırır, karar 0140) ve geciken gönderim müşterinin o arada yaptığı değişiklikle yarışır. Kullanıcı bu yolu seçmedi.
- **Düğmeyi `disabled` yapmak.** Klavye odağı almaz, ekran okuyucu nedenini okuyamaz; sepetteki "Ödemeye geç" düğmesi de aynı nedenle `aria-disabled` kullanır.
- **Yalnız testi beklemeli yapmak.** Testi düzeltir, müşterinin sessizce kaybolan basışını düzeltmez.

## Sonuçları

- Özet her açılışta kısa bir an kapalı düğme ve neden metniyle görünür; hızlı bağlantıda bu bir göz kırpması kadardır.
- Üye olmadan alışverişin kapalı olduğu sitede girişsiz müşteri zaten girişe yönlenir; yönlenene kadar düğme aynı nedenle kapalı görünür.
- Tarayıcı testleri ödeme düğmesine basmadan önce düğmenin açılmasını bekler (Playwright `aria-disabled` düğmeyi etkin saymaz).
