# 0057 · Yavaş bağlantıda giriş formu şifreyi adres satırına yazıyor

## Amaç

Sayfanın kodu yüklenmeden giriş formunda Enter'a basılırsa form tarayıcının kendi yöntemiyle (GET) gönderilir: adres `/yonetim/giris?eposta=...&sifre=...` olur (kart 0029 sırasında, kod 6 saniye geciktirilerek ölçüldü). Şifre tarayıcı geçmişine, ön kapı ve varsa başka kayıtlara düşer. Kart 0027'den beri vardır. Deneme adresindeki sitede yönetici yoktur, canlıda site yoktur; yine de yeni yayından önce kapatılmalıdır.

Kurulum ekranında aynı durumda Enter bir şey yapmadı, adrese kod yazmadı (aynı ölçüm). Neden farklı olduğu ölçülmedi. Düzeltme: bu ölçüm zamanlamadan yanlıştı, işin başındaki ölçümde kurulum formu da `?kod=` yazdı (karar 0046).

## Olmazsa olmazlar

- Önce ölçülür: `/yonetim/giris`, kod ve kurulum formlarının üçü, kod gecikmeliyken Enter ve düğmeyle, sunucuda ve ön kapıda kayda ne düştüğü.
- Şifre ve kod hiçbir durumda adrese ve kayıtlara düşmez (`method="post"` ve kod yüklenene kadar gönderimin engellenmesi gibi).
- Müşteri girişi (kart 0033) ve şifremi unuttum (kart 0034) formları aynı ortak yolu kullanır, aynı hataya düşmez.
- Yavaş bağlantıdaki kullanıcı neden bir şey olmadığını anlar; yazdığı silinmez.
- Canlıya çıkmadan önce sunucu kayıtlarında geçmişte böyle bir istek var mı bakılır.

## Sınırlar

- Formların görünümü bu kartta değişmez.

## Bitti sayılır

- Kod gecikmeliyken Enter ve düğmeyle gönderimde adres şifre ve kod taşımıyor. Gerçek tarayıcıda test var, korumayı kaldırınca kırmızı.
- Yavaş bağlantıda kod yüklenince aynı form çalışıyor. Ölçüldü.

## Durum

bitti
