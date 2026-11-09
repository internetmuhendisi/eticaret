# 0082 · Menüler ve alt bilgi bağlantıları

## Tarih

2026-11-09

## Karar

Üst kısımdaki menüler ve alt kısımdaki bağlantı sütunları mağaza sahibinin verisidir (kart 0107). Sitenin veritabanında `menuler` ve `menu_ogeleri` tablolarında durur. Yalnız `cekirdek/moduller/menu/servis.ts` ile okunur ve değişir. Türler, hedefler ve sınırlar `cekirdek/kayitlar/menu.ts` kaydındadır.

**Menü.**

- Bir kodu (`ana-menu`, `alt-bilgi`), adı ve türü vardır. Kod ve tür menü açılırken verilir, değişmez. Bölümler menüye koduyla başvurur: başlangıç düzeni kimlik bilmeden menü seçebilir.
- Mağaza sahibi istediği kadar menü açar (kullanıcı kararı). Sitede en çok 50 menü olur, bu sınır yalnız kötüye kullanıma karşıdır.
- İki tür vardır:
  - **Elle kurulan:** öğelerini mağaza sahibi kurar.
  - **Kategori menüsü:** öğe saklamaz. Bütün kategori ağacından derinlik sınırına kadar, kategorilerin kendi sırasıyla kendiliğinden kurulur (kullanıcı kararı). Kategori değişince menü de değişir.
- Alt bilgi sütunları ayrı bir yapı değildir. Alt bilgi bir menüdür: en üst öğeleri sütun başlıkları, altları bağlantılardır.

**Öğe.**

- Bir hedefe bağlanır: kategori, marka, ürün, dış ya da sitenin kendi adresi (bölümlerdeki bağlantı kuralı), bağlantısız başlık.
- Sayfa hedefi kayıtta yer alır ama düz sayfalar yazılana kadar seçilemez. Veritabanı da bu türde satırı kabul etmez.
- Metni boş bırakılırsa bağlı kaydın adı görünür, ad değişince menü de değişir. Adres ve başlığın metni zorunludur.
- Dış adres yeni sekmede açılabilir. Bu seçenek yalnız adreste vardır.
- Öğeler kardeşler arasında sıralanır ve bir alt düzey açılır. Derinlik sınırı (2) kayıtta tek yerdedir.
- Bir menüde en çok 100 öğe olur.

**Silinen ya da açılmayan hedef.**

- Bağlı kayıt silinme işaretiyle silinince öğe yerinde kalır. Vitrinde altlarıyla birlikte görünmez, panelde "hedefi silinmiş" diye işaretlenir. Mağaza sahibi hedefi değiştirerek düzeltir.
- Ürünün açılıp açılmadığı ürün sayfasının vitrin koşuluyla bulunur, çünkü menü bir bağlantıdır:
  - Taslak, arşiv ve zamanı gelmemiş ürünün öğesi görünmez, panelde "hedef görünmüyor" diye işaretlenir.
  - Gizli ürünün sayfası açılır: öğesi görünür.
- Görünür altı kalmayan başlık da görünmez ("boş başlık").

**Yazmalar.**

- Her yazma menü kilidini alır. Bağlanılan kayıt paylaşımlı kilitlenir: aynı anda silinen kayda bağlanılmaz.
- Veritabanındaki ağaç tetikleyicisi (`menu_ogeleri_agac`) aynı kilitle şunları denetler: derinlik, döngü, üstün aynı menüde ve silinmemiş olması, kategori menüsüne öğe yazılmaması, öğenin başka menüye geçmemesi.
- Menünün kodu ve türü veritabanında da değişmez (`menuler_kod_ve_tur`): öğesi olan menü kategori menüsüne dönemez. Bu iki koruma ve öğenin menüsünün değişmemesi bağımsız kontrolün bulgusudur, ayrı değişikliktedir (0027): 0026 yerelde uygulanmıştı, uygulanmış değişiklik değiştirilmez.
- Kimlikler şemada küçük harfe çevrilir: büyük harfle yazılmış aynı kimlik başka kimlik sayılıp taşıma ya da döngü denetimini yanıltmaz.
- Servisin ağaç sorguları tetikleyicideki gibi 100 düzeyle sınırlıdır: tetikleyiciyi atlayan bir yazı (silinmiş satırla kurulmuş döngü) sorguyu sonsuza döndürmez.
- Hedef türüyle dolu alanların uyumunu bir denetim (`menu_ogeleri_hedef`) korur.
- Her yazma değişiklik kaydına aynı işlemde girer.
- Menü ve öğe silinme işaretiyle silinir. Silinen öğenin altları da, silinen menünün öğeleri de silinir.

**Başlangıç menüleri.**

