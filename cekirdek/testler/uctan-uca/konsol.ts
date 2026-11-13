// Tarayıcı testlerinin konsol denetimi (kart 0123): sayfanın konsoldaki hataları ve yakalanmamış hataları. React'ın
// hidrasyon uyarısı (sunucunun çizdiği HTML ile tarayıcının ilk çizimi uyuşmuyor) hangi seviyede yazılırsa yazılsın
// hata sayılır: geliştirmede "uyarı" olarak da yazılabilir, Next.js onu sayfada "Issue" göstergesiyle bırakır, yalnız
// hataları sayan denetim kaçırırdı. Konsolu denetleyen her tarayıcı testi bunu kullanır.
import type { Page } from "@playwright/test";

// React 19 ve Next.js'in hidrasyon iletileri: "hydrated", "Hydration failed", "during hydration" ve eski biçimdeki
// öznitelik ya da metin farkı ("... did not match. Server: ..."). Canlı derlemede React bu uyarıyı yazmaz, hidrasyon
// hatasını yalnız numarasıyla (Minified React error #418) hata olarak yazar; o da hata seviyesinden sayılır.
const hidrasyonKaliplari = [/hydrat/i, /did not match\. Server:/i];

export const hidrasyonUyarisiMi = (metin: string): boolean =>
  hidrasyonKaliplari.some((kalip) => kalip.test(metin));

// Sayfayı açmadan önce çağrılır; dönen dizi sayfa boyunca dolar. haric, beklenen hata iletilerini ayıklar (girişsiz
// ziyaretçinin oturum sorusunun 401'i gibi, karar 0098); hidrasyon uyarısı hiçbir zaman ayıklanmaz.
export const konsoluDinle = (
  page: Page,
  { haric = () => false }: { haric?: (metin: string) => boolean } = {},
): string[] => {
  const hatalar: string[] = [];
  page.on("console", (ileti) => {
    const metin = ileti.text();
    if (hidrasyonUyarisiMi(metin)) {
      hatalar.push(`${ileti.type()}: ${metin}`);
      return;
    }
    if (ileti.type() === "error" && !haric(metin)) hatalar.push(metin);
  });
  page.on("pageerror", (hata) => hatalar.push(hata.message));
  return hatalar;
};
