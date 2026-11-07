# 0053 · Site kullanıcısından başka sitelerin sayaçları ve listeleri kapalı, numaradan kullanıcı adı kabul edildi

## Tarih

2026-11-07

## Karar

Karar 0023'ün "bilinen sınır" maddesi burada çözülür. Veritabanları tek PostgreSQL'de kalır (karar 0013, 0034).

- **Kapatılan:** Sitenin veritabanında `PUBLIC`'ten izin kaldırılır (`komutlar/site-ust-bilgi.mts`). Bütün `pg_stat_get_*` işlevleri, `pg_lock_status`, `pg_prepared_xact`, `pg_tablespace_size`; `pg_database`, `pg_roles`, `pg_user`, `pg_group`, `pg_auth_members`, `pg_shdepend`, `pg_shdescription`, `pg_shseclabel`, `pg_db_role_setting`, `pg_locks`, `pg_prepared_xacts`, `pg_stat_activity`, `pg_stat_database`, `pg_stat_database_conflicts`.
- **Uygulama yeri:** Açma betiği sonunda sitenin veritabanına geçip kapatır, tekrar çalıştırılabilir. Geri yükleme, yedek açıldıktan sonra yeni veritabanında yeniden uygular; tutmazsa canlıya dokunmaz.
- **Güvenli yönetici oturumu:** Sitenin veritabanına bağlanan her yönetici komutu `PGOPTIONS='-c search_path=pg_catalog -c role=none'` ile açılır (`guvenliOturum`): açma betiği, geri yükleme, prova, denetim, gece yedeği. Bir test bu komutların listesini kaynaktan okuyup ayarı arar.
- **Denetim:** Veri ayrımı testi her sorguyu sitenin kullanıcısıyla dener. `pnpm sunucu-denetle` sunucudaki her site veritabanında açık kalanı arar, tek sütun iznini de sayar; açık varsa kırmızıdır ve `pnpm yayinla` durur.
- **Kabul edilen sınır (kullanıcıya söylendi):** Aşağıdaki "Sonuçları" bölümündeki kalanlar.
- **Çekirdek sürümü değişmez:** Çekirdek kodu değişmedi, değişiklik komutlardadır.

## Neden

- **İzinle kapanıyor:** Yerelde PostgreSQL 18 ile ölçüldü. Site kullanıcısı veritabanının sahibidir ama sistem kayıtlarının sahibi değildir, izni doğrudan geri veremez.
- **Güvenli oturum şart:** Sahip `ALTER DATABASE ... SET search_path` ile kendi işlevini sistem işlevinin önüne alabilir. Yönetici o veritabanında sorgu çalıştırınca işlev yönetici yetkisiyle çalışır, site süper kullanıcı olur. Bağımsız kontrol bunu bu kartın ilk yazımında gerçek betikle ölçtü (`rolsuper` `t` oldu, `COPY TO PROGRAM` çalıştı). Aynı yol yedek provasında bu karttan önce de vardı. Bağlantı ayarı veritabanı ayarını ezer; saldırı testte gerçek betik ve denetim sorgusuyla yinelenir.
- **İşlevler de kapanmalı:** Yalnız görünümü kapatmak yetmez, `pg_stat_get_db_xact_commit(<numara>)` doğrudan çağrılabilir. Görünümler işlevi çağıranın izniyle çalıştırdığı için işlevi kapatmak görünümleri de kapatır.
- **Yedekten gelmez:** İzin sistem kayıtlarındadır, `pg_restore --no-acl` onu taşımaz. Bu yüzden geri yükleme yeniden uygular (testte ölçüldü: yedekten açılan veritabanında açıktır).
- **Yedek etkilenmez:** Yedekler yöneticiyle alınır. Site kullanıcısıyla `pg_dump` artık çalışmaz; projede böyle bir kullanım yoktur.
- **Çekirdek bunları okumaz:** Uygulama ve değişiklik uygulayıcısı testlerde çalıştı.

## Düşünülen diğer yollar

- **Her siteye ayrı PostgreSQL kutusu:** Seçilmedi. Adların görünmesini de kapatırdı ama 30 sitede sunucu belleği yetmez (karar 0034). Satış ve işlem bilgisi zaten kapandığı için bu bedele değmez. Bir mağaza adının bile görünmemesi gerekirse o mağaza için yeniden düşünülür.
- **`template1` üzerinde kapatmak:** Seçilmedi. Yeni veritabanları miras alırdı, ama açma sırasında `template1`'e bağlanmak aynı anda çalışan `CREATE DATABASE`'i bozar (karar 0048).
- **`pg_get_userbyid` işlevini de kapatmak:** Denendi, uygulama çalıştı, ama seçilmedi. Aynı bilgi `regrole` dönüşümüyle alınır, kapatmak yalnız yanlış güven verirdi.

