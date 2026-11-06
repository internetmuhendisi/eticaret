# 0025 · Şifre ve oturum altyapısı

## Amaç

Yönetici ve müşteri girişlerinin ortak temeli kurulur: şifrelerin güvenli saklanması ve oturumun güvenli yürütülmesi (`.claude/rules/guvenlik.md`).

Önce 0013 bitmiş olmalı.

## Olmazsa olmazlar

- Hazır bir giriş kütüphanesi mi kullanılacağı, kendi yazılacağı mı seçilir. Seçim karar kaydına yazılır.
- Yönetici ve müşteri hesap tabloları, numaralı değişiklik dosyasıyla. Aranacak alanlar ve indeksleri belgeye yazılır.
- Şifreler güncel ve güvenli bir özetleme yöntemiyle saklanır.
- Oturum kısa ömürlü bir anahtar ve onu yenileyen ikinci bir anahtarla yürür. İkisi de güvenli çerezde.
- Başka sitelerden gelen sahte istekler reddedilir.
- Çıkışta oturum kapanır, yenileme anahtarı da geçersiz olur.
- Bir sitenin oturum çerezi başka bir sitede geçmez.

## Sınırlar

- Giriş ekranları, iki aşamalı giriş ve şifremi unuttum ayrı kartlardır (0027, 0028, 0034).
- Roller ve izinler bu işe girmez (0026).

## Bitti sayılır

- Testler geçiyor: doğru şifre oturum açıyor, yanlış şifre açmıyor, süresi dolan anahtar yenileniyor, çıkıştan sonra eski anahtarlar geçmiyor.
- Veritabanında düz şifre yok, çerezler güvenli bayraklarla gidiyor.
- A sitesinin oturum anahtarı B sitesinde reddediliyor.
- Seçimin karar kaydı yazıldı.

## Durum

bitti
