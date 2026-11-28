# 0339 · Yönetici şifre sıfırlama tarayıcı testi eski şablon adını arıyor

## Amaç

Kart 0279'dan beri (b9a79b22) kontrol hattının tarayıcı testleri her çalışmada kırmızı: `cekirdek/testler/uctan-uca/sifre-sifirlama.test.ts:206` "yönetici: sıfırlamadan sonra yine doğrulama kodu ister" "e-posta kaydı yok" ile düşer (hatlar 46042042425, 46051610931, 46060587432; öteki 389–392 test geçer). Kart 0279'un bağımsız kontrolüyle yöneticinin şifre e-postası kendi şablonuyla gider (`yonetici-sifre-sifirlama`, `cekirdek/moduller/oturum/sifre-sifirlama.ts:92`); testin yardımcısı `epostadakiBaglanti` kaydı yalnız `sifre-sifirlama` şablonuyla arar. Kod doğru, test eski.

Yayın yalnız yeşil hatla yapılır: kart 0319'un önünde.

## Olmazsa olmazlar

- Yardımcı aranan şablonu alır; yönetici testi `yonetici-sifre-sifirlama` ile arar, müşteri testleri değişmez.
- Aynı kalıp başka testte aranır (`musteriler.test.ts` müşteriyi arar, doğru).
- Test yerelde geçer; eski hâliyle "e-posta kaydı yok" ile kırmızı.

## Sınırlar

- Şablonların kendisine ve e-posta metinlerine dokunulmaz.

## Bitti sayılır

- Testin dosyası yerelde geçiyor, eski hâliyle kırmızı.
- Gönderimin hattında tarayıcı testleri bu testte düşmüyor.

## Sonuç

- `epostadakiBaglanti` aranan şablonu alır (varsayılan `sifre-sifirlama`); yönetici testi `yonetici-sifre-sifirlama` verir. Eski hâliyle yerelde "e-posta kaydı yok" ile kırmızıydı, düzeltmeyle dosya 16/16 geçti. Öteki tarayıcı testlerinde yönetici şifre e-postasını arayan yok (`musteriler.test.ts` müşteriyi arar).

## Durum

bitti
