# Stoğa gelince haber ver

## Ad

Stoğa gelince haber ver (stoga-gelince-haber-ver)

## Ne işe yarar

Tükenmiş bir ürünün (ya da seçilen bedenin, rengin) sayfasında müşteri e-postasını bırakır. Ürün yeniden stoğa girince ona bir kez e-posta gider. Mağaza sahibi panelde hangi ürünü kaç kişinin beklediğini görür, hangi ürünü yeniden getirmesi gerektiğini anlar.

## Kimler için

Stok takibi yapan bütün siteler. Stok takibi kapalı üründe ürün hiç tükenmediği için form görünmez.

## Gerekenler

Temel paketteki ürün sayfası, stok (stok takibi ve artışı), e-posta gönderimi, arka plan kuyruğu, robot koruması ve müşteri hesabı. Başka eklenti gerekmez.

## Ayarlar

| Ayar | Kim değiştirir | Varsayılan | Örnek Mağaza |
|---|---|---|---|
| Eklenti açık mı (`eklentiler` listesinde) | Altyapı sahibi | Kapalı | Açık |
| Üye olmayan müşteri de isteyebilir mi (`stokBildirimiUyeOlmayan`) | Mağaza sahibi | Evet | Evet |
| Talep ne kadar saklanır (`stokBildirimiSaklamaGun`) | Mağaza sahibi | 90 gün (1–365) | 90 gün |

Üye olmayan müşteri isteyemiyorsa form yerine "Haber almak için giriş yapın" bağlantısı görünür. Giriş yapmış müşteri e-posta yazmaz, hesabının e-postasına haber gider.

## Veri

- Yeni kayıt: stok bildirimi talebi. Satılabilir birim (basit ürünün birimi ya da birleşim), e-posta, durum (bekliyor, gönderildi), oluşturma ve gönderilme zamanı.
- Aynı e-posta aynı birime, bekleyen talep olarak bir kez yazılır. Bildirim gittikten sonra yeniden istenebilir.
- E-posta gidince talebin e-posta adresi silinir, yalnız birim ve tarihler kalır (kullanıcı kararı). Gönderim kaydı (e-posta kayıtları) çekirdeğin kuralıyla 365 gün alıcıyı tutar.
- Saklama süresi dolan talep, bekleyen de olsa gönderilmiş de olsa silinir.
- Mevcut kayıtlara alan eklenmez.

## Ekranlar

- Vitrin, ürün sayfası: eklenti açıkken tükenmiş beden ya da renk seçilebilir (üstü çizili kalır, kullanıcı kararı). Seçili birim satın alınamıyorsa (tükenmiş ya da fiyatsız) "Tükendi" yazısının altında "Stoğa gelince haber verelim" kutusu (taslaktaki): başlık, kısa açıklama, e-posta alanı ve "Haber ver". Altında KVKK aydınlatma bağlantısı ve "Bu adresi yalnız bu bildirim için kullanırız" cümlesi. Giriş yapmış müşteride e-posta alanı yerine hesabın e-postası yazılır. Başarıda kutu teşekkür yazısına döner.
- Panel: "Stok bildirimleri" sayfası (Ürünler grubunda). Bekleyen talebi olan her birim bir satırdır: ürün adı, seçim (renk ve beden), bekleyen talep sayısı, en eski talebin tarihi; en çok bekleyen önce. Stoğu görebilen yönetici (`stok.gor`) görür.

## Bildirimler

Müşteriye tek e-posta: ürünün adı, seçimi ve ürün sayfasına bağlantı, site tasarımıyla ve ortak şablondan. Fiyat yazılmaz. Pazarlama içeriği yoktur. SMS ve panel bildirimi yoktur.

## Dış servis

Temel paketteki e-posta gönderim servisi, yeni bağlantı gerekmez.

## Yasal notlar

- E-posta müşterinin isteğiyle ve yalnız bir kez gider, pazarlama değildir: pazarlama onayı istenmez, onay kutusu yoktur (kullanıcı kararı). Formun altında KVKK aydınlatma bağlantısı ve adresin yalnız bu bildirim için kullanıldığı yazar. Bu yorum ve metin mağaza sahibinin hukukçusuna kontrol ettirilir.
- E-posta adresi başka bir iş için kullanılmaz: bültene, müşteri kaydına ya da pazarlama listesine girmez.
- Saklama süresi dolan talep silinir.

## Bitti sayılır

- Eklenti kapalıyken ürün sayfasında form yok, uç bulunamadı verir, panel sayfası menüde yok ve açılmaz, stoğa giren üründe e-posta gitmez.
- Açıkken tükenmiş birimde form görünür, satılabilir birimde görünmez; seçim değişince form seçilen birime göre gelir ya da gider.
- Üye olmayan müşteri e-postasıyla, giriş yapmış müşteri hesabıyla talep bırakır. Ayar "hayır" iken üye olmayana giriş bağlantısı görünür ve uç reddeder.
- Aynı e-posta aynı birime ikinci kez yazılmaz; müşteriye ikinci kez de "tamam" denir (adresin kayıtlı olup olmadığı belli olmaz).
- Form robot korumalı, istek sınırlı; satılabilir, silinmiş, sayfası açılmayan ya da takibi kapalı birime talep yazılmaz.
- Stok sıfırdan yukarı çıkınca her bekleyen talep sahibine bir e-posta gider; aynı anda iki stok girişinde ve aynı anda iki gönderim işinde de bir kez. Gönderim sırasında stok yeniden biterse kalan talepler bekler.
- O anda gönderilemeyen talep (eklenti kapalıydı, ürün taslaktaydı, fiyatı yoktu) birim satılabilir olunca saatlik taramayla gider.
- Fiyatı olmayan birim ürün sayfasındaki gibi satılamaz sayılır: talep alınır, fiyat girilmeden e-posta gitmez.
- Gönderen adresi olmayan sitede talep alınmaz.
- E-posta gidince adres talepten silinir. Saklama süresi dolan talep silinir.
- Panelde bekleyen talep sayıları doğru, en çok bekleyen önce.
- Kontroller ve testler geçiyor, taslakla karşılaştırma yapıldı.

## Kapatılınca

Vitrindeki form kalkar, uçlar bulunamadı verir, panel sayfası menüden kalkar, e-posta gitmez. Talepler silinmez; saklama süresi dolanlar yine silinir. Eklenti yeniden açılınca stokta olan birimlerin bekleyen talepleri en geç bir saat içinde (zamanlı tarama), ötekiler stok girince gönderilir.
