// Şifre sıfırlama sayfası (kart 0034, karar 0052).
import type { Metadata } from "next";
import { metin } from "../../../metinler/site-metni";
import { SifremiUnuttumFormu } from "../../../moduller/oturum/sifirlama-formlari";
import { vitrinAdresleri } from "../../../vitrin/adresler";
import { stil } from "../../../vitrin/stil";

export const generateMetadata = (): Metadata => ({ title: metin("ortak.sifirlama.istekBaslik") });

export default function Sayfa() {
  return (
    <main className={stil.icerik}>
      <h1>{metin("ortak.sifirlama.istekBaslik")}</h1>
      <SifremiUnuttumFormu
        className={stil.form}
        girisAdresi={vitrinAdresleri.giris}
        istekUcu="/kapi/herkese-acik/musteri-sifre-sifirlama"
      />
    </main>
  );
}
