// Vitrinde karşılığı olmayan adres (kart 0120). Next.js eşleşmeyen adresi vitrin çerçevesinin dışında, kök düzende
// açar; bu yakalayıcı adresi çerçevenin içine alır ve "bulunamadı" sayfasını (../not-found.tsx) 404 ile verir.
// Kapı, panel ve geliştirme adresleri kendi yakalayıcılarıyla çerçevenin dışında kalır (kapi/, yonetim/(panel)/,
// gelistirme/ altındaki [...adres]).
import { notFound } from "next/navigation";
import { bulunamadiSayfaBilgisi } from "../../../../moduller/gorunurluk/sayfa-bilgisi";

export const generateMetadata = bulunamadiSayfaBilgisi;

export default function VitrindeOlmayanAdres(): never {
  notFound();
}
