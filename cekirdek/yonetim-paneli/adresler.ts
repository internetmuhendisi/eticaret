// Panelin giriş adresleri ve girişten sonra dönülecek adresin denetimi (kart 0027, karar 0042).
export const panelAdresi = "/yonetim";
export const girisAdresi = `${panelAdresi}/giris`;
export const donusParametresi = "donus";

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
  if (origin !== cozumKoku || !panelde || pathname === girisAdresi) return panelAdresi;
  return `${pathname}${search}`;
};
