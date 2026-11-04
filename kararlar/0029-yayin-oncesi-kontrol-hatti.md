# 0029 · Yayın öncesi kontrol hattı GitHub Actions'ta

## Tarih

2026-11-04

## Karar

- **Yer:** Hat GitHub Actions'ta çalışır (`.github/workflows/kontrol-hatti.yml`). GitHub'a her gönderimde ve her dalda çalışır. Elle de başlatılabilir. Aynı dala yeni bir gönderim gelince o daldaki eski çalışma durdurulur.
- **Sıra:** Adımlar sırayla çalışır ve ilk kırmızı adım hattı durdurur:
  1. Paketlerin kilit dosyasından kurulması
  2. Tür kontrolü
  3. Biçim ve denetim, ardından denetimin kendi testi
  4. Site klasörlerinin doğrulaması
  5. Güvenlik taraması
  6. Veritabanının açılması
  7. Birim ve entegrasyon testleri (gerçek veritabanıyla veri ayrımı testi dahil)
  8. Tarayıcı testleri
  9. Çekirdeğin Docker görüntüsünün üretilmesi ve denetlenmesi (karar 0027)
  10. Yerel ortam denemesi (karar 0028)
- **Sürümler:** Node.js ve pnpm sürümleri kökteki `package.json` dosyasından okunur (karar 0016). Kullanılan GitHub eylemleri sürüm adıyla değil, değişmez kayıt numarasıyla sabitlenir.
- **Gizli bilgi yok:** Hatta gerçek şifre bulunmaz. `pnpm hat-ortami-hazirla` her çalışmada `.env` dosyasını `.env.example` biçiminde, rastgele şifrelerle üretir. Yerelde `.env` zaten varsa komut ona dokunmadan durur. GitHub'a gizli bilgi tanımlanmaz. Hatta müşteri verisi de yoktur.
- **Güvenlik taraması eşiği:** `pnpm guvenlik-taramasi` iki kural uygular. Çalışırken kullanılan paketlerde orta ve üstü bir açık hattı durdurur. Yalnız geliştirmede kullanılan paketlerde yüksek ve kritik açıklar durdurur.
- **Yeşil kilidi:** `pnpm hat-sonucu [kayıt]` yalnız şu durumda yeşil der: hattın bu kayıt için en son çalışması (en son denemesi) bitmiş ve başarılı olmalı. Çalışma hiç olmamışsa, sürüyorsa, başarısız ya da iptal olmuşsa, GitHub'ın cevabı okunamıyorsa ya da çalışma kopyasında kaydedilmemiş değişiklik varsa cevap "yeşil değil"dir. Yayın komutu (kart 0021) işe bu kontrolle başlar.

## Neden

- Kod zaten GitHub'da duruyor. Hat aynı yerde, ek bir hizmet ya da sunucu kurulmadan çalışır.
- Rastgele şifreler, sızacak bir gizli bilgi bırakmaz. GitHub'ın sunucuları Almanya dışında olsa da oraya veri gitmediği için karar 0009 korunur.
- Sıra ucuz kontrolden pahalıya gider. Tür ya da biçim hatası, görüntü üretimini beklemeden birkaç dakikada görülür.
- Müşteriye giden kodda hiçbir açığa göz yumulmaz. Geliştirme araçlarındaki her küçük uyarı ise işi kilitlemesin. Bugün `drizzle-kit`'in içindeki eski bir `esbuild` yalnız geliştirmede orta düzey bir açık taşıyor.
- Yeşil kilidinin belirsiz her durumda "hayır" demesi, kontrolden geçmemiş bir kaydın yanlışlıkla yayına çıkmasını önler.

## Düşünülen diğer yollar

- Kontrolleri yalnız yerelde, kayıt anında çalıştırmak: Seçilmedi. Atlanabilir, ayrıca her bilgisayarda aynı ortam garanti edilemez. Kayıt öncesi denetim (`pnpm denetim`) yine durur.
- Kendi sunucumuzda bir hat aracı kurmak: Seçilmedi. 5–30 mağaza için bakımı gereksiz bir yüktür.
- Gerçek şifreleri GitHub'ın gizli bilgi kasasına koymak: Seçilmedi. Hattın gerçek şifreye ihtiyacı yok, rastgele şifre yetiyor.
- Hattı yalnız ana dalda çalıştırmak: Seçilmedi. Hata ana dala alınmadan, iş dalındayken görülmeli.
- Her adımı ayrı bir işe bölüp paralel çalıştırmak: Şimdilik seçilmedi. Her iş kurulumu baştan yapar, toplam süre ve ücretsiz dakika tüketimi artar. Hat uzarsa yeniden bakılır.
- Güvenlik taramasında her düzeydeki açığı durdurmak: Seçilmedi. Gerekçesi yukarıda.

## Sonuçları

- Depo gizli olduğu için hat GitHub'ın ücretsiz dakikalarını kullanır (ayda 2.000 dakika). Süre ilk çalışmalarda ölçülüp tarihçeye yazılır.
- Hat dosyasını GitHub'a göndermek için GitHub girişinin `workflow` izni gerekir (`gh auth refresh -h github.com -s workflow`).
- Görüntünün kendi testi (`pnpm cekirdek-goruntusu-denetle --kendi-testi`) hatta yoktur. İki görüntü daha üretir ve her gönderimde gerekmez. Denetim değişince elle çalıştırılır.
- Ekran ölçümü, hız ölçümü ve güvenlik başlıkları sayfalar yazılınca hatta eklenir.
- Ana dalın kırmızı kayıt kabul etmemesi (dal koruması) bu kararın dışındadır. Yayını korumak için yeşil kilidi yeterlidir.
