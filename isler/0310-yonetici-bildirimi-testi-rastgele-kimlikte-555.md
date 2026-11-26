# 0310 · Yönetici bildirimi testi rastgele kimlikteki "555"e takılıyor

## Amaç

Hat 45719023764 (kayıt cc4a242) yalnız birim testlerindeki tek testle kırmızı bitti: `cekirdek/moduller/yonetici-bildirimi/testler/servis.test.ts` › "kuyruğa giden veri ve e-posta müşterinin e-postasını, telefonunu, açık adresini ve soyadını taşımaz" (4239/4240). Test müşterinin telefonunun kuyruğa gitmediğini, işin JSON metninde "555" geçmemesiyle ölçüyor. Kuyruk işinin anahtarı rastgele bir kimlik taşıyor (`siparis-gecmisi:35b34454-a889-4555-9d3d-102c862ecc0d`); kimlikte "555" geçince test kırmızı oluyor. Telefon veride yoktu, kod doğru çalıştı. Kimliğin 30 kadar onaltılık hanesinde "555" geçme olasılığı her çalışmada yaklaşık %0,7'dir. Tarayıcı testleri ve yerel ortam denemesi bu yüzden çalışmadı.

## Olmazsa olmazlar

- Test telefonu rastgele kimlikte geçemeyecek bir değerle ölçer: tam telefon numarası ya da onaltılık harflerde olmayan bir parça. Öteki gizli değerler (posta kodu "06420" gibi rakamlı olanlar) de aynı açıdan gözden geçirilir.
- Aynı kalıp (rastgele kimlik taşıyan metinde kısa rakam dizisi aramak) başka testlerde aranır, bulunanlar aynı değişiklikte düzeltilir.
- Düzeltilmiş test telefon veriye konunca kırmızıya düşer (bilerek bozularak gösterilir).

## Sınırlar

- Yönetici bildiriminin kodu değişmez.

## Bitti sayılır

- Test ve bulunan benzerleri düzeltilmiş, bozma denemesi kırmızı.
- Kontrol hattı bu kayıtla yeşil.

## Sonuç

- Ortak yardımcı `gizliGeciyor` (`cekirdek/testler/gizli-deger.ts`): sekizden az rakamlı değer (telefon parçası, posta kodu) yalnız harf ya da rakamla bitişik değilken sayılır, uzun değer ve rakam dışı değer düz aranır. Kendi testi (`gizli-deger.test.ts`) hattın kimliğindeki "555"in, kimlikteki "06420"nin ve kod dosyası özetindeki "0555"in sayılmadığını, tek başına geçenin yakalandığını ölçer; sınır kaldırılınca kırmızı.
- Yönetici bildirimi testi telefonu "555 123 45 67" (girilen "0555 …" ve saklanan "+90 555 …" yazılışının ortak parçası) ve "5551234567" ile arar. Telefon ve posta kodu kuyruğa giden veriye bilerek konunca ikisi de kırmızı. İlk düzeltme "0555 123 45 67" arıyordu ve telefon veriye konunca yeşil kaldı: telefon "+90 555 123 45 67" diye saklanıyor, ölçülerek bulundu.
- Aynı kalıbın aranmasında iki yer daha bulundu ve yardımcıya geçti: sipariş takibi servis testi (kimlikli JSON'da "06420", `musteri.test.ts`) ve sipariş takibi tarayıcı testi (sayfanın HTML'inde "0555", "555 000", "06420"; bitişik "5550000042" eklendi). Konsol, günlük ve maske testlerindeki kısa sayılar sabit metinde aranıyor, rastgele kimlik taşımıyor; değişmedi.

## Durum

yapılacak
