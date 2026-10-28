# Klasör düzeni ve adlandırma

- Çekirdeği (ortak motor), her sitenin klasörünü ve ortak bileşen kütüphanesini ayrı klasörlerde tut.
- Her site bir klasördür. Sitenin markası, tasarım değerleri, ayarları ve kural dosyası kendi klasöründe durur.
- Her modül aynı parçalardan oluşsun: veri modeli, servis, uçlar, izinler, metinler, testler.
- Dosya, klasör, tablo ve alan adlarını tek bir adlandırma biçimiyle yaz.
- Panel ve vitrin adreslerini tek bir dilde ve okunur sözcüklerle yaz.
- Projenin hafıza ve kural klasörleri sabittir: `kararlar/`, `tarihce/`, `planlar/`, `isler/`, `eklentiler/`, `.claude/rules/`, `.claude/commands/`. Bir bilgiyi her zaman kendi klasöründe ara ve oraya yaz.

## Kod klasörleri (karar 0015)

```
cekirdek/
  uygulama/            Next.js uygulaması: yalnız adres dosyaları (app/) ve ayarı
    app/yonetim/       yönetim paneli adresleri; geri kalan app/ vitrindir
  moduller/<modul>/    urun, stok, fiyat, vergi, sepet, odeme, siparis, iade, kargo,
                       kampanya, musteri, yorum, icerik, eposta, gorunurluk,
                       yasal-metinler, rapor, ekip
    model.ts           veri modeli
    servis.ts          iş kuralları
    uclar.ts           uçlar
    semalar.ts         uçların ekranla ortak girdi şemaları
    izinler.ts         izinler
    metinler/          metinler
    testler/           testler
  kapi/                dört giriş: herkese-acik/, musteri/, yonetici/, sahip/
  ayar-semasi/         bütün site ayarlarının şeması
  vitrin/              vitrin ekranları
  yonetim-paneli/      panel ekranları
  temalar/             hazır temalar
  arka-plan-isleri/    kuyruk ve zamanlı işler
  veritabani/          tablolar/, degisiklikler/ (numaralı)
  metinler/            ortak metinler, biçimleyiciler, terim sözlüğü
  kayitlar/            durum, izin, ikon gibi kayıt dosyaları
  izleme/              hata yakalama, sağlık ucu, yoklamalar
  eklentiler/          eklentilerin kodu
  testler/             modüller arası ve uçtan uca testler
  surum-notlari/
bilesenler/            ortak bileşen kütüphanesi; tasarim-degerleri/ altında tasarım değerleri
sahip-paneli/          ayrı Next.js uygulaması
komutlar/              site kurma, güncelleme, teslim, yayın
siteler/<kod-adi>/     kimlik.json, ayarlar.json, baslangic/, marka/, tema/, vitrin/,
                       testler/, KURALLAR.md
sunucu/                Docker, Caddy ve yedek (yedek/) dosyaları
```

- Adlar Türkçedir ve yalnız İngiliz alfabesinin harfleriyle yazılır. Dosya ve klasör adları tireyle (`arka-plan-isleri`), tablo ve alan adları alt çizgiyle (`siparis_kalemleri`) yazılır. Araçların zorunlu tuttuğu adlar (`app/`, `page.tsx`, `route.ts`, `package.json`, `*.config.*`, `Dockerfile`) değişmez.
- Test dosyalarının adı `*.test.ts` ya da `*.test.tsx` ile biter.
- Bu ağaç değişirse kural dosyalarının `paths` satırları aynı değişiklikte güncellenir.
