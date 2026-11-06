// Panelin giriş adresleri ve girişten sonra dönülecek adresin denetimi (kart 0027, karar 0042).
export const panelAdresi = "/yonetim";
export const girisAdresi = `${panelAdresi}/giris`;
export const kodAdresi = `${girisAdresi}/kod`;
export const kurulumAdresi = `${girisAdresi}/kurulum`;
export const donusParametresi = "donus";

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
