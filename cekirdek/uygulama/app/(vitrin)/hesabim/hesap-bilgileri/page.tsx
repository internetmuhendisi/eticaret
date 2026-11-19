// Hesabım: Hesap bilgileri (kart 0237): /hesabim/hesap-bilgileri.
import { HesapBilgileriSayfasi, hesapSayfaBilgisi } from "../../../../../vitrin/hesap/sayfalar";

export const generateMetadata = hesapSayfaBilgisi("vitrin.hesap.bilgiler.baslik");

export default function HesapBilgileriAdresi() {
  return <HesapBilgileriSayfasi />;
}
