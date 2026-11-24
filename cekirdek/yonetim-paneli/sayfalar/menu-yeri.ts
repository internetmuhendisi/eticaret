// Sayfanın menüdeki yerinin yazısı (kart 0273): "Alt bilgi › Kurumsal" ya da yalnız menünün adı. Liste, sayfa ekranı ve
// sayfanın alt başlığı (sunucuda) aynı yazıyı kullanır.
import type { MenuYeri } from "../../moduller/menu/servis";

export const menuYeriYazisi = (yer: MenuYeri, ayrac: string): string =>
  yer.ust === null ? yer.menuAdi : `${yer.menuAdi}${ayrac}${yer.ust}`;
