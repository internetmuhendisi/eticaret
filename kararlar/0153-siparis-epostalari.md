# 0153 · Müşteriye giden sipariş e-postaları

## Tarih

2026-11-20

## Karar

Müşteri siparişinin her önemli adımında e-posta alır (kart 0240): sipariş alındı (havalede banka hesapları, tutar, son ödeme anı ve açıklamaya yazılacak numara; kapıda ödemede seçenek), havale onaylandı, kargoya verildi (firma, takip numarası ve bağlantısı), teslim edildi (iade talebinin son günüyle), iptal (süre doldu, müşterinin isteği, mağaza), tam iade, kısmi iade (iade edilen ürünler, tutar ve vergisi), müşteriye not, iade talebi alındı, onaylandı ve reddedildi.

- Hangi geçmiş nedeninin hangi e-postayı gönderdiği tek kayıttadır (`siparisGecmisiEpostalari`, `cekirdek/kayitlar/siparis.ts`). `gecmiseYaz` e-postayı geçmiş satırıyla aynı işlemde yazar; olayın anahtarı geçmiş satırının (müşteriye notta notun) kimliğidir. Aynı anahtarla ikinci e-posta kaydı yazılmaz (tekil indeks), kuyruğa da ikinci iş girmez.
- E-postanın verisi olay anında siparişin saklanan değerlerinden yazılır (tutarlar, oran oran vergi, kalemler, teslimat, kargo, iade); gönderimde yalnız sitenin dili ve biçimiyle çizilir. Veri gönderilince silinir.
- Ortak şablon bloklardan kurulur (paragraf, kutu, tablo, düğme, bilgi) ve sitenin açık temasının renkleri, yazı tipleri, yazı boyları ve köşeleriyle çizilir; hesap ve şifre e-postaları da aynı görünüşü alır. Stil satır içidir; telefonda dış çerçeve kalkar.
- Üye olmayan müşterinin e-postasındaki bağlantı takip sayfasını yalnız sipariş numarasıyla açar; e-posta adresi bağlantıya yazılmaz, müşteri kendisi yazar (kullanıcı kararı).
- Elle siparişte "Müşteriye sipariş e-postası gönder" kutusu varsayılan işaretlidir (kullanıcı kararı). Seçim yalnız "Siparişiniz alındı" e-postasını belirler; sonraki olayların e-postası gider.
- Sipariş alındı sayfası "Sipariş bilgilerini <e-posta> adresine gönderdik." cümlesini yalnız e-posta gerçekten gidebiliyorsa söyler (gönderici bağlı ve sitenin gönderen adresi var, `epostaGidebilirMi`). Bugün sunucuda gönderici yoktur (kart 0060): orada eski cümle kalır.
- E-posta siparişin değişikliğini düşürmez: kişisel bilgisi silinmiş siparişe yazılmaz; adres e-posta şemasından geçmezse yazılmaz, hata kaydedilir.

## Neden

- Tek kayıt, bir olayın e-postasının unutulmasını ya da iki yerde yazılmasını önler; yeni bir olay e-posta gönderecekse kayda bir satır yeter, tür kontrolü eksik nedeni yakalar.
- Geçmiş satırı olayın kalıcı ve tekil kaydıdır: anahtarı ondan almak "bir olay bir e-posta"yı ek tablo olmadan sağlar. Aynı işlemde yazmak, geri alınan değişikliğin e-postasını da geri alır.
- Veriyi olay anında yazmak e-postanın o anki durumu anlatmasını sağlar: sonradan yapılan bir düzeltme (kargo düzeltmesi, ayar değişikliği) kuyrukta bekleyen e-postayı değiştirmez. Biçimin gönderimde yapılması, iptal taraması gibi sitesiz çalışan yolların da aynı işlevi kullanmasını sağlar.
- E-posta adresi bağlantıya girerse tarayıcı geçmişine ve sunucu günlüklerine düşer; takip zaten numara ve e-postayla açılır.
- E-posta gitmeyen sitede "e-postanıza gönderdik" demek yanlış olurdu (karar 0150).

## Düşünülen diğer yollar

- **E-postayı her serviste olayın yanında elle yazmak:** Daha az soyutlama, ama yeni bir olay ya da yol (müşterinin iptali, kartla iadenin tamamlanması) eklendiğinde unutulabilirdi. Seçilmedi.
- **İçeriği gönderimde siparişten okumak:** Kayıtta kişisel veri tutulmazdı, ama kuyrukta beklerken siparişte yapılan değişiklik eski olayın e-postasını değiştirirdi. Seçilmedi.
- **Ayrı bir "gönderilen sipariş e-postaları" tablosu:** Tekillik oradan sağlanabilirdi; geçmiş satırının kimliği aynı işi tablo eklemeden gördüğü için gereksiz.
- **Takip bağlantısına e-postayı da koymak (taslaktaki gibi):** Müşteri bir alan az yazardı. Kullanıcı seçmedi.
- **Elle siparişte varsayılan kapalı:** Müşteri, mağazanın girdiği siparişin bilgisini almazdı. Kullanıcı seçmedi.

## Sonuçları

- `eposta_kayitlari`'na `veri` ve `olay_anahtari` alanları ve tekil indeks eklendi (değişiklik 0048). Bekleyen e-postanın verisinde teslimat adresi kısa süre durur, gönderilince silinir.
- Gönderim sitenin temasını ve sipariş e-postasında mağaza ayarlarını (satıcının unvanı, mağaza adresi, telefon) okur; okunamazsa e-posta düşmez, ortak değerlerle ya da alt bilgisiz gider ve hata kaydedilir. Tema servisi arka plan sürecinde döngüsel yüklenmesin diye işlevin içinde yüklenir.
- Taslaktan bilerek ayrılan yerler: iade talebinin onayındaki kargo kodu ("İADE-48210") ve teslim e-postasındaki "Ürünlere yorum yaz" düğmesi verisi olmadığı için yok; talep alındı e-postası tutar söylemez (talep tutar belirlemez, karar 0151) ve "2 iş günü" söz vermez; alındı e-postası ödeme yöntemini de yazar.
- Metinler taslaktadır; gerçek metin ve yasal cümleler kart 0063'te, panelden düzenleme on dördüncü bölümde, gerçek gönderim kart 0060'tadır. Yönetici bildirimleri kart 0241'dedir.
- Kart 0095 bu kartla kapandı: iptal sinyali posta kitaplığı yüklenirken gelirse gönderim hiç başlamaz, başlamış gönderimin bağlantısı kapanır ve hatası yutulur.
