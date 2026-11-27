// Panelin giriş adresleri ve girişten sonra dönülecek adresin denetimi (kart 0027, karar 0042).
export const panelAdresi = "/yonetim";
export const girisAdresi = `${panelAdresi}/giris`;
export const kodAdresi = `${girisAdresi}/kod`;
export const kurulumAdresi = `${girisAdresi}/kurulum`;
export const sifremiUnuttumAdresi = `${girisAdresi}/sifremi-unuttum`;
export const sifreYenileAdresi = `${girisAdresi}/sifre-yenile`;
// Ekibe davetin kabul sayfası (kart 0275): bağlantının anahtarı adresin # sonrasındadır.
export const davetKabulAdresi = `${girisAdresi}/davet`;
export const donusParametresi = "donus";
// Siparişler ve bir siparişin ayrıntısı (kart 0234); yönetici bildirimi e-postası da buraya bağlanır (kart 0241).
// Tema ve tema ayarları (kart 0260): iki sayfa birbirine bağlanır.
export const temaAdresi = `${panelAdresi}/tema`;
export const temaAyarlariAdresi = `${temaAdresi}/ayarlar`;
export const siparislerAdresi = `${panelAdresi}/siparisler`;
export const siparisAyrintisiAdresi = (numara: string): string =>
  `${siparislerAdresi}/ayrinti?numara=${encodeURIComponent(numara)}`;
// Sipariş fişi (kart 0270): numaralar virgülle; yazdır, sayfa açılınca yazdırma penceresini getirir.
export const siparisFisiAdresi = (numaralar: readonly string[], yazdir = true): string =>
  `${siparislerAdresi}/fis?numara=${numaralar.map(encodeURIComponent).join(",")}${yazdir ? "&yazdir=1" : ""}`;

// Müşteriler (kart 0271): liste ve ayrıntı (?kimlik=).
export const musterilerAdresi = `${panelAdresi}/musteriler`;
export const musteriAyrintisiAdresi = (kimlik: string): string =>
  `${musterilerAdresi}/ayrinti?kimlik=${encodeURIComponent(kimlik)}`;

// Mağaza bilgileri (kart 0278).
export const magazaBilgileriAdresi = `${panelAdresi}/magaza-bilgileri`;

// Vergi ayarları (kart 0322).
export const vergiEkraniAdresi = `${panelAdresi}/vergi`;

// Yorumlar (kart 0277): liste Onay bekleyen sekmesiyle açılır; yönetici bildirimi e-postası da buraya bağlanır.
export const yorumlarAdresi = `${panelAdresi}/yorumlar`;

// Ürünler listesi (kart 0262); ürün ekranı kart 0263'le gelir.
export const urunlerAdresi = `${panelAdresi}/urunler`;
// Ürün ekranı (kart 0263): yeni ürün ve var olan ürünün ekranı (kimlik adresin sorgusunda).
export const yeniUrunAdresi = `${urunlerAdresi}/yeni`;
// Excel ile toplu ürün işlemleri eklentisi (kart 0315): Ürünler listesinin sorgusu (süzgeçler) "liste" ile taşınır.
export const urunlerExcelAdresi = (listeSorgusu?: string): string =>
  listeSorgusu === undefined || listeSorgusu === ""
    ? `${urunlerAdresi}/excel`
    : `${urunlerAdresi}/excel?${new URLSearchParams({ liste: listeSorgusu })}`;
export const urunEkraniAdresi = (kimlik: string): string =>
  `${urunlerAdresi}/urun?kimlik=${encodeURIComponent(kimlik)}`;

// Kuponlar (kart 0313): liste, yeni kupon, kuponun sayfası (kullanımları; ?kimlik=, kullanımların sayfası ?sayfa=)
// ve düzenleme.
// Raporlar (kart 0317): dönem ve karşılaştırma adreste.
export const raporlarAdresi = `${panelAdresi}/raporlar`;
export const raporAdresi = (donem: string, karsilastir: boolean): string =>
  `${raporlarAdresi}?donem=${encodeURIComponent(donem)}${karsilastir ? "" : "&karsilastir=0"}`;
