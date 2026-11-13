# 0167 · Ürün sayfasında müşterinin seçtiği değer sessizce değişmesin

## Amaç

Müşteri gezisinde (2026-11-13) ölçüldü: Basic Tişört'te önce Beyaz, sonra M seçilince M Beyaz tükenmiş olduğu için renk kendiliğinden Siyah'a dönüyor, görsel de siyah tişörte geçiyor. Müşteri beyaz istediğini sanırken siyahı seçmiş oluyor, haber ver kutusunu da hiç görmüyor.

## Olmazsa olmazlar

- Kullanıcı kararı: müşterinin elle seçtiği değer korunur. Tükenmiş değer seçilebiliyorsa (haber ver eklentisi açık) seçim değişmez, sayfada "Tükendi" ve haber ver kutusu görünür.
- Tükenmiş değer seçilemiyorsa (eklenti kapalı, karar 0108) seçim yine satılabilir değere geçer, ama müşteriye bir satırla söylenir ("Beyaz bu bedende tükendi, Siyah seçildi" gibi); ekran okuyucuya da duyurulur.
- Kararlar 0108 ve 0117'nin yerine geçen yeni karar kaydı.
- Seçim kuralının birim testi, jsdom testi ve tarayıcı testi; eski davranışta kırmızı.

## Sınırlar

- İlk seçim ayarı (`secenekOnSecimi`) ve adresle gelen seçim kuralı değişmez.
- Sepet yok; satın alma davranışına dokunulmaz.

## Bitti sayılır

- Beyaz sonra M seçilince Beyaz seçili kalıyor, "Tükendi" ve haber ver kutusu görünüyor (tarayıcı testi).
- Eklenti kapalıyken seçim satılabilir değere geçip bunu söylüyor (birim ya da jsdom testi).
- Önce ve sonra ekran görüntüsü karşılaştırıldı.

## Notlar (2026-11-14)

- Önce ve sonra görüntüsü (Basic Tişört, taze kurulmuş Örnek Mağaza, bilgisayar ve telefon): önce Beyaz, sonra M seçilince eski kodda sayfa M Siyah'a geçiyor, siyah görsel ve "Stokta" görünüyordu. Yeni kodda M Beyaz seçili kalıyor, beyaz görsel, "Tükendi" ve haber ver kutusu görünüyor.
- Bağımsız kontrolün bulgularıyla düzeltildi (karar 0119): ilk uygulama tercihi sayfanın ilk seçimiyle başlatıyordu, müşterinin seçmediği değeri de koruyordu. Tarayıcı testi bedeni adresle veriyordu, artık seçimi tıklayarak yapıyor. Satır seçim tercihe dönene kadar duruyor, anahtarı seçeneğin kimliği.
- Bağımsız kontrolün kabul edilen sınırı: satırın ekran okuyucuda gerçekten okunması ölçülmez, satırın stok bölgesinin (aria-live) içinde olduğu ölçülür.

## Durum

yapılacak
