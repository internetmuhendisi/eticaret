# 0206 · Sitenin içeriğine dokunan işlem sitenin kendi kullanıcısıyla çalışır

## Tarih

2026-11-28

## Karar

Yedek provası, yedek denemesi ve geri yükleme sitenin içeriğine (tablo satırı, tür dönüşümü, kısıtlama, işlev) dokunan her adımı sitenin kendi veritabanı kullanıcısıyla yapar, yönetici olarak yapmaz (kart 0068):

- Tabloların özeti (`tabloOzetiKomutu`, `komutlar/yedek.mts`) canlıda ve provada sitenin kullanıcısıyla çalışır.
- Yedek sitenin kullanıcısıyla yüklenir (`siteYuklemeKomutu`): geri yüklemede yan veritabanına, provada geçici kutudaki veritabanına. Geçici kutuda da sitenin adında yetkisiz bir kullanıcı açılır.
- Yönetici yalnız sitenin kodunu çalıştırmayan işleri yapar: veritabanı açma ve adlandırma, izinler, düzen dökümü (`pg_dump -s`), gece yedeği (`pg_dump`), sistem kayıtlarını okuyan denetimler.
- Bunun için bağlantı kuralı değişti (karar 0023'ün yerel satırı): kutunun içinden, yerel soketten her kullanıcı şifresiz girer (`local all all trust`). Hangi veritabanına girileceğini izinler belirler.
- Geri yüklemede günlüğe satır içeriği düşmesin diye ayar bağlantı seçeneğiyle verilemez (yalnız yönetici verebilir). Yönetici onu yalnız o kullanıcı ve yan veritabanı için kaydeder (`ALTER ROLE … IN DATABASE … SET`), yüklemeden hemen sonra kaldırır.
- Sunucuda veritabanını kuran betik, kutu yeniden kurulmasa da yazdığı bağlantı kuralını okutur (`pg_reload_conf`).

## Neden

Yerelde gerçek betiklerle ölçüldü (kart 0068):

- **Tür dönüşümü:** Site kendi tablosunun türünden metne dönüşüm tanımlayabilir, çünkü türün sahibi sitedir. Eski özet sorgusu (`t::text`) bu kodu yönetici olarak çalıştırdı, site süper kullanıcı oldu.
- **Geri yükleme:** `pg_restore -U postgres --role=<site>` yüklerken yedekteki kısıtlamayı çalıştırır. Kısıtlamadaki işlev `RESET ROLE` ya da `SET ROLE postgres` ile oturumun asıl kullanıcısına döndü, site süper kullanıcı oldu.
- **Neden rol değiştirmek yetmez:** Oturumun asıl kullanıcısı yönetici kaldıkça `SET ROLE`, `--role` ve `SET SESSION AUTHORIZATION` geri alınabilir. Tek güvenli yol, oturumu baştan sitenin kullanıcısıyla açmaktır.
- **Ölçülen veritabanı ayarları:**
  - `session_replication_role`: site kaydedemiyor.
  - `session_authorization`: site kaydedebiliyor, ama yönetici oturumu yine yönetici kalıyor.
  - `local_preload_libraries`: site kaydedebiliyor ve o veritabanına bağlantıları bozuyor. Kutuda eklenti klasörü olmadığı için kod yükletemiyor; etkisi yalnız sitenin kendi yedeğini durdurmak.
- **Yeni yolla aynı saldırılar:** Gerçek Örnek Mağaza düzeniyle (83 tablo) yeni prova betiği yerelde çalıştı. Site süper kullanıcı olmadı, yedeğin özeti canlınınkiyle aynı çıktı. Ana daldaki eski betik aynı saldırıda siteyi süper kullanıcı yaptı.

## Düşünülen diğer yollar

- **Özeti `pg_dump --data-only` satırlarıyla almak:** Seçilmedi. Geri yükleme yine sitenin kullanıcısıyla yapılmak zorunda; bu da yerel bağlantı kuralını değiştirmeyi gerektiriyor. Özet aynı yoldan alınınca tek kural kalır. `pg_dump` yönetici olarak sitenin kodunu çalıştırmaz, düzen dökümü ve gece yedeği bu yüzden yönetici olarak kaldı.
- **Sitenin şifresiyle ağdan bağlanmak:** Seçilmedi. Ağdaki kural (`sameuser`) site kullanıcısını yalnız kendi adındaki veritabanına sokar, yan veritabanı (`__geri`) bu ada uymaz. Ayrıca şifrenin gizli bilgi dosyasından betiğe taşınması gerekirdi.
- **Yükleme için her seferinde geçici bir kullanıcı açmak:** Seçilmedi. Bağlantı kuralı değişmeden olurdu, ama her geri yüklemede kullanıcı açıp kapatmak, nesnelerin sahibini sonradan değiştirmek ve şifre taşımak gerekirdi.
- **Kısıtlamaları yüklemeden önce kaldırmak:** Seçilmedi. Yedekteki her ifadeyi (kısıtlama, varsayılan, indeks, dönüşüm) ayıklamak eksik kalır, yedeğin doğruluğunu da bozar.

## Sonuçları

- Kutuya `docker exec` ile girebilen (sunucuda kök kullanıcı) her site kullanıcısı olarak şifresiz bağlanabilir. Bu yeni bir yetki değil: o kişi zaten yönetici olarak şifresiz giriyordu. Site kutuları yerel soketi görmez, ağdaki kural değişmedi.
- Yerel sokette katman tektir: herkese açık bırakılmış bir veritabanına site kullanıcısı bu yoldan girebilir (izinler yok sayılır, kural yoktur). Yalnız kök bu yolu kullanır ve yalnız sitenin kendi ya da yan veritabanının adını verir. Veri ayrımı testi sitenin başka sitenin veritabanına ve PostgreSQL'in kendi veritabanlarına bu yoldan da giremediğini ölçer.
- Site, kendi tablolarının özetini kendi koduyla değiştirebilir: provanın sonucunu kendi aleyhine ya da lehine bozabilir. Bu yalnız kendi verisini etkiler; site zaten kendi verisini bozabilir.
- Gelecekte sitenin veritabanına yönetici olarak bağlanan yeni bir komut yalnız sistem kayıtlarını okuyabilir. Sitenin tablosunu, görünümünü ya da dönüşümünü yönetici olarak çalıştıran sorgu yazılmaz (`.claude/rules/veritabani.md`). Betiklerin yükleme ve özet satırları testte denetlenir, yeni bir komut yalnız disiplindir.
- Sunucudaki veritabanı kutusu yeni kuralı ancak `pnpm sunucu-veritabani` bağlantı kuralını yazıp okuttuktan sonra kullanır. O zamana kadar:
  - prova ve geri yükleme site kullanıcısıyla bağlanamaz, "no pg_hba.conf entry" ile durur (güvenli yönde);
  - sunucu denetimi "bağlantı kuralı dosyası projedekiyle aynı değil" der ve yayın komutunu durdurur.
- `local_preload_libraries` ile sitenin kendi yedeğini durdurması kapanmadı: gece yedeğinin başarısızlığı yedek kaydında ve sunucu denetiminde görünür.
- Gerçek sunucuda ölçülmedi (sunucuda prova ve deneme çalıştırılmadı). Yerelde gerçek kutularla ölçüldü.
