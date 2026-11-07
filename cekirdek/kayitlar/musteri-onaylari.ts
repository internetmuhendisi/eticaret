// Müşterinin kayıtta verdiği onayların tek kaydı (kart 0033, karar 0051, .claude/rules/guvenlik.md).
// Metin değişince sürümü burada artırılır: eski kayıt hangi metne onay verildiğini göstermeye devam eder.
// Metinler bugün taslaktır (kart 0063).
export const musteriOnayTurleri = {
  "uyelik-sozlesmesi": { metinSurumu: "taslak-1" },
  "kvkk-aydinlatma": { metinSurumu: "taslak-1" },
  pazarlama: { metinSurumu: "taslak-1" },
} as const satisfies Record<string, { metinSurumu: string }>;
export type MusteriOnayTuru = keyof typeof musteriOnayTurleri;
