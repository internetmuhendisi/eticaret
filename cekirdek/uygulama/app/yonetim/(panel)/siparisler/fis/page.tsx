// Sipariş fişi (kart 0270, karar 0171): ?numara=A ya da ?numara=A,B,C (en çok siparisSinirlari.fisEnCok). Önce
// sayfanın izni denetlenir; numaralardan biri kalıba uymuyorsa, sınırı aşıyorsa ya da hiçbir siparişin fişi yoksa
// bulunamadı (tek siparişte kişisel bilgisi silinmişse de). ?yazdir=1 sayfa açılınca yazdırma penceresini getirir.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siparisSinirlari } from "../../../../../../kayitlar/siparis";
import { doldur } from "../../../../../../metinler/doldur";
import { metin } from "../../../../../../metinler/site-metni";
import { siparisNumarasiSemasi } from "../../../../../../moduller/siparis/havale-bildirimi-semalari";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";
import { SiparisFisleri } from "../../../../../../yonetim-paneli/siparisler/fis";
import { siparisFisleriVerisi } from "../../../../../../yonetim-paneli/siparisler/fis-verisi";
import { FisYazdirma } from "../../../../../../yonetim-paneli/siparisler/fis-yazdirma";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("siparis-fisi");

// Adresteki numaralar: virgülle ayrılır, tekrar tek sayılır. Biri bile geçersizse undefined.
const numaralariOku = (deger: string | string[] | undefined): string[] | undefined => {
  if (typeof deger !== "string") return undefined;
  const parcalar = deger.split(",");
  if (parcalar.length > siparisSinirlari.fisEnCok) return undefined;
  const numaralar: string[] = [];
  for (const parca of parcalar) {
    const sonuc = siparisNumarasiSemasi.safeParse(parca);
    if (!sonuc.success) return undefined;
    if (!numaralar.includes(sonuc.data)) numaralar.push(sonuc.data);
  }
  return numaralar;
};

export default async function SiparisFisiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ numara?: string | string[]; yazdir?: string | string[] }>;
}) {
  await panelSayfasiniAc("siparis-fisi");
  const adres = await searchParams;
  const numaralar = numaralariOku(adres.numara);
  if (numaralar === undefined || numaralar.length === 0) notFound();
  const veri = await siparisFisleriVerisi(numaralar);
  if (veri.fisler.length === 0) notFound();
  const tek = numaralar.length === 1 ? veri.fisler[0] : undefined;
  return (
    <PanelSayfasi
      kod="siparis-fisi"
      {...(tek === undefined
        ? {}
        : { baslik: doldur(metin("yonetim.siparisFisi.etiket"), { numara: tek.numara }) })}
      eylemler={<FisYazdirma otomatik={adres.yazdir === "1"} />}
    >
      <SiparisFisleri veri={veri} />
    </PanelSayfasi>
  );
}
