# 0008 · Kapıda ödeme seçenekleri, kargoya verme süresi ve iade kargosu site ayarıdır

## Tarih

2026-10-28

## Karar

Temel pakete üç yeni site ayarı eklenir:

- Kapıda ödeme seçenekleri: nakit, kart. Varsayılanı yalnız nakittir.
- Kargoya verme süresi: iş günü olarak bir sayıdır, varsayılanı 1'dir. Ürün sayfasında "1 iş gününde kargoda" gibi görünür.
- İade kargosunu kim öder: mağaza ya da müşteri. Varsayılanı mağazadır.

## Neden

- Örnek Mağaza'nın ayarları konuşulurken üçü de istendi. Üçü de ne temel pakette ne eklenti kataloğunda vardı.
- Üçü de siteden siteye değişir. Siteye özel davranış koda değil çekirdeğe ayar olarak yazılır (değişmez kural 1).
- Kargoya verme süresi düz yazı değil sayı olarak tutulur, çünkü ön bilgilendirme metnindeki teslim süresi de aynı değerden gelmelidir.

## Düşünülen diğer yollar

- Üçünü eklenti saymak (temel pakette adı geçmeyen özellik eklentidir): Seçilmedi. Üçü de her mağazanın ödeme, kargo ve iade akışının olağan parçası, ayrı bir eklenti olacak kadar büyük değil.
- Kargoya verme süresini ürün sayfasında düz metin olarak yazmak: Seçilmedi. Ön bilgilendirme metniyle ayrışabilirdi.

## Sonuçları

- Yasal şablonlar (ön bilgilendirme, iade koşulları) bu ayarlardan beslenir. Ayar değişince metin de değişir.
- Cayma hakkında iade kargosunun yasal olarak kime ait olduğu hukukçuya teyit ettirilecek. Ayar "müşteri" yapılsa bile yasanın satıcıya yüklediği masraf müşteriden istenmemeli.
- Kapıda kartla ödemede kartı kurye çeker. Site yalnız seçilen yöntemi kaydeder, kart bilgisi almaz.
