# 0148 · Panelden elle sipariş

## Tarih

2026-11-19

## Karar

Mağaza sahibi ve görevli telefonla ya da yüz yüze aldığı siparişi panelden girer (kart 0236). Elle sipariş vitrin siparişiyle aynı yoldan kurulur: `odemeServisi.elleSiparisVer` ödeme oturumunu, stok ayırmasını ve siparişi tek işlemde yazar (`oturumuAc`, `siparisiKur`). Tutar, kargo ve vergi sunucunun sepet hesabıdır (`sepetiHesapla`); ekran tutar göndermez, gördüğü toplamı yalnız karşılaştırma için gönderir.

- Ödeme: sitede açık havale ve kapıda ödeme seçenekleri, bir de "ödeme alındı" (`elden`, elden ya da mağazanın POS'uyla). "Elden" yalnız panelde ve siparişte bulunan ayrı bir yöntemdir (`paneldenOdemeYontemleri`); müşterinin ödeme adımında ve yöntem ayarlarında yoktur. Sipariş havale ve kapıda ödemede "ödeme bekleniyor", elden ödemede ödeme anıyla "hazırlanıyor" açılır. Kartla ödeme panelden alınmaz.
- Yetki: elle sipariş `siparis.yonet` ister (görevli de girer, kullanıcı kararı). "Ödeme alındı" ayrı izindir (`siparis.elden-tahsil`, görevlide yok): para işidir.
- Sözleşmeler: ön bilgilendirme formu ve mesafeli satış sözleşmesinin müşteriye iletildiği yöneticinin zorunlu beyanıdır (kullanıcı kararı). Siparişin onaylarına metin sürümüyle ve beyan eden yöneticinin kimliğiyle (`beyan`) yazılır; müşterinin kendi onayı sayılmaz. Pazarlama izni panelden verilmez.
- Üye olmayan müşteri her zaman girilebilir: "üye olmadan alışveriş" ayarı yalnız vitrini bağlar (kullanıcı kararı). Üye seçilirse e-posta hesabındandır; son siparişinin teslimat adresi önerilir.
- Kayıt: geçmişe "panelden-olusturuldu" nedeniyle ve siparişi giren yöneticiyle, değişiklik kaydına `siparis.panelden-olusturuldu` ile yazılır.
- Ekran: Siparişler'in alt sayfası "Elle sipariş". Ürün vitrin aramasının kuralıyla aranır (yalnız sayfası vitrinde açılan ürünler); teslimat, fatura ve not vitrinin ödeme adımının alanları ve şemasıyladır (alanlar `cekirdek/vitrin/odeme/alanlar.tsx`'e taşındı). Özet vitrinin sepet görünümüyle (`sepetGorunumu`).

## Neden

- Tek akış: stok "yeterliyse düş", başka ödemelerin ayırması ve son ürünün iki kez satılmaması vitrin siparişinin koruduğu kurallardır; ayrı bir yol bunları ikinci kez yazdırırdı.
- "Elden" ödemeyi havale ya da kapıda ödeme gibi kaydetmek siparişin ödemesini yanlış anlatırdı (havalenin iptal süresi işlerdi, kapıda ödeme teslimde ödeme beklerdi). Ayrı yöntem yalnız siparişte durur, vitrin değişmez.

## Düşünülen diğer yollar

- Sözleşmeleri satış türüne göre saklamak (yüz yüzede yok) ya da müşteriye e-postayla onaylatmak: kullanıcı yönetici beyanını seçti.
- "Elden" yöntemini mağaza ayarlarındaki yöntemlere eklemek: vitrinde de seçilebilir gibi görünürdü, ayar ekranı karışırdı.
- Elle siparişte fiyatı ya da kargoyu elle değiştirmek: kart sepet hesabını istiyor; indirim ve düzeltme kampanya ve on dördüncü bölümle gelir.

## Sonuçları

- Elle siparişte stok ayırması anlık oturumla yazılır ve siparişe geçer; ödeme oturumu satırı (kişisel veri) siparişle aynı saklama kuralına uyar.
- Sipariş e-postasının elle siparişte gidip gitmeyeceği kart 0240'tadır.
- Panelden sipariş sonradan düzeltilemez (on dördüncü bölüm).
