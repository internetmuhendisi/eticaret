// Sitenin açılıştaki başlangıç kurulumu (kartlar 0084, 0107, 0114, 0129): katalog, menüler, düzen, bu sırayla.
// Arka plan süreci açılırken çağırır; tarayıcı testleri de testlerden önce aynı işlevle kurar (kart 0129),
// kurulumun ikinci bir yolu yoktur. Her adım kuruluysa hiçbir şey yazmaz.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { gunluk } from "../izleme/gunluk.ts";
import { duzenServisi } from "../moduller/duzen/servis.ts";
import { menuBaslangiciniKur } from "../moduller/menu/baslangic.ts";
import { katalogBaslangiciniKur } from "../moduller/urun/baslangic.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";

export type BaslangicAdimi = "katalog-baslangici" | "menu-baslangici" | "duzen-baslangici";

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
};