## Sonuçları

- **Numaradan kullanıcı adı görünür:** `<numara>::oid::regrole` kullanıcı adını verir ve kapatılamaz. Kullanıcı adı `site_<kod adı>` olduğu için numaraları sırayla deneyen biri bu PostgreSQL'deki sitelerin kod adlarını listeleyebilir. Yani saldırganın sitenin kodunu ya da veritabanı şifresini ele geçirmesi hâlinde öteki mağazaların kod adları öğrenilebilir. Satış, işlem, oturum, tablo ya da müşteri bilgisi görünmez. Veri ayrımı testi bu sınırı denetler. `pg_describe_object` ile veritabanı adı da görünür, kullanıcı adıyla aynı olduğu için ayrıca kapatılmadı.
- **Oturumun varlığı:** `pg_cancel_backend(<numara>)` var olan süreçte izin hatası, olmayanda uyarı verir. Sunucuda o numarada bir oturum olduğu anlaşılır, kime ait olduğu anlaşılmaz.
- **Ad veren başka yollar:** `pg_get_acl`, `pg_identify_object` ve `pg_describe_object` numaradan ad verir; aynı bilgi `regrole` ile alındığı için kapatılmadı.
- **Toplam hareket görünür:** `pg_current_xact_id()`, `pg_current_snapshot()`, `pg_control_checkpoint()`, `pg_current_wal_lsn()` ve kendi satırının numarası bütün sitelerin toplam işlem hareketini kabaca gösterir, hangi siteye ait olduğu görünmez. Sitenin kendi yazdığı satırın numarası bile bunu verdiği için kapatılamaz. Bu PostgreSQL'de tek site kalırsa toplam hareket ona ait olur.
- **Sitenin kendi sayaçları da kapanır:** Site kullanıcısı kendi tablolarının sayacını okuyamaz. Yavaş sorgu ya da boyut izlemesi gelince yöneticiyle okunur.
- **Site kullanıcısının kaybettikleri:** `psql` ile `\d <tablo>`, `\du` ve `\l` çalışmaz, `\dt` çalışır. `information_schema.columns` ve `domains` süzgeçsiz sorguda izin hatası verir (bağımsız kontrol ölçtü), `public` şemasıyla süzülünce çalışır. Site kullanıcısıyla `pg_dump` çalışmaz. Projede bunların kullanımı yoktur; yöneticiyle bakılır.
- **Yönetici işi için tek yol:** Yeni bir komut sitenin veritabanına yönetici olarak bağlanacaksa `guvenliOturum` kullanır. Listedeki dosyaların dışında yazılırsa test görmez, yalnız disiplindir.
- **Yedekte izin kayıtları:** Döküm artık sistem kayıtlarının 138 izin satırını taşır. Geri yükleme ve prova `--no-acl` kullanır. Devir komutu (karar 0014) yazılırken buna bakılmalı.
- **PostgreSQL sürümü değişince:** Yeni görünüm ya da farklı adlı sayaç işlevi listede olmayabilir. `pg_stat_get_` ile başlayanları desen kapsar; yeni sistem görünümü elle eklenir. Yalnız disiplindir.
- **Gece yedeği betiği değişti:** Sunucuya `pnpm yedek-kur` ile gider. Gidene kadar `pnpm sunucu-denetle` betiğin projedekiyle aynı olmadığını söyler.
- **Sunucu henüz uygulanmadı:** Sunucudaki veritabanı açık kalır, `pnpm sunucu-denetle` ve onu çağıran `pnpm yayinla` kırmızı olur. Kapatmak için `pnpm sunucu-veritabani siteler/<kod-adi> <ortam>` çalışır. Bu komut kimlikteki sürümün veritabanı değişikliklerini de uygular; yayınlanan sürüm eskiyse değişiklik önce gider. Değişiklikler eski kodla çalışacak biçimde yazıldığı için sorun çıkarmaz, sunucuda bu kartta denenmedi.
- **Geri yükleme adımı sunucuda ölçülmedi:** Adımlar yerelde ve testte denendi. `pnpm yedek-denemesi` sunucuda çalıştırılmadı; `pnpm sunucu-denetle` geri yüklemeden sonra açık kalanı yakalar.
