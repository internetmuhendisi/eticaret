// Kupon kodunun biçimi ve uzunluğu (kart 0312, kampanya kaydından ayrıldı, kart 0329). Kampanya kaydı
// (kampanya.ts) bunları kendi sınırlarına alır; tek tanım buradadır. Ayrı dosyadır: vitrinin her sayfaya giden sepet
// deposu yalnız kodun uzunluğunu okur, kampanya kaydının geri kalanını (tür, neden ve panel listeleri) taşımaz.
// Kod: harf, rakam ve tire. Büyük küçük harfin fark edip etmediği altyapı sahibinin ayarıdır (kuponKoduHarfDuyarli);
// tekillik her zaman harf ayrımsız aranır (aynı kodun yalnız harf büyüklüğüyle ayrılan iki kuponu açılmaz).
export const kuponKoduKalibi = /^[\p{L}\p{N}-]+$/u;

export const kuponKoduSinirlari = { kodEnAz: 3, kodEnCok: 30 } as const;
