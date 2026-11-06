# 0046 · Ortak form: kod yüklenmeden gönderilmez, yöntemi POST

## Tarih

2026-11-06

## Karar

- Bütün formlar `bilesenler/form/form.tsx` içindeki `Form` ve `GonderDugmesi` ile yazılır. Elle `<form>` denetimde hatadır (`denetim/kurallar/elle-form.grit`).
- Gönder düğmesi sayfanın kodu yüklenene kadar kapalıdır. Düğmesi kapalı formu tarayıcı Enter ile de göndermez, yazılanlar silinmez.
- Formun yöntemi POST'tur. Koruma aşılsa da alanlar adres satırına yazılmaz.
- `GonderDugmesi` formun tek gönderme düğmesidir. `Dugme` `submit` olamaz, `GonderDugmesi`'ne kendi yöntemi ve adresi verilemez (tür kontrolü).
- JavaScript kapalıysa form içinde bunun gerektiğini söyleyen kısa bir metin görünür. Kod 3 saniyede yüklenmezse "Uzun sürerse sayfayı yenileyin" metni görünür; zamanlamasını CSS yapar, kod gerekmez.
- Panel sayfasına gelen GET ve HEAD dışı istek ara katmanda 303 ile aynı adrese gönderilir, gövdesi okunmaz, sorgusu taşınmaz.

## Neden

- Ölçüldü (kod bilerek geciktirilerek, gerçek tarayıcıda):
  - Korumasız giriş formunda Enter: `GET /yonetim/giris?eposta=...&sifre=...`. Kurulum formunda: `GET /yonetim/giris/kurulum?kod=...`. Şifre ve kod adres satırına, tarayıcı geçmişine ve adresi kaydeden her yere düşüyordu.
  - Yalnız POST katmanıyla: `POST /yonetim/giris`, değerler gövdede.
  - İki katmanla: Enter ve düğme hiçbir gezinme üretmiyor, kod yüklenince form aynı değerlerle çalışıyor. Geliştirme sunucusunda ve derlenmiş uygulamada, Chromium'da ölçüldü. Firefox ve WebKit ölçülmedi; standart Enter'ı kapalı düğmede engeller, tarayıcı uymasa ikinci katman devreye girer.
  - Kapalı düğmeyi aşan yol: `requestSubmit()` ve `submit()` kod beklerken POST yapar (bağımsız kontrol ölçtü). Kendiliğinden gönderen parola yöneticisi bu yolu kullanabilir (denenmedi). Değer adrese düşmez, gövdesi okunmaz, 303 ile temiz sayfaya dönülür; bu yolda yazılanlar silinir.
- Kart 0057'nin ilk ölçümü kurulum formunu güvenli sanmıştı; yalnız zamanlamaydı. Üç form da açıktı.
- Tek yerde olması: müşteri girişi (0033) ve şifremi unuttum (0034) aynı hataya düşemez, kural denetimle korunur.

## Düşünülen diğer yollar

- **Yalnız `method="post"`:** Seçilmedi. Değer adrese düşmez ama kullanıcı boş bir hata sayfasına gider, şifre sunucuya gereksiz yere gönderilir.
- **Yalnız düğmeyi kapatmak:** Seçilmedi. Tek katmandır; düğme bir gün elle yazılırsa açık geri gelir.
- **Formu JavaScript'siz de çalıştırmak (sunucu eylemleri):** Seçilmedi. Kapının zarfı, deneme sınırı ve çerez yazımı uçta toplu duruyor; ikinci bir yol açardı.
- **Başlangıçta formu gizlemek:** Seçilmedi. Yavaş bağlantıda kullanıcı hiçbir şey görmezdi.

## Sonuçları

- JavaScript'i kapalı olan biri panele giremez. Bu önceden de böyleydi, artık nedenini görür.
- Yavaş bağlantıda düğme kapalı durur, 3 saniyeden uzun sürerse metin görünür. Kod hiç yüklenmezse (yayından sonra açık kalmış sekmede eski parçalar gibi) form kapalı kalır, metin yenilemeyi söyler. Yenilemenin kurtardığı ölçülmedi.
- Panelde sunucu eylemi (POST'la çalışan sayfa) yazılamaz: ara katman yönlendirir. Gerekirse bu kararla birlikte düşünülür.
- Düğme kapalıyken klavyeyle üstüne gelinemez.
- Sunucu kayıtları bir kez sayıldı: deneme sunucusundaki bütün kutularda `sifre=` ve `kod=` taşıyan satır 0. Ön kapı adres kaydı tutmuyor. Bu yalnız bugün duran kutuların kayıtlarını kapsar, silinen eski kutuları değil. Değer okunmadı, yalnız adet sayıldı.
- Denetim kuralı yalnız JSX'te yazılan `<form`'u görür. `createElement` ile ve değişken adıyla açılan form, içinde `GonderDugmesi` olmayan `Form` (tek alanlıda Enter POST yapabilir) yalnız disiplindir; ikinci katman yine adrese düşürmez.
