// Kimliğin biçimi (kart 0119, karar 0112; kart 0146): zod'suz denetim ve küçük harfe çevirme. Tarayıcıda çalışan
// kod (favori deposu, her sayfanın üst kısmındaki hesap durumu) kimliği bununla denetler: zod şeması
// (`kimlikSemasi`, kimlik.ts) her vitrin sayfasıyla tarayıcıya 30 KB zod taşıyordu (ölçüldü). Şemalar yine
// kimlik.ts'teki `kimlikSemasi`'nı kullanır; bu dosya onu yazmaz.

// Kimlik biçiminde bir metin mi? Dışarıdan gelen kimlik sorguya girmeden denetlenir: biçimi bozuk metin veritabanında
// beklenmeyen hataya (22P02) dönmesin, "bulunamadı" sayılsın (kart 0077).
const kimlikKalibi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const kimlikMi = (deger: string): boolean => kimlikKalibi.test(deger);

// Şemanın (`kimlikSemasi`, zod'un kimlik doğrulayıcısı) kabul ettiği kimlik mi? `kimlikMi`'den sıkıdır: RFC 9562
// sürüm ve varyant hanelerine bakar. Tarayıcıda tutulup sonra şemadan geçecek kimlik (favori deposu, kart 0146) bununla
// süzülür: gevşek kalıptan geçen bir değer birleştirme isteğinin tamamını reddettirirdi (bağımsız kontrolün bulgusu).
// Kalıp zod'unkiyle aynıdır; ikisinin aynı sonucu verdiği testtedir (cekirdek/testler/kimlik-semasi.test.ts).
const semaKalibi =
  /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
export const semayaUyanKimlikMi = (deger: string): boolean => semaKalibi.test(deger);

// Kimliği veritabanının yazdığı biçime (küçük harf) çevirir. Biçimi denetlemez: bozuk metin bozuk kalır, `kimlikMi`
// ya da sorgu onu bulunamadı sayar.
export const kimligiDuzelt = (deger: string): string => deger.toLowerCase();
