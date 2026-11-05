# Sürüm notları

Çekirdeğin her sürümünün notu bu klasördedir: `<sürüm>.md`, örneğin `0.1.0.md`. Çalışan sürüm `cekirdek/surum.ts` dosyasında, sitenin kayıtlı sürümü kimlik dosyasında yazar (karar 0011, 0024).

- Sürüm `büyük.orta.küçük` biçimindedir. Satışa hazır olana kadar `0.` ile başlar.
- Çekirdek sürümü değişince aynı değişiklikte notu yazılır. `surum.ts`'deki sürümün ve sitelerin kimliklerindeki her sürümün notu olmalıdır; bunu `cekirdek/testler/surum-notlari.test.ts` denetler.
- Yayınlanmış bir sürümün notu sonradan değiştirilmez, yalnız yazım hatası düzeltilir. Bu kuralın kontrolü yoktur, yalnız disiplindir.

Her not şu başlıkları taşır, sırası da budur:

1. `# <sürüm>`: sürümün numarası.
2. `## Tarih`: sürümün çıktığı gün.
3. `## Güvenlik`: sürüm bir güvenlik açığı kapatıyorsa ne kapattığı. Kapatmıyorsa `Güvenlik açığı kapatmaz.` yazar. Testi bölümün dolu olduğuna bakar, cümlenin kendisine bakmaz. Güvenlik açığı kapatan sürüm sahip panelinde ayrıca işaretlenir (`.claude/rules/cok-siteli-yapi.md`).
4. `## Değişenler`: bu sürümde neyin eklendiği ve değiştiği, kart numaralarıyla.
5. `## Sitelere etkisi`: güncellenen bir sitenin ne yapması gerektiği. Site klasöründe değişiklik, yeni ayar, yeni gizli bilgi, mağaza sahibinin göreceği bir fark.
6. `## Veritabanı değişiklikleri`: bu sürümün getirdiği numaralı değişiklikler ve geri dönüş notları (karar 0022).
