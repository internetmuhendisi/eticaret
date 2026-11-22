// Panelin giriş adresleri ve girişten sonra dönülecek adresin denetimi (kart 0027, karar 0042).
export const panelAdresi = "/yonetim";
export const girisAdresi = `${panelAdresi}/giris`;
export const kodAdresi = `${girisAdresi}/kod`;
export const kurulumAdresi = `${girisAdresi}/kurulum`;
export const sifremiUnuttumAdresi = `${girisAdresi}/sifremi-unuttum`;
export const sifreYenileAdresi = `${girisAdresi}/sifre-yenile`;
export const donusParametresi = "donus";
// Siparişler ve bir siparişin ayrıntısı (kart 0234); yönetici bildirimi e-postası da buraya bağlanır (kart 0241).
// Tema ve tema ayarları (kart 0260): iki sayfa birbirine bağlanır.
export const temaAdresi = `${panelAdresi}/tema`;
export const temaAyarlariAdresi = `${temaAdresi}/ayarlar`;
export const siparislerAdresi = `${panelAdresi}/siparisler`;
export const siparisAyrintisiAdresi = (numara: string): string =>
  `${siparislerAdresi}/ayrinti?numara=${encodeURIComponent(numara)}`;

// Ürünler listesi (kart 0262); ürün ekranı kart 0263'le gelir.
export const urunlerAdresi = `${panelAdresi}/urunler`;
// Ürün ekranı (kart 0263): yeni ürün ve var olan ürünün ekranı (kimlik adresin sorgusunda).
export const yeniUrunAdresi = `${urunlerAdresi}/yeni`;
export const urunEkraniAdresi = (kimlik: string): string =>
  `${urunlerAdresi}/urun?kimlik=${encodeURIComponent(kimlik)}`;

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
