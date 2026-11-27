// Raporların kaydı (kart 0317, karar 0185 ve 0195). Dönem adreste kodla ya da iki günle ("2026-10-01_2026-10-31")
// durur; hazır dönemler sitenin saat dilimindeki bugüne göre günlere çevrilir (cekirdek/moduller/rapor/donem.ts).
//
// - bugun, son-7-gun, son-30-gun: bugün dahil son 1, 7, 30 gün.
// - bu-ay: ayın ilk gününden bugüne; gecen-ay: önceki ayın bütün günleri.
export const raporHazirDonemleri = [
  "bugun",
  "son-7-gun",
  "son-30-gun",
  "bu-ay",
  "gecen-ay",
] as const;
export type RaporHazirDonemi = (typeof raporHazirDonemleri)[number];

export const raporSinirlari = {
  // Özel aralığın en çok gün sayısı (iki uç dahil): bir yıl ve artık gün. Daha uzun dönem grafiği okunmaz kılar.
  enCokGun: 366,
  // Bu kadar güne kadar seri günlüktür, daha uzun dönemde haftalık (dönemin ilk gününden yedişer gün).
  gunlukEnCokGun: 31,
} as const;
