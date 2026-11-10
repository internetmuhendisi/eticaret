# 0091 · Tema değişikliğinde düzenin iki yolu ve birlikte geri dönüş

## Tarih

2026-11-10

## Karar

Mağaza sahibi temayı değiştirirken düzenini kaybetmez (kart 0113). Tema kodu değişen her yayında düzen için iki yoldan biri seçilir. Tema ve düzen aynı veritabanı işleminde yazılır, ikisi de değişiklik kaydına girer. Yarıda kalan değişiklik hiçbir şey bırakmaz.

**Düzeni korumak.** Düzen aynen kalır. Görünümü kütüphanede olmayan bölüm, türünün ilk (varsayılan) görünümüne düşer; bölüm silinmez. Türü kütüphanede olmayan bölüme dokunulmaz.

**Yeni temanın düzenini uygulamak (kullanıcı kararı).**

- Yeni temanın başlangıç düzeni kurulur. Sitenin başlangıç dosyası (`baslangic/duzen.json`) kullanılmaz, o eski temanındır.
- Yeni düzendeki her bölüm, aynı alanda aynı türden henüz kullanılmamış ilk eski bölümün içeriğini alır: kimliği, alan değerleri ve görünürlüğü taşınır. Görünümü yeni temanınkidir.
- Karşılığı olmayan eski bölümler silinmez: alanın sonuna, eski sıralarıyla, gizli olarak eklenir. Mağaza sahibi istediğini açar.
- Alan sınırına (50 bölüm) sığmayan eski bölüm yalnız düzen geçmişinde kalır. Kayda kimliğiyle girer, geri dönüşle bütün düzen gelir.

**Geri dönüş (kullanıcı kararı).** Her tema sürümü, yazılmadan hemen önce geçerli olan düzen sürümünün sırasını saklar (`tema_surumleri.onceki_duzen_sira`, veritabanı değişikliği 0030).

- Bir tema sürümü geçerliyken düzenin son hâli, bir sonraki tema sürümünün sakladığı düzendir.
- Tema kodu değişen geri dönüş temayı, ayarları ve o düzeni tek adımda ve tek işlemde getirir. Düzen yeni sürüm olarak yazılır (`duzen.geri-donuldu`), geçmiş kaybolmaz.
- Tema değişikliğinden sonra yapılan düzen değişiklikleri vitrinden kalkar ama düzen geçmişinde durur. Art arda ikinci geri dönüş onları getirir.
- Sırası verilen dönüş, o sürüm geçerliyken düzenin son hâlini getirir.
- Yalnız ayar değişikliğinde (tema aynı) ve onun geri dönüşünde düzene dokunulmaz. Tema aynıysa verilen düzen yolu yok sayılır. Geri dönüşte ölçü, dönülen sürümden bu yana temanın hiç değişip değişmediğidir: A, B, yeniden A'dan ilk A sürümüne dönülünce, teması bugünküyle aynı olsa da düzen gelir.
- Kart 0113'ten önce yazılmış bir sürüme dönülürse düzeni bilinmez: düzen korunur (görünüm varsayılana düşebilir), kayda "koru" yoluyla girer.

**Kilit.** Tema servisi önce tema kilidini, sonra aynı işlemde düzen kilidini alır. Düzen işlemleri tema kilidini almaz, kilitlenme olmaz. Açık duran bir düzen işlemi varsa tema değişikliği bitmesini bekler ve onun yazdığı düzene uygulanır.

**Uçlar.** Projenin ilk yönetici uçları: `GET /kapi/yonetici/tema` (`tema.gor`), `POST /kapi/yonetici/tema` ve `POST /kapi/yonetici/tema-geri-don` (`tema.degistir`). Tema değişiyor ama düzen yolu verilmemişse `dogrulama` (`duzen-yolu-gerekli`). "Mağaza sahibi temayı değiştirebilir" kapalıysa değişiklik ve geri dönüş `is-kurali` (`tema-degistirilemez`) alır. Girdi şemaları `cekirdek/moduller/tema/semalar.ts`.

## Neden

