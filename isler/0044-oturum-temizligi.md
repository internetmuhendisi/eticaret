# 0044 · Süresi dolan oturumların temizliği

## Amaç

Süresi dolan ve kapanan oturum satırları oturum tablolarında birikir (karar 0039). Arka plan işiyle belirli süre sonra silinirler.

Önce 0031 bitmiş olmalı.

## Olmazsa olmazlar

- Zamanlı iş, süresi dolalı ya da kapanalı belirli süre geçmiş satırları `yonetici_oturumlari` ve `musteri_oturumlari` tablolarından siler. Süre tek yerde yazar.
- Silme için gereken indeks numaralı değişiklik dosyasıyla eklenir.

- `yonetici_giris_adimlari` tablosunun süresi dolan satırları da silinir (kart 0028, içinde şifreli gizli olabilir).
- `musteri_sifre_sifirlamalari` ve `yonetici_sifre_sifirlamalari` tablolarının kullanılmış ve süresi dolan satırları da silinir (kart 0034, karar 0052).

## Sınırlar

- Geçerli oturumlara dokunulmaz.

## Bitti sayılır

- Test gerçek veritabanıyla eski satırın silindiğini, geçerli oturumun kaldığını gösteriyor.

## Durum

yapılacak
