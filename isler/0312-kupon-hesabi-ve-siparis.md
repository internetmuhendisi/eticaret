# 0312 · Kupon: hesap, sepet, sipariş ve iade

## Amaç

Temel paketin Kampanya satırı (kupon kodu: oran, tutar ya da ücretsiz kargo; süre, toplam ve kişi başı kullanım sınırı, en az sepet tutarı, ürün ve kategori sınırlaması, indirimli ürünlerde geçmeme, başka kuponla birleşmeme) bugün yok. İndirim sepette, ödemede, siparişte, e-postada, sipariş fişinde ve faturaya esas olan sipariş kaydında aynı hesaptan çıkmalı; iade edilen siparişte kupon doğru geri hesaplanmalı.

Bölüm: Yönetim paneli 2. Önce 0311 (taslak ve ürün kararları) ve 0246 (iptalin tek akışı) bitmiş olmalı.

## Olmazsa olmazlar

- Kampanya modülü (`cekirdek/moduller/kampanya/`): kupon tablosu, kullanım kaydı; kuponun geçerliliği tek işlevde (süre, sınırlar, en az tutar, kapsam, indirimli ürün), sitenin saat dilimiyle.
- İndirim sepet hesabının içinde tek yerde hesaplanır (kart 0212'nin `sepet` hesabı): kalemlere dağıtılır, vergi indirimden sonraki tutardan oran oran hesaplanır, yuvarlama sitenin kuralıyla, dağıtımda artan kuruş tek kurala göre. Ücretsiz kargo kuponu kargo satırını sıfırlar.
- Sepette kupon kutusu (yeri kart 0311'in kararıyla), kabul ve red nedenleri; ödeme adımında sunucu kuponu yeniden doğrular, sepet değişince kupon düşebilir ve müşteriye söylenir.
- Siparişte kupon kodu, indirimin kalem kalem payı ve vergi dökümü o anki hâliyle saklanır; kupon sonradan değişse de sipariş değişmez.
- Kullanım sınırı aynı anda gelen siparişlerde aşılmaz (kilitle, sıra kurularak test edilir).
- Sipariş e-postası, sipariş fişi, müşterinin sipariş ayrıntısı ve takip, panelin sipariş ayrıntısı ve elle sipariş aynı kayıttan okur.
- İptal ve iade (kart 0235'in iade hesabı) kuponlu siparişte kalemin indirimli payıyla hesaplanır; kısmi iade, kargo dahil iade ve ücretsiz kargo kuponu kart 0311'in kararlarına göre; iptal ve tam iadede kullanım hakkı kararla.
- Kartla ödeme eklentisi indirimli toplamla çalışır; iade parçaları kalemin indirimli tutarıdır.

## Sınırlar

- Panelin kupon ekranları kart 0313'tedir; bu kart kuponu servisle ve başlangıç verisiyle kurar.
- Otomatik kampanya ve öteki indirim eklentileri bu karta girmez.

## Bitti sayılır

- Elle hesaplanmış örneklerle: yüzde, tutar ve ücretsiz kargo kuponu; vergi dahil ve hariç girişte; iki oranlı sepette dağıtım ve yuvarlama; en az tutar sınırında; indirimli ürün ve kapsam dışı ürün; sepet, sipariş kaydı, e-posta ve fişin aynı tutarı vermesi.
- Gerçek veritabanıyla süre, toplam ve kişi başı sınır, aynı anda iki siparişte sınır, iki site; tam, kısmi ve kargo dahil iadede geri hesap; iptalde kullanım hakkı.
- Tarayıcıda klavyeyle kupon girme, red nedeni, ödemede kupon satırı ve kaldırma; iki renkte ve üç genişlikte tarama.
- Her yeni denetim bilerek bozularak kırmızıya düşüyor.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

bitti
