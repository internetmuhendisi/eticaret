// Raporlar (kart 0317, 0318; karar 0195, 0196): satış, ürün, müşteri ve kupon raporu, adresteki sekmeyle. Önce sayfanın izni denetlenir, sonra dönem adresten okunur
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
import {
  KuponRaporu,
  MusteriRaporu,
  UrunRaporu,
} from "../../../../../yonetim-paneli/raporlar/diger-raporlar";
import {
  type KuponRaporuVerisi,
  kuponRaporuVerisi,
  type MusteriRaporuVerisi,
  musteriRaporuVerisi,
  type UrunRaporuVerisi,
  urunRaporuVerisi,
} from "../../../../../yonetim-paneli/raporlar/diger-veri";
import { SatisRaporu } from "../../../../../yonetim-paneli/raporlar/satis-raporu";
import {
  raporIsteginiCoz,
  raporuOku,
  type SatisRaporuVerisi,
  satisRaporuVerisi,
} from "../../../../../yonetim-paneli/raporlar/veri";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("raporlar");

type RaporEkrani =
  | { tur: "satis"; veri: SatisRaporuVerisi }
  | { tur: "urunler"; veri: UrunRaporuVerisi }
  | { tur: "musteriler"; veri: MusteriRaporuVerisi }
  | { tur: "kuponlar"; veri: KuponRaporuVerisi };

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
  const veri = await (async (): Promise<RaporEkrani> => {
    const istek = await raporIsteginiCoz(vt, site, {
      rapor: tek(sorgu["rapor"]),
      donem: tek(sorgu["donem"]),
      karsilastir: tek(sorgu["karsilastir"]),
      sirala: tek(sorgu["sirala"]),
      sayfa: tek(sorgu["sayfa"]),
    });
    switch (istek.rapor) {
      case "satis":
        return {
          tur: "satis",
          veri: satisRaporuVerisi(site, istek, await raporuOku(vt, site, istek)),
        };
      case "urunler":
        return { tur: "urunler", veri: await urunRaporuVerisi(vt, site, istek) };
      case "musteriler":
        return { tur: "musteriler", veri: await musteriRaporuVerisi(vt, site, istek) };
      case "kuponlar":
        return { tur: "kuponlar", veri: await kuponRaporuVerisi(vt, site, istek) };
    }
  })().catch((hata: unknown) => {
    hatayiKaydet(hata, { ekran: "raporlar" });
    return null;
  });
  return (
    <PanelSayfasi
      kod="raporlar"
      eylemler={
        veri === null || veri.veri.bos ? undefined : (
          <EylemBaglantisi
            eylem="disa-aktar"
            href={veri.veri.csvAdresi}
            prefetch={false}
            download
          />
        )
      }
    >
      {veri === null ? (
        <Uyari tur="tehlike" baslik={metin("yonetim.rapor.hata.okunamadi")}>
          {metin("yonetim.rapor.hata.okunamadiAciklama")}
        </Uyari>
      ) : veri.tur === "satis" ? (
        <SatisRaporu veri={veri.veri} />
      ) : veri.tur === "urunler" ? (
        <UrunRaporu veri={veri.veri} />
      ) : veri.tur === "musteriler" ? (
        <MusteriRaporu veri={veri.veri} />
      ) : (
        <KuponRaporu veri={veri.veri} />
      )}
    </PanelSayfasi>
  );
}
