// "Excel ile içe ve dışa aktar" ekranı (kart 0315): Excel ile toplu ürün işlemleri eklentisinin sayfası. Önce sayfanın
// izni ve eklentinin açıklığı denetlenir (yoksa bulunamadı), sonra yöneticinin son dışa ve içe aktarması okunur.
// Ürünler listesinin süzgeçleri adresin "liste" parametresiyle gelir.
import type { Metadata } from "next";
import { ExcelEkrani } from "../../../../../../eklentiler/excel-ile-toplu-urun-islemleri/panel/ekran";
import { excelEkraniVerisi } from "../../../../../../eklentiler/excel-ile-toplu-urun-islemleri/panel/veri";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("urunler-excel");

export default async function UrunlerExcelSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("urunler-excel");
  const { kimlik, yetkili } = await panelOturumu();
  const liste = (await searchParams)["liste"];
  const veri = await excelEkraniVerisi({
    yonetici: kimlik,
    listeSorgusu: typeof liste === "string" && liste !== "" ? liste.slice(0, 2000) : null,
    fiyatGorur: yetkili("fiyat.gor"),
    stokGorur: yetkili("stok.gor"),
    iceAktarabilir: yetkili("urun.degistir"),
  });
  return (
    <PanelSayfasi kod="urunler-excel">
      <ExcelEkrani veri={veri} />
    </PanelSayfasi>
  );
}