- İçeriği taşımak, mağaza sahibinin emek verdiği afiş görsellerini, başlıkları ve seçilmiş ürünleri yeni temada kaybetmemesini sağlar. Karşılıksız bölümü gizli eklemek, "hiçbir durumda içerik silinmez" maddesini vitrinden de korur: geçmişe gitmeden açılabilir (kullanıcı kararı).
- Bir tema sürümünün "kendi düzenini" saklamak yerine bir sonraki sürümde önceki düzeni saklamak, sürüm geçerliyken yapılan düzen değişikliklerini de kapsar. Sürüm satırları değiştirilemez olduğu için (karar 0080) sonradan güncellenen bir alan kullanılamazdı.
- Geri dönüşün değişiklik öncesine dönmesi basit ve öngörülebilirdir. Hiçbir düzen hâli kaybolmaz, çünkü düzen sürümleri değiştirilemez (kullanıcı kararı).
- Tema ve düzeni tek işlemde yazmak, temanın değişip düzenin eski kaldığı yarım bir vitrini imkânsız kılar.
- Yetkisiz rolün reddi ancak gerçek istekle ölçülebilir. Uçlar bu yüzden bu kartta yazıldı, panel ekranı yazılmadı.

## Düşünülen diğer yollar

- **Yeni temanın düzeni boş gelsin, eski içerik yalnız geçmişte kalsın:** Mağaza sahibi içeriğini elle yeniden girerdi. Kullanıcı taşımayı seçti.
- **Yalnız eşleşen içerik taşınsın, karşılıksız bölümler düzene girmesin:** İçerik vitrinden kaybolurdu, geri almak için bütün tema değişikliğini geri almak gerekirdi. Seçilmedi.
- **Tema değişikliğinden sonra düzen değiştiyse geri dönüş reddedilsin:** Mağaza sahibi önce düzeni elle geri almak zorunda kalırdı. Kullanıcı değişiklik öncesine dönmeyi seçti.
- **Tema ve düzen için tek ortak sürüm tablosu:** Bütün düzen işlemleri tema sürümü de yazardı, iki modül birbirine kilitlenirdi. Var olan iki sürüm tablosu bir sıra alanıyla bağlandı.
- **Tema servisinin ayrı bir "temayı değiştir" işlemi:** Aynı tema kuralları (kullanılabilir tema, ayarlar, okunurluk) iki yerde dururdu. Yayın işlemi düzen yolunu isteğe bağlı alan olarak aldı.

## Sonuçları

- Bölümün görünümünün temaya bağlı olmaması bugün "yeni temada olmayan görünüm" durumunu yalnız kütüphaneden kaldırılan görünümle sınırlar. Çekirdek güncellemesinde kaldırılan görünümün genel sorunu kart 0122'dedir; bu karar yalnız tema değişikliği anındaki düşmeyi yazar.
- Eşleşme türe ve alana göredir, sıraya göre ilk eşleşen alınır. Aynı türden birden çok bölüm varsa hangisinin nereye taşınacağını mağaza sahibi seçmez.
- Taşınan bölümün değerleri yeni temanın başlangıç değerlerinin yerine geçer. Yeni temanın o bölüm için yazdığı metin görünmez.
- Geri dönüş, tema değişikliğinden sonra yapılan düzen düzenlemelerini vitrinden kaldırır. Panel ekranı bunu geri dönüşten önce mağaza sahibine söylemelidir (panel kartı).
- Tema yayını artık düzenin başlangıç sürümünü de yazar (yoksa). Düzen başlangıcı bölüm kütüphanesine uymayan site temayı yayınlayamaz; site doğrulaması bunu açılışta yakalar.
- Vitrin temayı ve düzeni ayrı sorgularla okur. Tema değişikliği tam o anda işlenirse tek bir sayfa yeni temayı eski düzenle çizebilir; bir sonraki istekte ikisi birliktedir. Yazım tek işlemdedir.
- "O sürüm geçerliyken" harfiyendir: hedeften hemen sonra yalnız ayar değişikliği gelmiş ve düzen ondan sonra değişmişse, o düzen değişikliği dönüşle gelmez, geçmişte durur.
- Değişiklik kaydında tema ve düzen kayıtları aynı işlemde, ayrı satırlardır. Düzen kaydı tema sürümünün sırasını (`temaSurumu`) taşır.
- Altyapı sahibinin "değiştirebilir" kapalı sitede tema değiştirmesi kart 0117'dedir; o yol da düzen yolunu bu kararla seçer.
- Kural: `.claude/rules/tasarim-sistemi.md`. Uçlar: `cekirdek/kapi/uclar.md`.
