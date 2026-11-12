// Favorilerin sınırları (kart 0140, karar 0110). Sitenin favori sınırı altyapı sahibinin ayarıdır
// (favoriSiniri); burada yalnız ayarın alabileceği en büyük değer ve tarayıcıdaki saklamanın adları durur.
//
// En büyük değer 100'dür: favoriler sayfası listeyi yalnız o adrese giden bir çerezle alır (karar 0110). Çerez
// en çok 4096 bayttır; 100 kimlik ayırıcılarıyla 3699 bayt tutar.
export const favoriSiniriEnCok = 100;

// Üye olmayan müşterinin listesi tarayıcının deposunda bu anahtarla durur.
export const favoriDepoAnahtari = "favoriler";

// Favoriler sayfasına giden çerezin adı ve yolu. Çerez yalnız bu yola gider, başka sayfaya gönderilmez.
export const favoriCerezi = { ad: "favoriler", yol: "/favoriler", ayirici: "." } as const;
