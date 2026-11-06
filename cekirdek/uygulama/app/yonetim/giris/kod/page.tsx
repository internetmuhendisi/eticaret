// İki aşamalı girişin kod ekranı (kart 0028). Şifreden geçmemiş kişi giriş sayfasına, kurulumu
// bitmemiş kişi kurulum ekranına döner.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { metin } from "../../../../../metinler/site-metni";
import {
  donusParametresi,
  girisAdresi,
  guvenliDonus,
  kurulumAdresi,
} from "../../../../../yonetim-paneli/adresler";
import { sayfadakiGirisAdimi } from "../../../../../yonetim-paneli/giris-adimi";
import { KodGirisi } from "../../../../../yonetim-paneli/kod-girisi";

export const generateMetadata = (): Metadata => ({ title: metin("yonetim.kod.baslik") });

export default async function KodSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const adim = await sayfadakiGirisAdimi();
  if (adim === null) redirect(girisAdresi);
  if (adim.durum === "kurulum") redirect(kurulumAdresi);
  const donus = (await searchParams)[donusParametresi];
  return (
    <main>
      <h1>{metin("yonetim.kod.baslik")}</h1>
      <p>{metin("yonetim.kod.aciklama")}</p>
      <KodGirisi donus={guvenliDonus(typeof donus === "string" ? donus : null)} />
      <p>
        <Link href={girisAdresi}>{metin("yonetim.kod.girisDon")}</Link>
      </p>
    </main>
  );
}
