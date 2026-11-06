// Erişim testinin bozuk örneği (kart 0030): izin beyan eder ama kapıdan geçmez, herkese açıktır.
export const GET = Object.assign(async () => Response.json({ basarili: true, veri: {} }), {
  tanim: { giris: "yonetici", izin: "ekip.gor", sinir: "genel" },
});
