// Vitrinin müşteri giriş sayfası (kart 0033).
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { sayfaBasligi } from "../../../../moduller/gorunurluk/sayfa-bilgisi";
import { SifreYenilendiBildirimi } from "../../../../moduller/oturum/sifre-yenilendi-bildirimi";
import { vitrinDonusParametresi, vitrinDonusu } from "../../../../vitrin/adresler";
import { GirisFormu } from "../../../../vitrin/giris-formu";
import { stil } from "../../../../vitrin/stil";
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
  const donus = parametreler[vitrinDonusParametresi];
  return (
    <main className={stil.icerik}>
      <h1>{metin("vitrin.giris.baslik")}</h1>
      <SifreYenilendiBildirimi parametreler={parametreler} />
      <GirisFormu donus={vitrinDonusu(Array.isArray(donus) ? donus[0] : donus)} />
    </main>
  );
}
