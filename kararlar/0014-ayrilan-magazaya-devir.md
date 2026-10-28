# 0014 · Siteleri biz barındırırız, ayrılan mağazanın sitesi devredilebilir

## Tarih

2026-10-28

## Karar

Bu karar 0001'in yerine geçer. 0001'deki düzen olağan düzen olarak aynen sürer, yanına tek bir çıkış yolu eklenir.

- **Olağan düzen:** Bütün siteleri altyapı sahibi barındırır ve günceller. Mağaza sahibi yalnız kendi sitesinin yönetim paneline girer, koda ve sunucuya erişmez. Sahip paneli yalnız altyapı sahibine açıktır. "Teslim" mağaza sahibine panelin ve kendi hesabının verilmesidir, kodun verilmesi değildir.
- **Çıkış yolu:** Ayrılmak isteyen bir mağazanın sitesi bütünüyle, mağaza sahibinin seçtiği bir sunucuya **devredilebilir**. Devredilenler şunlardır: çekirdeğin o sitenin çalıştığı sürümü, sitenin klasörü, sitenin veritabanı ve dosyaları.
- Devir yalnız ayrılan mağaza içindir. Hiçbir site baştan mağaza sahibinin sunucusunda kurulmaz.

## Neden

- 0001'in gerekçesi geçerliliğini koruyor: Güncellemeler tek elden yapılmalı, teknik bilmeyen mağaza sahibinin sunucuyu ve kodu yönetmesi beklenemez.
- Mağaza sahibi, ayrılırsa sitesini ve verisini götürebileceğini bilmeli. Verisi ve sitesi bize kilitli kalmamalı.
- Teknoloji buna izin veriyor: Site tek başına taşınabilen parçalardan oluşuyor ve firmaya özgü bir hizmete bağlı değil (0013).

## Düşünülen diğer yollar

- Bazı mağazaları baştan kendi sunucularında kurmak: Seçilmedi. Güncellemeler tek elden yapılamaz, 0001'in önlediği durum geri gelir.
- Hiç devretmemek, ayrılan mağazaya yalnız verisini vermek: Seçilmedi. Mağaza sahibi sitesini yeniden kurmak zorunda kalır.

## Sonuçları

- Her site, sahip panelinden ve öteki sitelerden bağımsız çalışabilmeli. Devredilen site sahip paneline bağlı olmadan açılmalı.
- Devirde sitenin gizli bilgileri (veritabanı şifresi, durum ucu anahtarı gibi) yenilenir. Bizdeki kopyalar devirden sonra silinir.
- Devredilen site sahip panelinden ve yedeklerimizden çıkar. Verinin bizdeki kopyalarının ne zaman silineceği yasal saklama süreleriyle birlikte belirlenir.
- Devir için ayrı bir tarif gerekir: neyin, hangi biçimde ve hangi sırayla verileceği. Bu tarif `planlar/komutlar.md` düzeninde ilk devir istendiğinde yazılır.
- Açık konular, ilk devir istendiğinde konuşulacak:
  - Devredilen sitede çekirdeğin kodu da gider. Mağaza sahibi bu kodu başka sitelerde kullanabilir mi, başkasına verebilir mi?
  - Devredilen siteyi bundan sonra kim güncelleyecek?
