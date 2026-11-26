// Sitenin açılıştaki başlangıç kurulumu (kartlar 0084, 0107, 0114, 0129, 0272, 0273, 0312): katalog, sayfalar, menüler,
// düzen, blog, kuponlar, bu sırayla.
// Arka plan süreci açılırken çağırır; tarayıcı testleri de testlerden önce aynı işlevle kurar (kart 0129),
// kurulumun ikinci bir yolu yoktur. Her adım kuruluysa hiçbir şey yazmaz.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { gunluk } from "../izleme/gunluk.ts";
import { duzenServisi } from "../moduller/duzen/servis.ts";
import { blogBaslangiciniKur } from "../moduller/icerik/baslangic.ts";
import { sayfaBaslangiciniKur } from "../moduller/icerik/sayfa-kurulumu.ts";
import { kuponBaslangiciniKur } from "../moduller/kampanya/baslangic.ts";
import { menuBaslangiciniKur } from "../moduller/menu/baslangic.ts";
import { katalogBaslangiciniKur } from "../moduller/urun/baslangic.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";

export type BaslangicAdimi =
  | "katalog-baslangici"
  | "sayfa-baslangici"
  | "menu-baslangici"
  | "duzen-baslangici"
  | "blog-baslangici"
  | "kupon-baslangici";

// hata: adım yazılamayınca çağrılır. Arka plan süreci hatayı kaydedip sürer, testlerin hazırlığı durur.
// Katalog yazılamadıysa menüler ve düzen denenmez (kart 0107): bağlanacakları kaydı bulamadan bir kez
// yazılırlardı; sonraki açılışta üçü birlikte yeniden denenir.
export const baslangiclariKur = async (
  vt: Veritabani,
  hata: (hata: unknown, adim: BaslangicAdimi) => void,
): Promise<void> => {
  try {
    if (await katalogBaslangiciniKur(vt, calisanSite())) {
      gunluk.bilgi("başlangıç kataloğu yazıldı");
    } else {
      gunluk.bilgi("başlangıç kataloğu yazılmadı: dosya boş ya da katalog kurulu");
    }
  } catch (yakalanan) {
    hata(yakalanan, "katalog-baslangici");
    return;
  }
  // Başlangıç sayfaları (kart 0273) menülerden önce kurulur: başlangıç menüsü sayfaya bağlanabilir.
  try {
    if (await sayfaBaslangiciniKur(vt, calisanSite())) {
      gunluk.bilgi("başlangıç sayfaları yazıldı");
    } else {
      gunluk.bilgi("başlangıç sayfaları yazılmadı: dosya boş ya da sayfalar kurulu");
    }
  } catch (yakalanan) {
    hata(yakalanan, "sayfa-baslangici");
  }
  try {
    if (await menuBaslangiciniKur(vt, calisanSite())) {
      gunluk.bilgi("başlangıç menüleri yazıldı");
    } else {
      gunluk.bilgi("başlangıç menüleri yazılmadı: dosya boş ya da menüler kurulu");
    }
  } catch (yakalanan) {
    hata(yakalanan, "menu-baslangici");
  }
  // Başlangıç düzeni katalogdaki kategori, marka ve ürünlere bağlanır (kart 0114): katalogdan ve menülerden
  // sonra kurulur. Vitrin daha önce açılırsa düzeni boş görür, yazmaz.
  try {
    if (await duzenServisi(calisanSite).baslangiciKur(vt)) {
      gunluk.bilgi("başlangıç düzeni yazıldı");
    } else {
      gunluk.bilgi("başlangıç düzeni yazılmadı: düzen kurulu");
    }
  } catch (yakalanan) {
    hata(yakalanan, "duzen-baslangici");
  }
  // Başlangıç blogu (kart 0272) katalogdan bağımsızdır; düzenden sonra kurulur.
  try {
    if (await blogBaslangiciniKur(vt, calisanSite())) {
      gunluk.bilgi("başlangıç blogu yazıldı");
    } else {
      gunluk.bilgi("başlangıç blogu yazılmadı: dosya boş ya da blog kurulu");
    }
  } catch (yakalanan) {
    hata(yakalanan, "blog-baslangici");
  }
  // Başlangıç kuponları (kart 0312) kapsamdaki ürün ve kategorileri adres adıyla bulur: katalogdan sonra kurulur.
  // Kapsamı kurulumdan önce silinmiş kupon yazılmaz, hata olarak bir kez kaydedilir.
  try {
    const kurulum = await kuponBaslangiciniKur(vt, calisanSite());
    if (kurulum.sonuc === "kurulu") {
      gunluk.bilgi("başlangıç kuponları yazılmadı: dosya boş ya da kuponlar kurulu");
    } else {
      gunluk.bilgi("başlangıç kuponları yazıldı");
      if (kurulum.atlananlar.length > 0) {
        hata(
          new Error(
            `Kapsamı bulunamayan başlangıç kuponları yazılmadı: ${kurulum.atlananlar.join(", ")}.`,
          ),
          "kupon-baslangici",
        );
      }
    }
  } catch (yakalanan) {
    hata(yakalanan, "kupon-baslangici");
  }
};
