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

## Durum

yapılacak
