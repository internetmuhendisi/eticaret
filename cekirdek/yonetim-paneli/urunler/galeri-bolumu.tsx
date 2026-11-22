"use client";
// Ürün ekranının "Görseller ve video" bölümü (kart 0266, karar 0073 ve 0162; taslak: planlar/tasarim-yonu/panel.html,
// u-galeri). Galeri ürünün tek formunun alanıdır, "Kaydet"le gider (galeri-formu.ts):
// - Öğeler ızgarada kartlardır (SiralanabilirListe, duzen="izgara"): küçük görsel ya da video kapağı, ilk görselde "Ana
//   görsel", alternatif metin (yoksa "Alternatif metin eksik"), küçük görsel uyarısı; altta tutamak, öne ve arkaya al,
//   Düzenle (alternatif metin penceresi) ve Sil. Ana görseli değiştirmek görseli öne almaktır.
// - Bırakma alanı ve "Bilgisayardan seç" birden çok görseli sırayla yükler (ortak yükleme parçası, yükleme ucu); her
//   dosya yüklenirken kendi kartında ilerleme ve İptal görünür. Reddedilen dosya adı ve nedeniyle yazılır, öteki
//   dosyalar sürer. Yüklenen görsel formda dosyasıyla durur, galeriye kayıtla bağlanır.
// - "Video bağla" penceresi bağlantıyı ve başlığı alır; sitenin kabul ettiği video siteleri denetlenir, önizleme
//   çerezsiz oynatıcıyla yalnız "Önizle"ye basınca yüklenir.
// - Hata öğenin kartının altında yazar (galeri.ogeler.<sıra>), sınır galerinin kendisinde (galeri).
import { useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { DosyaYukleme } from "../../../bilesenler/parcalar/dosya-yukleme";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { IlerlemeCubugu } from "../../../bilesenler/parcalar/ilerleme-cubugu";
import {
  Pencere,
  PencereAciklamasi,
  PencereBasligi,
  PencereIcerigi,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { yuklenebilenTurler } from "../../kayitlar/dosya";
import { galeriOnerilenEnAz, galeriSinirlari } from "../../kayitlar/gorsel";
import type { VideoSitesi } from "../../kayitlar/video-siteleri";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { oynaticiAdresi, videoAdresiniCoz, videoSitesiIzinliMi } from "../../moduller/urun/video";
import { dosyaHatasiMetni, useDosyaYuklemesi } from "../dosya-yuklemesi";
import {
  AlanKabi,
  KaydetCubugu,
  PanelAlani,
  PanelFormu,
  usePanelFormu,
  usePanelFormuBaglami,
} from "../form/panel-formu";
import { panelGorseliAdresi } from "../gorsel-secimi";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { anaGorselAnahtari, type GaleriFormOgesi, kucukGorselMi } from "./galeri-formu";

const siteAdlari: Record<VideoSitesi, MetinAnahtari> = {
  youtube: "yonetim.urunEkrani.galeri.site.youtube",
  vimeo: "yonetim.urunEkrani.galeri.site.vimeo",
};

export const galeriUclari = { yukle: "urun-gorseli-yukle" } as const;

type Yuklenen = { anahtar: string; ad: string };
type Reddedilen = { anahtar: string; metin: string };

// Odak verilecek düğmelerin kimlikleri: pencere kapanınca açan düğmeye, silmeden sonra komşu kartın Düzenle'sine
// (yoksa yükleme düğmesine) dönülür; Radix'in kendi dönüşü yeniden çizilen listede odağı gövdede bırakıyordu
// (tarayıcıda ölçüldü).
const duzenleKimligi = (anahtar: string) => `galeri-duzenle-${anahtar}`;
const secKimligi = "galeri-sec";
const videoKimligi = "galeri-video-bagla";

let sayac = 0;
const yeniAnahtar = () => {
  sayac += 1;
  return `yeni:${Date.now()}:${sayac}`;
};

export function GaleriBolumu({
  galeri,
  degistir,
  kaldirildi,
  izinli,
  videoSiteleri,
  dosyaSinirlari,
}: {
  galeri: GaleriFormOgesi[];
  degistir: (galeri: GaleriFormOgesi[]) => void;
  // Kayıtlı öğe kaldırıldı: birleşimlerin bu öğeyi seçmiş görseli formda boşaltılır.
  kaldirildi: (kimlik: string) => void;
  izinli: boolean;
  videoSiteleri: readonly VideoSitesi[];
  dosyaSinirlari: { boyut: string; turler: string };
}) {
  const metin = usePanelMetni();
  const { hata } = usePanelFormuBaglami();
  const { yukleme, yukle, iptalEt } = useDosyaYuklemesi();
  const [sira, setSira] = useState<Yuklenen[]>([]);
  const [reddedilenler, setReddedilenler] = useState<Reddedilen[]>([]);
  const [duzenlenen, setDuzenlenen] = useState<GaleriFormOgesi | null>(null);
  const [videoAcik, setVideoAcik] = useState(false);
  // Yükleme sırasında formun son hâli: her yüklenen görsel bir öncekinin üstüne eklenir.
  const son = useRef(galeri);
  son.current = galeri;
  const durdur = useRef(false);
  const anaGorsel = anaGorselAnahtari(galeri);
  // Çizimden sonra odaklanacak düğme.
  const [odak, setOdak] = useState<string | null>(null);
  useEffect(() => {
    if (odak === null) return;
    document.getElementById(odak)?.focus();
    setOdak(null);
  }, [odak]);

  const adi = (oge: GaleriFormOgesi) =>
    oge.alternatifMetin.trim() !== ""
      ? oge.alternatifMetin
      : oge.tur === "video" && oge.site !== undefined
        ? doldur(metin("yonetim.urunEkrani.galeri.video"), { site: metin(siteAdlari[oge.site]) })
        : metin("yonetim.urunEkrani.galeri.adsizGorsel");

  const dosyalarSecildi = async (dosyalar: File[]) => {
    setReddedilenler([]);
    durdur.current = false;
    const bos = galeriSinirlari.oge - son.current.length;
    const sigan = dosyalar.slice(0, Math.max(bos, 0));
    const reddet = (ad: string, neden: string) =>
      setReddedilenler((onceki) => [
        ...onceki,
        {
          anahtar: yeniAnahtar(),
          metin: doldur(metin("yonetim.urunEkrani.galeri.reddedildi"), { ad, neden }),
        },
      ]);
    for (const dosya of dosyalar.slice(sigan.length)) {
      reddet(
        dosya.name,
        doldur(metin("yonetim.urunEkrani.galeri.sinir"), { sinir: String(galeriSinirlari.oge) }),
      );
    }
    const kuyruk = sigan.map((dosya) => ({ anahtar: yeniAnahtar(), ad: dosya.name, dosya }));
    setSira(kuyruk.map(({ anahtar, ad }) => ({ anahtar, ad })));
    for (const { anahtar, ad, dosya } of kuyruk) {
      if (durdur.current) break;
      const sonuc = await yukle<{ dosya: string; genislik: number; yukseklik: number }>(
        galeriUclari.yukle,
        dosya,
      );
      setSira((onceki) => onceki.filter((oge) => oge.anahtar !== anahtar));
      if (sonuc === undefined) continue;
      if (sonuc.tamam) {
        degistir([
          ...son.current,
          {
            anahtar,
            tur: "gorsel",
            alternatifMetin: "",
            dosya: sonuc.veri.dosya,
            genislik: sonuc.veri.genislik,
            yukseklik: sonuc.veri.yukseklik,
          },
        ]);
      } else if (sonuc.kod === "iptal") {
        durdur.current = true;
      } else {
        reddet(
          ad,
          doldur(metin(dosyaHatasiMetni(sonuc)), {
            boyut: dosyaSinirlari.boyut,
            turler: dosyaSinirlari.turler,
          }),
        );
      }
    }
    setSira([]);
  };

  const kaldir = (oge: GaleriFormOgesi) => {
    const sirasi = galeri.indexOf(oge);
    const komsu = galeri[sirasi + 1] ?? galeri[sirasi - 1];
    degistir(galeri.filter((aday) => aday.anahtar !== oge.anahtar));
    setOdak(komsu === undefined ? secKimligi : duzenleKimligi(komsu.anahtar));
    if (oge.kimlik !== undefined) kaldirildi(oge.kimlik);
  };

  const galeriHatasi = hata("galeri");
  const metinler = siralamaMetinleri(metin, { duzen: "izgara" });

  return (
    <>
      <div className="flex flex-col gap-4">
        {galeri.length === 0 && sira.length === 0 ? (
          <p className="m-0 text-soluk-yazi">{metin("yonetim.urunEkrani.galeri.bos")}</p>
        ) : null}
        {galeri.length > 0 ? (
          <SiralanabilirListe
            duzen="izgara"
            ogeler={galeri}
            anahtar={(oge) => oge.anahtar}
            ad={adi}
            siralaninca={degistir}
            etiket={metin("yonetim.urunEkrani.galeri.liste")}
            metinler={metinler}
            // Öğenin hatası satırın alanıdır: odak satırın "Düzenle" düğmesine gider.
            satirVerisi={(oge) => ({
              "data-alan": `galeri.ogeler.${galeri.indexOf(oge)}`,
              "data-alan-etiketi": adi(oge),
            })}
            satir={(oge) => {
              const sirasi = galeri.indexOf(oge);
              const ogeHatasi = hata(`galeri.ogeler.${sirasi}`);
              return (
                <>
                  <div className="relative">
                    {oge.tur === "gorsel" && oge.dosya !== undefined ? (
                      // biome-ignore lint/performance/noImgElement: panel görseli ucundan, boyutu kayıtlıdır.
                      <img
                        src={panelGorseliAdresi(oge.dosya)}
                        alt={oge.alternatifMetin}
                        className="aspect-square w-full rounded-kucuk bg-yuzey object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-kucuk bg-yuzey text-soluk-yazi">
                        <Ikon ad="oynat" />
                      </div>
                    )}
                    {oge.anahtar === anaGorsel ? (
                      <Rozet tur="koyu" className="absolute top-2 left-2">
                        {metin("yonetim.urunEkrani.galeri.ana")}
                      </Rozet>
                    ) : null}
                  </div>
                  {oge.alternatifMetin.trim() === "" ? (
                    <span className="mt-2 block truncate text-kucuk font-kalin text-tehlike-yazi">
                      {metin("yonetim.urunEkrani.galeri.altMetinEksik")}
                    </span>
                  ) : (
                    <span className="mt-2 block truncate text-kucuk text-soluk-yazi">
                      {oge.tur === "video" && oge.site !== undefined
                        ? `${doldur(metin("yonetim.urunEkrani.galeri.video"), { site: metin(siteAdlari[oge.site]) })}: `
                        : ""}
                      {oge.alternatifMetin}
                    </span>
                  )}
                  {kucukGorselMi(oge) ? (
                    <span className="mt-1 block text-kucuk text-uyari-yazi">
                      {metin("yonetim.urunEkrani.galeri.kucuk")}
                    </span>
                  ) : null}
                  {ogeHatasi === undefined ? null : (
                    <span
                      id={`galeri-hata-${oge.anahtar}`}
                      className="mt-1 block text-kucuk font-kalin text-tehlike-yazi"
                    >
                      {ogeHatasi}
                    </span>
                  )}
                </>
              );
            }}
            eylemler={(oge) => {
              const sirasi = galeri.indexOf(oge);
              const hatali = hata(`galeri.ogeler.${sirasi}`) !== undefined;
              return izinli ? (
                <>
                  <IkonDugmesi
                    ikon="duzenle"
                    etiket={doldur(metin("yonetim.urunEkrani.galeri.duzenle"), { ad: adi(oge) })}
                    id={duzenleKimligi(oge.anahtar)}
                    data-hata-odagi=""
                    {...(hatali
                      ? { "aria-invalid": true, "aria-describedby": `galeri-hata-${oge.anahtar}` }
                      : {})}
                    onClick={() => setDuzenlenen(oge)}
                  />
                  <IkonDugmesi
                    ikon="sil"
                    etiket={doldur(metin("yonetim.urunEkrani.galeri.sil"), { ad: adi(oge) })}
                    onClick={() => kaldir(oge)}
                  />
                </>
              ) : null;
            }}
          />
        ) : null}
        {sira.length > 0 ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 tablet:grid-cols-4">
            {sira.map((oge, i) => (
              <li
                key={oge.anahtar}
                className="flex min-w-0 flex-col justify-center gap-2 rounded-orta border border-kenar bg-zemin p-2"
              >
                <span className="truncate text-kucuk text-soluk-yazi">{oge.ad}</span>
                {i === 0 && yukleme !== null ? (
                  <>
                    <IlerlemeCubugu
                      oran={yukleme.oran}
                      etiket={doldur(metin("yonetim.urunEkrani.galeri.yukleniyor"), { ad: oge.ad })}
                    />
                    <Dugme
                      tur="sade"
                      onClick={() => {
                        durdur.current = true;
                        iptalEt();
                      }}
                    >
                      {metin("yonetim.dosya.iptal")}
                    </Dugme>
                  </>
                ) : (
                  <span className="text-kucuk text-soluk-yazi">
                    {doldur(metin("yonetim.urunEkrani.galeri.sirada"), { ad: oge.ad })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <AlanKabi ad="galeri" etiket={metin("yonetim.urunEkrani.bolum.galeri")}>
          {izinli ? (
            <DosyaYukleme
              coklu
              birakma={{
                baslik: metin("yonetim.urunEkrani.galeri.birak"),
                aciklama: doldur(metin("yonetim.urunEkrani.galeri.birakAciklamasi"), {
                  turler: dosyaSinirlari.turler,
                  boyut: dosyaSinirlari.boyut,
                  enAz: String(galeriOnerilenEnAz),
                }),
              }}
              id={secKimligi}
              secEtiketi={metin("yonetim.urunEkrani.galeri.sec")}
              tur="sade"
              kabul={yuklenebilenTurler}
              onSecildi={(dosyalar) => void dosyalarSecildi(dosyalar)}
              // İlerleme ve İptal yüklenen dosyanın kartındadır.
              yukleme={null}
              disabled={sira.length > 0}
              ilerlemeEtiketi={metin("yonetim.urunEkrani.galeri.sec")}
              iptalEtiketi={metin("yonetim.dosya.iptal")}
              onIptal={iptalEt}
              {...(galeriHatasi === undefined
                ? {}
                : { "aria-invalid": true, "aria-describedby": "galeri-hatasi" })}
            >
              {videoSiteleri.length > 0 ? (
                <Dugme
                  id={videoKimligi}
                  tur="sade"
                  onClick={() => setVideoAcik(true)}
                  disabled={sira.length > 0}
                >
                  <Ikon ad="oynat" />
                  {metin("yonetim.urunEkrani.galeri.videoBagla")}
                </Dugme>
              ) : null}
            </DosyaYukleme>
          ) : null}
          {galeriHatasi === undefined ? null : (
            <p id="galeri-hatasi" className="m-0 font-kalin text-tehlike-yazi">
              {galeriHatasi}
            </p>
          )}
        </AlanKabi>
        {reddedilenler.length > 0 ? (
          <Uyari tur="tehlike">
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {reddedilenler.map((oge) => (
                <li key={oge.anahtar}>{oge.metin}</li>
              ))}
            </ul>
          </Uyari>
        ) : null}
        <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.urunEkrani.galeri.ipucu")}</p>
      </div>
      <DuzenlePenceresi
        oge={duzenlenen}
        donus={duzenlenen === null ? "" : duzenleKimligi(duzenlenen.anahtar)}
        kapat={() => setDuzenlenen(null)}
        uygula={(alternatifMetin) => {
          if (duzenlenen === null) return;
          degistir(
            galeri.map((oge) =>
              oge.anahtar === duzenlenen.anahtar ? { ...oge, alternatifMetin } : oge,
            ),
          );
          setDuzenlenen(null);
        }}
      />
      <VideoPenceresi
        acik={videoAcik}
        donus={videoKimligi}
        kapat={() => setVideoAcik(false)}
        videoSiteleri={videoSiteleri}
        ekle={(oge) => {
          degistir([...galeri, oge]);
          setVideoAcik(false);
        }}
      />
    </>
  );
}

// Pencere kapanınca odak açan düğmeye verilir (donus: düğmenin kimliği).
const odagiVer = (donus: string) => (olay: Event) => {
  olay.preventDefault();
  document.getElementById(donus)?.focus();
};

function DuzenlePenceresi({
  oge,
  donus,
  kapat,
  uygula,
}: {
  oge: GaleriFormOgesi | null;
  donus: string;
  kapat: () => void;
  uygula: (alternatifMetin: string) => void;
}) {
  const metin = usePanelMetni();
  const { kapat: kapatVeTemizle, kapatmayiIste, degisince, soru } = useKapatmaSorusu(kapat);
  return (
    <Pencere open={oge !== null} onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}>
      {oge === null ? null : (
        <PencereIcerigi
          kapatEtiketi={metin("ortak.parca.kapat")}
          onCloseAutoFocus={odagiVer(donus)}
        >
          <PencereUstu>
            <PencereBasligi>
              {metin(
                oge.tur === "video"
                  ? "yonetim.urunEkrani.galeri.duzenleVideoBaslik"
                  : "yonetim.urunEkrani.galeri.duzenleBaslik",
              )}
            </PencereBasligi>
          </PencereUstu>
          {soru}
          <MetinFormu
            ilk={oge.alternatifMetin}
            video={oge.tur === "video"}
            uygula={(deger) => {
              uygula(deger);
              kapatVeTemizle();
            }}
            vazgec={kapatmayiIste}
            degisince={degisince}
          />
        </PencereIcerigi>
      )}
    </Pencere>
  );
}

function MetinFormu({
  ilk,
  video,
  uygula,
  vazgec,
  degisince,
}: {
  ilk: string;
  video: boolean;
  uygula: (deger: string) => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const [deger, setDeger] = useState(ilk);
  const pf = usePanelFormu({ degisti: deger !== ilk });
  const gonder = () => {
    if (deger.trim() === "") {
      pf.hatalariGoster(
        {
          alternatifMetin: metin(
            video
              ? "yonetim.urunEkrani.galeri.videoBaslikGerekli"
              : "yonetim.urunEkrani.galeri.altMetinGerekli",
          ),
        },
        [],
      );
      return;
    }
    uygula(deger.trim());
  };
  return (
    <PanelFormu durum={pf} gonder={gonder} className="gap-4">
      <PanelAlani
        ad="alternatifMetin"
        etiket={metin(
          video ? "yonetim.urunEkrani.galeri.videoBaslik" : "yonetim.urunEkrani.galeri.altMetin",
        )}
        aciklama={metin(
          video
            ? "yonetim.urunEkrani.galeri.videoBaslikAciklamasi"
            : "yonetim.urunEkrani.galeri.altMetinAciklamasi",
        )}
        zorunlu
      >
        {(baglanti) => (
          <GirisAlani
            {...baglanti}
            autoComplete="off"
            maxLength={galeriSinirlari.alternatifMetin}
            value={deger}
            onChange={(olay) => {
              setDeger(olay.target.value);
              degisince(olay.target.value !== ilk);
            }}
          />
        )}
      </PanelAlani>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.urunEkrani.galeri.uygula")} vazgec={vazgec} />
    </PanelFormu>
  );
}

function VideoPenceresi({
  acik,
  donus,
  kapat,
  videoSiteleri,
  ekle,
}: {
  acik: boolean;
  donus: string;
  kapat: () => void;
  videoSiteleri: readonly VideoSitesi[];
  ekle: (oge: GaleriFormOgesi) => void;
}) {
  const metin = usePanelMetni();
  const { kapat: kapatVeTemizle, kapatmayiIste, degisince, soru } = useKapatmaSorusu(kapat);
  return (
    <Pencere open={acik} onOpenChange={(durum) => (durum ? undefined : kapatmayiIste())}>
      {acik ? (
        <PencereIcerigi
          kapatEtiketi={metin("ortak.parca.kapat")}
          onCloseAutoFocus={odagiVer(donus)}
        >
          <PencereUstu>
            <PencereBasligi>{metin("yonetim.urunEkrani.galeri.videoPencere")}</PencereBasligi>
            <PencereAciklamasi>
              {metin("yonetim.urunEkrani.galeri.videoPencereAciklamasi")}
            </PencereAciklamasi>
          </PencereUstu>
          {soru}
          <VideoFormu
            videoSiteleri={videoSiteleri}
            ekle={(oge) => {
              ekle(oge);
              kapatVeTemizle();
            }}
            vazgec={kapatmayiIste}
            degisince={degisince}
          />
        </PencereIcerigi>
      ) : null}
    </Pencere>
  );
}

function VideoFormu({
  videoSiteleri,
  ekle,
  vazgec,
  degisince,
}: {
  videoSiteleri: readonly VideoSitesi[];
  ekle: (oge: GaleriFormOgesi) => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const [baglanti, setBaglanti] = useState("");
  const [baslik, setBaslik] = useState("");
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const pf = usePanelFormu({ degisti: baglanti !== "" || baslik !== "" });
  const coz = () => {
    const video = videoAdresiniCoz(baglanti.trim());
    if (video === undefined) return { hata: metin("yonetim.urun.hata.video-adresi-gecersiz") };
    if (!videoSitesiIzinliMi(video.site, videoSiteleri)) {
      return { hata: metin("yonetim.urun.hata.video-sitesi-izinsiz") };
    }
    return { video };
  };
  const gonder = () => {
    const sonuc = coz();
    const hatalar: Record<string, string> = {};
    if ("hata" in sonuc && sonuc.hata !== undefined) hatalar["baglanti"] = sonuc.hata;
    if (baslik.trim() === "")
      hatalar["baslik"] = metin("yonetim.urunEkrani.galeri.videoBaslikGerekli");
    if (Object.keys(hatalar).length > 0 || !("video" in sonuc) || sonuc.video === undefined) {
      pf.hatalariGoster(hatalar, []);
      return;
    }
    ekle({
      anahtar: yeniAnahtar(),
      tur: "video",
      alternatifMetin: baslik.trim(),
      video: baglanti.trim(),
      site: sonuc.video.site,
      videoKimligi: sonuc.video.kimlik,
    });
  };
  const degistir = (yeniBaglanti: string, yeniBaslik: string) => {
    setBaglanti(yeniBaglanti);
    setBaslik(yeniBaslik);
    degisince(yeniBaglanti !== "" || yeniBaslik !== "");
  };
  return (
    <PanelFormu durum={pf} gonder={gonder} className="gap-4">
      <PanelAlani
        ad="baglanti"
        etiket={metin("yonetim.urunEkrani.galeri.baglanti")}
        aciklama={doldur(metin("yonetim.urunEkrani.galeri.baglantiAciklamasi"), {
          siteler: videoSiteleri.map((site) => metin(siteAdlari[site])).join(", "),
        })}
        zorunlu
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            type="url"
            autoComplete="off"
            value={baglanti}
            onChange={(olay) => {
              setOnizleme(null);
              degistir(olay.target.value, baslik);
            }}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="baslik"
        etiket={metin("yonetim.urunEkrani.galeri.videoBaslik")}
        aciklama={metin("yonetim.urunEkrani.galeri.videoBaslikAciklamasi")}
        zorunlu
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            autoComplete="off"
            maxLength={galeriSinirlari.alternatifMetin}
            value={baslik}
            onChange={(olay) => degistir(baglanti, olay.target.value)}
          />
        )}
      </PanelAlani>
      <div className="flex flex-col gap-3">
        <div>
          <Dugme
            tur="cerceveli"
            onClick={() => {
              const sonuc = coz();
              if ("video" in sonuc && sonuc.video !== undefined) {
                setOnizleme(oynaticiAdresi(sonuc.video));
                return;
              }
              pf.hatalariGoster({ baglanti: sonuc.hata ?? "" }, []);
            }}
          >
            {metin("yonetim.urunEkrani.galeri.onizle")}
          </Dugme>
        </div>
        {onizleme === null ? null : (
          <iframe
            src={onizleme}
            title={doldur(metin("yonetim.urunEkrani.galeri.onizleme"), {
              ad: baslik.trim() === "" ? metin("yonetim.urunEkrani.galeri.baglanti") : baslik,
            })}
            className="aspect-square w-full rounded-kucuk border-0 bg-yuzey"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.urunEkrani.galeri.ekle")} vazgec={vazgec} />
    </PanelFormu>
  );
}
