"use client";
// Özellikler ekranı (kart 0261, karar 0160; Canlı Çarşı taslağı): ürün sayfasındaki "Özellikler" tablosunun satırları,
// tablodaki sırayla. Sıra sürüklenerek ya da klavyeyle değişir ve hemen kaydedilir. Özelliğin formu yan penceredir:
// ad, tür, birim (yalnız sayıda), seçenekler (yalnız listede; eklenir, adı değişir, sıralanır, çıkarılır) ve
// "Filtrede kullanılsın". Form tek kayıtla yazılır (ozellik-kaydet): biri yazılamazsa hiçbiri yazılmaz. Ürünlerde
// değeri olan özelliğin türü değiştirilemez, pencere nedenini söyler (servisin kuralı). Değeri olan seçenek
// çıkarılınca kayıttan önce kaç üründen kalkacağı sorulur. Silme onay penceresiyle sorulur.
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { type OzellikTuru, ozellikSinirlari, ozellikTurleri } from "../../kayitlar/ozellik";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { ozellikHataMetinleri } from "../../moduller/ozellik/semalar";
import { EylemDugmesi } from "../eylem-dugmesi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { kodluHataMetni, useKodluForm } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { ozellikUclari } from "./uclar";
import type { OzellikSatiri } from "./veri";

type Pencere = { tur: "ekle" } | { tur: "duzenle"; ozellik: OzellikSatiri } | null;

type Baglam = {
  ozellikler: OzellikSatiri[];
  degistirebilir: boolean;
  silebilir: boolean;
  pencere: Pencere;
  setPencere: (pencere: Pencere) => void;
  islem: ReturnType<typeof usePanelIslemi>;
  // Sayfa yenilenince odaklanacak satır (kimliği; "" ise "Özellik ekle"), menüler ekranıyla aynı.
  odaklanacak: { current: string | null };
};

const ekleIsareti = "data-ozellik-ekle";
const hataMetni = kodluHataMetni(ozellikHataMetinleri);
const turAdi = (tur: OzellikTuru): MetinAnahtari => `yonetim.ozellik.tur.${tur}`;

const OzelliklerBaglami = createContext<Baglam | null>(null);
const useOzellikler = (): Baglam => {
  const baglam = useContext(OzelliklerBaglami);
  if (baglam === null) throw new Error("OzelliklerSaglayici dışında kullanılamaz.");
  return baglam;
};

export function OzelliklerSaglayici({
  ozellikler,
  degistirebilir,
  silebilir,
  children,
}: {
  ozellikler: OzellikSatiri[];
  degistirebilir: boolean;
  silebilir: boolean;
  children: ReactNode;
}) {
  const [pencere, setPencere] = useState<Pencere>(null);
  const islem = usePanelIslemi(hataMetni);
  const odaklanacak = useRef<string | null>(null);
  useEffect(() => {
    const hedef = odaklanacak.current;
    if (hedef === null || ozellikler === undefined) return;
    const oge =
      hedef === ""
        ? document.querySelector<HTMLElement>(`[${ekleIsareti}]`)
        : document.querySelector<HTMLElement>(`[data-anahtar="${hedef}"] button`);
    if (oge === null) return;
    odaklanacak.current = null;
    oge.focus();
  }, [ozellikler]);
  return (
    <OzelliklerBaglami.Provider
      value={{ ozellikler, degistirebilir, silebilir, pencere, setPencere, islem, odaklanacak }}
    >
      {children}
    </OzelliklerBaglami.Provider>
  );
}

// Komut çubuğunun asıl eylemi: özellik ekle.
export function OzelliklerEylemleri() {
  const metin = usePanelMetni();
  const { setPencere } = useOzellikler();
  return (
    <EylemDugmesi
      eylem="ekle"
      ne={metin("yonetim.ozellik.tek")}
      asil
      onClick={() => setPencere({ tur: "ekle" })}
      {...{ [ekleIsareti]: "" }}
    />
  );
}