export const kuponlarAdresi = `${panelAdresi}/kuponlar`;
export const yeniKuponAdresi = `${kuponlarAdresi}/yeni`;
export const kuponAdresi = (kimlik: string, sayfa?: number): string =>
  `${kuponlarAdresi}/kupon?kimlik=${encodeURIComponent(kimlik)}${sayfa === undefined || sayfa <= 1 ? "" : `&sayfa=${sayfa}`}`;
export const kuponDuzenleAdresi = (kimlik: string): string =>
  `${kuponlarAdresi}/duzenle?kimlik=${encodeURIComponent(kimlik)}`;

// Blog (kart 0272): yazıların listesi, yeni yazı, yazının ekranı (kimlik adresin sorgusunda) ve blog kategorileri.
export const blogAdresi = `${panelAdresi}/blog`;
export const yeniBlogYazisiAdresi = `${blogAdresi}/yeni`;
export const blogYazisiEkraniAdresi = (kimlik: string): string =>
  `${blogAdresi}/yazi?kimlik=${encodeURIComponent(kimlik)}`;
export const blogKategorileriAdresi = `${blogAdresi}/kategoriler`;

// Sabit sayfalar (kart 0273): liste, yeni sayfa, sayfanın ekranı (kimlik adresin sorgusunda).
export const sayfalarAdresi = `${panelAdresi}/sayfalar`;
export const yeniSayfaAdresi = `${sayfalarAdresi}/yeni`;
export const sayfaEkraniAdresi = (kimlik: string): string =>
  `${sayfalarAdresi}/sayfa?kimlik=${encodeURIComponent(kimlik)}`;

// Menüler ekranı (kart 0143). Kart 0273: sayfa ekranının "Menüye ekle"si menüler ekranını öğe penceresi sayfa seçili
// açılmış olarak açar (?ekle-sayfa=<kimlik>).
export const menulerAdresi = `${panelAdresi}/menuler`;
export const menuyeSayfaEkleParametresi = "ekle-sayfa";
export const menuyeSayfaEkleAdresi = (kimlik: string): string =>
  `${menulerAdresi}?${new URLSearchParams({ [menuyeSayfaEkleParametresi]: kimlik })}`;

// Şifreden sonraki ara adımın sayfası (kart 0028).
export const adimAdresi = (durum: "kod" | "kurulum"): string =>
  durum === "kod" ? kodAdresi : kurulumAdresi;

// Bu kök yalnız adresi çözmek içindir, hiçbir yere istek gitmez.
const cozumKoku = "http://panel.invalid";

// Girişten sonra yalnız panelin içine dönülür: başka siteye yönlendirme yapılamaz.
export const guvenliDonus = (deger: string | null | undefined): string => {
  if (!deger?.startsWith("/") || deger.startsWith("//") || deger.includes("\\")) return panelAdresi;
  let adres: URL;
  try {
    adres = new URL(deger, cozumKoku);
  } catch {
    return panelAdresi;
  }
  const { origin, pathname, search } = adres;
  const panelde = pathname === panelAdresi || pathname.startsWith(`${panelAdresi}/`);
  const girisOncesi = pathname === girisAdresi || pathname.startsWith(`${girisAdresi}/`);
  if (origin !== cozumKoku || !panelde || girisOncesi) return panelAdresi;
  return `${pathname}${search}`;
};

// Ekip (kart 0274): kullanıcılar, roller ve kullanıcının ayrıntısı (kimlik adresin sorgusunda); yöneticinin kendi hesabı.
export const ekipAdresi = `${panelAdresi}/ekip`;
export const ekipRolleriAdresi = `${ekipAdresi}/roller`;
export const ekipKisiAdresi = (kimlik: string): string =>
  `${ekipAdresi}/kisi?kimlik=${encodeURIComponent(kimlik)}`;
export const hesabimAdresi = `${panelAdresi}/hesabim`;
