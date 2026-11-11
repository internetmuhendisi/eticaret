// Vitrinin ana sayfası (kartlar 0009, 0010, 0041, 0071, 0110). Düzenin ana sayfa alanında bölüm varsa onlar
// çizilir; yoksa mağazanın adı ve ayarı açıksa "Yakında açılıyoruz." yazısı. Hesap alanı başlığın üstündedir
// (kart 0033). Ad mağaza sahibinin ayarıdır (kart 0071).
//
// Sekme başlığı vitrin çerçevesinin varsayılanıdır: mağaza adı (kart 0135).
//
// Düzen ve bölümlerin bağlamı burada bir kez okunur. Okunamazsa (veritabanı kapalı) sayfa sade hâliyle açılır,
// hata kaydedilir: ana sayfa düzen yüzünden düşmez.
import { calisanSite } from "../../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../../izleme/hata-katmani";
import { duzenServisi } from "../../../moduller/duzen/servis";
import { magazaninAdi } from "../../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../../veritabani/baglanti";
import { AnaSayfa, type AnaSayfaDuzeni } from "../../../vitrin/ana-sayfa";
import { vitrinBaglaminiOku } from "../../../vitrin/baglam-oku";
import { bolumGorunumleri } from "../../../vitrin/bolum-kutuphanesi/gorunumler";
import { bolumKutuphanesi } from "../../../vitrin/bolum-kutuphanesi/kutuphane";

const duzeniOku = async (): Promise<AnaSayfaDuzeni | undefined> => {
  try {
    const vt = siteninVeritabani();
    const bolumler = await duzenServisi(calisanSite).cizilecekBolumler(vt, "ana-sayfa");
    if (bolumler.length === 0) return undefined;
    const baglam = await vitrinBaglaminiOku(vt, calisanSite(), bolumler, bolumKutuphanesi);
    return { bolumler, gorunumler: bolumGorunumleri, baglam };
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "ana-sayfa" });
    return undefined;
  }
};

export default async function VitrinAnaSayfa() {
  return (
    <AnaSayfa
      magazaAdi={await magazaninAdi()}
      yakindaYazisi={calisanSite().ayarlar.yakindaYazisi}
      duzen={await duzeniOku()}
    />
  );
}
