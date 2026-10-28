# 0006 · Kod biçimi ve kod denetim kuralları

## Amaç

Yazılı kuralların bir kısmı kod yazılırken otomatik yakalansın (`.claude/rules/kurallari-koruyan-kontroller.md`). Kod tek biçimde dursun, biçimsiz kod kayda girmesin.

Önce 0005 bitmiş olmalı.

## Olmazsa olmazlar

- Kod biçimlendirici ve kod denetim aracı, tek komutla bütün çalışma alanında çalışır.
- Şimdiden kurulabilen yasaklar hata sayılır: ham renk değeri, koda gömülü ekran metni, güvensiz sorgu, `any` türü. Henüz koda dönüşemeyenler listede "sonra" diye işaretlenir.
- Kayıt öncesi kontrol: biçim ve denetim kırmızıysa kayıt durur. Var olan gizli bilgi kalkanı bozulmaz.
- Her yasak için bilerek bozulmuş küçük bir örnek. Kontrolün onu yakaladığı gösterilir.

## Sınırlar

- Testler ve yayın öncesi kontrol hattı bu işe girmez (0007, 0017).
- Var olan belgelerin biçimine dokunulmaz.

## Bitti sayılır

- Biçim ve denetim komutları temiz projede geçiyor.
- Her bozuk örnek kontrolü kırmızıya düşürüyor.
- Biçimsiz bir dosyayla kayıt denendiğinde kayıt duruyor.
- `.claude/rules/kurallari-koruyan-kontroller.md` tablosunda kurulan kontroller işaretlendi.

## Durum

bitti
