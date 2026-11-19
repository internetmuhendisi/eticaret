// Vitrinin müşteri giriş sayfası (kart 0033; kart 0237 ile taslağın düzeni). Dönüş adresi verilmeyen müşteri girişten
// sonra hesabına gider (taslak, karar 0145).
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { sayfaBasligi } from "../../../../moduller/gorunurluk/sayfa-bilgisi";
import { SifreYenilendiBildirimi } from "../../../../moduller/oturum/sifre-yenilendi-bildirimi";
import {
  kayitAdresiDonuslu,
  vitrinAdresleri,
  vitrinDonusParametresi,
  vitrinDonusu,
} from "../../../../vitrin/adresler";
import { GirisFormu } from "../../../../vitrin/giris-formu";
import { GirisDuzeni, HesapYararlari } from "../../../../vitrin/hesap/giris-duzeni";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../../../../vitrin/yalniz-gezinti";

export const generateMetadata = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("vitrin.giris.baslik")),
  }),
);

export default async function MusteriGirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  musteriSayfasiniAc();
  const parametreler = await searchParams;
  const verilen = parametreler[vitrinDonusParametresi];
  const donus = Array.isArray(verilen) ? verilen[0] : verilen;
  const kayitAdresi = kayitAdresiDonuslu(donus === undefined ? undefined : vitrinDonusu(donus));
  return (
    <GirisDuzeni
      baslik={metin("vitrin.giris.baslik")}
      adres={vitrinAdresleri.giris}
      yan={
        <HesapYararlari
          baslik={metin("vitrin.hesap.yararlar.hesabinYokMu")}
          kayitAdresi={kayitAdresi}
        />
      }
    >
      <SifreYenilendiBildirimi parametreler={parametreler} />
      <GirisFormu
        donus={donus === undefined ? vitrinAdresleri.hesabim : vitrinDonusu(donus)}
        kayitAdresi={kayitAdresi}
      />
    </GirisDuzeni>
  );
}
