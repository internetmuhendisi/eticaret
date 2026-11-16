// Yayın denemesinin yayın işareti (kart 0209). Deneme iki yayını sitenin ilk logosuyla ayırt eder:
// mağaza sahibi logo yüklemediyse logo ucu dosyayı her yayının kendi site klasöründen verir
// (cekirdek/moduller/magaza-ayarlari/logo.ts), veritabanında kalan bir değer yoktur. Mağaza adı bu işe
// yaramaz: başlangıç değeri veritabanına bir kez yazılır, sonraki yayında değişmez (kart 0071).

import sharp from "sharp";

export const logoUcu = "/kapi/herkese-acik/logo";

// İki ayrı logo: ölçüleri farklı olduğu için baytları da farklıdır. WebP, site doğrulamasından geçer.
const logoUret = (genislik: number) =>
  sharp({
    create: { width: genislik, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .webp()
    .toBuffer();

export const denemeLogolari = async (): Promise<{ birinci: Buffer; ikinci: Buffer }> => ({
  birinci: await logoUret(40),
  ikinci: await logoUret(80),
});

// Gelen logo beklenen yayının logosu mu? Öteki yayının logosuyla aynıysa işaret ayırt etmez, hayır.
export const logoYayiniGosteriyor = (gelen: Buffer, beklenen: Buffer, oteki: Buffer): boolean =>
  !beklenen.equals(oteki) && gelen.equals(beklenen);
