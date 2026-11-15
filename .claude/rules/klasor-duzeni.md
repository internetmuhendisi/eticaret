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
    app/yonetim/       yönetim paneli adresleri
    app/(vitrin)/      vitrin sayfaları ve üst-alt kısım çerçevesi (kart 0108); adrese girmez
  moduller/<modul>/    urun, kategori, marka, etiket, ozellik, stok, fiyat, vergi, sepet, odeme,
                       siparis, iade, kargo, kampanya, musteri, oturum, yorum, icerik, eposta,
                       gorunurluk, yasal-metinler, rapor, ekip, degisiklik-kaydi, robot-korumasi,
                       magaza-ayarlari, dosya, tema, duzen, menu
    model.ts           veri modeli
    servis.ts          iş kuralları
    uclar.ts           uçlar
    semalar.ts         uçların ekranla ortak girdi şemaları
    izinler.ts         izinler
    metinler/          metinler
    testler/           testler
  surum.ts             çekirdeğin sürümü (karar 0024)
  katalog/             bileşen kataloğu: parça listesi, örnekler, sayfa, kaynak taraması (karar 0078)
  kapi/                dört giriş: herkese-acik/, musteri/, yonetici/, sahip/; uç belgesi uclar.md
  ayar-semasi/         bütün site ayarlarının şeması
  bolgeler/            ülke, il ve ilçe listesi (veri dosyaları), bölge doğrulaması ve ortak adres
                       şeması (kararlar 0056, 0057)
  vitrin/              vitrin ekranları; bolum-kutuphanesi/ (bölüm tarifi, düzen kuralları, tür ve görünüş
                       kaydı, vitrin bağlamı), bolumler/<tür>/ (her bölüm türünün kodu, elle içerik taşımaz;
                       ortak/ bölümlerin ortak parçaları), urun-karti/ (ürün kartı, fiyat bileşeni ve
                       kartın verisi) (karar 0081, 0083, 0085)
  yonetim-paneli/      panel ekranları
  temalar/             tema şeması, hazır temalar (hazir/), birleşim ve okunurluk (karar 0080)
  arka-plan-isleri/    kuyruk ve zamanlı işler
  veritabani/          tablolar/, degisiklikler/ (numaralı)
  metinler/            ortak metinler, biçimleyiciler, terim sözlüğü
  kayitlar/            durum, izin, ikon, işlev gibi kayıt dosyaları
  izleme/              hata yakalama, sağlık ucu, yoklamalar
  eklentiler/          eklentilerin kodu (<kod>/ modülle aynı parçalar) ve bağlantı noktaları: açıklık, stok
                       kancaları, ürün sayfası yuvaları (karar 0117)
  testler/             modüller arası testler; tarayıcı testleri uctan-uca/ altında
  surum-notlari/
bilesenler/            ortak bileşen kütüphanesi: parcalar/ (shadcn/ui'dan uyarlanmış parçalar), form/,
                       ikonlar/ (ikon sözlüğü), tasarim-degerleri/ (tasarım değerleri),
                       shadcn-kaynagi/ (parçaların asıl hâlleri, kod değil; karar 0077)
sahip-paneli/          ayrı Next.js uygulaması
komutlar/              site kurma, güncelleme, teslim, yayın
siteler/<kod-adi>/     kimlik.json, ayarlar.json, baslangic/, marka/, tema/, vitrin/,
                       testler/, KURALLAR.md
sunucu/                Docker, Caddy (yerel caddy/, sunucudaki ön kapı on-kapi/), sunucu kurulumu
                       (kurulum/), sunucu kaydı (sunucular.json),
                       sitelerin kutu kullanıcıları (site-kullanicilari.json) ve yedek (yedek/)
yamalar/               bağımlılık yamaları (pnpm `patchedDependencies`, karar 0130)
denetim/               kod denetiminin projeye özel kuralları (kurallar/), bozuk örnekleri
                       (bozuk-ornekler/) ve kendi kendini denetleme betiği (karar 0017)
```

- Adlar Türkçedir ve yalnız İngiliz alfabesinin harfleriyle yazılır. Dosya ve klasör adları tireyle (`arka-plan-isleri`), tablo ve alan adları alt çizgiyle (`siparis_kalemleri`) yazılır. Araçların zorunlu tuttuğu adlar (`app/`, `page.tsx`, `route.ts`, `package.json`, `biome.json`, `*.config.*`, `Dockerfile`) değişmez.
- Test dosyalarının adı `*.test.ts` ya da `*.test.tsx` ile biter.
- Bu ağaç değişirse kural dosyalarının `paths` satırları aynı değişiklikte güncellenir.
