// Şifre sıfırlama sayfası (kart 0034, karar 0052).
import type { Metadata } from "next";
import { metin } from "../../../../../metinler/site-metni";
import { SifreYenileFormu } from "../../../../../moduller/oturum/sifirlama-formlari";
import { girisAdresi, sifremiUnuttumAdresi } from "../../../../../yonetim-paneli/adresler";
import { stil } from "../../../../../yonetim-paneli/stil";

export const generateMetadata = (): Metadata => ({ title: metin("ortak.sifirlama.yenileBaslik") });

export default function Sayfa() {
  return (
    <main>
      <h1>{metin("ortak.sifirlama.yenileBaslik")}</h1>
      <SifreYenileFormu
        className={stil.form}
        girisAdresi={girisAdresi}
        sifremiUnuttumAdresi={sifremiUnuttumAdresi}
        yenileUcu="/kapi/herkese-acik/yonetici-sifre-yenile"
      />
    </main>
  );
}
