# 0182 · İşlemden sonra odak çizim bittikten sonra verilir

## Tarih

2026-11-25

## Karar

Bir işlemden sonra durum değişikliğiyle çizilecek, kalkacak ya da yeri değişecek öğeye odak tek kancayla verilir: `useCizimdenSonraOdak` (`bilesenler/parcalar/cizimden-sonra-odak.ts`). Odak isteği, onu doğuran durum güncellemesiyle aynı çizime girer ve React'ın efektinde, çizim bittikten sonra verilir. Ekran sunucunun cevabıyla değişiyorsa (sepetten çıkan satır) istek `hazir` koşulu sağlanana kadar her çizimden sonra bekler. Beklerken kullanıcı odağı başka bir öğeye taşıdıysa istek bırakılır: odak yalnız istek anındaki öğede ya da boşta (gövdede) duruyorsa verilir. Olay işleyicisinde `requestAnimationFrame`, `setTimeout` ya da `queueMicrotask` ile odak vermek taramayla yakalanır. İki yer gerekçesiyle muaftır: biçimli metin alanı (kare efektin içinden, çizimden sonra istenir) ve ekibe davet (odak Radix'in pencere kapanınca kendi zamanlayıcısıyla verdiği dönüşten sonra gelmeli; pencereyi kapatan her yol tıklamanın içindedir, React durumu zamanlayıcıdan önce çizer).

## Neden

Kart 0307'de hat 45567962785 Hesabım'da kırmızıydı: yeni yedek kodların başlığı sayfadaydı, odak almadı. Odak bir sonraki karede (`requestAnimationFrame`) veriliyordu; kare React'ın çizimden önce gelince öğe henüz yoktu. Sıra jsdom'da kurularak (kare hemen çalışır) ölçüldü: eski kod Hesabım'da, adres defterinde (son adres silinince) ve çoklu kayıt seçiminde (kaldırılanın kendi düğmesine odak) kırmızıydı. Sepette sebep yükten bağımsızdı: satır sunucunun yeni sepet cevabıyla kalkar, kare her durumda cevaptan önce gelir; eski kodda odak çıkarılan satırın kendi düğmesinde kalıp onunla kayboluyordu (tarayıcıda yüksüz makinede ölçüldü). İade talebi formunun özeti boşken gizlidir (`empty:hidden`): tarayıcı gizli öğeye odak vermez.

## Düşünülen diğer yollar

- **İki kare beklemek.** Yalnız olasılığı azaltır; yüklü makinede ve sunucu cevabı bekleyen ekranda yine geç kalır.
- **`flushSync` ile durumu hemen çizdirmek.** Sunucu cevabını bekleyen sepette işe yaramaz; React çizimi zorlamak öteki güncellemeleri de bekletir.
- **Her ekranda kendi efektini yazmak.** İade formunun teşekkürü gibi (`alindi` için zaten öyleydi) yapılabilir ama beş yerde aynı kalıp kopyalanırdı.
- **Öğenin kendi ref geri çağırmasında odak.** Yalnız yeni çizilen öğede çalışır; yeri değişen ya da başka öğenin kalkmasıyla belirlenen hedefte (sonraki satırın düğmesi) çalışmaz.

## Sonuçları

- Kanca bağımlılıksız bir efekt taşır: bileşen her çizildiğinde bekleyen istek denenir, istek yokken iş yapmaz.
- `hazir` koşulu hiç sağlanmazsa istek bekler, bir sonraki odak isteği onun yerini alır; bileşen kalkınca istek de gider.
- Tarama `requestAnimationFrame(` çağrısının gövdesinde `.focus(` arar: değişkene alınmış işlevle verilen odak yakalanmaz, yalnız disiplindir.
- Durum geçişle (`startTransition`, `useDeferredValue`) yazılırsa odak isteği geçişten önce çizilir, hedef eski DOM'da aranır. Bugün böyle kullanım yok; kancanın açıklamasında yazılı.
- Sepette "Geri al" sunucunun cevabından önce basılırsa satır hiç kalkmaz, istek bekler; bir sonraki istek onun yerini alır, odak başka öğedeyse verilmez. Aynı cevaptan önce art arda iki satır çıkarılırsa odağın sırası tıklama anındaki listeden sayılır, bir satır atlanabilir. İkisi bilinen sınırdır.
