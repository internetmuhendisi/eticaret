// Sipariş fişi (kart 0270, karar 0171): ?numara=A ya da ?numara=A,B,C (fisNumaralariniOku). Önce sayfanın izni
// denetlenir; numaralardan biri kalıba uymuyorsa ya da sınırı aşıyorsa bulunamadı.
// ?yazdir=1 sayfa açılınca yazdırma penceresini getirir.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { doldur } from "../../../../../../metinler/doldur";
import { metin } from "../../../../../../metinler/site-metni";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { SiparisFisleri } from "../../../../../../yonetim-paneli/siparisler/fis";
import {
  fisNumaralariniOku,
  siparisFisleriVerisi,
} from "../../../../../../yonetim-paneli/siparisler/fis-verisi";
import { FisYazdirma } from "../../../../../../yonetim-paneli/siparisler/fis-yazdirma";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("siparis-fisi");

export default async function SiparisFisiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ numara?: string | string[]; yazdir?: string | string[] }>;
}) {
  await panelSayfasiniAc("siparis-fisi");
  const adres = await searchParams;
  const numaralar = fisNumaralariniOku(adres.numara);
  if (numaralar === undefined || numaralar.length === 0) notFound();
  const veri = await siparisFisleriVerisi(numaralar);
  // Tek sipariş fişsizse (kişisel bilgisi silinmiş) ya da hiçbir numara yoksa bulunamadı. Toplu fişte siparişlerin hepsi
  // atlanmışsa sayfa açılır ve atlananları söyler (karar 0171); yazdırma penceresi gelmez.
  if (veri.fisler.length === 0 && (numaralar.length === 1 || veri.atlanan.length === 0)) notFound();
  const tek = numaralar.length === 1 ? veri.fisler[0] : undefined;
  return (
    <PanelSayfasi
      kod="siparis-fisi"
      {...(tek === undefined
        ? {}
        : { baslik: doldur(metin("yonetim.siparisFisi.etiket"), { numara: tek.numara }) })}
      eylemler={
        veri.fisler.length === 0 ? undefined : <FisYazdirma otomatik={adres.yazdir === "1"} />
      }
    >
      <SiparisFisleri veri={veri} />
    </PanelSayfasi>
  );
}