function OzellikSatiriGorunusu({
  ozellik,
  silmeyiSor,
}: {
  ozellik: OzellikSatiri;
  silmeyiSor: (ozellik: OzellikSatiri) => void;
}) {
  const metin = usePanelMetni();
  const { degistirebilir, silebilir, setPencere } = useOzellikler();
  const tur =
    ozellik.tur === "sayi" && ozellik.birim !== undefined
      ? `${metin(turAdi(ozellik.tur))}${metin("yonetim.kategori.ayrac")}${ozellik.birim}`
      : metin(turAdi(ozellik.tur));
  const altBilgi = [
    ...(ozellik.secenekler.length > 0
      ? [
          ozellik.secenekler
            .map((secenek) => secenek.ad)
            .join(metin("yonetim.ozellik.secenekAyraci")),
        ]
      : []),
    doldur(metin("yonetim.ozellik.urunSayisi"), { sayi: String(ozellik.urun) }),
  ].join(metin("yonetim.kategori.ayrac"));
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
        <span className="flex flex-wrap items-center gap-2 font-kalin">
          {ozellik.ad}
          <Rozet tur="ikincil">{tur}</Rozet>
          {ozellik.filtrede ? (
            <Rozet tur="cerceveli">{metin("yonetim.ozellik.filtrede")}</Rozet>
          ) : null}
        </span>
        <span className="text-kucuk text-soluk-yazi">{altBilgi}</span>
      </div>
      <div className="flex shrink-0 items-center">
        {degistirebilir ? (
          <IkonDugmesi
            ikon="duzenle"
            etiket={doldur(metin("yonetim.kategori.duzenle"), { ad: ozellik.ad })}
            onClick={() => setPencere({ tur: "duzenle", ozellik })}
          />
        ) : null}
        {silebilir ? (
          <IkonDugmesi
            ikon="sil"
            etiket={doldur(metin("yonetim.kategori.silAdli"), { ad: ozellik.ad })}
            onClick={() => silmeyiSor(ozellik)}
          />
        ) : null}
      </div>
    </div>
  );
}

export function OzelliklerIcerigi() {
  const metin = usePanelMetni();
  const { ozellikler, degistirebilir, islem, odaklanacak } = useOzellikler();
  const [yerel, setYerel] = useState<OzellikSatiri[] | null>(null);
  const sonSiralama = useRef(0);
  const [onay, setOnay] = useState<OzellikSatiri | null>(null);
  const silindi = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sunucunun yeni verisi gelince yerel sıra bırakılır.
  useEffect(() => setYerel(null), [ozellikler]);
  const gosterilen = yerel ?? ozellikler;
  const silmeyiSor = (ozellik: OzellikSatiri) => {
    // Silinince odak sonraki satıra, yoksa öncekine, yoksa "Özellik ekle"ye geçer.
    const sira = gosterilen.indexOf(ozellik);
    odaklanacak.current = (gosterilen[sira + 1] ?? gosterilen[sira - 1])?.kimlik ?? "";
    setOnay(ozellik);
  };
  const etiket = metin("yonetim.ozellik.listeEtiketi");
  return (
    <div className="flex flex-col gap-3">
      {ozellikler.length === 0 ? (
        <BosHal
          ikon="ozellikler"
          baslik={metin("yonetim.ozellik.bos.baslik")}
          aciklama={metin(
            degistirebilir ? "yonetim.ozellik.bos.metin" : "yonetim.ozellik.bos.metinIzinsiz",
          )}
        />
      ) : degistirebilir ? (
        <>
          <Uyari tur="bilgi">{metin("yonetim.ozellik.siralamaBilgisi")}</Uyari>
          <SiralanabilirListe
            ogeler={gosterilen}
            anahtar={(ozellik) => ozellik.kimlik}
            ad={(ozellik) => ozellik.ad}
            etiket={etiket}
            metinler={siralamaMetinleri(metin)}
            siralaninca={(yeni) => {
              setYerel(yeni);
              sonSiralama.current += 1;
              const bu = sonSiralama.current;
              void islem(
                ozellikUclari.sirala,
                { kimlikler: yeni.map((ozellik) => ozellik.kimlik) },
                "yonetim.ozellik.siralandi",
              ).then((sonuc) => {
                if (!sonuc.tamam && bu === sonSiralama.current) setYerel(null);
              });
            }}
            satir={(ozellik) => <OzellikSatiriGorunusu ozellik={ozellik} silmeyiSor={silmeyiSor} />}
          />
        </>
      ) : (
        <ol
          aria-label={etiket}
          className="m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0"
        >
          {gosterilen.map((ozellik) => (
            <li
              key={ozellik.kimlik}
              data-anahtar={ozellik.kimlik}
              className="flex border-b border-kenar p-3 last:border-b-0"
            >
              <OzellikSatiriGorunusu ozellik={ozellik} silmeyiSor={silmeyiSor} />
            </li>
          ))}
        </ol>
      )}
      <OzellikPenceresi />
      <OnayPenceresi
        acik={onay !== null}
        acikDegisince={(acik) => {
          if (acik) return;
          if (!silindi.current) odaklanacak.current = null;
          silindi.current = false;
          setOnay(null);
        }}
        baslik={doldur(metin("yonetim.ozellik.silOnay.baslik"), { ad: onay?.ad ?? "" })}
        aciklama={
          onay === null || onay.urun === 0
            ? metin("yonetim.ozellik.silOnay.urunsuz")
            : doldur(metin("yonetim.ozellik.silOnay.urunler"), { sayi: String(onay.urun) })
        }
        onayEtiketi={metin("yonetim.kategori.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          if (onay === null) return;
          const sonuc = await islem(
            ozellikUclari.sil,
            { kimlik: onay.kimlik },
            "yonetim.ozellik.silindi",
          );
          if (!sonuc.tamam) odaklanacak.current = null;
          silindi.current = sonuc.tamam;
        }}
      />
    </div>
  );
}

