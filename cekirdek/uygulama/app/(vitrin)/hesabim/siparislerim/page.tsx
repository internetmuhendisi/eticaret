// Hesabım: Siparişlerim (kart 0238): /hesabim/siparislerim, sayfa adreste (?sayfa=2).

import { hesapSayfaBilgisi } from "../../../../../vitrin/hesap/sayfalar";
import { SiparislerimSayfasi, sayfaNumarasi } from "../../../../../vitrin/hesap/siparisler";

export const generateMetadata = hesapSayfaBilgisi("vitrin.hesap.siparisler.baslik");

export default async function SiparislerimAdresi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sayfa } = await searchParams;
  return <SiparislerimSayfasi sayfa={sayfaNumarasi(sayfa)} />;
}