- Sitenin `baslangic/menuler.json` dosyasındadır. Kayıtlı hedef dosyada adres adıyla yazılır.
- Site doğrulaması şunları denetler: dosyanın şemaya uyması, adres adının başlangıç kataloğunda olması, derinlik, kategori menüsünde öğe olmaması, kod tekrarı.
- Arka plan süreci açılırken, katalog kurulduktan sonra, sitede hiç menü yoksa servislerle tek işlemde bir kez yazılır.
  - Kilit sırası: menü, kategori, sonra bağlanılan satırlar. Kurulum birden çok kategori satırını kilitler, kategori silme de üstü ve altlarını günceller; kategori kilidi olmasa ikisi kilitlenebilirdi. Bağlanılan satırlar adres adından okunurken paylaşımlı kilitlenir.
  - Katalog o açılışta yazılamadıysa menüler de denenmez.
  - Kurulumdan önce silinmiş kaydın öğesi yazılmaz, hata bir kez kaydedilir.

**Okuma.**

- Vitrin menüyü koduyla `vitrinMenusu` ile alır. Her öğenin metni, hedefi (kayıtlı hedef adres adıyla) ve altları gelir.
- Panel `panelMenusu` ile her öğenin durumunu görür.
- Öğeler bağlı kayıtlarıyla tek sorguda okunur.

**İzinler.** `menu.gor` ve `menu.degistir` yalnız tam yetkili rollerdedir (kullanıcı kararı, tema ve düzenle aynı).

## Neden

- Tema değişikliği menülere dokunmaz (`.claude/rules/tasarim-sistemi.md`). Düzenden farklı olarak menünün eski hâline dönme ihtiyacı yoktur. Tablo, her hedefi veritabanında gerçek bir bağla korur ve öğeleri tek sorguda bağlı kayıtlarıyla okumayı sağlar.
- Silinen hedefin öğesini silmek yerine saklamak, mağaza sahibinin menüyü bir silme yüzünden sessizce kaybetmesini önler. Panel ne olduğunu gösterir.
- Kategori menüsünü öğe olarak kopyalamak ağaçla zamanla ayrışırdı (`.claude/rules/calisma-duzeni.md`, tek tanım).
- Başlangıç menüleri kataloğa bağlıdır. Düzen gibi ilk okumada yazılsaydı katalog kurulmadan önce yazılıp bağlantılarını kaybedebilirdi.

## Düşünülen diğer yollar

- **Menüyü düzen gibi sürüm sürüm JSON olarak saklamak:** Hedeflerin bağı veritabanında tutulamazdı, silinen kaydı bulmak her okumada JSON'u taramak isterdi. Geri dönme ihtiyacı da yok. Seçilmedi.
- **Silinen hedefin öğesini de silmek:** Menü sessizce değişirdi, mağaza sahibi neden kaybolduğunu göremezdi. Seçilmedi.
- **Alt bilgi sütunlarını ayrı bir tabloda tutmak:** Sütun, başlık ve altındaki bağlantılardır. Menünün iki düzeyiyle aynı şeydir. İkinci bir yapı gereksizdi.
- **Sabit üç menü (ana menü, kategori menüsü, alt bilgi):** Kullanıcı mağaza sahibinin istediği kadar menü açabilmesini seçti.
- **Kategori menüsünde mağaza sahibinin üst kategorileri seçmesi:** Kullanıcı bütün ağacı seçti. Seçmeli bir menü gerekirse elle kurulan menüyle yapılır.

## Sonuçları

- Vitrin adresleri henüz yok: kategori, marka ve ürün sayfaları yazılmadı. Vitrin hedefi adres adıyla alır, bağlantıyı vitrin sayfası kurar (kart 0108 ve vitrin sayfaları).
- Derinlik veritabanındaki tetikleyicide de 2 olarak yazılıdır. Kayıttaki değerle aynı olduğunu menü testi ölçer. Derinlik değişirse yeni bir veritabanı değişikliği gerekir.
- Ağaç tetikleyicisini sitenin kendi kullanıcısı kapatabilir (karar 0045 ile aynı sınır). Menüyü öğeleri silinmeden silinmiş işaretleyen doğrudan yazıyı veritabanı durdurmaz; panel ve vitrin silinmiş menüyü okumaz.
- Aynı büyük harf kalıbı kategori servisinde de var; düzeltmesi kart 0119'dadır.
- Hedef silinince öğenin altları da vitrinde görünmez. Mağaza sahibi hedefi değiştirene ya da altları taşıyana kadar o dal kaybolur. Panel bunu işaretle gösterir.
- Menü uçları ve panel ekranı yoktur. İzinlerin gerçek istekle denenmesi uçlarla gelir.
- Kurulumdan önce adres adı değişmiş ya da kaydı silinmiş öğe yazılmaz. Hata altyapı sahibine gider, mağaza sahibi menüyü panelden tamamlar.
