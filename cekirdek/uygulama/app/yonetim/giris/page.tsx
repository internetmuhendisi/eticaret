// Yönetim paneli giriş sayfası (kart 0027). Girişli kişiyi ara katman panele yönlendirir.
import type { Metadata } from "next";
import { calisanSite } from "../../../../ayar-semasi/calisan-site";
import { metin } from "../../../../metinler/site-metni";
import { donusParametresi, guvenliDonus } from "../../../../yonetim-paneli/adresler";
import { GirisFormu } from "../../../../yonetim-paneli/giris-formu";

export const generateMetadata = (): Metadata => ({ title: metin("yonetim.giris.baslik") });

export default async function YonetimGirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const donus = (await searchParams)[donusParametresi];
  return (
    <main>
      <h1>{metin("yonetim.giris.baslik")}</h1>
      <p>{calisanSite().kimlik.gorunenAd}</p>
      <GirisFormu donus={guvenliDonus(typeof donus === "string" ? donus : null)} />
    </main>
  );
}
