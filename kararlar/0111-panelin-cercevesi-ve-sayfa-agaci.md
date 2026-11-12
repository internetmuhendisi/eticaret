# 0111 · Panelin çerçevesi ve sayfa ağacı

## Tarih

2026-11-13

## Karar

Yönetim panelinin her sayfası tek bir sayfa ağacında yazılır (`cekirdek/yonetim-paneli/sayfa-agaci.ts`): adres, ad, açıklama, ikon, gereken izin, menü grubu ve varsa üst sayfa. Ana menü, sayfa yolu, sayfa başlığı ve sekme başlığı bu ağaçtan üretilir (kart 0141).

- Menü, yöneticinin sunucudan okunan izinleriyle süzülür. İzinler tek sorguyla okunur (`yoneticininYetkileri`), kuralı izin sorusuyla (`yoneticininIzniVarMi`) aynıdır. İzni olmayan sayfa menüde görünmez, adresi bilinse de bulunamadı verir.
- Ekranı yazılmamış sayfa ağaca girmez. Bugün ağaçta yalnız karşılama sayfası vardır. Vitrin bölümleri, Menüler ve Tema kendi kartlarıyla (0142, 0143, 0148) ağaca girer.
- Her panel sayfası `PanelSayfasi` ile çizilir: üstte komut çubuğu (sayfa yolu, başlık, açıklama, eylemler), altında içerik. Eylemlerin adı ve ikonu tek kayıttadır (`cekirdek/yonetim-paneli/eylemler.ts`).
- Çerçeve masaüstünde solda yan menüdür, telefon ve tablette menü yan pencerede açılır (karar 0102). Yan menünün altında giriş yapan yöneticinin e-postası, "Vitrine git" (yeni sekmede), "Çıkış yap" ve altyapı adı durur.
- Panel sayfası çizilirken yöneticinin kimliği anahtar değiştirilmeden okunur (`oturumunHesabi`, `panelOturumu`). Oturumun açık olup olmadığını söyleyen kural aynı işlevdir (karar 0039, 0042).
- Sıralanabilir küçük liste ortak kütüphanededir (`SiralanabilirListe`). Sürükleme @dnd-kit ile yapılır: satır tutamaktan fareyle ya da parmakla sürüklenir, klavyeyle boşluk ve ok tuşlarıyla taşınır. Her genişlikte "yukarı al" ve "aşağı al" düğmeleri de vardır: sürükleyemeyen kullanıcı tek dokunuşla taşır (WCAG 2.2, 2.5.7). Her taşıma ekran okuyucuya duyurulur.

## Neden

- Menü, sayfa yolu ve başlık ayrı yerlerde yazılsaydı zamanla ayrışırdı. Tek ağaç, yeni ekranın bir satırla menüye, yola ve başlığa girmesini sağlar (`.claude/rules/yonetim-paneli.md`).
- Yetki ikinci bir listeyle yazılmaz: sayfa yalnız izin adını söyler, cevabı rollerin bugünkü izin tablosu verir.
- Menü her sayfada çizilir. Her sayfanın iznini ayrı sorgulamak sayfa sayısı kadar sorgu demekti, tek sorgu yeter.
- @dnd-kit klavyeyle sıralamayı, dokunmatik ekranı ve ekran okuyucu duyurularını hazır ve denenmiş olarak verir. Bunları elle yazmak hem uzun hem hataya açıktı.

## Düşünülen diğer yollar

- Ekranı henüz olmayan sayfaları da menüye koymak: menü şimdiden dolu görünürdü, ama bağlantılar bulunamadı sayfasına giderdi.
- Sürüklemeyi tarayıcının kendi sürükle-bırak özelliğiyle yazmak: dokunmatik ekranda çalışmaz, klavye ve duyurular yine elle yazılırdı.
- Yalnız "yukarı al" ve "aşağı al" düğmeleri: erişilebilir ve basittir, ama uzun listede bir satırı uzağa taşımak çok tıklama ister. Düğmeler sürüklemenin yanında kalır.

## Sonuçları

- Yeni panel ekranı üç yerde değişir: ağaca bir satır, `app/yonetim/(panel)/` altında sayfa dosyası ve sayfa dosyasında `<PanelSayfasi kod="...">`. Ağaç ile sayfa dosyalarının birebir aynı olmasını `cekirdek/yonetim-paneli/testler/sayfa-agaci.test.ts` denetler.
- Sayfa yolunda menü grubu ("Vitrin") adım olarak görünmez: grubun kendi sayfası yoktur. Taslakta grup adımı vardı; grup sayfası gelirse eklenir.
- Menü satırları 44 px yüksekliğindedir, taslakta 40 px: dokunma alanı kuralı (`.claude/rules/telefon-gorunumu.md`).
- "Yukarı al" ve "aşağı al" düğmeleri 32 px'tir (WCAG 2.2 AA'nın 24 px sınırının üstünde, 44 px'in altında). Taslakta telefonda yoktular, işleri satırın "Diğer işlemler" menüsündeydi. Bağımsız kontrol bunun sürüklemeye karşılığı parçanın kendisine değil her ekrana bıraktığını buldu; düğmeler telefonda da durur. Satırın menüsü yine `islemler` ile aynı işi yapabilir.
- İzni olmayan sayfanın sekme başlığı da sayfanın adını taşımaz. Panel menüsünün grup başlığı her çizimde ayrı kimlik alır: yan menü ve telefonun yan penceresi sayfada birlikte durabilir. Geniş logo yan menüde yerin yarısını geçmez, oranını korur.
- @dnd-kit yeni bir dış pakettir (`@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2). Güvenlik taraması her yayında onu da tarar.
- Liste motoru yazılınca sıralanabilir liste ona bağlanır (`.claude/rules/liste-motoru.md`).
