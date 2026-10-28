# 0005 · Çalışma alanı ve tür kontrolü

## Amaç

Kodun ilk satırından önce projenin çalışma alanı kurulur. `cekirdek/`, `bilesenler/` ve `sahip-paneli/` tek bir çalışma alanında durur, bütün kod tek komutla tür kontrolünden geçer (karar 0013, 0015).

## Olmazsa olmazlar

- Kökte çalışma alanı tanımı ve paket kilidi. Paket yöneticisi ve Node.js'in uzun destekli sürümü sabitlenir.
- `cekirdek/uygulama`, `bilesenler` ve `sahip-paneli` için boş paket tanımları, adları karar 0015'e uygun.
- Ortak, sıkı TypeScript ayarı. Her paket bunu kullanır.
- Tek komutla bütün çalışma alanının tür kontrolü.
- `.claude/rules/klasor-duzeni.md` ağacıyla çelişen bir klasör açılmaz.

## Sınırlar

- Next.js uygulaması, sayfa ya da veritabanı bu işe girmez.
- Kod denetim kuralları ve testler ayrı kartlardır (0006, 0007).

## Bitti sayılır

- Tür kontrolü komutu temiz projede geçiyor.
- Bilerek yanlış türde bir değer yazılınca komut kırmızıya düşüyor, değer geri alınınca yeşile dönüyor.
- Paket kilidi kayıtta, Node.js sürümü sabitlenmiş.
- Paket yöneticisi seçimi nedeniyle birlikte bir cümleyle yazıldı.

## Durum

yapılacak
