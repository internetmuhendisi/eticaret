// Ürün, müşteri ve kupon raporlarının ekranları (kart 0318, karar 0196; taslak: panel-2.html "Raporlar", Ürünler,
// Müşteriler, Kuponlar). Sunucuda çizilir; sayılar sunucuda sitenin biçimiyle yazılır (diger-veri.ts). Tablolar sayfa
// sayfadır. Üst kısım, kutular ve boş hâl ortak.tsx'tedir.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
import { SekmeBaglantilari } from "../../../bilesenler/parcalar/sekme-baglantilari";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { Bolum } from "../ayrinti-parcalari";
import type { KuponRaporuVerisi, MusteriRaporuVerisi, Sayfa, UrunRaporuVerisi } from "./diger-veri";
import { RaporBos, RaporUstu, SayiKutulari } from "./ortak";

const sag = "py-2 pl-3 text-right whitespace-nowrap";
const sol = "py-2 pr-3";

function RaporSayfalama({ sayfa, etiket }: { sayfa: Sayfa; etiket: string }) {
  return (
    <Sayfalama
      sayfa={sayfa.sayfa}
      toplamSayfa={sayfa.sayfaSayisi}
      adres={sayfa.adres}
      metinler={{
        etiket,
        onceki: metin("ortak.parca.oncekiSayfa"),
        sonraki: metin("ortak.parca.sonrakiSayfa"),
        sayfaAdi: (sira) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
        bosluk: metin("ortak.parca.atlananSayfalar"),
      }}
    />
  );
}

function Basliklar({ sutunlar }: { sutunlar: { ad: string; sayi?: boolean }[] }) {
  return (
    <TabloUstu>
      <TabloSatiri>
        {sutunlar.map((sutun) => (
          <TabloBasHucresi key={sutun.ad} scope="col" className={sutun.sayi ? sag : sol}>
            {sutun.ad}
          </TabloBasHucresi>
        ))}
      </TabloSatiri>
    </TabloUstu>
  );
}

export function UrunRaporu({ veri }: { veri: UrunRaporuVerisi }) {
  return (
    <div className="flex flex-col gap-4">
      <RaporUstu veri={veri} />
      {veri.bos ? (
        <RaporBos
          veri={veri}
          baslik={metin("yonetim.rapor.urun.bos")}
          aciklama={metin("yonetim.rapor.bos.aciklama")}
        />
      ) : (
        <Bolum
          baslik={metin("yonetim.rapor.urun.baslik")}
          kimlik="rapor-urunler"
          ek={
            <SekmeBaglantilari
              etiket={metin("yonetim.rapor.urun.siralama")}
              secili={veri.sirala}
              sekmeler={[
                {
                  kod: "tutar",
                  ad: metin("yonetim.rapor.urun.tutaraGore"),
                  adres: veri.siralamaAdresleri.tutar,
                },
                {
                  kod: "adet",
                  ad: metin("yonetim.rapor.urun.adedeGore"),
                  adres: veri.siralamaAdresleri.adet,
                },
              ]}
            />
          }
        >
          <div className="overflow-x-auto">
            <Tablo>
              <TabloBasligi className="sr-only">
                {metin(`yonetim.rapor.urun.tablo.${veri.sirala}`)}
              </TabloBasligi>
              <Basliklar
                sutunlar={[
                  { ad: metin("yonetim.rapor.csv.urun.urun") },
                  { ad: metin("yonetim.rapor.csv.urun.adet"), sayi: true },
                  { ad: metin("yonetim.rapor.csv.urun.tutar"), sayi: true },
                  { ad: metin("yonetim.rapor.csv.urun.iade"), sayi: true },
                ]}
              />
              <TabloGovdesi>
                {veri.satirlar.flatMap((satir) => [
                  <TabloSatiri key={satir.kimlik}>
                    <TabloHucresi className={sol}>
                      {satir.adres === null ? (
                        <span className="font-kalin">{satir.ad}</span>
                      ) : (
                        <Baglanti href={satir.adres}>{satir.ad}</Baglanti>
                      )}
                      {satir.silindi ? (
                        <Rozet tur="ikincil" className="ml-2">
                          {metin("yonetim.rapor.urun.silindi")}
                        </Rozet>
                      ) : null}
                    </TabloHucresi>
                    <TabloHucresi className={sag}>{satir.adet}</TabloHucresi>
                    <TabloHucresi className={sag}>{satir.tutar}</TabloHucresi>
                    <TabloHucresi className={sag}>{satir.iadeAdedi}</TabloHucresi>
                  </TabloSatiri>,
                  ...satir.birlesimler.map((birlesim) => (
                    <TabloSatiri key={birlesim.kimlik}>
                      <TabloHucresi className="py-2 pr-3 pl-6 text-kucuk text-soluk-yazi">
                        {birlesim.ad}
                      </TabloHucresi>
                      <TabloHucresi className={`${sag} text-kucuk`}>{birlesim.adet}</TabloHucresi>
                      <TabloHucresi className={`${sag} text-kucuk`}>{birlesim.tutar}</TabloHucresi>
                      <TabloHucresi className={`${sag} text-kucuk`}>
                        {birlesim.iadeAdedi}
                      </TabloHucresi>
                    </TabloSatiri>
                  )),
                ])}
              </TabloGovdesi>
            </Tablo>
          </div>
          <RaporSayfalama sayfa={veri.sayfa} etiket={metin("yonetim.rapor.urun.sayfalar")} />
          <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.rapor.urun.not")}</p>
        </Bolum>
      )}
    </div>
  );
}

