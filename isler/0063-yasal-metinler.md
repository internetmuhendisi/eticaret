# 0063 · Üyelik sözleşmesi ve KVKK aydınlatma metinlerinin gerçeği

## Amaç

Kart 0033 kayıt kutularını taslak olduğunu söyleyen yer tutucu sayfalara bağladı (karar 0051). İlk gerçek mağazadan önce gerçek metinler gelmeli.

## Olmazsa olmazlar

- Metinlerin nereden geldiği ve mağaza bilgileriyle nasıl dolduğu `planlar/komutlar.md` ile uyumlu kurulur (temel paket: Yasal).
- Üyelik sözleşmesi temel paketin şablon listesinde geçmiyor; listeye eklenip eklenmeyeceği kullanıcıya sorulur.
- Metin değişince `cekirdek/kayitlar/musteri-onaylari.ts` içindeki sürüm artar.
- Hukukçuya sorulur: KVKK aydınlatmasının zorunlu onay kutusuyla alınması doğru mu, onay kaydında bağlantı adresi gerekir mi, onay satırları ne kadar saklanır.
- Yer tutucu metinle gerçek mağazanın açılmasını engelleyen bir kontrol kurulur.
- Kart 0091'den not (kullanıcı kararı, karar 0138): satıcı bilgileri (`saticiBilgileri`: işletme türü, unvan, vergi dairesi, vergi numarası ya da şahısta kimlik numarası, MERSİS ve ticaret sicil numarası, KEP adresi) ayarda isteğe bağlıdır. Hukukçuya hangilerinin mesafeli satış sözleşmesinde, ön bilgilendirme formunda ve sitenin kendisinde (elektronik ticaret mevzuatının hizmet sağlayıcı bilgileri) zorunlu olduğu sorulur; zorunlu olanlar için "gerçek mağaza açılmadan dolu" kontrolü yer tutucu metin kontrolüyle birlikte kurulur.
- Kart 0087'den not: ürün galerisindeki video müşteriyi video sitesine bağlar (YouTube, Vimeo; sitede hangilerinin açık olduğu `videoSiteleri` ayarı, karar 0073). KVKK aydınlatmasında ve çerez politikasında bu siteler anılır; hukukçuya oynatıcının çerez onayından önce yüklenip yüklenemeyeceği sorulur.
- Kart 0211'den not: ödeme adımının taslağında (karar 0132) "Siparişi onayla" düğmesinin altında "Siparişi onaylayınca ödeme yükümlülüğü doğar." cümlesi, ön bilgilendirme ve mesafeli satış onay kutuları ve "Kişisel verileriniz KVKK aydınlatma metnine göre işlenir." satırı var. Hukukçuya düğme metninin ve bu cümlenin mevzuata uygun olup olmadığı, ön bilgilendirme formunun onay kutusuyla mı yoksa yalnız gösterilerek mi alınacağı sorulur.
- Kart 0140'tan not: vitrin üye olmayan müşterinin favorilerini tarayıcı deposunda (`localStorage`, anahtar `favoriler`) ve favoriler sayfası için yalnız `/favoriler` yoluna giden, tarayıcı kapanınca silinen bir çerezde (`favoriler`) tutar; ikisi de yalnız ürün kimliklerini taşır (karar 0110). Hukukçuya bunların zorunlu (işlevsel) sayılıp onaysız kullanılıp kullanılamayacağı sorulur; çerez politikasında ve aydınlatma metninde anılır.
- Kart 0233'ten not (karar 0145): siparişteki kişisel bilgilerin (ad, adres, telefon, e-posta) saklama süresi altyapı sahibinin ayarıdır, taslakta 10 yıl. Hukukçuya sürenin uzunluğu, silmenin hangi alanları kapsayacağı ve tutarlarla vergi dökümünün kalmasının yeterli olup olmadığı sorulur. Ayrıca iade talebi süresinin (öneri 14 gün, teslimden sonra) cayma süresiyle ilişkisi ve üye olmayanın sipariş takibinde kısaltılmış adres gösterilmesi sorulur.

## Sınırlar

- Hukuki metni Claude yazmaz; şablon hukukçu kontrolünden geçer.

## Bitti sayılır

- Kayıt kutuları gerçek metne bağlı, verilen onay doğru metin sürümüyle kaydediliyor.
- Yer tutucu metinli gerçek mağaza kontrolde kırmızı oluyor.

## Durum

yapılacak
