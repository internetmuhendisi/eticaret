// Yönetim paneli giriş sayfası (kart 0027). Girişli kişiyi ara katman panele yönlendirir.
import type { Metadata } from "next";
import { metin } from "../../../../metinler/site-metni";
import { magazaninAdi } from "../../../../moduller/magaza-ayarlari/servis";
import { SifreYenilendiBildirimi } from "../../../../moduller/oturum/sifre-yenilendi-bildirimi";
import { donusParametresi, guvenliDonus } from "../../../../yonetim-paneli/adresler";
import { GirisFormu } from "../../../../yonetim-paneli/giris-formu";

export const generateMetadata = (): Metadata => ({ title: metin("yonetim.giris.baslik") });

export default async function YonetimGirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametreler = await searchParams;
  const donus = parametreler[donusParametresi];
  return (
    <main>
      <h1>{metin("yonetim.giris.baslik")}</h1>
      <p>{await magazaninAdi()}</p>
      <SifreYenilendiBildirimi parametreler={parametreler} />
      <GirisFormu donus={guvenliDonus(typeof donus === "string" ? donus : null)} />
    </main>
  );
}
