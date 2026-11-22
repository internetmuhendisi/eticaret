# 0288 · Tarayıcı testlerinin erişilebilirlik taraması tek yerde

## Amaç

31 tarayıcı test dosyasının her birinde kendi `tara` yardımcısı var (`new AxeBuilder` ile). Kopyalar zamanla ayrışmış: bazıları animasyonların bitmesini bekliyor, bazıları bildirim süresini durduruyor (`bildirimSuresiniDurdur`), bazıları ikisini de yapmıyor. Hat düzeltmesinde (2026-11-22) ürün seçenekleri testine "başlık dolu olsun" beklemesi eklendi (kart 0287). Aynı açık öteki 30 kopyada da duruyor: bir işlemden sonra panel sayfayı yenilerken taranırsa aynı hata çıkabilir.

## Olmazsa olmazlar

- Tek bir tarama yardımcısı yazılır (`cekirdek/testler/uctan-uca/` altında). Kuralları, sayılmayanları ve beklemeleri (animasyonlar, bildirim süresi, sayfa başlığı) tek yerde toplar.
- 31 dosya bu yardımcıyı kullanacak biçimde taşınır. Bir dosyanın bilerek farklı kuralı varsa yardımcıya seçenek olarak verilir.
- Kopyanın geri gelmemesi için `new AxeBuilder`'ın yardımcı dışında kullanılmadığını denetleyen bir test ya da denetim kuralı yazılır, bozuk örneğiyle.

## Sınırlar

- Taramanın kuralları ve etiketleri (WCAG 2.2 AA) gevşetilmez.

## Bitti sayılır

- 31 dosya ortak yardımcıyı kullanıyor, bütün tarayıcı takımı yeşil.
- Denetim, yardımcı dışında `new AxeBuilder` yazılınca kırmızıya düşüyor.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
