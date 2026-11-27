# 0331 · Hız ölçümünde etiket sayfasının kayması bir kez 0,458

## Amaç

Kart 0316'nın kapanışında yerelde hattın koşulunda (temiz veritabanı, iki işlemci) tam hız ölçümü etiket sayfasında kaymayı 0,458 ölçtü (sınır 0,1; üç ölçümün ortancası); öteki 16 sayfa geçti. Aynı koşulda yalnız etiket sayfası üç kez yeniden ölçüldü, üçünde de 0,001. Aynı gün kart 0315'in ölçümünde de 0,001'di. Kart 0316 vitrine dokunmaz (yalnız biçimleyiciye iki işlev ekledi, kod boyutu değişmedi). Kaymanın kaynağı bilinmiyor; hatta görülürse hattı durdurur.

## Olmazsa olmazlar

- Kaymanın kaynağı ölçümün içinden yazdırılarak bulunur (kart 0272'nin yolu: hangi öğenin kaydığı).
- Tam ölçümün sırasında mı (önceki sayfaların ardından) yalnız etiket sayfasında mı görüldüğü ayrılır.
- Sebep doğrulanmadan düzeltme yazılmaz.

## Sınırlar

- Hız hedefleri ve bilinen aşım listesi değişmez.

## Bitti sayılır

- Kaynak ölçümle bulundu ve düzeltildi ya da yeniden üretilemediği art arda çalışmalarla ölçülerek yazıldı.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
