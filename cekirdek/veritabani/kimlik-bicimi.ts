// Kimliğin biçimi (kart 0119, karar 0112; kart 0146): zod'suz denetim ve küçük harfe çevirme. Tarayıcıda çalışan
// kod (favori deposu, her sayfanın üst kısmındaki hesap durumu) kimliği bununla denetler: zod şeması
// (`kimlikSemasi`, kimlik.ts) her vitrin sayfasıyla tarayıcıya 30 KB zod taşıyordu (ölçüldü). Şemalar yine
// kimlik.ts'teki `kimlikSemasi`'nı kullanır; bu dosya onu yazmaz.

// Kimlik biçiminde bir metin mi? Dışarıdan gelen kimlik sorguya girmeden denetlenir: biçimi bozuk metin veritabanında
// beklenmeyen hataya (22P02) dönmesin, "bulunamadı" sayılsın (kart 0077).
const kimlikKalibi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const kimlikMi = (deger: string): boolean => kimlikKalibi.test(deger);

// Kimliği veritabanının yazdığı biçime (küçük harf) çevirir. Biçimi denetlemez: bozuk metin bozuk kalır, `kimlikMi`
// ya da sorgu onu bulunamadı sayar.
export const kimligiDuzelt = (deger: string): string => deger.toLowerCase();
