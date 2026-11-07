// E-posta kayıtlarının durumları ve şablonlarının tek kaydı (kart 0032, karar 0050).
export const epostaDurumu = {
  bekliyor: "bekliyor",
  gonderildi: "gonderildi",
  // Gönderici bağlı değil ya da sitenin gönderen adresi yok: e-posta kimseye gitmedi, denenmez.
  gonderilmedi: "gonderilmedi",
  basarisiz: "basarisiz",
} as const;
export type EpostaDurumu = (typeof epostaDurumu)[keyof typeof epostaDurumu];

// Yeni e-posta: buraya ad, tr.json'a metinler, moduller/eposta/sablon.ts'e tanım.
export const epostaSablonlari = ["deneme"] as const;
export type EpostaSablonu = (typeof epostaSablonlari)[number];

export const epostaAyari = {
  // Kayıt alıcı adresi taşır, bu süreden sonra silinir. İçerik hiç tutulmaz.
  kayitSaklamaGun: 365,
  // Gönderim sunucusu cevap vermezse iş bu süreden sonra başarısız sayılır.
  baglantiZamanAsimiMs: 10_000,
} as const;
