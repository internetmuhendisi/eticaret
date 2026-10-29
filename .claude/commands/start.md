---
description: Oturumun başında çalışır. Projenin durumunu özetler: tarihçedeki son üç giriş, yapılacak ve çalışılıyor durumundaki kartlar, açık çalışma kopyaları. Hiçbir dosyayı değiştirmez.
allowed-tools: Read, Glob, Grep, Bash(ls *), Bash(git worktree list*), Bash(git status *), Bash(git branch *)
---

# Proje durumu

Bu komut oturumun başında çalışır: `.claude/settings.json` içindeki oturum başı kancası Claude'a ilk cevabında bu adımları uygulamasını söyler. Elle de çağrılabilir.

Bu komut yalnız okur. Hiçbir dosyayı yazma, değiştirme ya da silme. Kayıt yapma, GitHub'a gönderme, çalışma kopyası açma ya da kaldırma.

## 1. Tarihçedeki son üç giriş

- `tarihce/` klasöründe en yeni ayın dosyasını oku (`README.md` dışındaki `YYYY-AA.md` dosyaları). En yeni giriş dosyanın en üstündedir.
- O ayda üçten az giriş varsa bir önceki ayın dosyasından tamamla.
- Her giriş için tarihi ve başlığı yaz, özetini tek satıra indir.

## 2. Açık kartlar

- `isler/` klasöründeki kartları oku (`README.md` ve `sablon.md` dışındakiler).
- Durumu `yapılacak` ya da `çalışılıyor` olan kartları numara sırasıyla yaz: numara, kısa ad, durum.
- Durum başlığı olmayan ya da durumu bu üçünden biri olmayan kart varsa onu ayrıca yaz.
- Açık kart yoksa "açık kart yok" de.

## 3. Açık çalışma kopyaları

- `git worktree list` ile ana klasör dışındaki çalışma kopyalarını bul.
- Her biri için klasörü, dalı ve kaydedilmemiş değişiklik olup olmadığını yaz (`git -C <klasör> status --short`).
- Ana dala alınmış dalı olan kopya varsa "kaldırılabilir" diye işaretle (`git branch --merged main`).
- Açık kopya yoksa "açık çalışma kopyası yok" de.

## Sonuç

Üç kısa başlık altında yaz: son girişler, açık kartlar, çalışma kopyaları. Yorum ya da öneri ekleme. Yalnız dikkat isteyen bir şey varsa (durumu belirsiz kart, kaydedilmemiş iş olan kopya) en sonda bir satırla söyle.
