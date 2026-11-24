// Ekipteki kullanıcının ekranı (kart 0274 ve 0053, karar 0178). Önce sayfanın izni denetlenir, sonra kimlik adresin
// sorgusundan okunur; kimlik yoksa, kalıba uymuyorsa ya da hesap kapatılmışsa bulunamadı.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { doldur } from "../../../../../../metinler/doldur";
import { metin } from "../../../../../../metinler/site-metni";
import { kimlikMi } from "../../../../../../veritabani/kimlik";
import { EkipKisisiEkrani } from "../../../../../../yonetim-paneli/ekip/kisi";
import { ekipKisiVerisi } from "../../../../../../yonetim-paneli/ekip/veri";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("ekip-kisi");

export default async function EkipKisisiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[] }>;
}) {
  await panelSayfasiniAc("ekip-kisi");
  const { kimlik } = await searchParams;
  if (typeof kimlik !== "string" || !kimlikMi(kimlik)) notFound();
  const oturum = await panelOturumu();
  const veri = await ekipKisiVerisi(kimlik.toLowerCase(), oturum.kimlik);
  if (veri === undefined) notFound();
  return (
    <PanelSayfasi
      kod="ekip-kisi"
      baslik={veri.kisi.eposta}
      altBaslik={doldur(metin("yonetim.ekip.katilma"), { zaman: veri.kisi.olusturulma })}
    >
      <EkipKisisiEkrani
        kisi={veri.kisi}
        roller={veri.roller}
        izinler={{
          rolAta: oturum.yetkili("ekip.rol-ata"),
          hesapKapat: oturum.yetkili("ekip.hesap-kapat"),
          ikiAsamaSifirla: oturum.yetkili("ekip.iki-asama-sifirla"),
        }}
      />
    </PanelSayfasi>
  );
}
