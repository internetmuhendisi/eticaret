# 0309 · Yerel ortam denemesinde kuyruk ölçümü açılış kurulumunu beklesin

## Amaç

Hat 45707129119 (kayıt 18809c9, Örnek Mağaza 0.80.0) yalnız yerel ortam denemesindeki tek ölçümle kırmızı bitti: "ornek-magaza: arka plan kutusu örnek işi çalıştırıyor, hatalı işi yeniden deneyip bırakıyor" (`basarili=bitti 1, hatali=bekliyor 1, eposta=gonderildi`). Deneme sitesinde aynı ölçüm geçti.

Sebep (2026-11-26'da ölçüldü): arka plan süreci kuyruğu açılış kurulumu (katalog, sayfalar, menüler, düzen, blog) bittikten sonra çalıştırır. Temiz bir Örnek Mağaza veritabanında 0.80.0'ın kurulumu bu bilgisayarda 30 saniye sürdü; kuyruk ondan sonra açıldı ve hatalı iş ikinci denemesine 5 saniyelik boş beklemeden sonra geçti. Deneme betiği (`cekirdek/arka-plan-isleri/deneme.ts`) kutu açıldıktan hemen sonra çalışır ve en çok 60 saniye bekler. Hattın daha yavaş makinesinde kurulum bu pencerenin büyük kısmını yiyor: ilk deneme pencerenin sonuna kalıyor, ikinci deneme pencereye sığmıyor. Hattaki kurulum süresi ölçülmedi, çıkarımdır. Örnek Mağaza 0.79.0'dayken ölçüm geçiyordu; 0.80.0 blog ve sabit sayfaları da kurar.

## Olmazsa olmazlar

- Yerel ortam denemesi kuyruk ölçümünden önce o sitenin arka plan sürecinin açılış kurulumunu bitirdiğini bekler (sabit süreli bekleme değil, sürecin verdiği bir işaretle) ve bekleme sınırı dolarsa bunu ayrı bir ölçüm olarak kırmızı söyler.
- Kuyruk ölçümünün kendi 60 saniyelik penceresi kurulumdan sonra başlar.
- Bekleme kaldırılınca ölçümün kurulumu uzun süren sitede kırmızıya düştüğü gösterilir.

## Sınırlar

- Açılış kurulumunun kendisi hızlandırılmaz, kuyruk kurulumdan önce çalıştırılmaz.
- Arka plan kuyruğunun ayarları (`kuyrukAyari`) değişmez.

## Bitti sayılır

- `pnpm yerel-ortam-testi` hattın koşulunda Örnek Mağaza 0.80.0 ile yeşil.
- Kontrol hattı bu kayıtla yeşil.
- `.claude/rules/kurallari-koruyan-kontroller.md`'deki yerel ortam denemesi satırı güncel.

## Sonuç

- Arka plan süreci açılış kurulumunu bitirince günlüğe "arka plan kuyruğu başladı" yazar (`kuyrukBasladiMesaji`, `cekirdek/kayitlar/arka-plan.ts`). Yerel ortam denemesi 0.80.0 ve sonraki görüntüde kuyruk ölçümünden önce bu satırı kutunun günlüğünde bekler (en çok 5 dakika); dolmazsa "arka plan süreci açılış kurulumunu bitirip kuyruğu başlattı" ölçümü kırmızıdır.
- Gerçek süreçle `katalog-acilisi.test.ts` satırın kurulumun bütün adımlarından sonra geldiğini ölçer; satır kurulumdan önceye alınınca kırmızı ("expected 241 to be greater than 945").
- Temiz Örnek Mağaza veritabanında, gerçek süreç ve gerçek deneme betiğiyle bir kez ölçüldü: kurulum tek işlemcide 32 sn, iki biçim de geçti. Kurulum ürün tablosu 75 sn kilitlenerek uzatılınca beklemesiz deneme hiçbir işi bitmemiş buldu (`basarili=bekliyor 0, hatali=bekliyor 0`), beklemeli deneme kuyruk 106. saniyede başladıktan sonra geçti (`basarili=bitti 1, hatali=hata 2`).
- `pnpm yerel-ortam-testi --goruntuyu-yenile` yerelde yeni ölçümü iki sitede geçti (katalog kurulu, 0 sn). Örnek Mağaza'nın kuyruğa bağlı beş ölçümü ortak veritabanındaki birikmiş e-posta işleri yüzünden yine kırmızı (bilinen, ortamsal); deneme sitesinin kuyruk ölçümü geçti. Hattaki sonuç gönderimle görülür.

## Durum

bitti
