# 0008 · Metin dosyaları ve biçimleyici

## Amaç

Ekrandaki bütün metinler anahtarlı metin dosyalarından okunsun. Para, tarih ve sayı tek ortak biçimleyiciden geçsin, dil ve para birimi site ayarından gelsin (`.claude/rules/metinler.md`). İlk sayfadan önce bu yol hazır olmalı, yoksa ilk sayfa koda gömülü metinle başlar.

Önce 0005 bitmiş olmalı.

## Olmazsa olmazlar

- `cekirdek/metinler/` altında anahtarlı metin dosyası ve metni anahtarla okuyan tek bir yol.
- Olmayan bir anahtar tür kontrolünde hata verir.
- Para, tarih ve sayı biçimleyicisi. Dil, para birimi ve biçimi dışarıdan verilir, içinde Türkiye'ye özgü sabit değer yoktur.
- Biçimleyicinin testleri: Türk lirasında binlik ve ondalık ayırıcı, simgenin yeri.

## Sınırlar

- Modüllere özel metinler o modül yazılınca eklenir.
- İkinci dil eklenmez.

## Bitti sayılır

- Var olmayan bir anahtarı okumaya çalışan kod tür kontrolünden geçmiyor.
- Biçimleyici testleri geçiyor, `1.247,00 ₺` örneği doğru üretiliyor.
- Kodda biçimleyici dışında para ya da tarih biçimlendiren bir yer yok.

## Durum

yapılacak
