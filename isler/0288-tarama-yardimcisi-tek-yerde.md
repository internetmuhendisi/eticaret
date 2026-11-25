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

## Notlar

- 2026-11-25: kopya sayısı kart yazıldığında 31'di, taşırken 40'tı (aynı kural ve etiketler; farklar beklemelerde ve kapsamda).
- Yardımcı `cekirdek/testler/uctan-uca/tarama.ts`: `tara(page, ne, { haric, yalniz })`, ihlalleri dönen `ihlalleriBul` (ekran ölçümü kendi listesine ekler) ve `hareketlerBitsin` (katalog renk ölçmeden önce de kullanır). Taramadan önce sırayla bildirim süresi durdurulur, sonlu animasyonlar beklenir, sayfanın başlığının dolması beklenir (kart 0287). Bildirim süresini ve animasyon beklemesini kullanmayan eski kopyalar da artık bekler.
- Bilerek farklı olan iki kullanım seçenekle verildi: Hesabım menüsü testi yalnız üst kısmı ve açık menüyü tarar (`yalniz`); hesap ve sepet testlerinde üst üste binen bildirimler (kart 0217) taranmaz (`haric`). Kayıt formunun taraması (`musteri-hesabi.test.ts`) menü testinin yardımcısını kullandığı için yalnız üst kısmı tarıyordu; artık bütün sayfayı tarar, iki genişlikte geçti.
- Denetim kuralı `denetim/kurallar/elle-tarama.grit`: `@axe-core/playwright` yalnız yardımcıda içe aktarılır; yeniden dışa aktarma ve sonradan yükleme de yakalanır; muafiyet yalnız projenin kökündeki yardımcı içindir. Üç bozuk örnek (`elle-tarama.ts`, `elle-tarama-sonradan-yukleme.ts`, `ic-ice/cekirdek/cekirdek/testler/uctan-uca/tarama.ts`) kendi kendini denetlemede yakalandı; kural eklenince 40 kopyanın 40'ı denetimde hata verdi. `require` ile yükleme yalnız disiplindir.
- Yardımcının testi `tarama.test.ts` (sayfa testin içinde kurulur): başlık yokken başlayan tarama, sürmekte olan renk animasyonu, sonsuz animasyon, `ihlalleriBul`'un gerçek ihlali bulması, `haric` ve `yalniz`. Başlık beklemesi, animasyon beklemesi, sonsuz animasyon süzgeci, `haric` ve `yalniz` ayrı ayrı bilerek bozuldu; her biri yalnız kendi testini kırmızıya düşürdü.
- Hattın koşulunda (ayrı kutuda temiz veritabanı, iki işlemci, iki işçi) bütün tarayıcı takımı: 360 geçti, 1 düştü, 5 çalışmadı. Düşen `davet.test.ts` taramada değil, `POST /kapi/yonetici/ekip-davet` 5 sn yanıt almadığı için düştü (kart 0251'in ailesi: takımın ilk testi, sunucu 18 sn hiçbir isteği bitirmedi, aynı aralıkta Turbopack "Finished writing to filesystem cache in 76s" yazdı). Çalışmayan 5 test tema aşamasıdır (öteki testlerin hepsi geçince çalışır). Aynı ortamda davet testi ve tema aşamasının 5 testi ayrıca geçti; yardımcının 4 testi de geçti.

## Durum

yapılacak
