# 0186 · Panelin karşılama sayfası boş kalmasın

## Amaç

Müşteri gezisinde (2026-11-13) görüldü: panelin açılış sayfası yalnız bir hoş geldiniz satırı; "Ürünler" grubunda yalnız "Stok bildirimleri" var (ürün ekranları henüz yok). Mağaza sahibi ne yapabileceğini göremiyor.

Bölüm: Yönetim paneli 2 (on dördüncü bölümde yapılmadı, bu bölüme alındı). Satış özeti için önce 0317, bildirimler için 0280 bitmiş olmalı.

## Olmazsa olmazlar

- Karşılama sayfasında mağaza sahibinin bugün yapabildiği işlere kısa yollar (vitrin bölümleri, menüler, stok bildirimleri sayısı) ve vitrine git.
- Ürün ekranları gelince sayfa onları da gösterir (ağaçtan, izinle süzülür).

## Sınırlar

- Satış ve sipariş özetleri o modüllerle gelir.

## Bitti sayılır

- Önce ve sonra ekran görüntüsü.

## Sonuç

- Panelin açılış sayfası panodur (karar 0199): günün selamı, açılış adımları (dördünden biri eksikken, yalnız mağaza sahibine; kullanıcı kararı), bakılması gerekenler (havale, iade talebi, iade işleri, hazırlanacak sipariş, onay bekleyen yorum, azalan ve tükenen stok, stok bildirimi talepleri), son 14 günün satışı, bugün ve son 7 günün satışı, hazırlanacak ve ödeme bekleyen sipariş sayıları, kısayollar (Ürün ekle, Elle sipariş, Kupon ekle, Vitrin bölümleri, Menüler, Vitrine git). Her kutu ve kısayol sayfa ağacının izniyle görünür; satış yalnız raporu görene.
- Kısayollar ve satırlar ağaçtan ve eylem kaydından gelir: ürün ekranları gibi yeni sayfalar izinle süzülür. Eklentinin satırı yeni bağlantı noktasındandır (`cekirdek/eklentiler/pano-satirlari.ts`).
- Önce ve sonra ekran görüntüsü bilgisayar ve telefon genişliğinde, iki temada alındı ve taslakla karşılaştırıldı (görüntüler geçici klasörde; önce: yalnız başlık ve hoş geldiniz satırı).

## Durum

yapılacak
