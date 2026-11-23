// Müşteri ayrıntısı ekranı (kart 0271, karar 0173). Önce sayfanın izni denetlenir, sonra kimlik adresin sorgusundan
// okunur; kimlik yoksa, bozuksa ya da müşteri yoksa (silinmiş hesap da) bulunamadı. Not ve şifre sıfırlama
// yöneticinin izinlerine göre gelir. Başlık müşterinin adıdır (yoksa e-postası).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { doldur } from "../../../../../../metinler/doldur";
import { metin } from "../../../../../../metinler/site-metni";
import { kimlikSemasi } from "../../../../../../veritabani/kimlik";
import { MusteriAyrintisi } from "../../../../../../yonetim-paneli/musteriler/ayrinti";
import { SifreSifirlamaGonder } from "../../../../../../yonetim-paneli/musteriler/sifre-sifirlama";
import { musteriAyrintisiVerisi } from "../../../../../../yonetim-paneli/musteriler/veri";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("musteri-ayrintisi");

export default async function MusteriAyrintisiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[] }>;
}) {
  await panelSayfasiniAc("musteri-ayrintisi");
  const kimlik = kimlikSemasi.safeParse((await searchParams).kimlik);
  if (!kimlik.success) notFound();
  const veri = await musteriAyrintisiVerisi(kimlik.data);
  if (veri === null) notFound();
  const { yetkili } = await panelOturumu();
  return (
    <PanelSayfasi
      kod="musteri-ayrintisi"
      baslik={veri.ad === "" ? veri.eposta : veri.ad}
      altBaslik={doldur(metin("yonetim.musteri.ozet"), { tarih: veri.kayit })}
      {...(yetkili("musteri.sifre-sifirlama")
        ? { eylemler: <SifreSifirlamaGonder musteri={veri.kimlik} eposta={veri.eposta} /> }
        : {})}
    >
      <MusteriAyrintisi veri={veri} notDegistirebilir={yetkili("musteri.not")} />
    </PanelSayfasi>
  );
}
