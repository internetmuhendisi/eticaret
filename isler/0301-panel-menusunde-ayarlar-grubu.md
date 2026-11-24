# 0301 · Panel menüsünde "Ayarlar" grubu

## Amaç

Onaylanan panel taslağında (karar 0157, `planlar/tasarim-yonu/panel.html`) menünün son grubu "Ayarlar"dır: Mağaza bilgileri, Sipariş ayarları, Ödeme yöntemleri, Kargo ve Ekip. Bugün bu ekranlar menüde "Satış" altında, siparişler ve müşterilerle karışık duruyor. Kart 0278'de Mağaza bilgileri de taslağa uymadan Satış altına konuldu.

Bölüm: Yönetim paneli. Kart 0278 sırasında bulundu, o karta karıştırılmadı.

## Olmazsa olmazlar

- Sayfa ağacına (`cekirdek/yonetim-paneli/sayfa-agaci.ts`) "Ayarlar" grubu eklenir; Mağaza bilgileri, Sipariş ayarları, Ödeme yöntemleri, Banka hesapları ve Kargo oraya, taslağın sırasıyla taşınır. Banka hesaplarının yeri taslakta yoktur; ödeme yöntemlerinin yanında önerilir.
- Sayfa yolunda grubun adı taslaktaki gibi görünür.
- Telefondaki yan pencerede de aynı gruplar durur.

## Sınırlar

- Sayfaların adresleri ve izinleri değişmez.
- Ekip ekranı kart 0274'tedir. Kart 0274 "Ayarlar" grubunu açtı (Ekip ve Hesabım orada); bu kart öteki ayar ekranlarını gruba, taslağın sırasıyla Ekip'ten önce taşır.

## Bitti sayılır

- Menünün grupları ve sırası testte (`panel-yetkisi.test.tsx`, `sayfa-agaci.test.ts`).
- Panel çerçevesinin tarayıcı testi ve taraması geçiyor.
- Ekran görüntüsü taslakla yan yana kondu.

## Durum

yapılacak
