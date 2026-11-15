# 0165 · Sıralanabilir liste testi yana kaymayı animasyon sırasında ölçüyor

## Amaç

`cekirdek/testler/uctan-uca/katalog.test.ts` içindeki "sıralanabilir liste: klavyeyle, düğmeyle ve fareyle taşınır" testi ara sıra kırmızıya düşüyor. Kart 0143 sırasında ölçüldü:

- Ana daldaki kodla (kart 0143'ün değişikliği olmadan) sekiz denemede üç kez düştü.
- Hata her seferinde aynı: telefon genişliğinde "yukarı al" düğmesine basıldıktan sonra sayfa 287 piksel yana kayıyor (`scrollWidth - clientWidth`).
- Taşan öğe az önce taşınan satırın kendisi (`siralanabilir-satir`, "Güven şeridi"; sağ kenarı 662 piksel). Ölçüm, @dnd-kit'in sıralama geçişi sürerken yapılıyor. Satır o sırada geçici bir kaydırmayla (transform) duruyor; pencere hemen önce 1280 pikselden 375 piksele küçültülmüştü.

Neden kesin değildir: satırın kaydırması geçiş bitince sıfırlanıyor mu, yoksa bir kullanıcı da bu anda yana kayma görüyor mu, ölçülmedi.

## Olmazsa olmazlar

- Önce ölçülür: pencere küçültülmeden de (yalnız telefonda) olur mu; geçiş bitince kayma kalıyor mu.
- Kullanıcının gördüğü bir sorunsa parça düzeltilir; yalnız ölçüm zamanlamasıysa test geçişin bitmesini bekler (kart 0136'daki tarama beklemesi gibi).

## Sınırlar

- Sıralanabilir listenin davranışı değişmez.

## Bitti sayılır

- Neden ölçülüp karta yazıldı.
- Test art arda en az on kez düşmeden geçiyor.

## Ölçüm (2026-11-15, kart 0204 ile birlikte)

Hattın koşulunda ölçüldü (temiz veritabanı, `taskset -c 0-3`, `--workers=2`). Satırların yeri, kaydırması ve sayfanın yana kayması her karede kaydedildi.

- **Taşan satırlar.** Kayma olan karelerde taşınan iki satır `translate3d(304px, …)` ile duruyordu. Geçiş bir karede başlıyor ve kayma ~130 ms sürüyor (dört ölçümde 9–10 kare), sonra 0'a iniyor. Geçiş bittikten sonra kayma hiçbir ölçümde kalmadı.
- **Sebep.** @dnd-kit, sıra değişince satırı eski yerinden yeni yerine geçişle getirir. Eski yeri sürüklemede ölçtüğü yerden alır. Sürükleme 1280 px'teydi ve genişlik hemen ardından 375 px'e indi. Bu yüzden satır 304 px sağdan geliyor ve sayfa 287 px taşıyor.
- **Pencere küçültülmeden olmuyor.** Yalnız telefonda (375 px'te sürükle, bas) dört ölçümde kayma olmadı. Araya bekleme konunca (sürükle, 1 sn, küçült, 1 sn, bas) de dört ölçümde olmadı.
- **Kaynaktaki pencere (bağımsız kontrolün bulgusu).** @dnd-kit/sortable bu geçişi yalnız sürüklemeden hemen sonra yapar (`defaultAnimateLayoutChanges`, `wasDragging`). Sürükleme bilgisini bırakmadan 50 ms sonra siler. Testin telefon tıklaması bu pencerenin içine düşebiliyordu. Pencere bittikten sonra düğmeyle taşımada eski yerden geçiş hiç yoktur. Bu, beklemeli ölçümde kaymanın görülmemesini açıklar.
- **Kullanıcıya etkisi.** Bir kullanıcının bunu görmesi için masaüstünde sürükledikten hemen sonra pencereyi telefon genişliğine küçültüp düğmeye basması gerekir; görürse de yalnız ~130 ms görür. Bu yüzden ürün hatası sayılmadı, parça değişmedi.
- **Düzeltme.** Test, geçişin başladığı kareyi (iki kare) ve sonra sonlu her hareketin bitmesini bekleyip ölçer. Bu, kart 0136'daki tarama beklemesiyle aynı yoldur.
- **Bozma.** Satıra kalıcı 700 px en az genişlik verilince test aynı adımda 342 px ile kırmızıya düştü.
- Doğrulama (hattın koşulu): test tek başına art arda on kez geçti (10/10). Katalog dosyasıyla beş kez, bütün tarayıcı takımıyla bir kez geçti (257/257). Telefon adımındaki yana kayma ölçümü de her çalışmada geçti.

## Durum

yapılacak
