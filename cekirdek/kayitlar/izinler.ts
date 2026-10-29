// İzinlerin tek kaydı (.claude/rules/yetki.md). Roller bu izinlerden oluşur.
// İzinler ve kontrolleri kart 0026'da eklenir. O zamana kadar liste boştur, bu yüzden
// herkese açık giriş dışındaki girişlere uç yazılamaz (karar 0024).
export const izinler = [] as const;
export type IzinAdi = (typeof izinler)[number];

// Herkese açık girişteki uçların izin beyanı. Başka girişte kullanılamaz.
export const herkeseAcik = "herkese-acik";
export type HerkeseAcik = typeof herkeseAcik;
