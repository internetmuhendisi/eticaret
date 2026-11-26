# 0188 · Panelin kupon ekranları

## Tarih

2026-11-26

## Karar

Kart 0313: mağaza sahibi kuponlarını panelden açar, değiştirir, kapatır ve kullanımlarını görür. Ekranlar `cekirdek/yonetim-paneli/kuponlar/`, sorgular `cekirdek/moduller/kampanya/panel.ts`, yazma kupon servisinde (`ekle`, `degistir`).

Kullanıcı kararları:

- Kuponları görmek (`kupon.gor`) görevliye ve sipariş görevlisine de açıktır: müşterinin kupon sorusunu cevaplarlar. Açmak, değiştirmek, kapatmak ve yeniden açmak (`kupon.degistir`) yalnız mağaza sahibinindir: kupon doğrudan ciroyu etkiler.
- Kupon silinmez, kapatılır. Kapalı kupon listede "Kapalı" sekmesinde durur, yeniden açılır, kullanım geçmişi kalır.

Teknik kararlar:

- Kuponun durumu (etkin, zamanlanmış, süresi dolmuş, kapalı) tek SQL ifadesinden, veritabanının saatiyle bulunur (`kuponDurumuSql`); liste, sayılar ve kuponun sayfası onu kullanır. Kural vitrindeki geçerlilikle aynıdır: başlangıç anında başlar, bitiş anında biter. Sınırı dolmuş kupon "etkin"dir, kullanım sütunu sınırı gösterir.
- Kullanım siparişe bağlı ve geri verilmemiş kullanımdır (süren ödemenin ayırması sayılmaz). Kuponun sayfasının özeti (verilen indirim, kuponlu siparişlerin toplamı, iade sonrası net) aynı kullanımların siparişlerinden; kullanıldığı siparişler listesi iptal edilen siparişi de durumuyla ve "kullanım geri verildi" yazısıyla gösterir.
- Form alanları metin gider (tutar sitenin para biçimiyle, zaman sitenin saat diliminde yerel zaman, sınır tam sayı); sunucuda `panelKuponGirdisi` çevirir. Kuralların hepsi tek işlevdedir (`kuponuDenetle`): başlangıç kuponları, panelin eklemesi ve değişikliği aynı kuralla geçer; hatalar alanın yoluyla birlikte döner.
- Değişiklik yalnız değişen alanları ve ekranın gördüğü değişme anını gönderir (`kuponlar.degisme_zamani`, değişiklik 0064); arada değişen kupon `kupon-degisti` alır. İndirim türüyle, kapsam seçimiyle birlikte gider. Aynı değerler hiçbir şey yazmaz.
- Kullanılmış kuponun kilitli alanları servisin "kullanildi" hatasıyla alanın yolunda reddedilir (veritabanı tetikleyicisi ikinci katmandır); ekran onları kapalı gösterir ve nedenini yazar.
- Kapsamda kalan, sonradan silinmiş ürün ya da kategori kuponun öteki alanlarının değişmesini engellemez (kupon o kayıtta zaten geçmez); yalnız yeni eklenen kaydın silinmemiş olması denetlenir.
- Kuponun adı (mağaza sahibinin kendi notu) değişiklik kaydına değeriyle girmez.
- Kod tekilliği önce okunur, aynı anda yazılan iki aynı kodu veritabanının tekil indeksi durdurur; ihlal "kod-var"a çevrilir (bağımsız kontrolün bulgusu).
- Kuponun sayfasındaki kalan hak süren ödemelerin ayırdığı kullanımı da düşer ve bunu söyler: vitrin sınıra onları da sayar (bağımsız kontrolün bulgusu).

## Neden

- Görmek ve değiştirmek ayrı izindir (yetki kuralı); kuponu silmek kullanım geçmişini ve raporları bozardı.
- Durumu tek ifadeyle bulmak sekme sayılarının, satırın rozetinin ve kuponun sayfasının ayrışmasını önler.

## Düşünülen diğer yollar

- Kullanılmamış kuponu silmek: kullanıcı yalnız kapatmayı seçti.
- Durumu uygulamada hesaplamak: sekmelerin süzgeci ve sayıları SQL'de olmalıydı, iki kural olurdu.

## Sonuçları

- Kupon raporu (dönemlik karşılaştırma) kart 0318'dedir.
- Satır menüsü (taslaktaki "…") yoktur: düzenleme ve kapatma kuponun sayfasındadır.
