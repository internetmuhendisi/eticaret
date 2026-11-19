// Hesabım: Adreslerim (kart 0237): /hesabim/adreslerim.
import { AdreslerimSayfasi, hesapSayfaBilgisi } from "../../../../../vitrin/hesap/sayfalar";

export const generateMetadata = hesapSayfaBilgisi("vitrin.hesap.adresler.baslik");

export default function AdreslerimAdresi() {
  return <AdreslerimSayfasi />;
}
