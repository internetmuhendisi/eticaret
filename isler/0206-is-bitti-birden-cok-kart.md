# 0206 · `/is-bitti` birden çok kartı tek gönderimle kapatsın

## Amaç

`/is-bitti` her çalıştığında GitHub'a gönderir. Her gönderim kontrol hattını baştan çalıştırır ve her çalışma ücretlidir.

Birlikte biten kartlar (ör. aynı testi düzelten 0204, 0158, 0165) bugün ya üç ayrı gönderimle kapanıyor ya da kullanıcının konuşmada "gönderme" demesiyle. Hattın ayarı aynı daldaki eski çalışmayı yeni gönderimde durdurur. Ama `/is-bitti` her kartta önce kontrol yaptığı için gönderimler arası dakikalar sürebilir. O arada başlayan çalışmalar ücretli dakika harcar.

Komut birden çok kart numarası alabilsin: `/is-bitti 0158 0165 0204`.

Bölüm: Çalışma düzeni.

## Olmazsa olmazlar

- Her kartın "Bitti sayılır" listesi ayrı ayrı, bugünkü kurallarla kontrol edilir. Kartlardan birinde eksik varsa hiçbir kart kapanmaz, hiçbir şey kaydedilmez ve gönderilmez.
- Her kartın durumu `bitti` olur. Her kart için tarihçeye ayrı giriş yazılır.
- Hepsi tek kayıtla ve tek gönderimle gider. Kayıt mesajında bütün kart numaraları geçer.
- Tek numarayla çalışma bugünkü gibi kalır.
- Numaralardan biri bulunamazsa, tekrar ederse ya da kart zaten bitmişse komut hiçbir şey yapmadan durur ve sebebi söyler.
- Kurallardaki anlatım aynı değişiklikte güncellenir (`CLAUDE.md`'deki çalışma düzeni, `.claude/rules/calisma-duzeni.md`).

## Sınırlar

- Hattın kendisi, yayın kilidi ve kontrolleri değişmez. Hiçbir kontrol atlanmaz.
- `[skip ci]` gibi hattı atlayan işaretler kullanılmaz.

## Bitti sayılır

- `.claude/commands/is-bitti.md` birden çok numarayı tarif ediyor.
- Komut deneme kartlarıyla, ayrı bir dalda ve göndermeden denendi. Üç durum ölçüldü: iki kartın ikisi de tamam (tek kayıt), biri eksik (hiçbir şey değişmez), numara tekrar ediyor (durur).
- Kurallardaki anlatım güncellendi.

## Durum

yapılacak
