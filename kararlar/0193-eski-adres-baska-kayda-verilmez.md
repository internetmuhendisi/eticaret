# 0193 · Eski adres başka kayda verilmez

## Tarih

2026-11-27

## Karar

Bir türde silinmemiş bir kaydın eski adresi (`eski_adresler`) o türde kullanılmış sayılır (kart 0330). Addan üretilen adres onu almaz, sayı alır ("cicekli-sal-2"). Mağaza sahibinin elle verdiği adres başka bir kaydın eski adresiyse kayıt `adres-adi-eski` hatasıyla reddedilir (kullanıcı kararı). Silinmiş kaydın eski adresi ve kaydın kendi eski adresi serbesttir. Kural tek yerdedir: `cekirdek/moduller/gorunurluk/adres-adi-kullanimi.ts`; kategori, marka, etiket, ürün (kopya da), blog yazısı ve sabit sayfa onu kullanır.

Karar 0103'ün "eski ad bugün yaşayan bir kaydın adıysa yaşayan kayıt kazanır" kuralı çözücüde kalır: servisler bu durumu artık kurmaz, yalnız veritabanına doğrudan yazı kurabilir.

## Neden

Eski adres başka kayda geçince o kaydın eski bağlantıları (müşterinin paylaştığı adres, arama motorundaki sayfa) habersiz yeni kaydı açar; yeni kayıt taslaksa "bulunamadı" verir. Üretimde eski adresler sayılmıyordu, yalnız kopyalama sayıyordu (kart 0320, karar 0190). Silinmiş kaydın eski adresi zaten "bulunamadı"ya düşer; onu ayırmak adı boşuna kilitlerdi.

## Düşünülen diğer yollar

- **Elle verilen eski adrese izin vermek, uyarıp onay istemek:** Mağaza sahibi bilerek eski bağlantıyı yeni kayda verebilirdi. Ekrana bir onay adımı ekler, kullanıcı seçmedi.
- **Bugünkü gibi bırakmak (yaşayan kayıt kazanır):** Eski bağlantılar sessizce başka kayda gider. Seçilmedi.
- **Silinmiş kaydın eski adresini de kullanılmış saymak (kopyalamanın ilk hâli):** Yönlenmeyen adresi boşuna kilitler, silinen ürünün adı yeni ürüne verilemezdi. Seçilmedi.

## Sonuçları

- Mağaza sahibi bir kaydın eski adresini başka kayda hiç veremez. Vermek isterse önce o adresin sahibini silmesi gerekir; eski adreslerin listesi ya da silinmesi panelde yoktur.
- Denetim her türün servisinde, o türün işlem kilidi altında yapılır. Veritabanına doğrudan yazı kuralı atlar; bu yalnız disiplindir.
- Sayfası açılmayan (taslak, arşiv) sahibin eski adresi de kullanılmıştır: sahip sonra açılabilir.
- Panelde adres alanı boşken gösterilen örnek adres tarayıcıda addan üretilir; eski adres yüzünden kaydedilen adres sayı alabilir ("cicekli-sal-2"). Kaydedilen adres doğrudur, yalnız örnek farklıdır.
- Excel ile içe aktarmada ürün kodu eski adresse satır o ürünü bulur (karar 0192); yeni ürün açmaz.
