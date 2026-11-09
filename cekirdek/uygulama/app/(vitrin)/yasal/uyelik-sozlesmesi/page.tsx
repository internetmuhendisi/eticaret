// Yasal metnin yer tutucusu (kart 0033). Gerçek metin hukukçu kontrolünden sonra gelir (kart 0063).
import type { Metadata } from "next";
import { metin } from "../../../../../metinler/site-metni";
import { stil } from "../../../../../vitrin/stil";

export const generateMetadata = (): Metadata => ({ title: metin("vitrin.yasal.uyelik.baslik") });

export default function UyelikSozlesmesiSayfasi() {
  return (
    <main className={stil.icerik}>
      <h1>{metin("vitrin.yasal.uyelik.baslik")}</h1>
      <p>{metin("vitrin.yasal.taslak")}</p>
    </main>
  );
}
