# 0352 · Seramik mağazası "Yeni site kur" ile seramik.eticaretmagazasi.com'da

## Amaç

Bölümün sonunda altyapının ilk yeni mağazası komutla açılır: bir seramik mağazası, `seramik.eticaretmagazasi.com` adresinde, bu sunucuda. Komutun gerçek bir mağazada ilk çalışmasıdır; öğrenilenler tarife işlenir.

Bölüm: Yeni mağaza. Bölümün son işi. Önce bu bölümün öteki kartları bitmiş olmalı.

Seramik satışa açılacak gerçek bir mağazadır; satışa açılış bir sonraki bölümdedir (Açılış). Bu bölümde kurulur ve yayına açılır, satışa kapalı kalır (kullanıcı kararı, 2026-11-28).

## Olmazsa olmazlar

- Komut çalışmadan önce kullanıcıdan cevaplar alınır: mağaza adı, sahibinin adı ve e-postası, ne sattığı ve kategorileri, başlanacak demo ve örnek ürünler, eklentiler, temalar, ayarlar, logo ve mağaza bilgileri. Türü gerçek mağazadır. Seramik için sektör demosu yoksa hangi demoyla başlanacağı ya da demosuz başlanacağı sorulur.
- Satışa kapalıdır: gerçek ödeme alınmaz, teslim yapılmaz, mağaza sahibine teslim e-postası gitmez. Gerçek e-posta gönderimi (0060) ve yasal metinler (0063) Açılış bölümündedir; bu bölümde e-posta gönderen adresi ve yasal metinler yer tutucuyla kalır, bunun vitrinde nasıl göründüğü ve ziyaretçinin sipariş verip veremeyeceği kurulumdan önce kullanıcıya söylenir. 0093 (dosyaların yedeği) bu bölümde biter; bitmeden siteye dosya yüklenmez.
- `pnpm yeni-site-kur` (kart 0350) baştan sona çalışır; komutun yaptığı dışında elle adım yapılmaz. Elle bir adım gerekirse komut durur, eksik komuta eklenir ya da nedeniyle kartın sonucuna yazılır.
- Kurulumdan önce ve sonra sunucunun bellek ve işlemci kullanımı ölçülür; üç sitenin (Örnek Mağaza, seramik, yayındaysa Tema Galerisi) kutuları birlikte sınırların altında.
- Kurulumdan sonra: `seramik.eticaretmagazasi.com` şifreli açılıyor, arama motoru kuralı kart 0344'ün kararındaki gibi, sağlık ucu kimlikteki sürümü söylüyor; sunucu denetimi, veri ayrımı (iki site birbirinin veritabanına, dosyalarına ve gizli bilgilerine ulaşamıyor; `pnpm sunucu-veritabani-denemesi`, `pnpm sunucu-gizli-denemesi`), hata izleme denemesi, panel denemesi, gece yedeği tanımlı ve ilk yedek alındı (geri yükleme provası 0068 bittiyse).
- Tarayıcıyla gezinti, telefon ve bilgisayarda: vitrinin ana sayfası, kategori, ürün, sepet ve ödeme adımı (gerçek ödeme yok), panel girişi, Demolar ekranı; Örnek Mağaza'nın hiçbir şeyi değişmedi.
- Örnek Mağaza'nın yayını ve sunucu denetimi kurulumdan sonra da yeşil.
- `planlar/komutlar.md`'ye ilk gerçek kurulumun adımları ve öğrenilenler yazılır.

## Sınırlar

- Teslim ve satışa açılış Açılış bölümündedir: mağaza satışa açılmaz, sahibine e-posta gitmez; 0060 ve 0063 bu karta karıştırılmaz.
- Örnek Mağaza'ya ve Tema Galerisi'ne dokunulmaz.

## Bitti sayılır

- Site komutla kuruldu, `seramik.eticaretmagazasi.com`'da açılıyor.
- Denetimlerin ve gezintinin her adımı kartta yeşil.
- Örnek Mağaza etkilenmedi (ölçüldü).
- Tarif güncel.

## Durum

yapılacak
