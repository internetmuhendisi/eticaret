# 0145 · Eklenti ekleme komutu

## Amaç

İlk eklenti (kart 0144) elle kurulduktan sonra aynı adımlar bir komuta çevrilir. Sonraki eklentiler bu komutla, aynı sırayla ve aynı kontrollerden geçerek kurulur (`eklentiler/README.md`, "Eklenti nasıl eklenir").

Bölüm: Vitrin. Önce 0144 bitmiş olmalı.

## Olmazsa olmazlar

- Komut `.claude/commands/` altında yazılır, eklentinin kod adını alır.
- Adımlar kart 0144'te gerçekten yapılanlardan çıkarılır: tarifi okuma, plan, onay, çalışma kopyası, kapalı başlatma, kontroller, tarifin bitti listesi, bağımsız denetim, kayıt.
- Komut tarifi olmayan eklentide durur ve tarifin yazılmasını önerir.
- Komut kullanıcı onayı olmadan yayın yapmaz.
- `CLAUDE.md` ve `eklentiler/README.md`'deki "komut henüz yok" satırları güncellenir.

## Sınırlar

- Komutla ikinci bir eklenti kurulmaz; katalogdaki eklentiler kullanıcı istemeden kurulmaz.

## Bitti sayılır

- Komut, stoğa gelince haber ver eklentisinin adımlarını eksiksiz içeriyor; kullanıcıyla birlikte okundu.
- Tarifi olmayan kod adıyla komut duruyor.

## Notlar (2026-11-13): komutun denemesi

Kullanıcı komutun küçük bir deneme eklentisiyle uçtan uca denenmesini istedi: kapalıyken sayfası yok, açılınca var, deneme bitince silinir. Sınırlardaki "ikinci eklenti kurulmaz" maddesinin istisnası budur. Deneme eklentisi katalogda yoktur ve kalıcı değildir.

**Ön denetim (0. adım)**
- `uydurma-eklenti` ile tarif yoktu, komut durdu.
- `sepette-kalan-hatirlatma` ile tarif vardı, katalogda vardı, kurulu değildi. Bu kod adı yalnız ön denetimde denendi, kurulmadı.

**Deneme**
- Ayrı bir dalda (`deneme-0145`) ve ayrı bir çalışma kopyasında (`.claude/worktrees/0145-deneme`) yapıldı. Ana dala alınmadı.
- Kod adı `deneme-eklentisi`. Tarifi 12 başlıkla, planı `planlar/` altında yazıldı.
- Bağlantı noktası yalnız panel sayfası. Tablo yok: yerel veritabanında iz kalmasın diye.
- Yapılan adımlar: 5.1 kayıt, 5.8 testlerin deneme sitesinde açma, 5.9 metin, 5.11 panel sayfası, 5.12 README, 5.13 Örnek Mağaza'da açma. Öteki maddelerin tarifte karşılığı yoktu.

**Ölçümler**
- Birim testi gerçek ağaç ve veritabanıyla, kapalı ve açık hâlde. Kapalıyken sayfa menüde yok ve `panelSayfasiniAc` bulunamadı veriyor. Açıkken sayfa menüde ve açılıyor.
- Ağaçtaki `eklenti` alanı kaldırılınca test kırmızıya düştü, geri konunca yeşil oldu.
- Tarayıcı testinde sayfa açık eklentiyle menüde, klavyeyle açılıyor. İki renkte ve üç genişlikte taramadan geçti.
- Gerçek uygulamada bir kez ölçüldü:
  - Eklenti Örnek Mağaza'da kapatıldı, sunucu yeniden açıldı. Menüde sayfa yoktu, `/yonetim/deneme-eklentisi` 404 verdi.
  - Ayar geri konunca aynı ölçüm kırmızıya düştü: menüde 1 bağlantı vardı.
- `denetim`, `denetim-kendi-testi`, `tur-kontrolu`, `site-dogrula` yeşil.
- `birim-testleri` ilk çalışmada kırmızıydı. Tarayıcı testinin yorumunda site adı geçiyordu (`site-adi-yok.test.ts`). Yorum düzeltilince yeşil.
- `tarayici-testleri`: 220 test geçti, 2 test düştü:
  - Arama taraması süre aşımıyla düştü (kart 0157).
  - Stok bildirimleri panelinde konsolda `Connection closed.` vardı (kart 0166 açıldı).
  - İki test dosyası tek başına üç kez çalıştırıldı, üçünde de geçti.
- Sonunda deneme eklentisinin dalı ve çalışma kopyası silindi. Ana dalda iz kalmadı.

**Denemeden komuta geçenler**
- Site adı kuralı 8. adımdan kurulumun başına taşındı ve her dosya için geçerli yapıldı, test yorumları dahil.
- `pnpm katalog-kullanimlari` vitrin maddesinden genel kurala taşındı: panel sayfası da kütüphanenin `BosHal` parçasını kullanıyordu.
- Kapalı hâlin gerçek uygulamada bir kez ölçülmesi adım olarak eklendi. Çalışan geliştirme sunucusunun önce kapatılması gerekir.
- Zorunlu bozmalar eklendi: her açıklık denetimi ve ağaçtaki `eklenti` alanı.
- Tarifi olup katalogda olmayan kod adı için kullanıcıya sorma adımı eklendi.

## Durum

bitti
