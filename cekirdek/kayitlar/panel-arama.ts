// Panelin araması (kart 0321, karar 0191): aranan türler, sırası ve izinleri. Her tür kendi ucundan, kendi izniyle
// aranır; izni olmayan türün grubu ekranda yoktur, ucu da reddeder. Gruplar bu sırayla görünür (taslak).
export const panelAramaTurleri = {
  siparis: { izin: "siparis.gor", uc: "panel-siparis-ara" },
  urun: { izin: "urun.gor", uc: "panel-urun-ara" },
  musteri: { izin: "musteri.gor", uc: "panel-musteri-ara" },
} as const satisfies Record<
  string,
  { izin: "siparis.gor" | "urun.gor" | "musteri.gor"; uc: string }
>;
export type PanelAramaTuru = keyof typeof panelAramaTurleri;
export const panelAramaTurKodlari = Object.keys(panelAramaTurleri) as PanelAramaTuru[];

// Aranan metnin en az ve en çok uzunluğu, bir grupta gösterilen en çok sonuç ve yazma durduktan sonra bekleme (ms).
export const panelAramaSinirlari = { enAz: 2, enCok: 100, grupta: 5, bekleme: 250 } as const;