function OzellikPenceresi() {
  const metin = usePanelMetni();
  const { pencere, setPencere } = useOzellikler();
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  const duzenlenen = pencere?.tur === "duzenle" ? pencere.ozellik : undefined;
  return (
    <YanPencere
      open={pencere !== null}
      onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
    >
      {pencere === null ? null : (
        <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} className="tablet:max-w-metin">
          <YanPencereUstu>
            <YanPencereBasligi>
              {metin(
                duzenlenen === undefined
                  ? "yonetim.ozellik.form.yeni"
                  : "yonetim.ozellik.form.duzenle",
              )}
            </YanPencereBasligi>
            <YanPencereAciklamasi>
              {duzenlenen === undefined ? metin("yonetim.ozellik.form.aciklama") : duzenlenen.ad}
            </YanPencereAciklamasi>
          </YanPencereUstu>
          {soru}
          <OzellikFormu
            key={duzenlenen?.kimlik ?? "yeni"}
            {...(duzenlenen === undefined ? {} : { ozellik: duzenlenen })}
            kapat={kapat}
            vazgec={kapatmayiIste}
            degisince={degisince}
          />
        </YanPencereIcerigi>
      )}
    </YanPencere>
  );
}

// Formdaki seçenek: var olan seçeneğin kimliği vardır; yeni seçeneğin yalnız ekrandaki anahtarı.
type FormSecenegi = { anahtar: string; kimlik?: string; ad: string };

let yeniSecenekSayaci = 0;
const yeniSecenek = (): FormSecenegi => {
  yeniSecenekSayaci += 1;
  return { anahtar: `yeni-${yeniSecenekSayaci}`, ad: "" };
};

const formAlanlari = ["ad", "tur", "birim", "secenekler", "filtrede"] as const;
// Eklemede seçeneğin hatası seçeneğin sırasıyla gelir (secenekler.<sıra>), kayıtta adıyla (secenekler.<sıra>.ad):
// ikisi de seçeneğin ad alanına bağlanır.
const secenekAlani = (alan: string) => (/^secenekler\.\d+$/.test(alan) ? `${alan}.ad` : alan);

