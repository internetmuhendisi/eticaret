# 0039 · Şifre ve oturum kendi kodumuzla: Argon2id, veritabanında özetli iki anahtar

## Tarih

2026-11-06

## Karar

- **Kütüphane:** Hazır giriş kütüphanesi kullanılmaz. Motor kendi kodumuzdur (`cekirdek/moduller/oturum/`), yalnız Node'un yerleşik şifreleme işlevlerini kullanır.
- **Şifre:** Argon2id, 19 MB bellek, 2 tekrar, 1 paralellik (`cekirdek/kayitlar/oturum.ts`). Ayar değişirse eski özet sonraki başarılı girişte yenilenir. En kısa şifre 10, en uzun 128 karakterdir, karmaşıklık kuralı yoktur (kullanıcı onayı).
- **Anahtarlar:** Giriş iki rastgele anahtar üretir: 15 dakikalık kısa anahtar ve yenileme anahtarı. Veritabanında yalnız SHA-256 özetleri durur. Yenileme anahtarı her kullanımda değişir.
- **Hareketsizlik süresi:** Site ayarıdır, altyapı sahibinindir: `yoneticiOturumuSaat` (24), `musteriOturumuGun` (30). Örnek Mağaza varsayılanla çalışır (kullanıcı onayı). Her yenilemede ileri alınır.
- **Yeniden kullanım:** Değişmiş yenileme anahtarı 30 saniye içinde gelirse aynı anda giden istek sayılır, yeni anahtar üretilmez, istek geçer. Sonra gelirse çalınmış olabilir: oturum kapanır, günlüğe uyarı yazılır.
- **Çerezler:** `__Host-` önekli, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, alan adsız.
- **Sahte istek:** Kapı veri değiştiren her istekte `Sec-Fetch-Site` ve `Origin` başlıklarını `Host` ile karşılaştırır (`cekirdek/kapi/sahte-istek.ts`). Tutmayan istek `yetki` koduyla reddedilir. İki başlık da yoksa istek tarayıcıdan gelmemiştir, geçer.
- **Tablolar:** Yönetici ve müşteri ayrı hesap ve oturum tablolarındadır (`moduller/ekip/model.ts`, `moduller/musteri/model.ts`), biçimleri ortaktır (`moduller/oturum/model.ts`, aranan alanlar ve indeksler orada yazar). Aynı e-posta iki tarafta da hesap açabilir.

## Neden

- Hazır kütüphaneler kendi tablolarını, adreslerini ve yanıt biçimlerini getirir. Kapının zarfı, izin beyanı, iki aşamalı giriş ve Türkçe adlandırmayla çakışır. Bizim ihtiyacımız birkaç yüz satırlık bir motordur, zor parçası (Argon2id, rastgele üretim) Node'un kendisindedir.
- Argon2id Node 24'te yerleşiktir, dış paket ve derlenmesi gereken kod getirmez. Bilgisayarda ve çekirdeğin görüntüsünün tabanı olan Alpine'de çalıştığı ölçüldü. Ayarlar OWASP'ın önerdiği en düşük Argon2id ayarlarındandır; Alpine'de özet yaklaşık 50 ms sürdü.
- Anahtar veritabanında arandığı için çıkış anında geçerli olur ve imza için yeni bir gizli bilgi gerekmez. Devirde de (0014) taşınacak ya da yenilenecek bir oturum sırrı yoktur. Veritabanı sızsa bile özetlerden anahtar elde edilemez: anahtar 256 bit rastgeledir, bu yüzden hızlı özet yeterlidir.
- Her site kendi veritabanını kullandığından bir sitenin anahtarı başka sitede bulunamaz. Çerez de adrese bağlıdır, tarayıcı onu başka adrese göndermez. İki katman ayrı ayrı ölçüldü.
- `SameSite` tek başına yetmez: `a.deneme.<alan>` ve `b.deneme.<alan>` tarayıcıya göre aynı sitedir. Kardeş adresten gelen istek ancak `Origin` kontrolüyle durur. `__Host-` öneki de kardeş adresin çerezin üzerine yazmasını önler.
- `Lax`, e-postadaki bir bağlantıyla gelen müşterinin oturumunu korur; `Strict` onu girişsiz gösterirdi.
- Kullanıcıya söylenen ölçü "bu süre boyunca hiç girmezse yeniden giriş ister" olduğu için süre hareketsizlikten sayılır.

## Düşünülen diğer yollar

- **Hazır kütüphane (Better Auth, Auth.js):** Seçilmedi. Gerekçesi yukarıda.
- **İmzalı anahtar (JWT):** Seçilmedi. Çıkıştan sonra süresi dolana kadar geçerli kalır, kapatmak için yine veritabanına bakmak gerekir. Ayrıca site başına bir imza sırrı daha getirir.
- **bcrypt ya da scrypt:** Seçilmedi. Argon2id güncel öneridir ve aynı kolaylıkla elde.
- **Dış Argon2 paketi:** Seçilmedi. Derlenmiş kod getirir, yerleşik işlev yeterli.
- **Tek oturum tablosu, hesap türü alanıyla:** Seçilmedi. Hesaba yabancı anahtar bağlanamaz, bir sorguda türü unutmak yönetici ile müşteriyi karıştırabilir.
- **CSRF jetonu:** Seçilmedi. Her forma ve isteğe ek parça getirir. Bugünkü tarayıcılarda kaynak başlıkları güvenilirdir ve aynı korumayı kapıda tek yerde sağlar.

## Sonuçları

- Her istek veritabanına bir sorgu atar. İndeksli tek satırdır, bu ölçekte önemsizdir.
- Oturumun üst ömrü yoktur: düzenli kullanılan oturum, çalınmış olsa da, yeniden kullanım yakalanmadıkça açık kalır.
- Yakalama yalnız bir önceki anahtarı bilir. Saldırgan çaldığı anahtarla kullanıcıdan önce iki kez yenilerse kullanıcının anahtarı yalnız geçersiz sayılır, oturum kapanmaz. Kullanıcı girişe düşer; saldırganın oturumu hareketsizlik süresine kadar sürebilir. Tam çözüm bütün eski özetleri tutmayı gerektirir, bu ölçekte seçilmedi.
- Tolerans süresindeki eski anahtar, yeni anahtar almadan bir istek geçirebilir. Bedel en çok 30 saniyedir.
- Süresi dolan oturum satırları silinmez. Temizliği arka plan kuyruğuyla yapılacak (kart 0044).
- Hesap tablolarında kişisel veri olarak yalnız e-posta vardır. Tablolar sitenin veritabanındadır, gece yedeğiyle yedeklenir.
- `Origin` karşılaştırması ön kapının `Host` başlığını değiştirmeden iletmesine dayanır. Caddy'nin varsayılanı budur, ön kapıda bunu değiştiren ayar yoktur.
- `Secure` çerez yerelde `http://<kod adı>.localhost` üzerinde de çalışır: tarayıcı `localhost` altını güvenli sayar. Chromium'da ölçüldü; öteki tarayıcılar kartlar 0027 ve 0033'ün testlerine kalır.
- Bu kartta giriş ve çıkış ucu yoktur. Motor ve kapı doğrudan test edilir, geçici bir uçla gerçek Chromium'da çerez bayrakları, kardeş adres ve sahte istek bir kez ölçüldü, uç sonra silindi.
