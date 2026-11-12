// Dışarıdan gelen kaydın kimliği (kart 0119, karar 0112). Kimlik rastgele bir UUID'dir, veritabanı onu küçük harfle
// verir. UUID büyük harfle de yazılabilir ve veritabanı ikisini aynı sayar; kod ise kimlikleri metin olarak
// karşılaştırır (taşındı mı, kendisi mi, tekrar var mı, sıra tam mı). Bu yüzden dışarıdan gelen her kimlik koda
// girmeden küçük harfe çevrilir: şemalar `kimlikSemasi`, şemadan geçmeyen kimlik (servisin kimlik değişkeni)
// `kimligiDuzelt` kullanır. Ekranla paylaşılan şemalar da kullandığı için bu dosya yalnız zod alır.
// Kimlik şemasını başka yerde yazmak testte kırmızıdır (cekirdek/testler/kimlik-semasi.test.ts).
import { z } from "zod";

// Kimlik biçiminde bir metin mi? Dışarıdan gelen kimlik sorguya girmeden denetlenir: biçimi bozuk metin veritabanında
// beklenmeyen hataya (22P02) dönmesin, "bulunamadı" sayılsın (kart 0077).
const kimlikKalibi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const kimlikMi = (deger: string): boolean => kimlikKalibi.test(deger);

// Kimliği veritabanının yazdığı biçime (küçük harf) çevirir. Biçimi denetlemez: bozuk metin bozuk kalır, `kimlikMi`
// ya da sorgu onu bulunamadı sayar.
export const kimligiDuzelt = (deger: string): string => deger.toLowerCase();

// Girdideki kimlik: UUID biçiminde, küçük harfe çevrilmiş.
export const kimlikSemasi = z.uuid().transform(kimligiDuzelt);
