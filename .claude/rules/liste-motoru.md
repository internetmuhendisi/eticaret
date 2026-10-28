---
paths:
  - "bilesenler/liste/**"
  - "cekirdek/yonetim-paneli/**"
  - "cekirdek/uygulama/app/yonetim/**"
  - "sahip-paneli/**"
---

# Liste, tablo, pano ve takvim motoru

- Ürün, sipariş, müşteri, kupon, iade gibi bütün listeleri tek ortak liste motorundan çıkar. Sayfada elle tablo kurma.
- Bir listenin sütunlarını, filtrelerini, sıralamasını ve toplu işlemlerini bir tanım dosyasında yaz. Sayfa yalnız tanımı çağırır.
- Aynı verinin tablo, kart, pano ve takvim görünümlerini aynı motordan üret. Elle pano ya da takvim kurma.
- Etkinlik geçmişi, bildirim akışı ve müşteri yazışmaları için kendi ortak motorlarını kullan. Her şeyi yapan tek dev motor yazma.
- Sunucunun döndürdüğü her anlamlı alan sütun olarak seçilebilsin. Dönmeyen alanı sütun yapma.
- Sunucunun kabul ettiği her filtre arayüzde olsun. Kabul etmediği filtreyi koyma.
- Bir sütunu ancak sunucu ona göre sıralayabiliyorsa sıralanabilir göster.
- Her listede yükleniyor, boş, filtreye uyan kayıt yok ve hata durumlarını ayrı göster.
- Bir listenin filtre düzeyini bilinçli seç: filtresiz, hazır filtreli ya da kullanıcının kendi filtresini kurup kaydedebildiği tam filtreli.
- Kullanıcının kaydettiği filtre ve sütun düzenlerini bütün listeler için aynı altyapıda tut.
- Düzenle, kopyala, sil gibi satır eylemlerini satırın sonunda tek küme olarak koy.
- Toplu işlemleri yalnız kayıt seçildiğinde göster ve yalnız seçilen kayıtlara uygula.
- Kategori, etiket, sipariş durumu gibi küçük listeleri aynı satır yapısı ve aynı sıralama yöntemiyle yönet.
- Motorun yapamadığı bir şey gerekiyorsa sayfaya kopya yazma, motoru genişlet.
