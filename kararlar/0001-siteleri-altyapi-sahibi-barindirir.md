# 0001 · Siteleri altyapı sahibi barındırır

## Tarih

2026-10-28

## Karar

Bütün siteleri altyapı sahibi barındırır ve günceller. Mağaza sahibi yalnız kendi sitesinin yönetim paneline girer, koda ve sunucuya erişmez. Sahip paneli yalnız altyapı sahibine açıktır.

## Neden

Güncellemeler tek elden yapılsın. Mağaza sahipleri teknik bilmiyor, sunucuyu ve kodu onların yönetmesi beklenemez.

## Düşünülen diğer yollar

- Siteyi kod ve sunucuyla birlikte mağaza sahibine teslim etmek: Seçilmedi. Güncellemeler tek elden yapılamaz, teknik bilmeyen mağaza sahibi siteyi kendi başına yürütemez.

## Sonuçları

- Sunucu, yedek, güvenlik ve güncelleme işinin tamamı altyapı sahibindedir. Site sayısı arttıkça bu yük de artar.
- Mağaza sahibi kendi isteğiyle koda dokunamaz. Ondan gelen her istek ya bir site ayarına ya da altyapı sahibinin yapacağı bir işe dönüşür.
- "Siteyi mağaza sahibine teslim etmek" panel ve sahip hesabının verilmesi demektir, kodun verilmesi değil (`temel-paket.md`, Çok siteli yapı).
