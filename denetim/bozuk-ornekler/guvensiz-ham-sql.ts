// Bilerek bozulmuş örnek: sql.raw() içine değişken verilmiş. Denetim bu dosyayı yakalamalıdır.
declare const sql: { raw(metin: string): unknown };

export const siralama = (alan: string) => sql.raw(alan);
