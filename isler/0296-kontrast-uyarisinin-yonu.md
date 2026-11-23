# 0296 · Tema ayarlarında kontrast uyarısı rengin yönünü yanlış söylüyor

## Amaç

Kullanıcı bildirdi: tema ayarlarında ana renge koyu bir ton seçilince uyarı "daha koyu bir renk seçin" diyor, oysa önerilen ton daha açık.

Sebep ölçüldü:

- Uyarı metni sabittir: `yonetim.temaAyarlari.hata.kontrast` ("… Önerilen tonu kullanın ya da daha koyu bir renk seçin.", `cekirdek/metinler/tr.json`). `temaAyariAlanHatasi` (`cekirdek/yonetim-paneli/tema/hatalar.ts`) yalnız önerinin olup olmadığına bakıyor, önerinin hangi yönde olduğuna bakmıyor.
- Önerilen ton iki yönde aranıyor (`okunurTon`, `bilesenler/tasarim-degerleri/kontrast.ts`): okunur olan en yakın açıklık, yazının rengine göre daha açık da çıkabilir, daha koyu da.
- Canlı Çarşı'da (Örnek Mağaza'nın teması) ana rengin (`birincil`) üstündeki yazı koyu (`birincil-ustu` #1B1F27). Bu yüzden koyu bir ana renk okunmuyor, öneri daha açık çıkıyor. Ölçüm (`temaAyariSorunlari`, açık tema): #1E1B4B → #817CD0, #3B0764 → #B15DF4, #7C2D12 → #E15B2D, #111111 → #868686, #000080 → #7575FF. Okunmayan çiftler `birincil-ustu/birincil` ve ona bağlı `rozet-ustu/rozet` (oranlar 1,03–1,76, eşik 4,5).
- Yumuşak Mevsim'de ana rengin üstündeki yazı beyazdır (#FFFFFF): orada okunmayan renk açık renktir ve "daha koyu" doğrudur. Aynı beş koyu renk Keskin Çizgi'de de Yumuşak Mevsim'de de geçiyor.

Bölüm: Panel.

## Olmazsa olmazlar

- Uyarı, temaya göre doğru yönü söyler: ya önerinin seçilen renkten açık mı koyu mu olduğuna göre iki ayrı metin, ya da yön söylemeyen tek metin. Seçim kullanıcıya sunulur.
- Metinler tek metin dosyasında kalır (`.claude/rules/metinler.md`); yön hesabı ekranda değil, öneriyi üreten yerde ya da tasarım değerlerinin ortak işlevinde yapılır.
- Aynı sabit yön başka bir uyarıda var mı diye bakılır (tema seçme penceresi, panelin öteki renk alanları).

## Sınırlar

- Öneri kuralı (`okunurTon`) ve kontrast eşikleri değişmez.
- Canlı Çarşı'da koyu ana rengin hiç seçilemiyor olması (üstündeki yazı mağaza sahibine açık değil) bu kartın işi değildir. Ayrı bir ürün kararı gerekiyorsa kart olarak yazılır.

## Bitti sayılır

- Canlı Çarşı'da koyu ana renk seçince uyarı "daha açık" yönünü (ya da yönsüz metni) söylüyor; Yumuşak Mevsim'de açık renk seçince "daha koyu" söylüyor. Bu, birim testinde ve tarayıcıda klavyeyle ölçülüyor.
- Yön kuralı bozulunca test kırmızıya düşüyor.
- Ekran iki renk temasında ve üç genişlikte hatalı hâliyle taramadan geçiyor.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
