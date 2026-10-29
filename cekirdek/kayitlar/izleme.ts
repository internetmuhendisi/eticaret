// Sağlık ucunun bildirdiği parçaların durumu (kart 0013).
export const parcaDurumlari = ["ayakta", "kapali"] as const;
export type ParcaDurumu = (typeof parcaDurumlari)[number];

// Günlük satırlarının seviyeleri, hafiften ağıra (kart 0014, karar 0025).
export const gunlukSeviyeleri = ["bilgi", "uyari", "hata", "olumcul"] as const;
export type GunlukSeviyesi = (typeof gunlukSeviyeleri)[number];
