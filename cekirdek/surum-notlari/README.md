# Sürüm notları

Çekirdeğin her sürümünün notu bu klasördedir: `<sürüm>.md`, örneğin `0.1.0.md`. Çalışan sürüm `cekirdek/surum.ts` dosyasında, sitenin kayıtlı sürümü kimlik dosyasında yazar (karar 0011, 0024).

- Sürüm `büyük.orta.küçük` biçimindedir. Satışa hazır olana kadar `0.` ile başlar.
- Çekirdek sürümü değişince aynı değişiklikte notu yazılır. `surum.ts`'deki sürümün ve sitelerin kimliklerindeki her sürümün notu olmalıdır; bunu `cekirdek/testler/surum-notlari.test.ts` denetler.
- Bir sürüm numarası yalnız bir çekirdeği gösterir (karar 0205). Görüntünün tarifi (`sunucu/cekirdek/Dockerfile` ve `Dockerfile.dockerignore`), görüntüye giren bir dosya (dockerignore'un izin listesi; testler ve `.md` belgeler hariç, sürüm notları yayından sonra düzeltilebilir) ya da demo paketi değişmişse yayından önce sürüm artar ve notu yazılır; deneme yayınları da numara alır, sürüme ek yazılmaz. Yayın komutu sunucudaki bütün sitelerin kayıtlarında aynı sürümü başka bir parmak iziyle bulursa durur (`komutlar/cekirdek-izi.mts`).
- Sürüm artınca proje sitelerinin kimliği kendiliğinden değişmez: her site kendi güncelleme işinde yeni sürüme geçer (değişmez kural 3). Yerel ortam denemesinin geçici deneme sitesi her açılışta çekirdeğin o anki sürümünü alır, elle artırılmaz. Yerel ortam denemesinin proje sitesi Örnek Mağaza'dır; kimliği şu anki sürümde değilse açılmaz, "ölçülmedi" satırıyla yazılır, yerine geçici bir deneme sitesi açılır (kart 0132, `yerelDenemeSecimi`).
- Yayınlanmış bir sürümün notu sonradan değiştirilmez, yalnız yazım hatası düzeltilir. Bu kuralın kontrolü yoktur, yalnız disiplindir.

Her not şu başlıkları taşır, sırası da budur:

1. `# <sürüm>`: sürümün numarası.
2. `## Tarih`: sürümün çıktığı gün.
3. `## Güvenlik`: sürüm bir güvenlik açığı kapatıyorsa ne kapattığı. Kapatmıyorsa `Güvenlik açığı kapatmaz.` yazar. Testi bölümün dolu olduğuna bakar, cümlenin kendisine bakmaz. Güvenlik açığı kapatan sürüm sahip panelinde ayrıca işaretlenir (`.claude/rules/cok-siteli-yapi.md`).
4. `## Değişenler`: bu sürümde neyin eklendiği ve değiştiği, kart numaralarıyla.
5. `## Sitelere etkisi`: güncellenen bir sitenin ne yapması gerektiği. Site klasöründe değişiklik, yeni ayar, yeni gizli bilgi, mağaza sahibinin göreceği bir fark.
6. `## Veritabanı değişiklikleri`: bu sürümün getirdiği numaralı değişiklikler ve geri dönüş notları (karar 0022).