function OzellikFormu({
  ozellik,
  kapat,
  vazgec,
  degisince,
}: {
  // Düzenlenen özellik; yoksa yeni özellik.
  ozellik?: OzellikSatiri;
  kapat: () => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const { islem, odaklanacak } = useOzellikler();
  const [ad, setAd] = useState(ozellik?.ad ?? "");
  const [tur, setTur] = useState<OzellikTuru>(ozellik?.tur ?? "liste");
  const [birim, setBirim] = useState(ozellik?.birim ?? "");
  const [filtrede, setFiltrede] = useState(ozellik?.filtrede ?? false);
  const [secenekler, setSecenekler] = useState<FormSecenegi[]>(
    ozellik?.secenekler.map(({ kimlik, ad: secenekAdi }) => ({
      anahtar: kimlik,
      kimlik,
      ad: secenekAdi,
    })) ?? [yeniSecenek()],
  );
  const [degisti, setDegisti] = useState(false);
  // Değeri olan seçenek çıkarılınca kayıttan önce sorulur: kaç ürünün değeri kalkacak.
  const [silinecekUrun, setSilinecekUrun] = useState(0);
  const odaklanacakSecenek = useRef<string | null>(null);
  const { pf, kaydet } = useKodluForm(ozellikHataMetinleri, formAlanlari, degisti, secenekAlani);
  const degistir =
    <T,>(ayarla: (deger: T) => void) =>
    (deger: T) => {
      ayarla(deger);
      setDegisti(true);
      degisince(true);
    };
  // Yeni eklenen seçeneğin alanına odak verilir.
  // biome-ignore lint/correctness/useExhaustiveDependencies: seçenekler çizildikten sonra odak verilir.
  useEffect(() => {
    const hedef = odaklanacakSecenek.current;
    if (hedef === null) return;
    odaklanacakSecenek.current = null;
    document.querySelector<HTMLInputElement>(`[data-secenek="${hedef}"] input`)?.focus();
  }, [secenekler]);
  const turDegisemez = ozellik?.degeriVar === true;
  const liste = tur === "liste";
  // Kayıtta değeri kalkacak ürünler: listeden çıkan (ya da tür listeden çıkınca bütün) seçeneklerin ürünleri.
  const kalanlar = new Set(liste ? secenekler.flatMap((secenek) => secenek.kimlik ?? []) : []);
  const kalkacakUrun = (ozellik?.secenekler ?? [])
    .filter((secenek) => !kalanlar.has(secenek.kimlik))
    .reduce((toplam, secenek) => toplam + secenek.urun, 0);
  const doluSecenekler = liste ? secenekler.filter((secenek) => secenek.ad.trim() !== "") : [];

  const yaz = () => {
    const birimDegeri = tur === "sayi" && birim.trim() !== "" ? birim : null;
    void kaydet(
      () =>
        ozellik === undefined
          ? islem(
              ozellikUclari.ekle,
              {
                ozellik: {
                  ad,
                  tur,
                  ...(birimDegeri === null ? {} : { birim: birimDegeri }),
                  filtrede,
                  secenekler: doluSecenekler.map((secenek) => secenek.ad),
                },
              },
              "yonetim.ozellik.eklendi",
              { formda: true },
            )
          : islem(
              ozellikUclari.kaydet,
              {
                kimlik: ozellik.kimlik,
                ozellik: {
                  ad,
                  tur,
                  birim: birimDegeri,
                  filtrede,
                  secenekler: doluSecenekler.map(({ kimlik, ad: secenekAdi }) =>
                    kimlik === undefined ? { ad: secenekAdi } : { kimlik, ad: secenekAdi },
                  ),
                },
              },
              "yonetim.ozellik.kaydedildi",
              { formda: true },
            ),
      () => {
        if (ozellik !== undefined) odaklanacak.current = ozellik.kimlik;
        kapat();
      },
    );
  };
  const gonder = () => {
    if (kalkacakUrun > 0) {
      setSilinecekUrun(kalkacakUrun);
      return;
    }
    yaz();
  };
  const turHatasi = pf.hata("tur");
  const secenekSirasi = (secenek: FormSecenegi) => doluSecenekler.indexOf(secenek);

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
      <AlanKabi ad="tur" etiket={metin("yonetim.ozellik.form.tur")}>
        <SecenekGrubu
          baslik={metin("yonetim.ozellik.form.tur")}
          etiket={metin("yonetim.ozellik.form.tur")}
          ogeler={ozellikTurleri.map((deger) => ({
            deger,
            ad: metin(turAdi(deger)),
            ...(turDegisemez && deger !== ozellik?.tur ? { secilemez: true } : {}),
          }))}
          deger={tur}
          onDegerDegisti={(yeni) => degistir(setTur)(yeni as OzellikTuru)}
          secilemezEki={metin("yonetim.ozellik.form.secilemez")}
          aciklama={metin(
            turDegisemez
              ? "yonetim.ozellik.form.turDegisemez"
              : "yonetim.ozellik.form.turAciklamasi",
          )}
          {...(turHatasi === undefined ? {} : { hata: turHatasi })}
        />
      </AlanKabi>
      {tur === "sayi" ? (
        <PanelAlani
          ad="birim"
          etiket={metin("yonetim.ozellik.form.birim")}
          aciklama={metin("yonetim.ozellik.form.birimAciklamasi")}
          zorunlu={false}
        >
          {(alan) => (
            <GirisAlani
              {...alan}
              value={birim}
              onChange={(olay) => degistir(setBirim)(olay.target.value)}
            />
          )}
        </PanelAlani>
      ) : null}
      {liste ? (
        <AlanKabi
          ad="secenekler"
          etiket={metin("yonetim.ozellik.form.secenekler")}
          className="flex flex-col gap-2"
        >
          <span className="font-kalin">{metin("yonetim.ozellik.form.secenekler")}</span>
          <span className="text-kucuk text-soluk-yazi">
            {metin("yonetim.ozellik.form.seceneklerAciklamasi")}
          </span>
          {pf.hata("secenekler") === undefined ? null : (
            <Uyari tur="tehlike">{pf.hata("secenekler")}</Uyari>
          )}
          {secenekler.length > 0 ? (
            <SiralanabilirListe
              ogeler={secenekler}
              anahtar={(secenek) => secenek.anahtar}
              ad={(secenek) =>
                secenek.ad.trim() === ""
                  ? doldur(metin("yonetim.ozellik.form.secenekSirasi"), {
                      sira: String(secenekler.indexOf(secenek) + 1),
                    })
                  : secenek.ad
              }
              etiket={metin("yonetim.ozellik.form.secenekler")}
              metinler={siralamaMetinleri(metin)}
              siralaninca={degistir(setSecenekler)}
              satir={(secenek) => {
                const sira = secenekler.indexOf(secenek);
                const dolu = secenekSirasi(secenek);
                const adi = doldur(metin("yonetim.ozellik.form.secenekSirasi"), {
                  sira: String(sira + 1),
                });
                return (
                  <div
                    data-secenek={secenek.anahtar}
                    className="flex min-w-0 flex-1 items-end gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <PanelAlani
                        ad={`secenekler.${dolu < 0 ? `bos-${sira}` : dolu}.ad`}
                        etiket={adi}
                      >
                        {(alan) => (
                          <GirisAlani
                            {...alan}
                            value={secenek.ad}
                            onChange={(olay) =>
                              degistir(setSecenekler)(
                                secenekler.map((oteki) =>
                                  oteki === secenek ? { ...oteki, ad: olay.target.value } : oteki,
                                ),
                              )
                            }
                          />
                        )}
                      </PanelAlani>
                    </div>
                    <IkonDugmesi
                      ikon="sil"
                      etiket={doldur(metin("yonetim.ozellik.form.secenegiCikar"), {
                        ad: secenek.ad.trim() === "" ? adi : secenek.ad,
                      })}
                      onClick={() => {
                        // Çıkan seçeneğin yerine odak sonrakine, yoksa öncekine, yoksa "Seçenek ekle"ye geçer.
                        const komsu = secenekler[sira + 1] ?? secenekler[sira - 1];
                        odaklanacakSecenek.current = komsu?.anahtar ?? null;
                        if (komsu === undefined)
                          document.querySelector<HTMLElement>("[data-secenek-ekle]")?.focus();
                        degistir(setSecenekler)(secenekler.filter((oteki) => oteki !== secenek));
                      }}
                    />
                  </div>
                );
              }}
            />
          ) : null}
          <Dugme
            tur="cerceveli"
            className="self-start"
            data-secenek-ekle=""
            disabled={secenekler.length >= ozellikSinirlari.secenek}
            onClick={() => {
              const yeni = yeniSecenek();
              odaklanacakSecenek.current = yeni.anahtar;
              degistir(setSecenekler)([...secenekler, yeni]);
            }}
          >
            <Ikon ad="ekle" />
            {metin("yonetim.ozellik.form.secenekEkle")}
          </Dugme>
        </AlanKabi>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-kalin">{metin("yonetim.ozellik.form.filtrede")}</span>
          <span className="text-kucuk text-soluk-yazi">
            {metin("yonetim.ozellik.form.filtredeAciklamasi")}
          </span>
        </div>
        <Anahtar
          etiket={metin("yonetim.ozellik.form.filtrede")}
          acikYazisi={metin("yonetim.ozellik.form.acik")}
          kapaliYazisi={metin("yonetim.ozellik.form.kapali")}
          checked={filtrede}
          onCheckedChange={(acik) => degistir(setFiltrede)(acik)}
        />
      </div>
      <KaydetCubugu vazgec={vazgec} kaydetEtiketi={metin("ortak.islem.kaydet")} />
      <OnayPenceresi
        acik={silinecekUrun > 0}
        acikDegisince={(acik) => {
          if (!acik) setSilinecekUrun(0);
        }}
        baslik={metin("yonetim.ozellik.secenekSilOnay.baslik")}
        aciklama={doldur(metin("yonetim.ozellik.secenekSilOnay.metin"), {
          sayi: String(silinecekUrun),
        })}
        onayEtiketi={metin("ortak.islem.kaydet")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          yaz();
        }}
      />
    </PanelFormu>
  );
}
