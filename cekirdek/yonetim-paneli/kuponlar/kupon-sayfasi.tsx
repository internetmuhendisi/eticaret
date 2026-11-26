// Kuponun sayfası (kart 0313, karar 0188; taslak: planlar/tasarim-yonu/panel-2.html "Kuponlar", kullanımlar): özet
// kartları (kullanım ve kalan, verilen indirim, kuponlu siparişlerin toplamı, iade sonrası net), kapsamı ve
// kullanıldığı siparişler (en yeni önce, sayfa sayfa, siparişe bağlantı). Sunucuda çizilir; "Kapat" ve "Aç" komut
// çubuğundadır (kupon-durumu.tsx).
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
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
import { kuponAdresi, siparisAyrintisiAdresi } from "../adresler";
import { Bolum } from "../ayrinti-parcalari";
import { DurumRozeti } from "../siparisler/durum-rozeti";
import type { KuponSayfasiVerisi } from "./veri";

function Sayi({ ad, deger, alt }: { ad: string; deger: string; alt: string | null }) {
  return (
    <Kart className="gap-1 p-4">
      <span className="text-kucuk text-soluk-yazi">{ad}</span>
      <strong className="font-baslik text-baslik-4">{deger}</strong>
      {alt === null ? null : <span className="text-kucuk text-soluk-yazi">{alt}</span>}
    </Kart>
  );
}

export function KuponSayfasi({ veri }: { veri: KuponSayfasiVerisi }) {
  const { ozet, kullanimlar } = veri;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 masaustu:grid-cols-4">
        <Sayi ad={metin("yonetim.kupon.ozet.kullanim")} deger={ozet.kullanim} alt={ozet.kalan} />
        <Sayi
          ad={metin("yonetim.kupon.ozet.verilenIndirim")}
          deger={ozet.verilenIndirim}
          alt={ozet.siparisSayisi}
        />
        <Sayi
          ad={metin("yonetim.kupon.ozet.siparisToplami")}
          deger={ozet.siparisToplami}
          alt={metin("yonetim.kupon.ozet.siparisToplamiAlt")}
        />
        <Sayi ad={metin("yonetim.kupon.ozet.iadeSonrasi")} deger={ozet.iadeSonrasi} alt={null} />
      </div>
      {veri.kapsamAdlari.length === 0 ? null : (
        <Bolum baslik={metin("yonetim.kupon.kapsamBasligi")} kimlik="kupon-kapsami">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {veri.kapsamAdlari.map(({ kimlik, ad, silinmis }) => (
              <li key={kimlik}>
                <Rozet tur={silinmis ? "ikincil" : "cerceveli"}>
                  {silinmis ? doldur(metin("yonetim.kupon.silinmisKayit"), { ad }) : ad}
                </Rozet>
              </li>
            ))}
          </ul>
        </Bolum>
      )}
      <Bolum baslik={metin("yonetim.kupon.kullanimlar.baslik")} kimlik="kupon-kullanimlari">
        {kullanimlar.satirlar.length === 0 ? (
          <p className="text-soluk-yazi">{metin("yonetim.kupon.kullanimlar.bos")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Tablo>
              <TabloBasligi className="sr-only">
                {doldur(metin("yonetim.kupon.kullanimlar.tablo"), { kod: veri.satir.kod })}
              </TabloBasligi>
              <TabloUstu>
                <TabloSatiri>
                  {(
                    [
                      ["siparis", "py-2 pr-3"],
                      ["musteri", "py-2 pr-3"],
                      ["tarih", "py-2 pr-3"],
                      ["durum", "py-2 pr-3"],
                      ["indirim", "py-2 pr-3 text-right"],
                      ["toplam", "py-2 text-right"],
                    ] as const
                  ).map(([kod, sinif]) => (
                    <TabloBasHucresi key={kod} scope="col" className={sinif}>
                      {metin(`yonetim.kupon.kullanimlar.${kod}`)}
                    </TabloBasHucresi>
                  ))}
                </TabloSatiri>
              </TabloUstu>
              <TabloGovdesi>
                {kullanimlar.satirlar.map((kullanim) => (
                  <TabloSatiri key={kullanim.numara}>
                    <TabloHucresi className="py-2 pr-3">
                      <Baglanti
                        href={siparisAyrintisiAdresi(kullanim.numara)}
                        aria-label={doldur(metin("yonetim.siparisler.ayrintiAdi"), {
                          numara: kullanim.numara,
                        })}
                      >
                        {kullanim.numara}
                      </Baglanti>
                    </TabloHucresi>
                    <TabloHucresi className="py-2 pr-3">
                      {kullanim.musteri ?? (
                        <span className="text-soluk-yazi">
                          {metin("yonetim.kupon.kullanimlar.adYok")}
                        </span>
                      )}
                      {kullanim.uye ? null : (
                        <span className="block text-kucuk text-soluk-yazi">
                          {metin("yonetim.kupon.kullanimlar.uyeDegil")}
                        </span>
                      )}
                    </TabloHucresi>
                    <TabloHucresi className="py-2 pr-3 whitespace-nowrap">
                      {kullanim.zaman}
                    </TabloHucresi>
                    <TabloHucresi className="py-2 pr-3">
                      <DurumRozeti durum={kullanim.durum} />
                      {kullanim.geriVerildi ? (
                        <span className="block text-kucuk text-soluk-yazi">
                          {metin("yonetim.kupon.kullanimlar.geriVerildi")}
                        </span>
                      ) : null}
                    </TabloHucresi>
                    <TabloHucresi className="py-2 pr-3 text-right whitespace-nowrap text-basari-yazi">
                      {doldur(metin("yonetim.kupon.kullanimlar.indirimYazisi"), {
                        tutar: kullanim.indirim,
                      })}
                    </TabloHucresi>
                    <TabloHucresi className="py-2 text-right whitespace-nowrap">
                      {kullanim.toplam}
                    </TabloHucresi>
                  </TabloSatiri>
                ))}
              </TabloGovdesi>
            </Tablo>
          </div>
        )}
        <Sayfalama
          sayfa={kullanimlar.sayfa}
          toplamSayfa={kullanimlar.sayfaSayisi}
          adres={(sayfa) => kuponAdresi(veri.kimlik, sayfa)}
          metinler={{
            etiket: metin("yonetim.kupon.kullanimlar.sayfalar"),
            onceki: metin("ortak.parca.oncekiSayfa"),
            sonraki: metin("ortak.parca.sonrakiSayfa"),
            sayfaAdi: (sira) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
            bosluk: metin("ortak.parca.atlananSayfalar"),
          }}
        />
        <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.kupon.kullanimlar.not")}</p>
      </Bolum>
    </div>
  );
}
