---
description: Oturumun sonunda çalışır. Kartsız işleri tarihçeye yazar, onayla kaydedip GitHub'a gönderir, ana dala alınmış çalışma kopyalarını kaldırır, yarım kartları ve bir sonraki adımı söyler.
disable-model-invocation: true
---

# Oturum sonu

Bu komutu yalnız kullanıcı çağırır. Adımları sırayla yap. Bir adımda dur dendiyse sonraki adımlara geçme.

Kartlı işlerin kapanışı `/is-bitti` komutunun işidir. Bu komut bir kartın durumunu değiştirmez ve kartlı iş için tarihçeye giriş yazmaz.

## 1. Kartsız işleri tarihçeye yaz

Giriş bu adımda yazılır ki 2. adımdaki kayda girsin.

- Bu oturumda yapılan, bir karta bağlı olmayan işleri bul: konuşmaya ve bu oturumdaki kayıtlara (`git log`) bak.
- Her biri için tarihçede giriş olup olmadığına bak. Girişi olmayan her iş için o ayın dosyasına (`tarihce/YYYY-AA.md`) giriş ekle. Dosya yoksa `# YYYY-AA` başlığıyla aç.
- Giriş ay başlığının hemen altına, en üste girer. Biçim: `## YYYY-AA-GG — <işin kısa adı>`, altında en fazla iki satır özet (`tarihce/README.md`).
- Kartsız iş yoksa ya da hepsinin girişi varsa bir şey yazma.

## 2. Kaydedilmemiş değişiklikler

- Ana klasörde `git status --short` çalıştır. Değişiklik yoksa bunu söyle ve 3. adıma geç.
- Dal `main` değilse bunu söyle ve bu adımı atla.
- Değişiklikleri kullanıcıya kısaca göster: dosya başına bir satır, ne değiştiği. Önerdiğin kayıt mesajını da yaz (Türkçe, kısa).
- Kullanıcıdan onay iste ve bekle. Onay gelmezse kaydetme, gönderme, 3. adıma geç.
- Onay gelirse yalnız gösterdiğin dosyaları kayda ekle ve kaydet. `.env` asla kayda girmez.
- `git push` ile gönder. Zorla gönderme. Bir kontrol kaydı durdurursa ya da gönderme reddedilirse etrafından dolanma, kullanıcıya söyle ve dur.

## 3. Ana dala alınmış çalışma kopyaları

- `git worktree list` ile ana klasör dışındaki çalışma kopyalarını bul. Yoksa bunu söyle ve 4. adıma geç.
- Her kopya için üç şeye bak:
  - Kaydedilmemiş değişiklik var mı (`git -C <klasör> status --short`).
  - Dalı ana dala alınmış mı (`git branch --merged main`).
  - Dalda iş yapılmış mı: `git reflog show <dal>` içinde oluşturma dışında kayıt yoksa işe henüz başlanmamıştır.
- Kaydedilmemiş değişikliği yok, dalı ana dala alınmış ve dalda iş yapılmış kopyayı kaldır: `git worktree remove <klasör>`, sonra `git branch -d <dal>`. Zorlama kullanma.
- Öteki kopyalara dokunma. Hangisi olduğunu ve neden kaldırılmadığını söyle. Git kaldırmayı reddederse de dokunma, söyle.

## 4. Yarım kalan kartlar

- `isler/` klasöründe durumu `çalışılıyor` olan kartları numara sırasıyla yaz: numara, kısa ad.
- Bunlardan işi ana dala alınmış olanlar için kullanıcının `/is-bitti <kart numarası>` çalıştırması gerektiğini söyle.
- Yarım kart yoksa "yarım kart yok" de.

## 5. Sonucu söyle

Kısa yaz, her adım için bir satır:
- Tarihçeye yazılan girişler.
- Kaydın mesajı ve gönderilip gönderilmediği, ya da neden kaydedilmediği.
- Kaldırılan ve dokunulmayan çalışma kopyaları.
- Yarım kartlar.

En sonda bir sonraki oturumda nereden devam edileceğini tek cümleyle söyle.
