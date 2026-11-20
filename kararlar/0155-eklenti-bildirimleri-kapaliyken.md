# 0155 · Kartla ödeme bildirimleri eklenti kapalıyken de gider

## Tarih

2026-11-20

## Karar

Kartla ödemeye bağlı iki yönetici bildirimi (kartla ödeme karşılaştırmasının uyuşmazlığı ve kuruluşta takılan iade) eklenti sitede kapalıyken de gider (kullanıcı kararı). Bildirim yalnız mağaza sahibi onu kapattıysa gitmez. Bu, karar 0154'ün "eklentiye bağlı bildirim yalnız eklenti açıkken gider" maddesinin yerine geçer.

Panelde bu iki bildirimin anahtarı yine yalnız eklenti açıkken görünür. Eklenti kapalıyken kaydedilen ayar bunların kayıtlı hâlini korur: eklentiyi kapatmadan önce kapatılmış bildirim kapalı kalır.

## Neden

- Eklenti kapalıyken de kartla ödemenin para işleri çalışır: başlatılmış ödemenin taraması, günlük karşılaştırma ve iade (kart 0235, karar 0147). Kapattıktan sonra çıkan uyuşmazlık ya da takılan iade bugün yalnız hata izleme aracında görünürdü; mağaza sahibi para hareketinden haberdar olmalı.
- Eklentiyi hiç kullanmamış sitede bu işler bir şey bulmaz: bildirim de çıkmaz. Anahtarları eklenti kapalıyken göstermek yalnız kafa karıştırırdı.

## Düşünülen diğer yollar

- **Eklenti kapalıyken göndermemek (karar 0154):** Daha sade, ama eklentiyi kapatan mağaza son ödemelerin ve iadelerin sorununu duymazdı. Kullanıcı seçmedi.
- **Anahtarları eklenti kapalıyken de göstermek:** Mağaza sahibi bildirimi kapatabilirdi, ama kartla ödeme kullanmayan her sitede iki anlamsız anahtar dururdu. Seçilmedi; kapatmak isteyen eklentiyi kapatmadan önce kapatır.

## Sonuçları

- `bildirimAcikMi` yalnız kapatılan bildirimlere bakar (`cekirdek/moduller/yonetici-bildirimi/gonderim.ts`); kayıttaki `eklenti` alanı yalnız panelde görünürlüğü belirler.
- Eklentisi kapalı bir sitede bu iki bildirimi kapatmak için önce eklentinin açılması gerekir (altyapı sahibinin ayarı).
