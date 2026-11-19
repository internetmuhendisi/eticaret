// Şifre sıfırlama sayfası (kart 0034, karar 0052; kart 0237 ile taslağın düzeni).
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { sayfaBasligi } from "../../../../moduller/gorunurluk/sayfa-bilgisi";
import { SifremiUnuttumFormu } from "../../../../moduller/oturum/sifirlama-formlari";
import { vitrinAdresleri } from "../../../../vitrin/adresler";
import { GirisDuzeni } from "../../../../vitrin/hesap/giris-duzeni";
import { stil } from "../../../../vitrin/stil";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../../../../vitrin/yalniz-gezinti";

export const generateMetadata = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("ortak.sifirlama.istekBaslik")),
  }),
);

export default function Sayfa() {
  musteriSayfasiniAc();
  return (
    <GirisDuzeni
      baslik={metin("ortak.sifirlama.istekBaslik")}
      adres={vitrinAdresleri.sifremiUnuttum}
    >
      <SifremiUnuttumFormu
        className={stil.form}
        girisAdresi={vitrinAdresleri.giris}
        istekUcu="/kapi/herkese-acik/musteri-sifre-sifirlama"
      />
    </GirisDuzeni>
  );
}
