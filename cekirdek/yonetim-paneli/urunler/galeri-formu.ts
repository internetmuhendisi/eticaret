// Ürün ekranının galeri bölümünün kuralları (kart 0266, karar 0073 ve 0162), sunucusuz: formdaki öğe, sunucuya giden
// girdi (`galeriGirdisi`) ve küçük görsel uyarısı. Galeri ürünün tek "Kaydet"iyle gider; görselin dosyası önce yükleme
// ucuyla yüklenir, öğe formda dosyanın kimliğiyle durur. Video bağlantısı kayda kadar bağlantı olarak durur.
import { galeriOnerilenEnAz } from "../../kayitlar/gorsel";
import type { VideoSitesi } from "../../kayitlar/video-siteleri";

export type GaleriFormOgesi = {
  // Formun anahtarı: kayıtlı öğede kimlik, yeni öğede "yeni:" ile başlayan geçici anahtar.
  anahtar: string;
  // Kayıtlı öğe.
  kimlik?: string;
  tur: "gorsel" | "video";
  alternatifMetin: string;
  // Görselin dosyası (önizleme panel görseli ucundan) ve özgün ölçüsü; yeni görselde yükleme ucunun döndürdüğü.
  dosya?: string;
  genislik?: number;
  yukseklik?: number;
  // Video: yeni videoda yapıştırılan bağlantı; site ve kimlik gösterim içindir.
  video?: string;
  site?: VideoSitesi;
  videoKimligi?: string;
};

// Sunucuya giden galeri (panel-galeri.ts): yalnız değişince. Ekranın gördüğü kayıtlı öğeler ve son hâl sırasıyla.
export const galeriGirdisi = (
  form: readonly GaleriFormOgesi[],
  bilinen: readonly GaleriFormOgesi[],
) => {
  if (JSON.stringify(form) === JSON.stringify(bilinen)) return undefined;
  return {
    gorulen: bilinen.flatMap((oge) => (oge.kimlik === undefined ? [] : [oge.kimlik])),
    ogeler: form.map((oge) => {
      if (oge.kimlik !== undefined) {
        return { kimlik: oge.kimlik, alternatifMetin: oge.alternatifMetin };
      }
      if (oge.dosya !== undefined)
        return { dosya: oge.dosya, alternatifMetin: oge.alternatifMetin };
      return { video: oge.video ?? "", alternatifMetin: oge.alternatifMetin };
    }),
  };
};

// Ana görsel: ilk görsel (video ana görsel olmaz).
export const anaGorselAnahtari = (form: readonly GaleriFormOgesi[]) =>
  form.find((oge) => oge.tur === "gorsel")?.anahtar;

// En uzun kenarı önerilenden kısa görsel (ölçüsü bilinmiyorsa uyarılmaz).
export const kucukGorselMi = (oge: GaleriFormOgesi) =>
  oge.tur === "gorsel" &&
  oge.genislik !== undefined &&
  oge.yukseklik !== undefined &&
  Math.max(oge.genislik, oge.yukseklik) < galeriOnerilenEnAz;
