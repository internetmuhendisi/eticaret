# 0182 · İşlemden sonra odak çizim bittikten sonra verilir

## Tarih

2026-11-25

## Karar

Bir işlemden sonra durum değişikliğiyle çizilecek, kalkacak ya da yeri değişecek öğeye odak tek kancayla verilir: `useCizimdenSonraOdak` (`bilesenler/parcalar/cizimden-sonra-odak.ts`). Odak isteği, onu doğuran durum güncellemesiyle aynı çizime girer ve React'ın efektinde, çizim bittikten sonra verilir. Ekran sunucunun cevabıyla değişiyorsa (sepetten çıkan satır) istek `hazir` koşulu sağlanana kadar her çizimden sonra bekler. Olay işleyicisinde `requestAnimationFrame` ile odak vermek taramayla yakalanır; efektin içinde (çizimden sonra) kare bekleyen tek yer muaftır (biçimli metin alanının bağlantı satırı).

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
