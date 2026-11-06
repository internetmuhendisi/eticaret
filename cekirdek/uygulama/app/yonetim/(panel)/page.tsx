// Yönetim panelinin ana sayfası. Şimdilik boş (kart 0009).
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { CikisDugmesi } from "../../../../yonetim-paneli/cikis-dugmesi";

export const generateMetadata = (): Metadata => ({ title: metin("yonetim.anasayfa.baslik") });

export default function YonetimAnaSayfa() {
  return (
    <main>
      <h1>{metin("yonetim.anasayfa.baslik")}</h1>
      <CikisDugmesi />
    </main>
  );
}
