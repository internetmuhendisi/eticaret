# 0150 · Siparişlerim ve üye olmayanın sipariş takibi

## Tarih

2026-11-20

## Karar

Müşteri siparişini iki yoldan görür (kart 0238; taslak `planlar/tasarim-yonu/siparis-ve-hesap.html`, karar 0145):

- **Siparişlerim** (`/hesabim/siparislerim`): hesabın siparişleri en yeni önce, 10'ar sayfa. Hesap girişten sonra bu sayfayla açılır (`hesapIlkSayfasi`). Ayrıntı `/hesabim/siparislerim/<numara>`'dadır; başka müşterinin numarası bulunamadıdır. Sayfalar verisini sunucuda okur, ayrı müşteri ucu yoktur.
- **Sipariş takibi** (`/siparis-takibi`): üye olmayan müşteri sipariş numarası ve siparişteki e-postayla siparişini bulur. Uç robot korumalı ve sıkı sınırlıdır (`POST /kapi/herkese-acik/siparis-takibi`). Eşleşmezse siparişin var olup olmadığı belli olmaz. Eşleşince tarayıcıya 30 dakikalık takip anahtarı verilir (çerez yalnız takip sayfasının yolunda, veritabanında `siparis_takip_erisimleri` tablosunda yalnız özeti); süre dolunca sayfa yeniden numara ve e-posta ister. "Başka bir sipariş sorgula" takibi kapatır: anahtarın satırı ve çerez silinir (`DELETE /kapi/herkese-acik/siparis-takibi`), ortak bilgisayarda arkadan gelen kişi siparişi görmez.

İki yol aynı ayrıntı görünüşünü çizer (`SiparisAyrintisi`). Veri yalnız `musteriSiparisleri` (`cekirdek/moduller/siparis/musteri.ts`) ile gelir: tutar ve vergi siparişin saklanan değerleridir, yeniden hesaplanmaz. Müşteriye iç not, iadenin nedeni ve açıklaması, başarısız iade, yazanlar ve ödeme kuruluşunun kimlikleri gitmez. Takipte teslimatın adı, soyadı ve telefonu kısaltılır (her sözcüğün baş harfi, telefonun son iki rakamı), açık adres, posta kodu, fatura ve e-posta görünmez (karar 0145). Takipte sipariş geçmişi ve mağazanın müşteriye notları da yoktur: taslağın takip sonucunda geçmiş yoktur, nota kişisel bilgi yazılmış olabilir. Kargo firması, takip numarası ve takip bağlantısı taslaktaki gibi görünür.

Kullanıcının kararı:

| Soru | Karar |
|---|---|
| Üye olmadan verilmiş sipariş, aynı e-postayla hesap açılınca Siparişlerim'de görünsün mü | Görünmesin. Siparişlerim'de yalnız hesapla verilen siparişler olur; eski siparişler numara ve e-postayla takipten görülür. |

Sipariş alındı sayfasına üyede "Siparişimi görüntüle" (hesaptaki ayrıntı), üye olmayanda "Siparişimi takip et" (takip sayfası, numara adreste) ve takip bilgisi eklendi. Taslaktaki "Sipariş bilgilerini <e-posta> adresine gönderdik" cümlesi eklenmedi: sipariş e-postası bugün gitmiyor, cümle kart 0240 ile gelir.

## Neden

- Kayıtta e-posta doğrulanmıyor (kart 0062). Aynı e-postalı eski siparişleri hesaba bağlamak, başkasının e-postasıyla hesap açana o kişinin adresini ve siparişlerini gösterirdi.
- Numara ve e-posta takip için yeterli bir sırdır ama ele geçirilebilir; bu yüzden takipte adres kısaltılır, uç robot korumalı ve sıkı sınırlıdır, anahtar 30 dakikada biter.
- Anahtar veritabanında durur, çerezde numara ve e-posta durmaz: sayfa çerezle her açılışta numarayı ve e-postayı yeniden denetleseydi, sayfa isteği uçtaki sınırı ve robot korumasını atlayan bir deneme yolu olurdu.
- Hesap sayfaları verisini sunucuda okur (karar 0149); ayrı bir müşteri ucu, aynı veriyi ikinci bir kapıdan açardı.

## Düşünülen diğer yollar

- Takip sonucunu çerezsiz, formun yanıtıyla tarayıcıda çizmek: sayfa yenilenince sipariş kaybolurdu ve ayrıntının görünüşü tarayıcı koduna da girerdi (hız ölçümünün kod sınırı).
- Çerezde imzalı numara: imza anahtarı gerekir, süresi dolmadan geri çekilemez; tablo zaten erişim çerezinde kullanılan kalıptır (karar 0141).
- Sayfanın e-postayı adreste doldurması (taslak): e-posta adrese ve sunucu günlüklerine düşerdi; yalnız numara doldurulur.

## Sonuçları

- Üye olmadan sipariş verip sonra üye olan müşteri eski siparişini hesabında görmez; Siparişlerim bunu söyler ve takip sayfasına bağlanır. Kart 0062 (e-posta doğrulaması) gelince bağlama yeniden düşünülebilir.
- Takip anahtarlarının süresi dolan satırları yeni takip açılırken silinir; ayrı temizlik işi yoktur. Kişisel bilgileri silinen siparişin açık anahtarları da silinir.
- Kargo firmasının takip sayfası alıcının adını gösteriyorsa, numara ve e-postayı bilen kişi onu görebilir; bu, firmanın sayfasının sınırıdır.
- Siparişin kişisel bilgileri silindiyse (saklama süresi) e-posta boştur, takip eşleşmez; sipariş yalnız hesaptan görülür.
- Alt kısımdaki "Sipariş takibi" bağlantısı sitenin menü verisidir: Örnek Mağaza'nın kurulu menüsünde yoktur, mağaza sahibi panelden ekler.
