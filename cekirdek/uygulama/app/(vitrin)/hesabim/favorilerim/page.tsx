// Hesabım: Favorilerim (kart 0237): /hesabim/favorilerim.
import { FavorilerimSayfasi, hesapSayfaBilgisi } from "../../../../../vitrin/hesap/sayfalar";

export const generateMetadata = hesapSayfaBilgisi("vitrin.favori.baslik");

export default function FavorilerimAdresi() {
  return <FavorilerimSayfasi />;
}
