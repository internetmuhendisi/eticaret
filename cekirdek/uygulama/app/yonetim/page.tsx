// Yönetim panelinin ana sayfası. Şimdilik boş (kart 0009).
import type { Metadata } from "next";
import { metin } from "../../../metinler/site-metni";

export const metadata: Metadata = { title: metin("yonetim.anasayfa.baslik") };

export default function YonetimAnaSayfa() {
  return (
    <main>
      <h1>{metin("yonetim.anasayfa.baslik")}</h1>
    </main>
  );
}
