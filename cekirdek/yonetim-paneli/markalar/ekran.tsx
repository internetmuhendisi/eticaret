"use client";
// Markalar ve etiketler ekranı (kart 0261, karar 0160; Canlı Çarşı taslağı): iki kısa liste, her biri kendi kartında
// ve kendi "ekle" düğmesiyle. Marka ve etiket kısa listelerdir, ortak liste ekranına geçmez; 50 kaydı aşınca listenin
// üstünde ada göre süzen bir arama kutusu çıkar (taslağın notu). Marka formu yan penceredir: ad, adres adı,
// açıklama ve logo; etiket formunda yalnız ad ve adres adı vardır. Silme onay penceresiyle sorulur ve kaç ürünün
// bağlantısının kalkacağını söyler; ürünler silinmez.
//
// Her değişiklik hemen yayınlanır; sonuç bildirimle verilir, verisi sunucudan yeniden okunur (usePanelIslemi).
import { useEffect, useRef, useState } from "react";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart, KartBasligi, KartUstu } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { adresAdiUret } from "../../metinler/adres-adi";
import { aramaAnahtari } from "../../metinler/arama-anahtari";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import type { GorselSecenegi } from "../../moduller/duzen/secenekler";
import { etiketHataMetinleri } from "../../moduller/etiket/semalar";
import { markaHataMetinleri } from "../../moduller/marka/semalar";
import { kayitAdresleri } from "../../vitrin/adresler";
import { panelEylemleri } from "../eylemler";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu } from "../form/panel-formu";
import { GorselSecimi } from "../gorsel-secimi";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { KatalogGorseli } from "../katalog-gorseli";
import { kodluHataMetni, useKodluForm } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { type GrupTuru, grupUclari } from "./uclar";
import type { GrupSatiri, MarkalarEkraniVerisi } from "./veri";

// Arama kutusunun çıktığı kayıt sayısı (taslağın notu).
export const aramaSiniri = 50;

const hataMetinleri = { marka: markaHataMetinleri, etiket: etiketHataMetinleri } as const;

// İzinler sunucuda okunur (panelOturumu); ekran yalnız sorar.
export type GrupIzinleri = { degistir: boolean; sil: boolean };

export function MarkalarIcerigi({
  veri,
  izinler,
}: {
  veri: MarkalarEkraniVerisi;
  izinler: Record<GrupTuru, GrupIzinleri>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {veri.markalar === undefined ? null : (
        <GrupBolumu
          tur="marka"
          satirlar={veri.markalar}
          gorseller={veri.gorseller}
          izin={izinler.marka}
        />
      )}
      {veri.etiketler === undefined ? null : (
        <GrupBolumu tur="etiket" satirlar={veri.etiketler} gorseller={[]} izin={izinler.etiket} />
      )}
    </div>
  );
}

type Pencere = { tur: "ekle" } | { tur: "duzenle"; grup: GrupSatiri } | null;