export function MusteriRaporu({ veri }: { veri: MusteriRaporuVerisi }) {
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
          <Bolum baslik={metin("yonetim.rapor.musteri.baslik")} kimlik="rapor-musteriler">
            {veri.satirlar.length === 0 ? (
              <p className="m-0 text-soluk-yazi">{metin("yonetim.rapor.musteri.uyeYok")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Tablo>
                  <TabloBasligi className="sr-only">
                    {metin("yonetim.rapor.musteri.baslik")}
                  </TabloBasligi>
                  <Basliklar
                    sutunlar={[
                      { ad: metin("yonetim.rapor.csv.musteri.ad") },
                      { ad: metin("yonetim.rapor.csv.musteri.siparisSayisi"), sayi: true },
                      { ad: metin("yonetim.rapor.csv.musteri.tutar"), sayi: true },
                    ]}
                  />
                  <TabloGovdesi>
                    {veri.satirlar.map((satir) => (
                      <TabloSatiri key={satir.kimlik}>
                        <TabloHucresi className={sol}>
                          {satir.adres === null ? (
                            <span className={satir.adYok ? "text-soluk-yazi" : "font-kalin"}>
                              {satir.ad}
                            </span>
                          ) : (
                            <Baglanti href={satir.adres}>{satir.ad}</Baglanti>
                          )}
                          {satir.hesapKapali ? (
                            <Rozet tur="ikincil" className="ml-2">
                              {metin("yonetim.rapor.musteri.hesapKapali")}
                            </Rozet>
                          ) : null}
                        </TabloHucresi>
                        <TabloHucresi className={sag}>{satir.siparisSayisi}</TabloHucresi>
                        <TabloHucresi className={sag}>{satir.tutar}</TabloHucresi>
                      </TabloSatiri>
                    ))}
                  </TabloGovdesi>
                </Tablo>
              </div>
            )}
            <RaporSayfalama sayfa={veri.sayfa} etiket={metin("yonetim.rapor.musteri.sayfalar")} />
            <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.rapor.musteri.not")}</p>
          </Bolum>
        </>
      )}
    </div>
  );
}

export function KuponRaporu({ veri }: { veri: KuponRaporuVerisi }) {
  return (
    <div className="flex flex-col gap-4">
      <RaporUstu veri={veri} />
      {veri.bos ? (
        <RaporBos
          veri={veri}
          baslik={metin("yonetim.rapor.kupon.bos")}
          aciklama={metin("yonetim.rapor.kupon.bosAciklama")}
        />
      ) : (
        <>
          <SayiKutulari kutular={veri.kutular} />
          <Bolum baslik={metin("yonetim.rapor.kupon.baslik")} kimlik="rapor-kuponlar">
            <div className="overflow-x-auto">
              <Tablo>
                <TabloBasligi className="sr-only">
                  {metin("yonetim.rapor.kupon.baslik")}
                </TabloBasligi>
                <Basliklar
                  sutunlar={[
                    { ad: metin("yonetim.rapor.csv.kupon.kod") },
                    { ad: metin("yonetim.rapor.csv.kupon.kullanim"), sayi: true },
                    { ad: metin("yonetim.rapor.csv.kupon.indirim"), sayi: true },
                    { ad: metin("yonetim.rapor.csv.kupon.satis"), sayi: true },
                    { ad: metin("yonetim.rapor.csv.kupon.iadeSonrasi"), sayi: true },
                  ]}
                />
                <TabloGovdesi>
                  {veri.satirlar.map((satir) => (
                    <TabloSatiri key={satir.kod}>
                      <TabloHucresi className={sol}>
                        {satir.adres === null ? (
                          <span className="font-kalin">{satir.kod}</span>
                        ) : (
                          <Baglanti href={satir.adres}>{satir.kod}</Baglanti>
                        )}
                      </TabloHucresi>
                      <TabloHucresi className={sag}>{satir.kullanim}</TabloHucresi>
                      <TabloHucresi className={sag}>{satir.indirim}</TabloHucresi>
                      <TabloHucresi className={sag}>{satir.satis}</TabloHucresi>
                      <TabloHucresi className={sag}>{satir.iadeSonrasi}</TabloHucresi>
                    </TabloSatiri>
                  ))}
                </TabloGovdesi>
              </Tablo>
            </div>
            <RaporSayfalama sayfa={veri.sayfa} etiket={metin("yonetim.rapor.kupon.sayfalar")} />
            <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.rapor.kupon.not")}</p>
          </Bolum>
        </>
      )}
    </div>
  );
}
