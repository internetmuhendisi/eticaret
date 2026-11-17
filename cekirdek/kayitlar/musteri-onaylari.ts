// Müşterinin kayıtta verdiği onayların tek kaydı (kart 0033, karar 0051, .claude/rules/guvenlik.md).
// Metin değişince sürümü burada artırılır: eski kayıt hangi metne onay verildiğini göstermeye devam eder.
// Metinler bugün taslaktır (kart 0063).
export const musteriOnayTurleri = {
  "uyelik-sozlesmesi": { metinSurumu: "taslak-1" },
  "kvkk-aydinlatma": { metinSurumu: "taslak-1" },
  pazarlama: { metinSurumu: "taslak-1" },
} as const satisfies Record<string, { metinSurumu: string }>;
export type MusteriOnayTuru = keyof typeof musteriOnayTurleri;

// Siparişin onayları (kart 0213, karar 0140): müşteri ödeme adımında ön bilgilendirme formunu ve mesafeli satış
// sözleşmesini onaylar. Onay hesaba değil ödeme oturumuna (sonra siparişe, kart 0214) metin sürümüyle yazılır: üye
// olmayan müşterinin de siparişi vardır. Metinler bugün siparişin bilgileriyle dolan yer tutucu şablondur (kart 0063).
export const siparisOnayTurleri = {
  "on-bilgilendirme": { metinSurumu: "taslak-1" },
  "mesafeli-satis": { metinSurumu: "taslak-1" },
} as const satisfies Record<string, { metinSurumu: string }>;
export type SiparisOnayTuru = keyof typeof siparisOnayTurleri;
