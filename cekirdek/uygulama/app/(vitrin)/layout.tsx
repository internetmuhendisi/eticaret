// Vitrin sayfalarının çerçevesi (kart 0108, karar 0083): üst kısım ve alt kısım düzenden çizilir. Adresler
// değişmez, (vitrin) yalnız klasör grubudur; panel (yonetim/) ve geliştirme sayfaları bu çerçevenin dışındadır.
//
// Düzen ve bağlam istek başına bir kez okunur. Okunamazsa (veritabanı kapalı) sayfa üst ve alt kısım olmadan
// açılır, hata kaydedilir: sayfanın kendisi çerçeve yüzünden düşmez.
import type { ReactNode } from "react";
import { calisanSite } from "../../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../../izleme/hata-katmani";
import { duzenServisi } from "../../../moduller/duzen/servis";
import { siteninVeritabani } from "../../../veritabani/baglanti";
import { vitrinBaglaminiOku } from "../../../vitrin/baglam-oku";
import { bolumGorunumleri } from "../../../vitrin/bolum-kutuphanesi/gorunumler";
import { bolumKutuphanesi } from "../../../vitrin/bolum-kutuphanesi/kutuphane";
import { AltKisim, UstKisim } from "../../../vitrin/ust-alt-kisim";

const cerceveyiOku = async () => {
  try {
    const vt = siteninVeritabani();
    const servis = duzenServisi(calisanSite);
    const [ust, alt] = await Promise.all([
      servis.cizilecekBolumler(vt, "ust-kisim"),
      servis.cizilecekBolumler(vt, "alt-kisim"),
    ]);
    const baglam = await vitrinBaglaminiOku(vt, calisanSite(), [...ust, ...alt], bolumKutuphanesi);
    return { ust, alt, baglam };
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "vitrin-cercevesi" });
    return undefined;
  }
};

export default async function VitrinCercevesi({ children }: { children: ReactNode }) {
  const cerceve = await cerceveyiOku();
  return (
    <div className="flex min-h-dvh flex-col">
      {cerceve === undefined ? null : (
        <UstKisim bolumler={cerceve.ust} gorunumler={bolumGorunumleri} baglam={cerceve.baglam} />
      )}
      <div className="flex-1">{children}</div>
      {cerceve === undefined ? null : (
        <AltKisim bolumler={cerceve.alt} gorunumler={bolumGorunumleri} baglam={cerceve.baglam} />
      )}
    </div>
  );
}
