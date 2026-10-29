// Sağlık ucunun bildirdiği parçaların durumu (kart 0013).
export const parcaDurumlari = ["ayakta", "kapali"] as const;
export type ParcaDurumu = (typeof parcaDurumlari)[number];
