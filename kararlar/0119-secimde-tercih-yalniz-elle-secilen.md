# 0119 · Ürün sayfasında korunan tercih yalnız müşterinin seçtiği değerdir

## Tarih

2026-11-14

## Karar

Karar 0118'in kuralı düzeltilir: korunan değer yalnız müşterinin seçtiği değerdir.

- **Tercih:** Sayfa açılırken müşterinin tercihi yalnız adresteki seçimdir (`adrestekiSecim`: adresteki değerlerden öncekilerle birlikte birleşimi olanlar). Yenilenen ya da paylaşılan bağlantıdaki seçim müşterinindir. Ayarın kendiliğinden seçtiği ilk birleşim (`secenekOnSecimi: "ilk-satilabilir"`) tercih sayılmaz. Sonra her tıklama o seçeneğin tercihini yazar.
- **Kural (`secimiDegistir`):** Sonraki seçenekte önce tercih denenir. Tükenmiş değer seçilebiliyorsa birleşimi olan tercih, seçilemiyorsa yalnız satılabilir tercih kalır. Tercih kalmazsa o an seçili değer yalnız satılabilirse kalır. Sonra ilk satılabilir değere, o da yoksa (tükenmiş değer seçilebiliyorsa) birleşimi olan değere geçilir.
- **Satır (`degisenSecimler`):** Seçimden ve tercihten türetilir. Bir seçenekte tercihten başka bir değer seçili kaldıkça satır durur; müşteri o seçeneği yeniden seçince ya da seçim tercihe dönünce kalkar. Tercihi olmayan seçenek söylenmez.

## Neden

Bağımsız kontrol karar 0118'in ilk uygulamasında bir gerileme buldu. Tercih sayfa açılırken ilk seçimle doluyordu, bu yüzden müşterinin hiç seçmediği değer de korunuyordu. Örneğin S Beyaz kendiliğinden seçili açılan üründe müşteri yalnız Siyah'a basınca satılabilir Siyah-M yerine tükenmiş Siyah-S'de kalıyordu. Eklenti kapalıyken de müşterinin seçmediği bir değer için "S bu seçimle tükendi" satırı çıkıyordu. Satır bir sonraki seçimde kalkıyordu, oysa istenen değer hâlâ seçili değildi.

## Düşünülen diğer yollar

- **Tercihi boş başlatmak (adres de sayılmasın):** Bu seçilmedi. Sayfayı yenileyen müşterinin seçtiği beden, renk değişince sessizce değişirdi.
- **Satırı yalnız değişikliğin olduğu anda göstermek (ilk uygulama):** Bu seçilmedi. Müşteri istediği değerin neden seçili olmadığını sonraki seçimde göremiyordu.

## Sonuçları

- Kendiliğinden seçilen değer eski kuraldaki gibi davranır: satılamıyorsa satılabilir değere geçer ve bu söylenmez, çünkü müşteri o değeri seçmemişti.
- Ürün sayfası sunucuda adresteki seçimi ayrıca hesaplar (`adrestekiSecim`, `ilkSecim` aynı işlevi kullanır).
- Testler: birim ve jsdom testlerinde kendiliğinden seçilen değer ve adresteki değer; tarayıcı testi seçimi tıklayarak yapar.
