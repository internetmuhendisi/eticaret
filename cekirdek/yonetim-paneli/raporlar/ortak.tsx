// Raporlar ekranının ortak parçaları (kart 0317, 0318; taslak: panel-2.html "Raporlar"): üst kısım (rapor sekmeleri,
// dönem seçimi ve karşılaştırılan dönem), sayı kutuları (önceki döneme göre fark; iyiyse yeşil, kötüyse kırmızı,
// yönü okla ve yazıyla da) ve boş hâl (sonraki adımı başka döneme bağlantı). Sunucuda çizilir.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SekmeBaglantilari } from "../../../bilesenler/parcalar/sekme-baglantilari";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { metin } from "../../metinler/site-metni";
import { panelIkonu } from "../panel-ikon";
import { DonemSecici } from "./donem-secici";
import type { DonemVerisi, RaporKutusu } from "./veri";

const yonIsareti = { arti: "▲", eksi: "▼", esit: "=" } as const;

function Sayi({ kutu }: { kutu: RaporKutusu }) {
  const kimlik = `rapor-kutu-${kutu.kod}`;
  return (
    <Kart role="group" aria-labelledby={kimlik} className="gap-1 p-4">
      <span id={kimlik} className="text-kucuk text-soluk-yazi">
        {kutu.ad}
      </span>
      <strong className="font-baslik text-baslik-4">{kutu.deger}</strong>
      {kutu.fark === null ? null : (
        <span
          className={sinif(
            "text-kucuk font-kalin",
            kutu.iyi === null
              ? "text-soluk-yazi"
              : kutu.iyi
                ? "text-basari-yazi"
                : "text-tehlike-yazi",
          )}
        >
          {kutu.yon === null ? null : <span aria-hidden="true">{yonIsareti[kutu.yon]} </span>}
          {kutu.fark}
        </span>
      )}
      {kutu.alt === null ? null : <span className="text-kucuk text-soluk-yazi">{kutu.alt}</span>}
    </Kart>
  );
}

export function SayiKutulari({ kutular }: { kutular: RaporKutusu[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 masaustu:grid-cols-4">
      {kutular.map((kutu) => (
        <Sayi key={kutu.kod} kutu={kutu} />
      ))}
    </div>
  );
}

export function RaporUstu({ veri }: { veri: DonemVerisi }) {
  return (
    <>
      <SekmeBaglantilari
        etiket={metin("yonetim.rapor.sekmeler")}
        secili={veri.rapor}
        sekmeler={veri.sekmeler}
      />
      <div className="flex flex-wrap items-center gap-3">
        <DonemSecici
          rapor={veri.rapor}
          dugmeYazisi={veri.dugmeYazisi}
          hazirKod={veri.hazirKod}
          baslangic={veri.ozelBaslangic}
          bitis={veri.ozelBitis}
          karsilastir={veri.karsilastir}
        />
        {veri.oncekiYazisi === null ? null : (
          <span className="text-kucuk text-soluk-yazi">{veri.oncekiYazisi}</span>
        )}
      </div>
    </>
  );
}

export function RaporBos({
  veri,
  baslik,
  aciklama,
}: {
  veri: DonemVerisi;
  baslik: string;
  aciklama: string;
}) {
  return (
    <BosHal ikon={panelIkonu("rapor")} baslik={baslik} aciklama={aciklama}>
      <Baglanti gorunum="cerceveli" href={veri.bosDonemBaglantisi.adres}>
        {veri.bosDonemBaglantisi.yazi}
      </Baglanti>
    </BosHal>
  );
}