function GrupBolumu({
  tur,
  satirlar,
  gorseller,
  izin,
}: {
  tur: GrupTuru;
  satirlar: GrupSatiri[];
  gorseller: GorselSecenegi[];
  izin: GrupIzinleri;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(kodluHataMetni(hataMetinleri[tur]));
  const [pencere, setPencere] = useState<Pencere>(null);
  const [onay, setOnay] = useState<GrupSatiri | null>(null);
  const [aranan, setAranan] = useState("");
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  const baslikKimligi = `${tur}-listesi`;
  // Sayfa yenilenince odaklanacak satır (kimliği; "" ise "ekle" düğmesi): silinen satır kalkar, odak sayfanın
  // başına düşmesin (menüler ekranıyla aynı).
  const odaklanacak = useRef<string | null>(null);
  const silindi = useRef(false);
  useEffect(() => {
    const hedef = odaklanacak.current;
    if (hedef === null || satirlar === undefined) return;
    const oge =
      hedef === ""
        ? document.querySelector<HTMLElement>(`[data-${tur}-ekle]`)
        : document.querySelector<HTMLElement>(`[data-${tur}="${hedef}"] button`);
    if (oge === null) return;
    odaklanacak.current = null;
    oge.focus();
  }, [satirlar, tur]);
  const anahtar = aramaAnahtari(aranan);
  const gorunenler =
    satirlar.length > aramaSiniri && anahtar !== ""
      ? satirlar.filter((satir) => aramaAnahtari(satir.ad).includes(anahtar))
      : satirlar;
  const duzenlenen = pencere?.tur === "duzenle" ? pencere.grup : undefined;
  return (
    <section aria-labelledby={baslikKimligi}>
      <Kart>
        <KartUstu className="items-center">
          <KartBasligi duzey={2} id={baslikKimligi}>
            {metin(`yonetim.${tur}.liste`)}
          </KartBasligi>
          {izin.degistir ? (
            // Kartın kendi eylemi: komut çubuğunun eylemiyle aynı ikon ve ad, kartta çerçeveli (taslak).
            <Dugme
              tur="cerceveli"
              {...{ [`data-${tur}-ekle`]: "" }}
              onClick={() => setPencere({ tur: "ekle" })}
            >
              <Ikon ad={panelEylemleri.ekle.ikon} />
              {doldur(metin(panelEylemleri.ekle.ad), { ne: metin(`yonetim.${tur}.tek`) })}
            </Dugme>
          ) : null}
        </KartUstu>
        {satirlar.length > aramaSiniri ? (
          <FormAlani etiket={metin(`yonetim.${tur}.ara`)}>
            {(alan) => (
              <GirisAlani
                {...alan}
                type="search"
                value={aranan}
                onChange={(olay) => setAranan(olay.target.value)}
              />
            )}
          </FormAlani>
        ) : null}
        {satirlar.length === 0 ? (
          <p className="text-soluk-yazi">
            {metin(izin.degistir ? `yonetim.${tur}.bos` : `yonetim.${tur}.bosIzinsiz`)}
          </p>
        ) : gorunenler.length === 0 ? (
          <p role="status" className="text-soluk-yazi">
            {metin(`yonetim.${tur}.sonucsuz`)}
          </p>
        ) : (
          <ul
            aria-labelledby={baslikKimligi}
            className="m-0 flex list-none flex-col rounded-orta border border-kenar p-0"
          >
            {gorunenler.map((satir, sira) => (
              <li
                key={satir.kimlik}
                {...{ [`data-${tur}`]: satir.kimlik }}
                className="flex min-w-0 items-center gap-3 border-b border-kenar p-3 last:border-b-0"
              >
                {tur === "marka" ? <KatalogGorseli gorsel={satir.logo} /> : null}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
                  <span className="font-kalin">{satir.ad}</span>
                  <span className="text-kucuk text-soluk-yazi">
                    {[
                      doldur(metin("yonetim.kategori.urunSayisi"), { sayi: String(satir.urun) }),
                      kayitAdresleri[tur](satir.adresAdi),
                    ].join(metin("yonetim.kategori.ayrac"))}
                  </span>
                </div>
                <div className="flex shrink-0 items-center">
                  {izin.degistir ? (
                    <IkonDugmesi
                      ikon="duzenle"
                      etiket={doldur(metin("yonetim.kategori.duzenle"), { ad: satir.ad })}
                      onClick={() => setPencere({ tur: "duzenle", grup: satir })}
                    />
                  ) : null}
                  {izin.sil ? (
                    <IkonDugmesi
                      ikon="sil"
                      etiket={doldur(metin("yonetim.kategori.silAdli"), { ad: satir.ad })}
                      onClick={() => {
                        // Silinince odak sonraki satıra, yoksa öncekine, yoksa "ekle" düğmesine geçer.
                        odaklanacak.current =
                          (gorunenler[sira + 1] ?? gorunenler[sira - 1])?.kimlik ?? "";
                        setOnay(satir);
                      }}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <YanPencere
          open={pencere !== null}
          onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
        >
          {pencere === null ? null : (
            <YanPencereIcerigi
              kapatEtiketi={metin("ortak.parca.kapat")}
              className="tablet:max-w-metin"
            >
              <YanPencereUstu>
                <YanPencereBasligi>
                  {metin(
                    duzenlenen === undefined
                      ? `yonetim.${tur}.form.yeni`
                      : `yonetim.${tur}.form.duzenle`,
                  )}
                </YanPencereBasligi>
                <YanPencereAciklamasi>
                  {duzenlenen === undefined ? metin(`yonetim.${tur}.form.aciklama`) : duzenlenen.ad}
                </YanPencereAciklamasi>
              </YanPencereUstu>
              {soru}
              <GrupFormu
                key={duzenlenen?.kimlik ?? "yeni"}
                tur={tur}
                {...(duzenlenen === undefined ? {} : { grup: duzenlenen })}
                gorseller={gorseller}
                islem={islem}
                kapat={() => {
                  if (duzenlenen !== undefined) odaklanacak.current = duzenlenen.kimlik;
                  kapat();
                }}
                vazgec={kapatmayiIste}
                degisince={degisince}
              />
            </YanPencereIcerigi>
          )}
        </YanPencere>
        <OnayPenceresi
          acik={onay !== null}
          acikDegisince={(acik) => {
            if (acik) return;
            if (!silindi.current) odaklanacak.current = null;
            silindi.current = false;
            setOnay(null);
          }}
          baslik={doldur(metin(`yonetim.${tur}.silOnay.baslik`), { ad: onay?.ad ?? "" })}
          aciklama={
            onay === null || onay.urun === 0
              ? metin("yonetim.kategori.silOnay.urunsuz")
              : doldur(metin(`yonetim.${tur}.silOnay.urunler`), { sayi: String(onay.urun) })
          }
          onayEtiketi={metin("yonetim.kategori.sil")}
          vazgecEtiketi={metin("ortak.islem.vazgec")}
          onayla={async () => {
            if (onay === null) return;
            const sonuc = await islem(
              grupUclari[tur].sil,
              { kimlik: onay.kimlik },
              `yonetim.${tur}.silindi`,
            );
            if (!sonuc.tamam) odaklanacak.current = null;
            silindi.current = sonuc.tamam;
          }}
        />
      </Kart>
    </section>
  );
}

function GrupFormu({
  tur,
  grup,
  gorseller,
  islem,
  kapat,
  vazgec,
  degisince,
}: {
  tur: GrupTuru;
  // Düzenlenen grup; yoksa yeni grup.
  grup?: GrupSatiri;
  gorseller: GorselSecenegi[];
  islem: ReturnType<typeof usePanelIslemi>;
  kapat: () => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const markaMi = tur === "marka";
  const [ad, setAd] = useState(grup?.ad ?? "");
  const [adresAdi, setAdresAdi] = useState(grup?.adresAdi ?? "");
  const [aciklama, setAciklama] = useState(grup?.aciklama ?? "");
  const [logo, setLogo] = useState<string | undefined>(grup?.logo);
  const [degisti, setDegisti] = useState(false);
  const { pf, kaydet } = useKodluForm(
    hataMetinleri[tur],
    ["ad", "adresAdi", ...(markaMi ? ["aciklama", "logo"] : [])],
    degisti,
  );
  const degistir =
    <T,>(ayarla: (deger: T) => void) =>
    (deger: T) => {
      ayarla(deger);
      setDegisti(true);
      degisince(true);
    };
  const ornekAdresAdi = adresAdi.trim() === "" ? adresAdiUret(ad) : adresAdi.trim();
  const gonder = () => {
    const adres = adresAdi.trim() === "" ? {} : { adresAdi };
    const aciklamaDegeri = aciklama.trim() === "" ? null : aciklama;
    void kaydet(
      () =>
        grup === undefined
          ? islem(
              grupUclari[tur].ekle,
              {
                grup: {
                  ad,
                  ...adres,
                  ...(markaMi
                    ? {
                        ...(aciklamaDegeri === null ? {} : { aciklama: aciklamaDegeri }),
                        ...(logo === undefined ? {} : { logo }),
                      }
                    : {}),
                },
              },
              `yonetim.${tur}.eklendi`,
              { formda: true },
            )
          : islem(
              grupUclari[tur].degistir,
              {
                kimlik: grup.kimlik,
                grup: {
                  ad,
                  ...adres,
                  ...(markaMi ? { aciklama: aciklamaDegeri, logo: logo ?? null } : {}),
                },
              },
              `yonetim.${tur}.kaydedildi`,
              { formda: true },
            ),
      kapat,
    );
  };
  return (
    <PanelFormu durum={pf} gonder={gonder}>
      <PanelAlani ad="ad" etiket={metin("yonetim.kategori.form.ad")} zorunlu>
        {(alan) => (
          <GirisAlani
            {...alan}
            required
            value={ad}
            onChange={(olay) => degistir(setAd)(olay.target.value)}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="adresAdi"
        etiket={metin("yonetim.kategori.form.adresAdi")}
        aciklama={
          ornekAdresAdi === ""
            ? metin("yonetim.kategori.form.adresAdiAciklamasiBos")
            : doldur(
                metin(
                  grup === undefined
                    ? "yonetim.kategori.form.adresAdiAciklamasiYeni"
                    : "yonetim.kategori.form.adresAdiAciklamasi",
                ),
                { adres: kayitAdresleri[tur](ornekAdresAdi) },
              )
        }
        zorunlu={false}
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            value={adresAdi}
            {...(grup === undefined && ad.trim() !== "" ? { placeholder: adresAdiUret(ad) } : {})}
            onChange={(olay) => degistir(setAdresAdi)(olay.target.value)}
          />
        )}
      </PanelAlani>
      {markaMi ? (
        <>
          <PanelAlani
            ad="aciklama"
            etiket={metin("yonetim.kategori.form.aciklama")}
            aciklama={metin("yonetim.marka.form.aciklamaAciklamasi")}
            zorunlu={false}
          >
            {(alan) => (
              <UzunMetinAlani
                {...alan}
                value={aciklama}
                onChange={(olay) => degistir(setAciklama)(olay.target.value)}
              />
            )}
          </PanelAlani>
          <AlanKabi ad="logo" etiket={metin("yonetim.marka.form.logo")}>
            <GorselSecimi
              etiket={metin("yonetim.marka.form.logo")}
              aciklama={metin("yonetim.marka.form.logoAciklamasi")}
              hata={pf.hata("logo")}
              gorseller={gorseller}
              deger={logo}
              degistir={(yeni) => degistir(setLogo)(typeof yeni === "string" ? yeni : undefined)}
              zorunlu={false}
            />
          </AlanKabi>
        </>
      ) : null}
      <KaydetCubugu vazgec={vazgec} kaydetEtiketi={metin("ortak.islem.kaydet")} />
    </PanelFormu>
  );
}
