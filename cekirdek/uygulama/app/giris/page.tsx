// Vitrinin müşteri giriş sayfası (kart 0033).
import type { Metadata } from "next";
import { metin } from "../../../metinler/site-metni";
import { GirisFormu } from "../../../vitrin/giris-formu";
import { stil } from "../../../vitrin/stil";

export const generateMetadata = (): Metadata => ({ title: metin("vitrin.giris.baslik") });

export default function MusteriGirisSayfasi() {
  return (
    <main className={stil.icerik}>
      <h1>{metin("vitrin.giris.baslik")}</h1>
      <GirisFormu />
    </main>
  );
}
