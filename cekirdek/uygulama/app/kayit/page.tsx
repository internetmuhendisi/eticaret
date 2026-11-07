// Vitrinin müşteri kayıt sayfası (kart 0033).
import type { Metadata } from "next";
import { metin } from "../../../metinler/site-metni";
import { KayitFormu } from "../../../vitrin/kayit-formu";
import { stil } from "../../../vitrin/stil";

export const generateMetadata = (): Metadata => ({ title: metin("vitrin.kayit.baslik") });

export default function MusteriKayitSayfasi() {
  return (
    <main className={stil.icerik}>
      <h1>{metin("vitrin.kayit.baslik")}</h1>
      <KayitFormu />
    </main>
  );
}
