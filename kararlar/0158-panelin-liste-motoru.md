# 0158 · Panelin liste motoru ve tablo parçası

## Tarih

2026-11-21

## Karar

Panelin bütün listeleri tek liste motorundan çıkar (kart 0258):

- Her listenin tanımı tek dosyadadır (`ListeTanimi`, `cekirdek/yonetim-paneli/liste/tanim.ts`): süzgeçler (sekme ya da çok değerli seçenekler), arama (adreste ya da değil), sıralamalar, sıralanabilir sütunlar, sayfalı olup olmadığı ve toplu işlemler (her biri kendi izniyle). Panel sayfası adresi bu tanımla okur (`listeDurumunuOku`), liste ekranı adresi bu tanımla yazar (`listeAdresi`), liste ucunun şeması bu tanımdan üretilir (`listeUcuSemasi`).
- Hücreler tarayıcıda, listenin kendi istemci dosyasında tanımdan çizilir (`Liste`, `cekirdek/yonetim-paneli/liste/liste.tsx`); sunucu yalnız biçimlenmiş satırları verir. Böylece adrese yazılmayan aramanın sonucu (uçtan gelen satırlar) aynı tabloda çizilir.
- Sipariş araması adrese yazılmaz (kişisel bilgi, karar 0145): ekran aranan metni liste ucuna gönderir, süzgeç, sıralama ve sayfa değişince yeniden sorar. Öteki listelerde arama adrestedir.
- Çok değerli süzgeç adreste virgülle yazılır (`?odeme=havale,kart`): kapının GET okuması tekrarlanan parametreyi taşımaz.
- Toplu işlem en çok bir sayfanın satırlarına uygulanır ("bütün sayfaları seç" yok). Her satır tekil işlemle aynı servis yolundan, kendi işleminde geçer; işlenemeyen satır nedeniyle döner, ötekiler sürer (`TopluSonuc`).
- Sayfa başına satır mağaza sahibinin ayarıdır (`panelSayfaBoyu`: 25, 50, 100; karar 0157'nin önerisi). Ekranda yalnız gösterilir; değiştirme ekranı mağaza bilgileri kartındadır.
- Sayfada elle `<table>` yazılmaz: küçük tablolar `Tablo` parçalarıyla (`bilesenler/parcalar/tablo.tsx`), satır seçimi `TabloSecimi` ile çizilir. Kural denetimdedir (`denetim/kurallar/elle-tablo.grit`).
- Eklentinin panel ekranı eklentinin `panel/` klasöründedir (`cekirdek/eklentiler/<kod>/panel/`) ve panelin metin okuyucusunu kullanabilir (vitrin metinleri testi bu klasörü serbest sayar).

## Neden

- Kurallar listenin tek yerde tanımlanmasını ister (`.claude/rules/liste-motoru.md`); adresin okunması, yazılması ve ucun girdisi aynı tanımdan çıkınca biri ötekinden ayrışamaz.
- Hücreyi sunucuda çizmek daha az tarayıcı kodu demekti, ama adrese yazılmayan aramanın sonucu ayrı bir çizim yolu isterdi (kart 0234'teki ayrı arama kutusu buydu). Tek çizim yolu tek görünüş verir.
- Toplu işlemin tekil işlemle aynı yoldan geçmesi kilidi, görülen durumu, geçiş kuralını ve geçmişi kopyalamadan korur; satır başına işlem bir satırın hatasının ötekileri geri almasını önler.
- Sayfa sınırlı toplu işlem onay penceresinin söylediği sayının ekranda görülen satırlar olmasını sağlar.

## Düşünülen diğer yollar

- Sipariş aramasını da adrese yazmak: tek yol olurdu, ama müşteri adı ve e-posta tarayıcı geçmişine, sunucu kayıtlarına ve yönlendirme başlığına düşerdi.
- Hücreleri sunucuda çizip aramayı ayrı listede göstermek (kart 0234'teki gibi): arama sonucunda seçim ve toplu işlem olmazdı.
- Bütün sonuçları seçip toplu işlem: bu bölümün temel işlemlerinde gerekmedi; seçilmeyen satırın görülmeden işlenmesi riskli. Gerekirse sunucuda süzgeçle işleyen ayrı bir yol yazılır.
- Süzgeci "Uygula" düğmesiyle uygulamak (taslak): her işaret hemen adrese yazılınca bir adım eksilir; menü açık kalır, birden çok değer art arda seçilir.
- Seçimi Radix'in `OnayKutusu` ile yapmak: görünür etiket ister; tablo satırında ad satırın kendisindedir, kutu ekran okuyucu adıyla yetinir.

## Sonuçları

- Her liste kendi istemci dosyasında sütunlarını yazar; liste tarayıcıya hücre kodunu taşır (panelde, vitrinde değil).
- Gizli aramada sekme, süzgeç, sıralama ve sayfa değişince sayfa önce aramasız çizilir, sonra arama yeniden sorulur (bir fazla sunucu okuması).
- Tablo başlığıyla sıralama yalnız iki yönü olan sütunlarda vardır; tek yönlü sıralamalar (stok bildirimleri) yalnız menüdedir.
- Taslaktaki "bütün kayıtları seç" ve "Uygula" düğmesi yoktur.
- Eski adres `?talep=evet` artık `?durum=iade-talebi`dir; eski adres tanınmayan değer olarak yok sayılır.
