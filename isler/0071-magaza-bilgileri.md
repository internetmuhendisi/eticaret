# 0071 · Mağaza bilgileri

## Amaç

Mağazanın adı, iletişim bilgileri, adresi ve satış ile teslimat ülkeleri ayar olarak tutulur. Yasal metinler, e-postalar ve vergi hesabı bu bilgileri buradan okur (temel paket: Mağaza ayarları).

Önce 0069 ve 0070 bitmiş olmalı.

## Olmazsa olmazlar

- İletişim bilgileri: e-posta ve telefon.
- Mağaza adresi: ülke, il, ilçe, adres ve posta kodu. Bölgeler 0070'teki listeden gelir.
- Satış yapılan ve teslimat yapılan ülkeler ayrı listelerdir, ikisi de Türkiye ile başlar. Bugünkü tek `ulke` ayarı bu listelere dönüşür. Ülke ayarları yalnız biçimle değil `ulkeGecerliMi` ile doğrulanır (`cekirdek/bolgeler/`); bugün `"QQ"` şemadan geçiyor (kart 0070'in bağımsız kontrolü).
- Mağaza adı bugün kimlik dosyasında ve altyapı sahibinin. Mağaza sahibinin adı panelden değiştirip değiştiremeyeceği kullanıcıya ürün kararı olarak sorulur.
- Dil, para birimi ve biçimi, saat dilimi, ölçü birimleri ve sipariş numarası biçimi şemada var. Temel paketin satırıyla karşılaştırılır, eksik varsa eklenir.
- Örnek Mağaza'nın değerleri `baslangic/` altına yazılır, `planlar/site-ayarlari.md` güncellenir.

## Sınırlar

- Logo 0073'tedir.
- Ekran yazılmaz.

## Bitti sayılır

- Temel paketteki Mağaza ayarları satırının her maddesinin şemada bir karşılığı var, liste kartın kapanışında tek tek gösteriliyor.
- Geçersiz il ve ilçe, eksik zorunlu alan testte reddediliyor.
- Örnek Mağaza'nın bilgileri veritabanından okunuyor.
- Mağaza sahibinin bir ayarında yanlış türdeki başlangıç değeri `pnpm site-dogrula`'da tür hatasıyla kırmızı oluyor; bozuk örneği ve testi var (kart 0069'dan kalan madde: o kartta mağaza sahibinin hiç ayarı olmadığı için gösterilemedi).

## Durum

bitti
