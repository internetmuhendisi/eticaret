# 0325 · Rol erişim testinin "her kişi her uçta" adımı süre sınırına dayandı

## Amaç

Hat 45780640237 (kayıt e6b2000; kod 343617c ile aynı, değişiklik yalnız kart ve tarihçe) birim testlerinde tek testle kırmızı bitti: `cekirdek/kapi/testler/rol-uc-erisimi.test.ts` › "uygulamanın uçları" › "her kişi her uçta izin kaydının söylediğini görür", 5006 ms ile Vitest'in 5 saniyelik sınırını aştı (279/280 dosya geçti). Bu yüzden tarayıcı testleri, hız ölçümü ve yerel ortam denemesi çalışmadı; kart 0323'ün "hattın koşulunda yeşil" maddesi ölçülemedi.

Test her uçta her kişiyi (sahip, görevli, rolsüz yönetici, müşteri, girişsiz ziyaretçi ve rolleri) gerçek veritabanıyla dener; uç sayısı arttıkça uzar (bugün 154 adres dosyası). Yeşil hatlarda dosyanın tamamı 10,6–10,9 saniye sürdü; tek adımın süresi ölçülmedi. On beşinci bölüm yeni uçlar ekleyecek (kupon, toplu işlem, raporlar, vergi, bildirimler).

Bölüm: Test altyapısı (kart 0322 sırasında hattın sonucuna bakılırken bulundu).

## Olmazsa olmazlar

- Adımın süresi hattın koşulunda (iki işlemci, temiz veritabanı) ölçülür; neyin zaman aldığı (uç başına süre, kişi başına giriş, veritabanı) ölçümle yazılır.
- Süre uç sayısıyla büyümeye dayanıklı olur: sınır ölçüme göre konur ya da adım bölünür ya da iş azaltılır (ör. kişilerin oturumları bir kez açılır). Sınırı ölçüsüz büyütmek yetmez.
- Testin denediği şey zayıflamaz: her kişi her uçta yine denenir.

## Sınırlar

- Uçların ve izinlerin kodu değişmez.

## Bitti sayılır

- Adımın hattın koşulundaki süresi ve sınıra payı karta yazıldı.
- Birim takımı hattın koşulunda yeşil.

## Sonuç

- Ölçüm (yerelde, `taskset` ile iki işlemci, yalnız bu adım): 159 uç × 7 kişi = 1113 deneme; uç dosyalarının yüklenmesi 0,2 sn, denemeler 1,0 sn (oturum açma 0,27 sn, uç çağrıları 0,61 sn); adımın tamamı 1,1–1,2 sn. Hattaki 5,0 sn yükten gelir: o çalışmada dosyanın tamamı 18,2 sn sürdü, yeşil hatlarda 10,6–10,9 sn.
- Bir uçta kişiler aynı anda denenir (`erisim-denemesi.ts`, `kisiyiDene`): her kişinin hesabı, oturumu ve istemci adresi ayrıdır; hatalar kişilerin sırasıyla yazılır. Eski ve yeni hâl üçer kez: iki işlemcide 1,10–1,41 sn → 0,76–0,80 sn, tek işlemcide 1,26–1,34 sn → 0,92–1,11 sn.
- Adımın sınırı 20 sn (`rol-uc-erisimi.test.ts`, gerekçesi yanında): hattın yükü adımı 4 kata kadar uzattı, yeni hâlin hattaki en kötü tahmini yaklaşık 3,2 sn; pay 5 kattan fazla. Her yeni uç yerelde yaklaşık 5 ms ekler.
- Test zayıflamadı: her kişi her uçta yine denenir; görevlinin izni beklentiden çıkarılınca kırmızı (eksik izinler uç uç listelendi). Dosyanın 38 testi, tür kontrolü ve denetim yeşil.
- "Birim takımı hattın koşulunda yeşil" bir sonraki gönderimin hattında görülür.
- **Hat 45784138336 (010674b).** Birim takımı yeşil (280/280 dosya); "her kişi her uçta" adımı 2,19 sn, sınır 20 sn (pay yaklaşık 9 kat; önceki hatta 5,0 sn ile 5 sn sınırını aşıyordu). Hattın yerel ortam denemesi kart 0328 yüzünden kırmızı, bu kartla ilgisiz.

## Durum

bitti
