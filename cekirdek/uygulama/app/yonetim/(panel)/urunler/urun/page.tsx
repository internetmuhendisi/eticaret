// Ürün ekranı (kart 0263). Önce sayfanın izni denetlenir, sonra kimlik adresin sorgusundan okunur; kimlik yoksa,
// kalıba uymuyorsa ya da ürün yoksa (silinmişse) bulunamadı.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Uyari } from "../../../../../../../bilesenler/parcalar/uyari";
import { metin } from "../../../../../../metinler/site-metni";
import { kimlikMi } from "../../../../../../veritabani/kimlik";
import { EylemBaglantisi } from "../../../../../../yonetim-paneli/eylem-dugmesi";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { UrunKopyalaDugmesi } from "../../../../../../yonetim-paneli/urunler/kopyalama";
import { UrunEkrani } from "../../../../../../yonetim-paneli/urunler/urun-ekrani";
import { urunEkraniVerisi } from "../../../../../../yonetim-paneli/urunler/urun-verisi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("urun");

export default async function UrunSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[]; kopya?: string | string[] }>;
}) {
  await panelSayfasiniAc("urun");
  const { kimlik, kopya } = await searchParams;
  if (typeof kimlik !== "string" || !kimlikMi(kimlik)) notFound();
  const { yetkili } = await panelOturumu();
  const veri = await urunEkraniVerisi(kimlik, yetkili);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi
      kod="urun"
      baslik={veri.form.ad}
      {...(veri.baslikAlti.length === 0 ? {} : { altBaslik: veri.baslikAlti.join(" · ") })}
      eylemler={
        <>
          {yetkili("urun.degistir") ? (
            <UrunKopyalaDugmesi
              urun={{ kimlik, ad: veri.form.ad }}
              fiyatIzni={yetkili("fiyat.degistir")}
            />
          ) : null}
          {veri.vitrinAdresi === undefined ? null : (
            <EylemBaglantisi eylem="vitrinde-gor" href={veri.vitrinAdresi} target="_blank" />
          )}
        </>
      }
    >
      {/* Kopyalamadan sonra (kart 0320): kopyanın taslak olduğu ve neyin boş kaldığı. */}
      {kopya === "1" ? (
        <Uyari tur="bilgi" baslik={metin("yonetim.urunKopyalama.acildi.baslik")}>
          {metin("yonetim.urunKopyalama.acildi.metin")}
        </Uyari>
      ) : null}
      {/* Ürün değişince (kopyanın ekranına geçiş) form baştan kurulur: kaynağın kaydedilmemiş değişikliği kopyaya
          taşınmaz (kart 0320, bağımsız kontrolün bulgusu). */}
      <UrunEkrani key={kimlik} veri={veri} />
    </PanelSayfasi>
  );
}
