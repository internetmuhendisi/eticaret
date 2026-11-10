// Sitenin başlangıç düzeninin kayıtlara bağlanması (kart 0114, karar 0092).
//
// Sitenin başlangıç düzeni (baslangic/duzen.json) kategori, marka, etiket ve ürüne adres adıyla başvurur;
// kayıtların kimliği başlangıç kataloğu kurulurken üretilir. Düzen kurulurken adres adları silinmemiş
// kayıtların kimliğine çevrilir (baslangicBaglariniCoz).
//
// - Katalog kurulmadan düzen kurulmaz: dosya kayda başvuruyorsa ve katalog henüz kurulmamışsa (arka plan
//   süreci açılırken kurar, cekirdek/arka-plan-isleri/surec.ts) KatalogBekleniyor verilir, hiçbir şey
//   yazılmaz. Vitrin bu arada düzeni boş görür ve bunu süreç başına bir kez günlüğe uyarı olarak yazar
//   (servis.ts, vitrinDuzeni): katalog açılışta kurulamadıysa durum sonraki açılışa kadar sürer, katalog
//   hatası ayrıca kaydedilmiştir. Açılış düzeni katalog ve menülerden sonra kurar. Kayda başvurmayan düzen
//   (temanın düzeni) beklemez.
// - Bağlanılan satırlar adres adından okunurken paylaşımlı kilitlenir (bölüm eklemedeki gibi): okumayla
//   yazma arasında silinemez. Kilit sırası düzen, kategori (kategoriye başvuruyorsa), sonra bağlanılan
//   satırlar. Kurulum birden çok kategori satırını kilitler, kategori silme de üstü ve altlarını sırayla
//   günceller; kategori kilidi olmasa ikisi satırları ters sırayla bekleyip kilitlenebilirdi (menülerdeki
//   kuralın aynısı, cekirdek/moduller/menu/baslangic.ts). Kategori kilidini alan işler düzen kilidini almaz.
// - Görseller (kart 0115): dosya kaydetme veritabanı işleminin içinde çağrılamaz (karar 0058). Görsele başvuran
//   düzeni yalnız açılıştaki kurulum yazar: görselleri önce kaydeder, kimliklerini buraya verir. Vitrin ve
//   uçlar bu düzeni yazamaz, katalogdaki gibi KatalogBekleniyor alır (vitrin boş görür).
import { and, inArray, isNull } from "drizzle-orm";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import {
  type BaslangicBagTuru,
  type BolumKutuphanesi,
  baslangicBaglariniCoz,
  baslangicBagTurleri,
  baslangicKayitTurleri,
  type Duzen,
  duzenBaslangicBaglari,
} from "../../vitrin/bolum-kutuphanesi/duzen.ts";
import { etiketler } from "../etiket/model.ts";
import { kategoriler } from "../kategori/model.ts";
import { kategoriKilidiAl } from "../kategori/servis.ts";
import { markalar } from "../marka/model.ts";
import { katalogKuruluMu } from "../urun/baslangic.ts";
import { urunler } from "../urun/model.ts";

// Bilinen hata: düzene dokunan uç (tema yayını, geri dönüş, bölüm işlemleri) 503 ve "katalog-bekleniyor"
// ayrıntısıyla döner, beklenmeyen hata sayılmaz. Katalog açılışta kurulamadıysa sonraki açılışa kadar sürer.
export class KatalogBekleniyor extends BilinenHata {
  constructor() {
    super("hizmet-kullanilamiyor", [{ alan: "duzen", kod: "katalog-bekleniyor" }]);
  }
}

const tablolar = {
  kategori: kategoriler,
  marka: markalar,
  etiket: etiketler,
  urun: urunler,
} as const;

// Kurulacak düzenin adres adlarını kimliğe çevirir. Katalog kurulmamışsa KatalogBekleniyor verir.
export const baslangicDuzeniniBagla = async (
  islem: VeritabaniIslemi,
  duzen: Duzen,
  kutuphane: BolumKutuphanesi,
  gorseller?: ReadonlyMap<string, string>,
): Promise<{ duzen: Duzen; bulunamayanlar: string[] }> => {
  const aranan = duzenBaslangicBaglari(duzen, kutuphane);
  if (baslangicBagTurleri.every((tur) => aranan[tur].size === 0)) {
    return { duzen, bulunamayanlar: [] };
  }
  // Görseller kaydedilmeden (açılıştaki kurulumun dışında) görsele başvuran düzen yazılmaz.
  if (aranan.gorsel.size > 0 && gorseller === undefined) throw new KatalogBekleniyor();
  // Yalnız görsele başvuran düzen kataloğu beklemez: görsellerin kataloğa bağı yoktur.
  if (
    baslangicKayitTurleri.some((tur) => aranan[tur].size > 0) &&
    !(await katalogKuruluMu(islem))
  ) {
    throw new KatalogBekleniyor();
  }
  if (aranan.kategori.size > 0) await kategoriKilidiAl(islem);
  const kimlikler: Record<BaslangicBagTuru, ReadonlyMap<string, string>> = {
    kategori: new Map(),
    marka: new Map(),
    etiket: new Map(),
    urun: new Map(),
    gorsel: gorseller ?? new Map(),
  };
  for (const tur of baslangicKayitTurleri) {
    const tablo = tablolar[tur];
    const adlar = [...aranan[tur]];
    const satirlar =
      adlar.length === 0
        ? []
        : await islem
            .select({ kimlik: tablo.kimlik, adresAdi: tablo.adres_adi })
            .from(tablo)
            .where(and(inArray(tablo.adres_adi, adlar), isNull(tablo.silinme_zamani)))
            .orderBy(tablo.kimlik)
            .for("share");
    kimlikler[tur] = new Map(satirlar.map((satir) => [satir.adresAdi, satir.kimlik]));
  }
  return baslangicBaglariniCoz(duzen, kutuphane, kimlikler);
};
