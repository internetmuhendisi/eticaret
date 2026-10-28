---
description: Bir kartın bitti sayılır listesini kontrol eder, eksik yoksa kartı bitti yapar, tarihçeye yazar, kaydedip GitHub'a gönderir.
argument-hint: <kart numarası, örneğin 0004>
disable-model-invocation: true
---

# İş bitti: kart $ARGUMENTS

Kart numarası: `$ARGUMENTS`. Numara verilmediyse ya da dört haneye tamamlanınca `isler/` klasöründe bu numarayla başlayan tek bir kart yoksa kullanıcıya söyle ve dur.

Adımları sırayla yap. Bir adımda dur dendiyse sonraki adımlara geçme.

## 1. Bitti sayılır listesini kontrol et

- Kartı baştan sona oku. Durumu zaten `bitti` ise bunu söyle ve dur.
- İşin yapıldığı yeri bul. Kartın çalışma kopyası (`.claude/worktrees/<kart numarası>`) ya da dalı varsa ve ana dala alınmamışsa bunu söyle ve dur.
- "Bitti sayılır" listesindeki her maddeyi tek tek kontrol et. Her madde için bir ölçüm yap: dosyayı oku, `git status` ya da `git diff` çalıştır, testi çalıştır. Tahminle "tamam" deme.
- "Kaydedildi" ya da "GitHub'a gönderildi" diyen maddeler 4. adımda yapılır. Onları 4. adımdan sonra kontrol et.
- Ana klasörde bu kartla ilgisi olmayan kaydedilmemiş bir değişiklik varsa söyle ve dur, çünkü o değişiklik bu kayda karışır.
- Eksik bir madde varsa hangi maddenin neden eksik olduğunu söyle ve dur. Eksiği kendin tamamlama.

## 2. Kartın durumunu bitti yap

Kartın "Durum" başlığı altındaki değeri `bitti` yap. Kartın başka satırına dokunma.

## 3. Tarihçeye giriş yaz

- O ayın dosyasına (`tarihce/YYYY-AA.md`) giriş ekle. Dosya yoksa `# YYYY-AA` başlığıyla aç.
- Giriş ay başlığının hemen altına, en üste girer.
- Biçim: `## YYYY-AA-GG — <işin kısa adı> (iş <numara>)`, altında en fazla iki satır özet. Öteki girişlerle aynı dili kullan.

## 4. Kaydet ve GitHub'a gönder

- Yalnız bu kartın işine ait dosyaları, kartı ve tarihçeyi kayda ekle. `.env` asla kayda girmez.
- Kayıt mesajı Türkçe ve kısa olsun, kart numarasını içersin.
- `git push` ile gönder. Zorla gönderme. Gönderme reddedilirse ya da bir kontrol kaydı durdurursa etrafından dolanma, kullanıcıya söyle ve dur.
- Gönderdikten sonra 1. adımda bıraktığın kayıt ve gönderme maddelerini kontrol et (`git status`, `git log origin/main -1`).

## 5. Sonucu söyle

Kısa yaz:
- Kontrol ettiğin her madde ve sonucu, bir satırda bir madde.
- Kaydın mesajı ve gönderilip gönderilmediği.
- Kullanıcının yapması gereken bir şey varsa o. Kartın çalışma kopyası ya da dalı hâlâ duruyorsa bunu da söyle.
