# 0159 · Panelin ortak form yapısı

## Tarih

2026-11-21

## Karar

Panelin bütün veri formları tek yapıdan çıkar (kart 0259; `cekirdek/yonetim-paneli/form/`):

- `usePanelFormu` formun hatalarını, gönderimini ve çıkış korumasını tutar; `PanelFormu` ortak formu (POST, kod yüklenmeden gönderilmez) ve başındaki hata özetini çizer; alan `PanelAlani` (ortak `FormAlani` üstünde) ya da tek girişi olmayan alanda `AlanKabi` ile yazılır; alttaki düğmeler `KaydetCubugu`'dur.
- Alanın yeri ve adı sayfadan okunur (`data-alan`, `data-alan-etiketi`): form ayrıca bir alan sırası tutmaz. Hatanın yolunda alan yoksa en yakın üst alan bulunur ("slaytlar.0.baslik" yoksa "slaytlar.0", sonra "slaytlar"); hiç yoksa hata alanı olmayan hata sayılır.
- Tek alan hatasında odak o alana gider, özet çıkmaz. Birden çok hatada ya da alanı olmayan hata varken formun başında özet çıkar, odak özete gider. Özetin sırası alanların ekrandaki sırasıdır; satırı alana götürür. Alanı olmayan hata (yetki, bağlantı, iş kuralı) özette düz satırdır.
- Kayıt sürerken ikinci gönderim yok sayılır, kaydet çubuğunun düğmeleri kapalıdır. Sayfadaki ayar formunda çubuk "Kaydedilmemiş değişiklik var / Değişiklik yok" der, değişiklik yokken Kaydet ve Vazgeç kapalıdır (taslak).
- Kaydedilmemiş değişiklikle panelin başka bir sayfasına giden bağlantıda (menü dahil) çerçevedeki `CikisKorumasi` sorar: "Sayfada kal", "Kaydetmeden çık", "Kaydet ve çık" (yalnız her değişmiş formun kaydetme işi varsa). Sayfa yenilenir ya da kapanırsa tarayıcının sorusu çıkar. Pencere kapatılırken soru `useKapatmaSorusu`'ndadır (değişmedi).
- Zorunlu alanın etiketinin yanında yıldız (ekran okuyucudan gizli, alan `aria-required`), isteğe bağlı alanınkinde "(isteğe bağlı)" yazar; ek etiketin dışındadır, alanın adı etikettir.
- Hata özeti kütüphanenin parçasıdır (`HataOzeti`, `bilesenler/form/hata-ozeti.tsx`); vitrinin formları bu kartta taşınmadı.
- Sabit alt çubuk odaklanan öğeyi örtmez (kart 0188): kaydırma kabı çubuk kadar pay alır (`tailwind.css`, `scroll-pb-20`), kısmen görünen öğeyi tarayıcı kaydırmadığı için çubuk odaklanan öğeyi kendisi görünür yere kaydırır (`YanPencereAltCubugu`).

## Neden

- Kartlar 0142, 0143 ve 0236'nın bulguları: hata bazen pencerenin üstünde bazen alanın altında, odak her formda farklı. Bu bölümde çok sayıda form gelecek.
- Alanın sırasını sayfadan okumak her formun elle tuttuğu "alan sırası" listesini (elle sipariş) kaldırır; liste alanla ayrışamaz.
- Tek hatada doğrudan alana gitmek kullanıcıyı bir adım kısa yoldan düzeltmeye götürür; birden çok hatada özet hepsini bir kerede söyler (taslağın notu).
- Çıkış sorusu panel menüsüyle geçişte de gerekiyordu (kart 0142'de yalnız disiplin kalmıştı).

## Düşünülen diğer yollar

- Her formun alan sırasını elle yazması (elle siparişteki gibi): yeni alan eklenince liste unutulur.
- Hatayı her zaman özetle göstermek: tek hatada gereksiz bir adım.
- Tarayıcının geri tuşunda da sormak: uygulamanın içindeki geri gezinme Next'in yönlendiricisinde güvenilir biçimde durdurulamıyor (geçmiş değiştikten sonra haber verir); denenmedi, soru yalnız bağlantı ve sayfa kapanışında.
- Yalnız kaydırma payı (scroll-padding): ölçüldü, kısmen görünen uzun metin alanında tarayıcı hiç kaydırmıyordu.

## Sonuçları

- Panelin yeni formları bu yapıyla yazılır; elle `<Form>` panelde taramayla yakalanır (giriş, kod formu ve liste araması dışında).
- Vitrinin ortak adres alanları (`cekirdek/vitrin/odeme/alanlar.tsx`) alanın adını taşır (`data-alan`); vitrinin görünüşü değişmez.
- Ayar formlarında Kaydet değişiklik yokken kapalıdır: değişiklik yapmadan kaydetmeye çalışan test ya da kullanıcı düğmeyi kapalı görür.
- Tarayıcının geri tuşunda soru çıkmaz.
