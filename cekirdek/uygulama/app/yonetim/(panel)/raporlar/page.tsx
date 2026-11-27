// Raporlar (kart 0317, karar 0195): satış raporu. Önce sayfanın izni denetlenir, sonra dönem adresten okunur
// (geçersizse sitenin varsayılan dönemi) ve rapor servisle okunur. Okunamazsa ekran hata hâlini gösterir.
import type { Metadata } from "next";
import { Uyari } from "../../../../../../bilesenler/parcalar/uyari";
import { calisanSite } from "../../../../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { metin } from "../../../../../metinler/site-metni";
import { siteninVeritabani } from "../../../../../veritabani/baglanti";
import { EylemBaglantisi } from "../../../../../yonetim-paneli/eylem-dugmesi";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { SatisRaporu } from "../../../../../yonetim-paneli/raporlar/satis-raporu";
import {
  raporIsteginiCoz,
  raporuOku,
  satisRaporuVerisi,
} from "../../../../../yonetim-paneli/raporlar/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("raporlar");

const tek = (deger: string | string[] | undefined) =>
  typeof deger === "string" ? deger : undefined;

export default async function RaporlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("raporlar");
  const sorgu = await searchParams;
  const site = calisanSite();
  const vt = siteninVeritabani();
  const veri = await (async () => {
    const istek = await raporIsteginiCoz(vt, site, {
      donem: tek(sorgu["donem"]),
      karsilastir: tek(sorgu["karsilastir"]),
    });
    return satisRaporuVerisi(site, istek, await raporuOku(vt, site, istek));
  })().catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "raporlar" });
    return null;
  });
  return (
    <PanelSayfasi
      kod="raporlar"
      eylemler={
        veri === null || veri.bos ? undefined : (
          <EylemBaglantisi eylem="disa-aktar" href={veri.csvAdresi} prefetch={false} download />
        )
      }
    >
      {veri === null ? (
        <Uyari tur="tehlike" baslik={metin("yonetim.rapor.hata.okunamadi")}>
          {metin("yonetim.rapor.hata.okunamadiAciklama")}
        </Uyari>
      ) : (
        <SatisRaporu veri={veri} />
      )}
    </PanelSayfasi>
  );
}
