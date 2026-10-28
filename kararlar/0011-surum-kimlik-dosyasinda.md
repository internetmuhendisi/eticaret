# 0011 · Sitenin çekirdek sürümü kimlik dosyasında yazar

## Tarih

2026-10-28

## Karar

Bir sitenin hangi çekirdek sürümünde çalıştığı yalnız o sitenin klasöründeki kimlik dosyasında yazar. Yayın komutu sürümü buradan okur. Çalışan site kendi sürümünü söyler, sahip paneli iki değeri karşılaştırır.

Sürüm numarası üç parçalıdır: büyük.orta.küçük. Küçük artarsa yalnız hata düzeltilmiştir. Orta artarsa yeni özellik vardır, site klasöründe değişiklik gerekmez. Büyük artarsa site klasöründe de değişiklik gerekir. Güvenlik açığı kapatan sürüm, sürüm notlarında ayrıca işaretlenir.

Ortak bileşen kütüphanesi çekirdekle aynı sürüm numarasını taşır.

## Neden

- Sürüm kodla birlikte kayıtta durursa her güncelleme bir kayıttır: kimin, ne zaman, hangi sürüme geçirdiği görülür ve önceki kayda dönülerek geri alınır.
- Tek asıl yer olursa "panel bir sürüm, sunucu başka sürüm söylüyor" durumu çıkmaz. Çıkarsa sahip paneli bunu fark eder.
- Numaraya bakınca güncellemenin ne kadar riskli olduğu anlaşılır.
- Bileşen kütüphanesi ayrı sürümlenirse bir düğme değişikliği sürüm değişmeden bütün sitelere giderdi (değişmez kural 3).

## Düşünülen diğer yollar

- Sürümü sahip panelinin kendi kaydında tutmak: Seçilmedi. Sürüm koddan ayrı bir yerde durur, kayıt geçmişi ve geri alma ayrıca kurulmak zorunda kalır.
- Sürümü sitenin veritabanında tutmak: Seçilmedi. Hangi kodun yayınlanacağı, yayından önce okunamayan bir yerde dururdu.
- Sürüm yerine tarih ya da ardışık numara: Seçilmedi. Güncellemenin riskini göstermez.

## Sonuçları

- Bir siteyi güncellemek kimlik dosyasındaki satırı değiştirip yayınlamaktır. Bu satır yayın komutu dışında elle sunucuya yazılmaz.
- Her çekirdek sürümünün etiketlenmesi ve sürüm notunun yazılması zorunlu olur.
- Sitenin veritabanı hangi numaralı değişikliklerin uygulandığını ayrıca tutar. Bu bir sürüm kaydı değil, veritabanının kendi durumudur.
- Her yeni sürüm önce Örnek Mağaza'ya gider (0007).
- Plan: `planlar/cekirdek-ve-siteler.md`.
