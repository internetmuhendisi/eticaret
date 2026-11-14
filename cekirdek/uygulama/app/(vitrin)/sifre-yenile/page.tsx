// Şifre sıfırlama sayfası (kart 0034, karar 0052).
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { sayfaBasligi } from "../../../../moduller/gorunurluk/sayfa-bilgisi";
import { SifreYenileFormu } from "../../../../moduller/oturum/sifirlama-formlari";
import { vitrinAdresleri } from "../../../../vitrin/adresler";
import { stil } from "../../../../vitrin/stil";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../../../../vitrin/yalniz-gezinti";

export const generateMetadata = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("ortak.sifirlama.yenileBaslik")),
  }),
);

export default function Sayfa() {
  musteriSayfasiniAc();
  return (
    <main className={stil.icerik}>
      <h1>{metin("ortak.sifirlama.yenileBaslik")}</h1>
      <SifreYenileFormu
        className={stil.form}
        girisAdresi={vitrinAdresleri.giris}
        sifremiUnuttumAdresi={vitrinAdresleri.sifremiUnuttum}
        yenileUcu="/kapi/herkese-acik/musteri-sifre-yenile"
      />
    </main>
  );
}
