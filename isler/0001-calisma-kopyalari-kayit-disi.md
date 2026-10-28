# 0001 · Çalışma kopyaları klasörü kayıt dışı kalsın

## Amaç

`.claude/worktrees/` klasöründe açılan çalışma kopyaları ana klasörde kaydedilmemiş dosya gibi görünüyor. Klasör `.gitignore` dosyasına eklenmeli.

## Olmazsa olmazlar

- `.gitignore` dosyasına `.claude/worktrees/` satırı eklenir.

## Sınırlar

- Başka bir `.gitignore` değişikliği bu işe karıştırılmaz.

## Bitti sayılır

- Çalışma kopyası açıkken ana klasörde `git status` bu klasörü göstermez.
