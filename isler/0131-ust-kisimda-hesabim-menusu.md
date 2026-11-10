# 0131 · Üst kısımda Hesabım menüsü

## Amaç

Ana sayfada bölüm olunca müşterinin hesap alanı (e-postası ve "Çıkış") sayfadan kalkıyor. Hesap alanı yalnız bölümsüz, sade ana sayfada çizilir (`cekirdek/vitrin/ana-sayfa.tsx`). Üst satırdaki "Hesabım" bağlantısı (`cekirdek/vitrin/bolumler/ust-satir/gorunum.tsx`) müşteri giriş yapmış olsa da her zaman giriş sayfasına gider. Örnek Mağaza'nın bugünkü düzeninde giriş yapan müşteri ne giriş yaptığını görür ne de çıkış yapabilir.

Kart 0129 sırasında ölçüldü (2026-11-10): tarayıcı testlerinden önce Örnek Mağaza'nın düzeni kurulunca müşteri hesabı ve şifre sıfırlama testlerinden 11'i düştü (sekizi müşteri hesabı, üçü şifre sıfırlama). Hat düzeni hiç kurmadığı için bunu bugüne kadar görmemişti.

Kullanıcının kararı: üst kısımdaki "Hesabım", giriş yapmış müşteriye e-postasını ve "Çıkış"ı gösteren küçük bir menü açar; giriş yapmamış müşteriyi giriş sayfasına götürür. Her vitrin sayfasında çalışır. Bu kart 0129'dan önce yapılır.

## Olmazsa olmazlar

- Oturum, hesap alanındaki gibi uçtan sorulur (karar 0039, 0051). Yalnız 401 girişsiz sayılır; sunucu ya da ağ hatasında girişli müşteri "Giriş yap" görmez.
- Menü ortak `AcilirMenu` parçasıyla kurulur, klavyeyle açılır ve kapanır, telefonda yan penceredeki hesap öğesinde de aynı bilgi ve "Çıkış" vardır.
- Hesap alanının oturum sorma ve çıkış işi tek yerde durur: sade ana sayfanın hesap alanı ile üst kısmın menüsü aynı kodu kullanır.
- Müşteri hesabı ve şifre sıfırlama tarayıcı testleri Örnek Mağaza'nın gerçek, bölümlü ana sayfasında geçer. Testin denediği şey zayıflamaz.
- Panel ve sahip paneli değişmez.

## Sınırlar

- Müşterinin hesap sayfası (siparişler, adresler) bu kartın işi değildir.
- Kart 0129'un hat işleri (tarayıcı testlerinin hazırlığı, hidrasyon, yerel ölçüm) bu karta karışmaz.

## Bitti sayılır

- Bölümlü ana sayfada giriş yapan müşteri üst kısımdaki menüde e-postasını görür ve çıkış yapar; telefonda yan pencerede de.
- Sade ana sayfada hesap alanı eskisi gibi çalışır.
- Müşteri hesabı ve şifre sıfırlama tarayıcı testleri düzeni kurulmuş sitede yeşil.

## Durum

yapılacak
