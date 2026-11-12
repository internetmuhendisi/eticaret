# 0063 · Üyelik sözleşmesi ve KVKK aydınlatma metinlerinin gerçeği

## Amaç

Kart 0033 kayıt kutularını taslak olduğunu söyleyen yer tutucu sayfalara bağladı (karar 0051). İlk gerçek mağazadan önce gerçek metinler gelmeli.

## Olmazsa olmazlar

- Metinlerin nereden geldiği ve mağaza bilgileriyle nasıl dolduğu `planlar/komutlar.md` ile uyumlu kurulur (temel paket: Yasal).
- Üyelik sözleşmesi temel paketin şablon listesinde geçmiyor; listeye eklenip eklenmeyeceği kullanıcıya sorulur.
- Metin değişince `cekirdek/kayitlar/musteri-onaylari.ts` içindeki sürüm artar.
- Hukukçuya sorulur: KVKK aydınlatmasının zorunlu onay kutusuyla alınması doğru mu, onay kaydında bağlantı adresi gerekir mi, onay satırları ne kadar saklanır.
- Yer tutucu metinle gerçek mağazanın açılmasını engelleyen bir kontrol kurulur.
- Kart 0087'den not: ürün galerisindeki video müşteriyi video sitesine bağlar (YouTube, Vimeo; sitede hangilerinin açık olduğu `videoSiteleri` ayarı, karar 0073). KVKK aydınlatmasında ve çerez politikasında bu siteler anılır; hukukçuya oynatıcının çerez onayından önce yüklenip yüklenemeyeceği sorulur.
- Kart 0140'tan not: vitrin üye olmayan müşterinin favorilerini tarayıcı deposunda (`localStorage`, anahtar `favoriler`) ve favoriler sayfası için yalnız `/favoriler` yoluna giden, tarayıcı kapanınca silinen bir çerezde (`favoriler`) tutar; ikisi de yalnız ürün kimliklerini taşır (karar 0110). Hukukçuya bunların zorunlu (işlevsel) sayılıp onaysız kullanılıp kullanılamayacağı sorulur; çerez politikasında ve aydınlatma metninde anılır.

## Sınırlar

- Hukuki metni Claude yazmaz; şablon hukukçu kontrolünden geçer.

## Bitti sayılır

- Kayıt kutuları gerçek metne bağlı, verilen onay doğru metin sürümüyle kaydediliyor.
- Yer tutucu metinli gerçek mağaza kontrolde kırmızı oluyor.

## Durum

yapılacak
