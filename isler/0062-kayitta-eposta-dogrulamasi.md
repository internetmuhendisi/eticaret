# 0062 · Kayıtta e-posta doğrulaması ayarının "açık" davranışı

## Amaç

Kart 0033 kayıtta e-posta doğrulamasını site ayarı olarak önerdi, varsayılanı kapalı yazdı, "açık" davranışı yazılmadı (karar 0051). Üyeliği gizli kalması gereken mağazalar ve başkasının adresiyle hesap açılmasını önlemek isteyenler için gerekir.

Önce 0060 bitmiş olmalı: gerçek e-posta gitmeden ayar açılamaz.

## Olmazsa olmazlar

- Ayar şemaya girer (`kayittaEpostaDogrulamasi`, altyapı sahibinin, varsayılan kapalı).
- Ayar açıkken kayıttan sonra oturum açılmaz. Herkes aynı "e-postanı kontrol et" cevabını alır, kayıtlı e-posta belli olmaz.
- Yeni adrese tek kullanımlık, süreli doğrulama bağlantısı, kayıtlı adrese "zaten hesabın var" e-postası gider.
- Doğrulanmamış hesapla giriş olmaz, bağlantıyı yeniden isteme yolu vardır.
- Pazarlama izni doğrulanınca geçerli sayılır (kart 0064 ile birlikte düşünülür).

## Sınırlar

- Ayarı kapalı olan sitenin akışı değişmez.

## Bitti sayılır

- Ayar açık ve kapalı iki akış da tarayıcı testinde deneniyor.
- Kayıtlı ve kayıtsız e-postanın cevabı ayar açıkken birebir aynı.
- Kullanılmış ya da süresi dolmuş bağlantı reddediliyor.

## Durum

yapılacak
