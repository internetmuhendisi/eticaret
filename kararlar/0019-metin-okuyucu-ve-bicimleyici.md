# 0019 · Metin okuyucu ve biçimleyici kendi kodumuz, para tutarı en küçük birimde

## Tarih

2026-10-28

## Karar

- Ekran metinleri `cekirdek/metinler/` altındaki dil dosyalarında (`tr.json`) iç içe anahtarlarla durur ve tek bir fonksiyonla okunur (`metin.ts`, `metinOkuyucu`). Dış çeviri kütüphanesi kullanılmaz. Anahtarların türü Türkçe dosyadan türetilir, olmayan anahtar tür kontrolünde hata verir.
- Para, sayı ve tarih tek biçimleyiciden geçer (`cekirdek/metinler/bicimleyici.ts`). Biçimleyici tarayıcının ve Node'un hazır `Intl` aracını kullanır. Dil, saat dilimi, binlik ve ondalık ayırıcı, para simgesi, simgenin yeri, simgeden önceki boşluk ve ondalık sayısı dışarıdan verilir.
- Biçimleyici para tutarını para biriminin en küçük biriminde (kuruş) tam sayı olarak alır. Tam sayı olmayan tutarı reddeder.
- Biçimleyici dışında `Intl` ve `toLocale...String` kullanmak denetimde hatadır (`denetim/kurallar/elle-bicimlendirme.grit`).

## Neden

- Bugün tek dil var ve Next.js henüz kurulmadı. Anahtarı türden denetleyen küçük bir okuyucu yeterli, dış pakete ve onun güncellemelerine bağlanmayı gerektirmiyor.
- `Intl` aracının Türkçe hazır biçimi simgeyi başa koyuyor (₺1.247,00), site ayarı ise simgeyi sona istiyor (1.247,00 ₺). Bu yüzden ayırıcılar ve simgenin yeri ayardan alınıyor, `Intl` yalnız sayıyı basamaklara ayırıyor.
- Ondalıklı sayılarla yapılan para hesabı kuruş kaydırabilir (0,1 + 0,2 gibi). Tutarı kuruşta tam sayı tutmak bu sınıfı baştan kapatıyor.

## Düşünülen diğer yollar

- Hazır çeviri kütüphanesi (next-intl, i18next): Seçilmedi. Şimdilik gereksiz bir bağımlılık getiriyor. Çoğul ekleri ya da ikinci dil gerekince yeniden düşünülür.
- `Intl` aracının hazır para biçimi (`style: "currency"`): Seçilmedi. Simgenin yeri ve ayırıcılar site ayarına göre değiştirilemiyor.
- Para tutarını ondalıklı sayı olarak almak: Seçilmedi. Yuvarlama hatasına açık.

## Sonuçları

- Fiyat ve tutar tutan her tablo ve modül tutarı kuruşta tam sayı olarak saklamalı ve taşımalıdır. Bu, veritabanı ve ürün modülü yazılırken de geçerlidir.
- Metinlere değişken (örneğin "{adet} ürün") ve çoğul desteği henüz yok. İlk ihtiyaçta okuyucuya eklenir.
- Biçim değerleri şimdilik biçimleyiciye elle verilir. Site ayarından okunması ayar şemasıyla gelir (kart 0010).
