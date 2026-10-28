# 0031 · Arka plan iş kuyruğu

## Amaç

E-posta gibi işler kullanıcıyı bekletmeden arka planda yapılsın. Kuyruk sitenin kendi veritabanında durur, işleri sitenin kutusundaki ikinci bir süreç çalıştırır (karar 0013).

Önce 0021 bitmiş olmalı.

## Olmazsa olmazlar

- Kuyruk tablosu, numaralı değişiklik dosyasıyla.
- İkinci süreç aynı Docker görüntüsünden başlar. Yayın komutu iki süreci birlikte açar ve kapatır.
- Başarısız iş belirli sayıda yeniden denenir, sonra hata olarak kalır ve hata izleme aracına gider.
- Aynı iş iki kez çalıştırılmaz.
- Zamanlı iş tanımlamanın yolu.
- `cekirdek/arka-plan-isleri/` altında.

## Sınırlar

- E-posta gönderimi 0032'dir. Havale iptali, stok ayırma ve yoklamalar o modüllerle gelir.

## Bitti sayılır

- Örnek bir iş kuyruğa girip arka plan sürecinde çalışıyor.
- Bilerek hata veren iş yeniden deneniyor, sonunda hata olarak kalıyor ve hata izleme aracında görünüyor.
- İki süreç aynı anda çalışırken bir iş yalnız bir kez yapılıyor, test bunu gösteriyor.
- Deneme sitesinde yayından sonra iki süreç de çalışıyor.

## Durum

yapılacak
