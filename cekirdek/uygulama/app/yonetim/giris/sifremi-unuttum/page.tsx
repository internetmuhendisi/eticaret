// Şifre sıfırlama sayfası (kart 0034, karar 0052).
import type { Metadata } from "next";
import { metin } from "../../../../../metinler/site-metni";
import { SifremiUnuttumFormu } from "../../../../../moduller/oturum/sifirlama-formlari";
import { girisAdresi } from "../../../../../yonetim-paneli/adresler";
import { stil } from "../../../../../yonetim-paneli/stil";

export const generateMetadata = (): Metadata => ({ title: metin("ortak.sifirlama.istekBaslik") });

export default function Sayfa() {
  return (
    <main>
      <h1>{metin("ortak.sifirlama.istekBaslik")}</h1>
      <SifremiUnuttumFormu
        className={stil.form}
        girisAdresi={girisAdresi}
        istekUcu="/kapi/herkese-acik/yonetici-sifre-sifirlama"
      />
    </main>
  );
}
