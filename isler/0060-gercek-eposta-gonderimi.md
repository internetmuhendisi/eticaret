# 0060 · Gerçek e-posta gönderiminin bağlanması

## Amaç

Kart 0032 e-postayı yerel posta kutusuyla kurdu; kullanıcının kararıyla hizmet hesabı açılmadı (karar 0050). Açılışta gerçek hizmet bağlanır.

İlk gerçek mağazadan önce yapılmalı. Kart 0032'de karşılaştırma ve önerilen hizmet (Amazon SES Frankfurt, seçenek Lettermint) kullanıcıya söylendi, seçim yapılmadı; fiyatlar o tarihe aittir, yeniden bakılır.

## Olmazsa olmazlar

- Hizmetin verisi Avrupa Birliği'nde, tercihen Almanya'da durur (karar 0009). Seçim ve gerekçesi karar kaydına yazılır, fiyatı kullanıcıya söylenir.
- Kullanıcıdan: hizmette hesap açılması ve gönderen alan adının doğrulanması için alan adı ayarına onay.
- Gönderen alan adı doğrulanır, gereken alan adı kayıtları (SPF, DKIM, DMARC) eklenir.
- Her sitenin ayrı anahtarı gizli bilgidir (0019). Değer dışarıdan geldiği için gizli bilgi kaydının kurulma yolu buna uygun genişler.
- Hizmet yalnız `cekirdek/moduller/eposta/gonderici.ts` dosyasında bağlanır. Yerel adres koruması geliştirmede kalır.
- Sunucunun dışarıya gönderim kapısından çıkabildiği ölçülür (kart 0032'de ölçülmedi).
- Yönetici ve e-posta tasarımı için site tasarım değerleri varsa şablon onları kullanır.

## Sınırlar

- Toplu e-posta gönderilmez.

## Bitti sayılır

- Deneme sitesinden gönderilen deneme e-postası kullanıcının adresine ulaştı ve istenmeyen kutusuna düşmedi.
- Hizmet seçiminin karar kaydı yazıldı.
- Sunucu denetimi gönderici bağlı olmayan canlı siteyi kırmızı gösteriyor.

## Durum

yapılacak
