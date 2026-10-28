// Vitrinin ana sayfası. Şimdilik boş (kart 0009).
import type { Metadata } from "next";
import { metin } from "../../metinler/site-metni";

export const metadata: Metadata = { title: metin("vitrin.anasayfa.baslik") };

export default function VitrinAnaSayfa() {
  return (
    <main>
      <h1>{metin("vitrin.anasayfa.baslik")}</h1>
    </main>
  );
}
