// Satış raporu ekranı (kart 0317, karar 0195; taslak: planlar/tasarim-yonu/panel-2.html "Raporlar", Satış): araç
// şeridinde dönem seçimi ve karşılaştırılan dönem, dört sayı kutusu (ciro, sipariş, ortalama sepet, iade; önceki
// döneme göre fark, mağaza için iyiyse yeşil, kötüyse kırmızı, yönü okla ve yazıyla da), seri grafiği ve tablosu,
// özet ve oran oran vergi. Satışsız dönemde boş hâl. Sunucuda çizilir;
// sayılar sunucuda sitenin biçimiyle yazılır (veri.ts). Üst kısım, kutular ve boş hâl ortak.tsx'tedir.
import {
  Tablo,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
} from "../../../bilesenler/parcalar/tablo";
import { metin } from "../../metinler/site-metni";
import { Bolum } from "../ayrinti-parcalari";
import { RaporBos, RaporUstu, SayiKutulari } from "./ortak";
import { SeriGrafigi } from "./seri-grafigi";
import type { SatisRaporuVerisi } from "./veri";

export function SatisRaporu({ veri }: { veri: SatisRaporuVerisi }) {
  return (
    <div className="flex flex-col gap-4">
      <RaporUstu veri={veri} />
      {veri.bos ? (
        <RaporBos
          veri={veri}
          baslik={metin("yonetim.rapor.bos.baslik")}
          aciklama={metin("yonetim.rapor.bos.aciklama")}
        />
      ) : (
        <>
          <SayiKutulari kutular={veri.kutular} />
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
