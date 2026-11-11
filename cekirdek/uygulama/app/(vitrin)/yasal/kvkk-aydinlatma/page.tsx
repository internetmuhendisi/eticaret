// Yasal metnin yer tutucusu (kart 0033). Gerçek metin hukukçu kontrolünden sonra gelir (kart 0063).
import type { Metadata } from "next";
import { metin } from "../../../../../metinler/site-metni";
import { sayfaBasligi } from "../../../../../moduller/gorunurluk/sayfa-bilgisi";
import { stil } from "../../../../../vitrin/stil";

export const generateMetadata = async (): Promise<Metadata> => ({
  title: await sayfaBasligi(metin("vitrin.yasal.kvkk.baslik")),
});

export default function KvkkAydinlatmaSayfasi() {
  return (
    <main className={stil.icerik}>
      <h1>{metin("vitrin.yasal.kvkk.baslik")}</h1>
      <p>{metin("vitrin.yasal.taslak")}</p>
    </main>
  );
}
