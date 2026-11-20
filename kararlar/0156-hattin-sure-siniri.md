# 0156 · Kontrol hattının süre sınırı 150 dakika

## Tarih

2026-11-20

## Karar

Kontrol hattının tek işinin süre sınırı 90 dakikadan 150 dakikaya çıkar (kart 0255). Hat tek iş olarak kalır, tarayıcı testleri bölünmez, tarayıcı kurulumu önbelleğe alınmaz.

## Neden

Son 25 çalışmanın adım süreleri ölçüldü (GitHub'ın adım kayıtlarından, dakika):

| Çalışma | Birim | Tarayıcı kurulumu | Tarayıcı testleri | Hız ölçümü | Tamamı |
|---|---|---|---|---|---|
| Yeşil hatlar (6 çalışma) | 11–21 | 1'in altında | 31–49 | 5–6 | 52–82 |
| 44762439752 deneme 1 | 24 | 13 | 49 (yarıda) | – | 90, kesildi |
| 44762439752 deneme 2 | 22 | 1 | 57,6 (302 test geçti) | 6 (yarıda) | 90, kesildi |

- Süre tarayıcı testlerinde ve birim testlerinde büyüyor: test sayısı her kartla artıyor, makinenin hızı da çalışmadan çalışmaya değişiyor. Görüntü ve yerel ortam denemesi birer dakika, hız ölçümü 5–6 dakika.
- Son yeşil hat 82 dakikaydı, sınıra 8 dakika pay kalmıştı; son çalışmanın tamamı yaklaşık 95 dakika sürerdi. 150 dakika bugünkü en uzun çalışmaya yaklaşık 55 dakika (%58) pay bırakır.
- GitHub ücreti harcanan dakikaya göre alır; sınırı yükseltmek olağan çalışmanın ücretini değiştirmez. Değişen tek şey takılan bir çalışmanın en çok 150 dakika yakabilmesidir. Bugün sınıra takılan çalışma da yeniden çalıştırıldığı için iki kat ödeniyordu.

## Düşünülen diğer yollar

- **Tarayıcı testlerini parçalara ya da ayrı işe bölmek:** Hattın beklenen süresini kısaltırdı, ama her parça paketleri, veritabanını, örnek mağazayı ve uygulamanın ısınmasını yeniden kurar (parça başına birkaç dakika), yani ödenen dakika toplamı artar. Testler ortak bir veritabanını paylaşır, tema testi kendi aşamasında en sona kalır; bölmek bu düzeni bozabilir. Yayın kilidinin bütün parçaların yeşilini istemesi de ayrıca değişirdi. Seçilmedi.
- **Tarayıcı kurulumunu önbelleğe almak:** 25 çalışmanın yalnız birinde uzun sürdü (13 dakika), ötekilerde bir dakikanın altında. Önbellek sistem paketlerini (`--with-deps`) kapsamaz, kazancı ara sıra birkaç dakikadır. Seçilmedi.
- **Adım başına sınır koymak:** Takılan adımın yaktığı süreyi biraz kısaltırdı, ama her adım için ayrı bir tahmin gerektirir ve büyüyen test takımında yeşil çalışmayı kesebilir. Seçilmedi; tarayıcı testlerinin her testinin kendi sınırı zaten vardır (`playwright.config.ts`).

## Sonuçları

- Hattın beklenen süresi değişmez (bugün ~95 dakikaya yaklaşıyor); gönderimden yeşil sonuca kadar beklemek uzun kalır.
- Takılan bir çalışma en çok 150 dakika yakar (önce 90).
- Test takımı büyüdükçe pay yine azalır. Yeşil bir çalışma 120 dakikayı geçerse bölme yeniden düşünülür.
