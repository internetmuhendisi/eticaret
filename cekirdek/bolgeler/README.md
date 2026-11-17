# Bölgeler: ülke, il ve ilçe listesi

Mağaza adresi, vergi bölgesi ve teslimat adresi bölgelerini buradan okur (kart 0070, karar 0056). Kayıtlar adı değil kodu tutar. Okuma ve doğrulama yalnız `bolgeler.ts` ile yapılır. Ülke adı sitenin dilinde ortak biçimleyiciden gelir (`ulkeAdi`, `cekirdek/metinler/bicimleyici.ts`).

> **Resmî değil.** Liste açık kaynaklardan derlendi. Gerçek mağaza açılmadan önce İçişleri Bakanlığı'nın resmî listesiyle (e-icisleri.gov.tr, Mülki İdare Bölümleri) karşılaştırılacak: kart 0089.

## Dosyalar

| Dosya | İçinde ne var |
|---|---|
| `ulkeler.json` | ISO 3166-1 iki harfli ülke kodları (249). Ad yok. |
| `tr.json` | Türkiye'nin 81 ili ve 973 ilçesi, kodlarıyla; posta kodu biçimi (5 rakam); satıcı kimliği kuralları (`saticiKimligi`: şirkette 10 haneli vergi kimlik numarası, şahısta 11 haneli kimlik numarası, ikisi de kontrol haneli; 16 haneli MERSİS numarası; KEP adresinin alan adı). |
| `bolgeler.ts` | Okuma işlevleri ve tek bölge doğrulaması (`bolgeyiDogrula`), posta kodu biçimi. |
| `adres.ts` | Posta adresinin ve telefonun ortak şeması (kart 0071, karar 0057). Hata iletileri koddur. |
| `satici.ts` | Satıcı bilgilerinin şeması (kart 0091, karar 0138). Numaraların biçimini ve kontrol hanesini ülkenin dosyasındaki `saticiKimligi` seçer; kontrol hanesi hesapları adlarıyla buradadır (adları `cekirdek/kayitlar/satici.ts`). Kuralı olmayan ülkede numara yalnız genel biçimle denetlenir. |

İl ve ilçe listesi olan yeni bir ülke `<ülke kodu>.json` dosyasıyla gelir ve `bolgeler.ts` içindeki `bolgeliUlkeler` listesine eklenir.

## Kodlar

- **Ülke:** ISO 3166-1 alpha-2, örneğin `TR`.
- **İl:** ISO 3166-2:TR, örneğin `TR-34`. Sayı plaka numarasıdır.
- **İlçe:** Bu projenin kodudur, resmî değildir: il kodu ve ilçenin il içindeki sırası, örneğin `TR-34-001`. Numaralar 2026-11-07'de Türkçe alfabe sırasıyla verildi (rakamla başlayan ad sonda). Kod bir kez verilince değişmez ve yeniden kullanılmaz. Yeni ilçe ilindeki sıradaki numarayı alır. Kaldırılan ilçenin kodu listede kalır, kaldırılma bilgisiyle işaretlenir; bunun alanı ilk kaldırmada eklenir.

## İlçe sayısı

Resmî ilçe sayısı 922'dir. Büyükşehir olmayan 51 ilin merkez ilçesi bu sayıya girmez, adreste ise "Merkez" diye seçilir. Liste bu 51 ilçeyle birlikte 973 ilçedir.

## Kaynaklar (2026-11-07)

| Ne | Kaynak | Lisans |
|---|---|---|
| İl kodları ve adları | ISO 3166-2:TR, [Vikipedi sayfası](https://en.wikipedia.org/wiki/ISO_3166-2:TR) üzerinden okundu | ISO kodların ücretsiz kullanımına izin verir |
| İlçe listesi | [AlperKocanx/TurkiyeGuncelSehirIlceMahalleBilgileri2022](https://github.com/AlperKocanx/TurkiyeGuncelSehirIlceMahalleBilgileri2022), `AdresListesi.csv`, kayıt `86fdf8c` (2023-12-28) | MIT, aşağıda |
| İlçe adlarının yazılışı ve karşılaştırma | [Districts of Turkey](https://en.wikipedia.org/wiki/Districts_of_Turkey), sürüm 1383908694 | CC BY-SA 4.0 |
| Ülke kodları | [datasets/country-list](https://github.com/datasets/country-list), `data.csv` (pycountry ve Debian iso-codes üzerinden ISO 3166-1) | ISO kodların ücretsiz kullanımına izin verir |
| Ülke adları | Node.js'in dil verisi, biçimleyiciden (çekirdek görüntüsündeki Node 24.22.1: ICU 78.3, CLDR 48.0) | Unicode lisansı |

Resmî kaynaklara 2026-11-07'de ulaşılamadı: NVİ'nin il-ilçe kod tablosunun adresi kaldırılmış (404), e-icisleri.gov.tr yurt dışından bağlantıya açılmadı.

## Yöntem

1. İlçe kümesi derlemeden alındı: üst kaydı il olan satırlar.
2. Vikipedi'nin il il ilçe tablolarıyla karşılaştırıldı. Büyük-küçük harf, şapka ve "Istanbul" yazılışı yok sayıldığında 81 ilin hepsinde ilçe kümeleri birebir aynı çıktı.
3. İl adları ISO listesinden (örneğin "Hakkâri"), ilçe adları Vikipedi'den alındı (derlemede bütün adlar büyük harfle yazılı). Merkez ilçeler "Merkez" adını taşır.
4. İlçeler il içinde Türkçe alfabe sırasıyla numaralandı; rakamla başlayan ad ("19 Mayıs") harflerden sonra geldi.

Veriyi üreten betik projede tutulmadı. Kart 0089'da resmî liste gelince liste o listeden yeniden üretilecek ve betik o zaman projeye girecek.

## İlçe listesinin lisans metni

Aynı metin dağıtılan veri dosyasında da durur (`tr.json`, `kaynak.ilce_listesi_lisansi`).

```
MIT License

Copyright (c) 2022 Alper Kocan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
