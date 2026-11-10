# 0099 · Tarayıcı testleri sayfanın tarayıcıda bağlanmasını bekler

## Tarih

2026-11-11

## Karar

- Tarayıcı testleri sayfayla etkileşmeden önce `sayfaHazir` ile bekler (`cekirdek/testler/uctan-uca/sayfa-hazir.ts`): ağ işi biter ve sayfanın bütün öğeleri React'a bağlanır (hidrasyon). Yalnız ağ işini beklemek yetmez.
- Yan pencerenin ve açılır menünün davranışı değişmez: pencere açılınca sayfanın geri kalanı yine ekran okuyucudan gizlenir.
- Konsol hatası denetimi aynen kalır.

## Neden

- Ölçüldü (kart 0121): tarayıcının işlemcisi 2–5 kat yavaşken, ağ işi bittiği anda katalog sayfasının 2230 öğesinden 2018–2230'u henüz bağlanmamıştı. O anda açılan yan pencere bağlanmamış bölümlere `aria-hidden` yazıyor, React bölümü bağlarken sunucunun HTML'iyle farkı konsola uyarı olarak yazıyordu. Her denemede 11–27 uyarı çıktı. `sayfaHazir` ile beklenince uyarı kalmadı.
- Uyarı yalnız geliştirme derlemesinde yazılır. Canlı derlemede 12 kat yavaşlıkta da uyarı yoktu, menü açıldı, pencere kapanınca öznitelikler kalktı (ölçüldü). Ziyaretçiye bir etkisi yok. Sorun testin sayfa hazır değilken düğmeye basmasıydı.

## Düşünülen diğer yollar

- **Pencereyi sayfanın bağlanması bitene kadar açmamak:** Ziyaretçiye etkisi olmayan bir uyarı için ürünün davranışını değiştirirdi. Yavaş telefonda düğme bir süre çalışmaz görünürdü.
- **Konsol denetiminde bu uyarıyı saymamak:** Testi zayıflatırdı. Gerçek bir uyuşmazlık da gözden kaçardı.
- **Sabit süre beklemek:** Hızlı makinede boşa bekler, yavaş makinede yine yetmeyebilir.

## Sonuçları

- Ölçüm React'ın iç alan adına (`__reactFiber`) dayanır. React bu adı değiştirirse bekleme süresini doldurup kırmızıya düşer, sessizce geçmez.
- React'ın dışında açılan öğeler (Next.js'in betikleri, geliştirme göstergesi, sayfa duyurucusu ve Radix'in odak koruyucuları) ölçüme girmez. Yeni bir kütüphane React dışında öğe açarsa listeye eklenir. Eklenmezse bekleme süresini doldurup kırmızıya düşer.
- Yönetici paneli testleri (`yonetici-girisi.test.ts`) henüz bu beklemeyi kullanmaz. Panelden çıkış testinin ara ara düşmesi kart 0096'da ölçülecek.
