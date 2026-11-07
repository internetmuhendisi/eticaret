# 0097 · Bozuk kimlik vergi ve öteki servislerde beklenmeyen hata veriyor

## Amaç

Kimlik biçiminde olmayan bir metin (`"abc"`) servise gelince sorgu veritabanında `22P02` hatasıyla düşüyor, kullanıcı "bulunamadı" yerine beklenmeyen hata (500) alıyor. Kart 0077'nin bağımsız kontrolü kategori servisinde buldu. Kategori ve ürün servisleri kart 0077'de düzeltildi: kimlik önce `kimlikMi` (`cekirdek/veritabani/turler.ts`) ile denetleniyor.

Aynı hata vergi servisinde de var (`cekirdek/moduller/vergi/servis.ts`: `degisebilenSinif`, `degisebilenOran`, `kargoSinifiniDegistir`; kart 0077 sırasında kod okunarak bulundu, çalıştırılmadı). Başka servislerde de olabilir.

## Olmazsa olmazlar

- Dışarıdan kimlik alan bütün servis işlevleri aranır (vergi, ekip, mağaza ayarları, dosya, e-posta, oturum ve sonraki modüller).
- Bozuk kimlik sorguya girmeden "bulunamadı" sayılır. Denetim tek yerden yapılır (`kimlikMi`).
- Her düzeltilen işlev için bozuk kimlikle test yazılır, düzeltme kaldırılınca kırmızıya düştüğü gösterilir.
- Uçlar gelince kapının girdi şemasının da kimliği denetlediği ayrıca ölçülür; servis denetimi yine kalır.

## Sınırlar

- Ürün ve kategori servisleri kart 0077'de düzeltildi, yeniden yazılmaz.
- Kimliğin biçimi değişmez.

## Bitti sayılır

- Aranan her servis işlevi bir listede yazılı; her biri bozuk kimlikle "bulunamadı" ya da boş sonuç veriyor, testte.
- Düzeltmeler bilerek kaldırılınca testler kırmızıya düşüyor.

## Durum

yapılacak
