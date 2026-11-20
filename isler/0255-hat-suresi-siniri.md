# 0255 · Kontrol hattının süre sınırı

## Amaç

Kontrol hattı 90 dakikalık süre sınırına yaklaştı. 2026-11-20'deki çalışma (44762439752, kayıt 575cd07) hiçbir test düşmeden bu sınıra takılıp kesildi. Yavaş bir makine denk gelince hat kodla ilgisiz bir sebeple yarıda kalıyor, yeniden çalıştırmak da ücretli. Hattın olağan süresiyle sınır arasında güvenli bir pay olmalı.

## Ölçülenler

- 44762439752: tarayıcı kurulumu 13 dakika (olağanda birkaç saniye), birim testleri 25 dakika (olağanda 15–17), tarayıcı testleri 50 dakikada 254 test geçmiş, hiç düşen yok, iş kesildi.
- 44736094238 ve 44663133477: birim testleri 15–17 dakika, tarayıcı testleri yaklaşık 40 dakika; hattın tamamı 65–70 dakika.
- Sınır kart 0146'da 45'ten 90 dakikaya çıkarıldı (o gün hattın tamamı 34 dakikaydı).

## Olmazsa olmazlar

- Önce son hat çalışmalarının adım sürelerini ölç, sürenin nereye gittiğini yaz (tarayıcı kurulumu, birim, tarayıcı, hız ölçümü, görüntü, yerel ortam).
- Yolu ölçüme göre seç ve nedenini yaz: sınırı yükseltmek, tarayıcı kurulumunu önbelleğe almak, tarayıcı testlerini ayrı işe ya da parçalara bölmek. Bölme seçilirse yayın kilidi (`pnpm hat-sonucu`) bütün parçaların yeşilini istemeli.
- Hat dosyası değişince yayın komutunun hat koruması ana daldakiyle karşılaştırır; değişiklik bu korumadan geçmeli ve korumayı zayıflatmamalı.
- Ücret etkisini yaz (bölmek dakika toplamını artırabilir).

## Sınırlar

- Testlerin kendisini hızlandırmak ya da test atlamak bu kartın işi değil.
- Hat dışındaki komutlara dokunulmaz.

## Bitti sayılır

- Seçilen yolla hattın olağan süresi ile sınırı arasındaki pay ölçülmüş ve kartta yazılı.
- Hat bu değişiklikle en az bir kez yeşil bitmiş.
- `pnpm hat-sonucu` yeni düzende yeşil olmayan kaydı yine reddediyor (testi `komutlar/testler/hat-sonucu.test.ts`).
- `.claude/rules/kurallari-koruyan-kontroller.md` tablosunun kontrol hattı satırı güncel.

## Sonuç

- Son 25 çalışmanın adım süreleri ölçüldü (karar 0156'daki tablo). Yeşil hatlar 52–82 dakika; süre birim (11–24) ve tarayıcı testlerinde (31–57,6) büyüyor; tarayıcı kurulumu 25 çalışmanın yalnız birinde uzun (13 dk), hız ölçümü 5–6, görüntü ve yerel ortam birer dakika. 44762439752 ikinci denemede 302 tarayıcı testi geçtikten sonra hız ölçümünde kesildi; tamamı ~95 dakika sürerdi.
- Seçilen yol: işin sınırı 150 dakika. Pay bugünkü en uzun çalışmaya göre ~55 dakika (%58). Ücret harcanan dakikadır, olağan çalışmanın ücreti değişmez; takılan çalışma en çok 150 dakika yakar. Bölme dakika toplamını artırırdı ve ortak veritabanlı test düzenini bozabilirdi, önbellek ara sıra birkaç dakika kazandırırdı; ikisi seçilmedi (karar 0156).
- Hat tek iş kaldığı için yayın kilidi değişmedi; `komutlar/testler/hat-sonucu.test.ts` ve hat korumasının testleri (`yayin.test.ts`) yeşil. Yayın komutunun hat koruması hat dosyasını ana daldakiyle karşılaştırır, değişiklik ana dala girince koruma onunla karşılaştırır.
- Hattın bu değişiklikle yeşil bitmesi gönderimden sonra görülür.

## Durum

bitti
