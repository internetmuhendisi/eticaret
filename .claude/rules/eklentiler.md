---
paths:
  - "cekirdek/eklentiler/**"
  - "eklentiler/**"
  - "cekirdek/kayitlar/eklentiler.ts"
---

# Eklentiler (karar 0117)

Eklenti temel pakette olmayan özelliktir (`temel-paket.md`). Tarifi `eklentiler/<kod>.md`, kodu `cekirdek/eklentiler/<kod>/` klasöründedir. Eklenti `/eklenti-ekle <kod>` komutuyla kurulur (`.claude/commands/eklenti-ekle.md`, kart 0145). Komutun adımlarına uyulması yalnız disiplindir, otomatik kontrolü yoktur.

- Eklentinin kodu modülle aynı parçalardan oluşur: `model.ts`, `servis.ts`, `semalar.ts`, `izinler.ts`, `isler.ts`, ekran parçaları ve `testler/`. Kodu `cekirdek/kayitlar/eklentiler.ts` kaydına yazılır.
- Kurulu eklenti kapalı başlar. Sitede açık olması altyapı sahibinin `eklentiler` ayarıdır; açıklık yalnız `eklentiAcikMi` ile sorulur (`cekirdek/eklentiler/acik.ts`). Eklentinin servisi, uçları, işleri ve ekranları kapalıyken hiçbir şey yapmaz; uç bulunamadı verir. Kişisel veriyi silen saklama işi kapalıyken de çalışır. Para işleri de kapalıyken çalışır: başlatılmış ödemenin taraması, günlük karşılaştırma ve iade (kart 0235, karar 0147; para ödendiği yoldan döner).
- E-posta gönderen eklenti, gönderen adresi olmayan sitede çalışmaz.
- Kancanın anı kaçabilir (eklenti kapalıydı, ürün taslaktaydı): kancaya bağlı iş yapan eklentinin zamanlı bir taraması da olur (`stok-bildirimi-taramasi`).
- Eklentinin site başına davranışı mağaza sahibinin ayarıdır, çekirdeğin ayar şemasında eklentinin adıyla başlayan bir ayardır (`stokBildirimi…`).
- Eklenti çekirdeğe yalnız bağlantı noktalarından bağlanır; çekirdeğin modülü eklentiyi tanımaz:
  - Stok değişikliği: `cekirdek/eklentiler/stok-kancalari.ts`. Kanca stoğu değiştiren işlemin içinde çalışır, site bilgisi almaz, yalnız işi kuyruğa koyar.
  - Ürün sayfası: `cekirdek/eklentiler/urun-sayfasi-yuvalari.tsx`. Parça seçili birimi `useSeciliBirim` ile okur.
  - Panel: sayfa ağacındaki sayfa `eklenti` alanını taşır; eklenti kapalıyken menüde yoktur ve açılmaz. Ekranın dosyaları eklentinin `panel/` klasöründedir (karar 0158), listesi liste motoruyla yazılır.
  - Ödeme yöntemi: `cekirdek/eklentiler/odeme-yontemleri.ts` (kart 0215, karar 0142). Kayıttaki yöntem eklentiye bağlıdır (`eklentiliOdemeYontemleri`); eklenti `hazirMi`, `baslat` ve `iadeEt` (kart 0235, karar 0147) verir. Ödeme servisi oturum ve ayırmadan sonra `baslat`'ı çağırır, sipariş ödeme doğrulanınca `eklentiliSiparisiKur` ile kurulur.
  - E-posta şablonu, arka plan işi, izin, uç ve metin çekirdeğin var olan kayıtlarına eklenir; metinler `tr.json`'da `eklenti.` altındadır.
- Eklentinin tablosu kendi `model.ts`'indedir; değişiklik üreten araç onu da okur.
- Ürünleri toplu yazan eklenti (Excel ile toplu ürün işlemleri, karar 0192) her parçayı çekirdeğin servisleriyle yazar, ürün grubu başına bir işlemde; stoğu aracın sebebiyle (`aracStokSebepleri`, elle seçilemez) `stokDuzelt`'e verir. Uzun iş arka plandadır, satırlar uygulandıkça işaretlenir, kaldığı yerden sürer.
- Arka plan sürecinin ulaştığı dosyalar Node ile doğrudan çalışır: içe aktarmalar uzantıyla yazılır (`katalog-acilisi.test.ts` gerçek süreçle yakalar).
- Eklentinin kapalı hâli birim testiyle denenir (uç, servis, panel): tarayıcı testlerinin sitesinde (Örnek Mağaza) eklentiler açıktır.
- Dış servise bağlanan eklenti (ödeme kuruluşu) kuruluşa özgü her şeyi tek dosyada tutar (`iyzico.ts`), isteği `disServiseIstek` ile gönderir (`cekirdek/dis-servis/istek.ts`), anahtarını dışarıdan gelen gizli bilgi olarak okur (`disaridanGizliBilgi`). Testleri ve tarayıcı testleri gerçek kuruluşa değil yerel sahte kuruluşa gider; gerçek deneme ortamı elle denenir.
