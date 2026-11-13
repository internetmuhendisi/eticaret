---
paths:
  - "cekirdek/eklentiler/**"
  - "eklentiler/**"
  - "cekirdek/kayitlar/eklentiler.ts"
---

# Eklentiler (karar 0117)

Eklenti temel pakette olmayan özelliktir (`temel-paket.md`). Tarifi `eklentiler/<kod>.md`, kodu `cekirdek/eklentiler/<kod>/` klasöründedir. Eklenti `/eklenti-ekle <kod>` komutuyla kurulur (`.claude/commands/eklenti-ekle.md`, kart 0145). Komutun adımlarına uyulması yalnız disiplindir, otomatik kontrolü yoktur.

- Eklentinin kodu modülle aynı parçalardan oluşur: `model.ts`, `servis.ts`, `semalar.ts`, `izinler.ts`, `isler.ts`, ekran parçaları ve `testler/`. Kodu `cekirdek/kayitlar/eklentiler.ts` kaydına yazılır.
- Kurulu eklenti kapalı başlar. Sitede açık olması altyapı sahibinin `eklentiler` ayarıdır; açıklık yalnız `eklentiAcikMi` ile sorulur (`cekirdek/eklentiler/acik.ts`). Eklentinin servisi, uçları, işleri ve ekranları kapalıyken hiçbir şey yapmaz; uç bulunamadı verir. Kişisel veriyi silen saklama işi kapalıyken de çalışır.
- E-posta gönderen eklenti, gönderen adresi olmayan sitede çalışmaz.
- Kancanın anı kaçabilir (eklenti kapalıydı, ürün taslaktaydı): kancaya bağlı iş yapan eklentinin zamanlı bir taraması da olur (`stok-bildirimi-taramasi`).
- Eklentinin site başına davranışı mağaza sahibinin ayarıdır, çekirdeğin ayar şemasında eklentinin adıyla başlayan bir ayardır (`stokBildirimi…`).
- Eklenti çekirdeğe yalnız bağlantı noktalarından bağlanır; çekirdeğin modülü eklentiyi tanımaz:
  - Stok değişikliği: `cekirdek/eklentiler/stok-kancalari.ts`. Kanca stoğu değiştiren işlemin içinde çalışır, site bilgisi almaz, yalnız işi kuyruğa koyar.
  - Ürün sayfası: `cekirdek/eklentiler/urun-sayfasi-yuvalari.tsx`. Parça seçili birimi `useSeciliBirim` ile okur.
  - Panel: sayfa ağacındaki sayfa `eklenti` alanını taşır; eklenti kapalıyken menüde yoktur ve açılmaz.
  - E-posta şablonu, arka plan işi, izin, uç ve metin çekirdeğin var olan kayıtlarına eklenir; metinler `tr.json`'da `eklenti.` altındadır.
- Eklentinin tablosu kendi `model.ts`'indedir; değişiklik üreten araç onu da okur.
- Arka plan sürecinin ulaştığı dosyalar Node ile doğrudan çalışır: içe aktarmalar uzantıyla yazılır (`katalog-acilisi.test.ts` gerçek süreçle yakalar).
- Eklentinin kapalı hâli birim testiyle denenir (uç, servis, panel): tarayıcı testlerinin sitesinde (Örnek Mağaza) eklentiler açıktır.
