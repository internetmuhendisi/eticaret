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

## Durum

yapılacak
