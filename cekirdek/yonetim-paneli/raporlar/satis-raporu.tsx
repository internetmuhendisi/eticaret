// Satış raporu ekranı (kart 0317, karar 0195; taslak: planlar/tasarim-yonu/panel-2.html "Raporlar", Satış): araç
// şeridinde dönem seçimi ve karşılaştırılan dönem, dört sayı kutusu (ciro, sipariş, ortalama sepet, iade; önceki
// döneme göre fark, mağaza için iyiyse yeşil, kötüyse kırmızı, yönü okla ve yazıyla da), seri grafiği ve tablosu,
// özet ve oran oran vergi. Satışsız dönemde boş hâl. Sunucuda çizilir;
// sayılar sunucuda sitenin biçimiyle yazılır (veri.ts). Ürün, müşteri ve kupon sekmeleri kart 0318'dedir.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  Tablo,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
} from "../../../bilesenler/parcalar/tablo";
import { metin } from "../../metinler/site-metni";
import { Bolum } from "../ayrinti-parcalari";
import { panelIkonu } from "../panel-ikon";
import { DonemSecici } from "./donem-secici";
import { SeriGrafigi } from "./seri-grafigi";
import type { SatisKutusu, SatisRaporuVerisi } from "./veri";

const yonIsareti = { arti: "▲", eksi: "▼", esit: "=" } as const;

function Sayi({ ad, kutu }: { ad: string; kutu: SatisKutusu }) {
  const kimlik = `rapor-kutu-${kutu.kod}`;
  return (
    <Kart role="group" aria-labelledby={kimlik} className="gap-1 p-4">
      <span id={kimlik} className="text-kucuk text-soluk-yazi">
        {ad}
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

export function SatisRaporu({ veri }: { veri: SatisRaporuVerisi }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DonemSecici
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
      {veri.bos ? (
        <BosHal
          ikon={panelIkonu("rapor")}
          baslik={metin("yonetim.rapor.bos.baslik")}
          aciklama={metin("yonetim.rapor.bos.aciklama")}
        >
          <Baglanti gorunum="cerceveli" href={veri.bosDonemBaglantisi.adres}>
            {veri.bosDonemBaglantisi.yazi}
          </Baglanti>
        </BosHal>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 masaustu:grid-cols-4">
            {veri.kutular.map((kutu) => (
              <Sayi key={kutu.kod} ad={metin(`yonetim.rapor.kutu.${kutu.kod}`)} kutu={kutu} />
            ))}
          </div>
          <div className="grid grid-cols-1 items-start gap-4 masaustu:grid-cols-2">
            <Bolum baslik={veri.seri.baslik} kimlik="rapor-seri">
              <SeriGrafigi
                baslik={veri.seri.baslik}
                sutun={veri.seri.sutun}
                noktalar={veri.seri.noktalar}
              />
            </Bolum>
            <Bolum baslik={metin("yonetim.rapor.ozetBasligi")} kimlik="rapor-ozet">
              <div className="overflow-x-auto">
                <Tablo>
                  <TabloBasligi className="sr-only">
                    {metin("yonetim.rapor.ozetTablosu")}
                  </TabloBasligi>
                  <TabloGovdesi>
                    {veri.ozetSatirlari.map((satir) => (
                      <TabloSatiri key={satir.ad}>
                        <TabloHucresi
                          className={satir.vurgu ? "py-2 pr-3 font-kalin" : "py-2 pr-3"}
                        >
                          {satir.ad}
                        </TabloHucresi>
                        <TabloHucresi
                          className={
                            satir.vurgu
                              ? "py-2 text-right font-kalin whitespace-nowrap"
                              : "py-2 text-right whitespace-nowrap"
                          }
                        >
                          {satir.deger}
                        </TabloHucresi>
                      </TabloSatiri>
                    ))}
                  </TabloGovdesi>
                </Tablo>
              </div>
              <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.rapor.ozetNotu")}</p>
            </Bolum>
          </div>
        </>
      )}
    </div>
  );
}
