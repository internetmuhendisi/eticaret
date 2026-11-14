// Dışarıdan gelen kaydın kimliği (kart 0119, karar 0112). Kimlik rastgele bir UUID'dir, veritabanı onu küçük harfle
// verir. UUID büyük harfle de yazılabilir ve veritabanı ikisini aynı sayar; kod ise kimlikleri metin olarak
// karşılaştırır (taşındı mı, kendisi mi, tekrar var mı, sıra tam mı). Bu yüzden dışarıdan gelen her kimlik koda
// girmeden küçük harfe çevrilir: şemalar `kimlikSemasi`, şemadan geçmeyen kimlik (servisin kimlik değişkeni)
// `kimligiDuzelt` kullanır. Ekranla paylaşılan şemalar da kullandığı için bu dosya yalnız zod alır.
// Kimlik şemasını başka yerde yazmak testte kırmızıdır (cekirdek/testler/kimlik-semasi.test.ts).
// `kimlikMi` ve `kimligiDuzelt` zod'suz dosyadadır (kimlik-bicimi.ts): tarayıcıda çalışan kod onları zod'u
// taşımadan alır (kart 0146). Buradan da alınabilirler.
import { z } from "zod";
import { kimligiDuzelt } from "./kimlik-bicimi.ts";

export { kimligiDuzelt, kimlikMi } from "./kimlik-bicimi.ts";

// Girdideki kimlik: UUID biçiminde, küçük harfe çevrilmiş.
export const kimlikSemasi = z.uuid().transform(kimligiDuzelt);
