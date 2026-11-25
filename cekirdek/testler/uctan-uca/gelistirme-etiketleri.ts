// Tarayıcı testlerinin geliştirme aşaması (kart 0251, karar 0184). Tarayıcı testleri canlıdaki gibi derlenmiş
// sunucuda çalışır (playwright.config.ts); yalnız geliştirme sunucusunda görünen şeyleri ölçen testler ayrıca
// geliştirme sunucusunda çalışır (playwright.gelistirme.config.ts). Test bunu etiketle söyler:
// - gelistirmedeDe: iki aşamada da çalışır. React'ın yalnız geliştirmede yazdığı uyarıları (hidrasyon farkı gibi)
//   ölçen testler: canlı derleme hidrasyon hatasını yalnız numarasıyla yazar, öznitelik farkını hiç yazmaz.
// - yalnizGelistirmede: yalnız geliştirme aşamasında çalışır (bilerek hata veren deneme sayfası canlı derlemede
//   kapalıdır).
export const gelistirmedeDe = "@gelistirmede-de";
export const yalnizGelistirmedeEtiketi = "@yalniz-gelistirmede";

// Playwright'ın etiket süzgeçleri (grep, grepInvert) testin adıyla etiketlerini birlikte arar.
export const yalnizGelistirmede = new RegExp(yalnizGelistirmedeEtiketi);
export const gelistirmeAsamasindakiler = new RegExp(
  `${gelistirmedeDe}|${yalnizGelistirmedeEtiketi}`,
);
