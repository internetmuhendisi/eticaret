// Her panel sayfasının iskeleti (kart 0141, .claude/rules/yonetim-paneli.md): üstte komut çubuğu (sayfa yolu,
// başlık, açıklama, eylemler), altında içerik. Başlık, açıklama ve sayfa yolu sayfa ağacından gelir; sayfa
// yalnız kodunu, eylemlerini ve içeriğini verir. İzni olmayan yönetici sayfanın adresini bilse de bulunamadı alır:
// menüde görmediği sayfayı açamaz. Komut çubuğunda dolu renkli tek düğme sayfanın asıl eylemidir.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SayfaBasligi } from "../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../bilesenler/parcalar/sayfa-yolu";
import { calisanSite } from "../ayar-semasi/calisan-site";
import { eklentiAcikMi } from "../eklentiler/acik";
import { doldur } from "../metinler/doldur";
import { metin } from "../metinler/site-metni";
import { magazaninAdi } from "../moduller/magaza-ayarlari/servis";
import { panelOturumu } from "./panel-oturumu";
import {
  type PanelSayfaKodu,
  type PanelSayfaTanimi,
  panelSayfalari,
  sayfaAcikMi,
  sayfaTanimi,
  sayfaYolunuKur,
} from "./sayfa-agaci";

// Eklentinin getirdiği sayfa yalnız eklenti sitede açıkken vardır (karar 0117).
const sitedeAcik = (sayfa: PanelSayfaTanimi) =>
  sayfaAcikMi(sayfa, (kod) => eklentiAcikMi(calisanSite(), kod));

// Sayfanın tanımı ve kökten yolu; izni yoksa bulunamadı. Ağaç yalnız testte değişir.
export const panelSayfasiniAc = async (
  kod: string,
  agac: readonly PanelSayfaTanimi[] = panelSayfalari,
): Promise<{ sayfa: PanelSayfaTanimi; yol: PanelSayfaTanimi[] }> => {
  const sayfa = sayfaTanimi(agac, kod);
  if (sayfa === undefined || !sitedeAcik(sayfa)) notFound();
  const { yetkili } = await panelOturumu();
  if (sayfa.izin !== null && !yetkili(sayfa.izin)) notFound();
  return { sayfa, yol: sayfaYolunuKur(agac, kod) };
};

// Sekme başlığı: "<sayfa> | <mağaza> paneli". Tam olarak verilir, kök düzenin kalıbı eklenmez. İzni olmayan
// yöneticiye sayfanın adı sekmede de görünmez: sayfa bulunamadı verir, başlık Next.js'in kendisininkidir.
export const panelSayfaBilgisi = async (
  kod: PanelSayfaKodu,
  agac: readonly PanelSayfaTanimi[] = panelSayfalari,
): Promise<Metadata> => {
  const sayfa = sayfaTanimi(agac, kod);
  if (sayfa === undefined || !sitedeAcik(sayfa)) return {};
  const { yetkili } = await panelOturumu();
  if (sayfa.izin !== null && !yetkili(sayfa.izin)) return {};
  return {
    title: {
      absolute: doldur(metin("yonetim.cerceve.sekmeBasligi"), {
        sayfa: metin(sayfa.ad),
        magaza: await magazaninAdi(),
      }),
    },
  };
};

export async function PanelSayfasi({
  kod,
  baslik,
  eylemler,
  children,
  agac = panelSayfalari,
}: {
  kod: PanelSayfaKodu;
  // Ağaçtaki addan farklı başlık: kaydın kendisini gösteren alt sayfa (sipariş ayrıntısında "Sipariş ORN-1007").
  // Sayfa yolu ve sekme başlığı ağaçtaki adla kalır.
  baslik?: string;
  // Komut çubuğundaki eylemler (EylemDugmesi, EylemBaglantisi); asıl eylem en sonda.
  eylemler?: ReactNode;
  children?: ReactNode;
  agac?: readonly PanelSayfaTanimi[];
}) {
  const { sayfa, yol } = await panelSayfasiniAc(kod, agac);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-kenar bg-zemin px-4 py-4 masaustu:px-8 masaustu:py-5">
        <div className="flex min-w-0 max-w-metin flex-col gap-1">
          {yol.length > 1 ? (
            <SayfaYolu
              etiket={metin("ortak.parca.sayfaYolu")}
              ayrac={metin("ortak.parca.sayfaYoluAyraci")}
              adimlar={yol.map((adim) => ({ ad: metin(adim.ad), adres: adim.adres }))}
              className="hidden tablet:block"
            />
          ) : null}
          <SayfaBasligi baslik={baslik ?? metin(sayfa.ad)} gorunum="panel" />
          <p className="text-kucuk text-soluk-yazi">{metin(sayfa.aciklama)}</p>
        </div>
        {eylemler === undefined ? null : (
          <div className="flex w-full flex-wrap gap-2 tablet:w-auto">{eylemler}</div>
        )}
      </div>
      <div className="flex flex-col gap-4 px-3 py-4 tablet:px-4 masaustu:px-8 masaustu:py-5">
        {children}
      </div>
    </>
  );
}
