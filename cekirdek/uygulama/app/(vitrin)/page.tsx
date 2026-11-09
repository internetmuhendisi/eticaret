// Vitrinin ana sayfası. Şimdilik mağazanın adını ve ayarı açıksa "Yakında açılıyoruz." yazısını
// gösterir (kartlar 0009, 0010, 0041). Hesap alanı başlığın üstündedir (kart 0033). Ad mağaza
// sahibinin ayarıdır (kart 0071).
import type { Metadata } from "next";
import { calisanSite } from "../../../ayar-semasi/calisan-site";
import { magazaninAdi } from "../../../moduller/magaza-ayarlari/servis";
import { AnaSayfa } from "../../../vitrin/ana-sayfa";

export const generateMetadata = async (): Promise<Metadata> => ({ title: await magazaninAdi() });

export default async function VitrinAnaSayfa() {
  return (
    <AnaSayfa
      magazaAdi={await magazaninAdi()}
      yakindaYazisi={calisanSite().ayarlar.yakindaYazisi}
    />
  );
}
