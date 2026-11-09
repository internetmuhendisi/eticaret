// Katalogun sayfa içindeki ikinci kapısı (kart 0104, karar 0078). Asıl kapı ara katmandadır
// (cekirdek/uygulama/proxy.ts): istek sayfaya ulaşmaz. Bu kapı ara katman atlanırsa diye her düzende,
// sayfada ve sayfa bilgisinde (generateMetadata) ayrıca çağrılır; Next.js'te düzenin notFound() vermesi
// sayfanın çizilmesini durdurmaz.
import { notFound } from "next/navigation";
import { katalogAcikMi } from "./acik-mi";

export const katalogKapisi = (): void => {
  if (!katalogAcikMi()) notFound();
};
