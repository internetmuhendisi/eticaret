# 0135 · Vitrin sayfalarının ortak çerçevesi ve adresleri

## Amaç

Üst ve alt kısım çerçevesi kart 0108 ile kuruldu. Bu bölümün sayfaları (kategori, marka, etiket, arama, ürün, favoriler) aynı iç iskeleti paylaşmalı. Her sayfa sayfa yolunu, başlığını, boş hâlini ve sayfalamasını kendisi kurarsa sayfalar zamanla ayrışır. Adresler de tek yerde durmalı, değişen adres eski bağlantıyı kırmamalı.

Bölüm: Vitrin. Önce 0134 bitmiş olmalı.

## Olmazsa olmazlar

- Sayfa iskeleti ortak parçalardan kurulur: sayfa yolu, sayfa başlığı, boş hâl, sayfalama. Her parça katalogda örnekle görünür.
- Adresler `cekirdek/vitrin/adresler.ts` dosyasında kalır; etiket sayfası ve öteki yeni sayfalar oraya eklenir.
- Ürün, kategori, marka ya da etiketin adres adı değişince eski adres yenisine kalıcı olarak (301) yönlenir (`.claude/rules/vitrin.md`). Eski adresler veritabanında saklanır, zincir kurulmaz.
- Sayfanın başlığı ve açıklaması sayfa türüne göre tek üreticiden gelir. Boş bırakılan başlık şablondan üretilir.
- Silinmiş ya da görünmeyen kaydın adresi bulunamadı sayfasına düşer (kart 0120).
- Taslakla karşılaştırma: ekran görüntüsü taslakla yan yana, iki temada, telefon ve bilgisayarda; farklar düzeltilir ya da nedeni kullanıcıya söylenir.

## Sınırlar

- Kategori, ürün ve arama sayfalarının içeriği bu kartta yazılmaz.
- Yapılandırılmış veri, paylaşım önizlemesi ve site haritası Görünürlük işidir.

## Bitti sayılır

- Ortak parçalar katalogda iki temada ve üç genişlikte taramadan geçiyor.
- Adres adı değişen kayıtta eski adres 301 ile yenisine gidiyor, iki kez değişende de tek adımda (gerçek veritabanıyla test).
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
