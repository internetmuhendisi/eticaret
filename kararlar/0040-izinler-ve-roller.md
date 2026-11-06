# 0040 · İzinler kodda, roller veritabanında; kapı her istekte sorar

## Tarih

2026-11-06

## Karar

- **İzinler:** Kodda durur. Her modül kendi `izinler.ts` dosyasında yazar, `cekirdek/kayitlar/izinler.ts` toplar. Her iznin girişi ve kapsamı (`kendi`, `ekip`, `tumu`) vardır. Müşteri izninin kapsamı yalnız `kendi` olabilir.
- **Roller:** Veritabanındadır (`roller`, `rol_izinleri`, `yonetici_rolleri`). Bir yöneticinin birden çok rolü olabilir. Başlangıç rolleri değişiklik dosyasıyla girer: Mağaza sahibi ve Görevli (kullanıcı onayı). Görevli bugün yalnız kendi hesabını görür.
- **Tam yetki:** Mağaza sahibi rolü `tam_yetki` alanıyla bütün yönetici izinlerini alır.
- **Müşteri:** Rolü yoktur. Geçerli oturumu olan her müşteri müşteri girişinin izinlerine sahiptir.
- **Kapı:** Her istekte sırayla sahte istek, istek sınırı, oturum, izin, girdi denetlenir (`cekirdek/kapi/izin-kontrolu.ts`). İzin veritabanından her istekte okunur. Uç, hesabın kimliğini ve kapsamı kapıdan alır. Kapsama göre süzmek servisin işidir.
- **Yeni hata kodu:** Geçerli oturumu olmayan istek `oturum-yok` (401) alır, oturumu olup izni olmayan `yetki` (403) alır.
- **Son sahip:** Tam yetkili son yöneticinin rolü alınamaz, `is-kurali` döner (kullanıcı onayı). Silinmiş hesap sayılmaz. Aynı anda iki rol alma tam yetkili rol satırlarının kilidiyle sıraya girer.

## Neden

- İzni kod kullanır: kod değişmeden yeni izin anlamsızdır, kodda bulunmayan izin de hiçbir şey açmaz. Kayıt kodda olunca yanlış izin adı tür kontrolünde yakalanır.
- Rol ekranı temel pakette vardır (ekip ve roller), siteler kendi rollerini kuracaktır. Bu yüzden roller sitenin verisidir.
- Tam yetki alanı olmasaydı her yeni izin için her sitede veritabanı değişikliği gerekir, biri unutulursa mağaza sahibi yeni özelliğe giremezdi.
- İzin her istekte okununca alınan rol hemen geçerli olur. İndeksli tek sorgudur.
- İzin girdiden önce denetlenir: yetkisiz kişi hatalardan ucun girdi yapısını öğrenemez.
- Ekranın "giriş yap" ile "yetkin yok" durumlarını ayırması gerekir, tek kod bunu söyleyemezdi.
- Son sahibin rolü alınırsa mağazada ekibi yönetecek kimse kalmaz, sorunu ancak altyapı sahibi çözerdi.

## Düşünülen diğer yollar

- **Rolleri kodda tutmak:** Seçilmedi. Rol ekranı geldiğinde taşımak gerekirdi, sitenin rolü her sitede aynı olmak zorunda kalırdı.
- **İzinleri de veritabanında tutmak:** Seçilmedi. Uç beyanı tür kontrolünden geçemezdi.
- **Mağaza sahibine her izni satır satır yazmak:** Seçilmedi. Gerekçesi yukarıda.
- **İzinleri oturum anahtarına gömmek ya da bellekte tutmak:** Seçilmedi. Rol alındıktan sonra erişim bir süre daha açık kalırdı.
- **Girişsizi de `yetki` ile cevaplamak:** Seçilmedi. Kart yalnız izni olmayanın kodunu söylüyor, ekran ayrımı istiyor.
- **Örnek ucu uygulamada gerçek adres olarak açmak:** Seçilmedi. Kullanılmayan açık adres gereksiz risktir, uç testte tanımlanır.

## Sonuçları

- Her korumalı istek iki sorgu atar: oturum ve izin.
- Tam yetkili rol, `rol_izinleri` satırı olmadan izin verir. Rol ekranı bu rolün izinlerini liste diye değil "bütün izinler" diye göstermelidir.
- `rol_izinleri.izin` alanı serbest metindir, kayıtla veritabanı arasında yabancı anahtar yoktur. Kayıttan kaldırılan iznin satırı zararsız kalır: kod artık o izni sormaz. Başlangıç rollerinin tanımla aynı olduğunu test denetler.
- Sınırlı role izin eklemek hem değişiklik dosyası hem tanım satırı ister, yani güncellenen sitede rol ekranından eklenmiş izinlerle çakışmamalıdır. Rol ekranı gelince yeniden düşünülür.
- Son sahip kuralı yalnız rol alırken çalışır. Hesap kapatma servisi henüz yoktur, kart 0029'a not düşüldü.
- `rolVer` ve `rolAl` işlemi kimin yaptığını almaz. Rol ekranı ya da ucu geldiğinde, `ekip.rol-ata` verilen sınırlı biri kendine tam yetkili rol verebilir; o uç kişinin kendi izinlerinin üstünde rol vermesini engellemelidir. Bugün etkisizdir: uç yoktur, bu izin yalnız tam yetkili roldedir.
- Kapı kapsama göre kayıt süzmez, yalnız oturumun kimliğini ve kapsamı verir. Ucun süzmesi kart 0030'a kadar yalnız disiplindir.
- İlk yöneticinin rolünü 0027'nin komutu verir, karta not düşüldü.
- Rol verme ve alma yalnız servistir, ucu ve ekranı yoktur. `ekip.gor` ve `ekip.rol-ata` izinleri ilk uçlarını bekler.
- Rol değişiklikleri kart 0029'a kadar kaydedilmez.
- `ekip` kapsamı kayıttadır, henüz kullanan izin yoktur.
- `magaza-sahibi` sözcüğü ayar sahipleri kaydında (karar 0010) ayrı bir kavramdır: ayarı kimin değiştirdiğini söyler. Paneldeki ayar ekranı bunu izinlere bağlarken ikisi karıştırılmamalıdır.
- Kapı sahip girişini izinsiz olduğu için tümüyle kapalı tutar, sahip anahtarı sahip paneliyle gelir.
