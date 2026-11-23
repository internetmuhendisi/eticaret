// Müşteri ayrıntısı (kart 0271, karar 0173; taslak planlar/tasarim-yonu/panel.html "Müşteri ayrıntısı"): sipariş sayısı,
// toplam ve ortalama; solda siparişleri (ayrıntıya bağlantılı) ve mağazanın notları, sağda hesap ve adresler.
// Masaüstünde iki sütun, daha darda tek sütun. Adresler yalnız görünür, müşteri değiştirir. Sunucuda çizilir; notlar
// tarayıcıda (ekleme ve silme).
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { musteriPanelSinirlari } from "../../kayitlar/musteri-paneli";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siparisAyrintisiAdresi } from "../adresler";
import { Bilgi, Bolum } from "../ayrinti-parcalari";
import { DurumRozeti } from "../siparisler/durum-rozeti";
import { MusteriNotlari } from "./notlar";
import type { MusteriAyrintisiVerisi } from "./veri";

function Sayi({ ad, deger }: { ad: string; deger: string }) {
  return (
    <Kart className="gap-1 p-4">
      <span className="text-kucuk text-soluk-yazi">{ad}</span>
      <strong className="font-baslik text-baslik-4">{deger}</strong>
    </Kart>
  );
}

export function MusteriAyrintisi({
  veri,
  notDegistirebilir,
}: {
  veri: MusteriAyrintisiVerisi;
  notDegistirebilir: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
        {[
          [metin("yonetim.musteri.sayi.siparis"), String(veri.siparisSayisi)],
          [metin("yonetim.musteri.sayi.toplam"), veri.toplam],
          [metin("yonetim.musteri.sayi.ortalama"), veri.ortalama],
        ].map(([ad, deger]) => (
          <div key={ad}>
            <dt className="sr-only">{ad}</dt>
            <dd>
              <Sayi ad={ad ?? ""} deger={deger ?? ""} />
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-4 masaustu:flex-row masaustu:items-start">
        <div className="flex min-w-0 flex-col gap-4 masaustu:w-2/3">
          <Bolum baslik={metin("yonetim.musteri.siparisler.baslik")} kimlik="musteri-siparisleri">
            {veri.siparisler.length === 0 ? (
              <p className="text-soluk-yazi">{metin("yonetim.musteri.siparisler.bos")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Tablo>
                  <TabloBasligi className="sr-only">
                    {metin("yonetim.musteri.siparisler.tablo")}
                  </TabloBasligi>
                  <TabloUstu>
                    <TabloSatiri>
                      <TabloBasHucresi scope="col" className="py-2 pr-3">
                        {metin("yonetim.musteri.siparisler.siparis")}
                      </TabloBasHucresi>
                      <TabloBasHucresi scope="col" className="py-2 pr-3">
                        {metin("yonetim.musteri.siparisler.tarih")}
                      </TabloBasHucresi>
                      <TabloBasHucresi scope="col" className="py-2 pr-3">
                        {metin("yonetim.musteri.siparisler.durum")}
                      </TabloBasHucresi>
                      <TabloBasHucresi scope="col" className="py-2 text-right">
                        {metin("yonetim.musteri.siparisler.tutar")}
                      </TabloBasHucresi>
                    </TabloSatiri>
                  </TabloUstu>
                  <TabloGovdesi>
                    {veri.siparisler.map((siparis) => (
                      <TabloSatiri key={siparis.numara}>
                        <TabloHucresi className="py-2 pr-3">
                          <Baglanti
                            href={siparisAyrintisiAdresi(siparis.numara)}
                            aria-label={doldur(metin("yonetim.siparisler.ayrintiAdi"), {
                              numara: siparis.numara,
                            })}
                          >
                            {siparis.numara}
                          </Baglanti>
                        </TabloHucresi>
                        <TabloHucresi className="py-2 pr-3 whitespace-nowrap">
                          {siparis.zaman}
                        </TabloHucresi>
                        <TabloHucresi className="py-2 pr-3">
                          <DurumRozeti durum={siparis.durum} />
                        </TabloHucresi>
                        <TabloHucresi className="py-2 text-right whitespace-nowrap">
                          {siparis.toplam}
                        </TabloHucresi>
                      </TabloSatiri>
                    ))}
                  </TabloGovdesi>
                </Tablo>
              </div>
            )}
            {veri.siparisKesildi ? (
              <p className="text-kucuk text-soluk-yazi">
                {doldur(metin("yonetim.musteri.siparisler.kesildi"), {
                  sayi: String(musteriPanelSinirlari.ayrintiSiparis),
                })}
              </p>
            ) : null}
          </Bolum>
          <Bolum baslik={metin("yonetim.musteri.notlar.baslik")} kimlik="musteri-notlari">
            <MusteriNotlari
              musteri={veri.kimlik}
              notlar={veri.notlar}
              degistirebilir={notDegistirebilir}
            />
          </Bolum>
        </div>
        <div className="flex min-w-0 flex-col gap-4 masaustu:w-1/3">
          <Bolum baslik={metin("yonetim.musteri.hesap.baslik")} kimlik="musteri-hesabi">
            <dl className="flex flex-col gap-3">
              <Bilgi ad={metin("yonetim.musteri.hesap.eposta")}>{veri.eposta}</Bilgi>
              <Bilgi ad={metin("yonetim.musteri.hesap.kayit")}>{veri.kayit}</Bilgi>
              <Bilgi ad={metin("yonetim.musteri.hesap.kampanya")}>
                {veri.kampanya.var
                  ? doldur(metin("yonetim.musteri.hesap.kampanyaVar"), {
                      tarih: veri.kampanya.zaman ?? "",
                    })
                  : metin("yonetim.musteri.hesap.kampanyaYok")}
              </Bilgi>
              {veri.uyelikSurumu === null ? null : (
                <Bilgi ad={metin("yonetim.musteri.hesap.uyelik")}>
                  {doldur(metin("yonetim.musteri.hesap.uyelikSurumu"), {
                    surum: veri.uyelikSurumu,
                  })}
                </Bilgi>
              )}
            </dl>
          </Bolum>
          <Bolum baslik={metin("yonetim.musteri.adresler.baslik")} kimlik="musteri-adresleri">
            {veri.adresler.length === 0 ? (
              <p className="text-soluk-yazi">{metin("yonetim.musteri.adresler.bos")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {veri.adresler.map((adres) => (
                  <li
                    key={adres.kimlik}
                    className="flex flex-col gap-1 rounded-orta border border-kenar p-3 text-kucuk"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="wrap-anywhere">{adres.baslik}</strong>
                      {adres.varsayilanTeslimat ? (
                        <Rozet tur="ikincil">{metin("yonetim.musteri.adresler.teslimat")}</Rozet>
                      ) : null}
                      {adres.varsayilanFatura ? (
                        <Rozet tur="ikincil">{metin("yonetim.musteri.adresler.fatura")}</Rozet>
                      ) : null}
                    </span>
                    <span className="wrap-anywhere">{adres.ad}</span>
                    {adres.satirlar.map((satir) => (
                      <span key={satir} className="wrap-anywhere">
                        {satir}
                      </span>
                    ))}
                    {adres.telefon === null ? null : <span>{adres.telefon}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Bolum>
        </div>
      </div>
    </div>
  );
}
