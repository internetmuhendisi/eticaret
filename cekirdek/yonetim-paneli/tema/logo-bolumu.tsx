"use client";
// Tema ekranının logo bölümü (kart 0094, karar 0165; tema ayarlarının geri kalanı kart 0260): şimdiki logonun
// önizlemesi ve kaynağı, "Logo yükle" (ortak yükleme parçası: ilerleme ve iptal), yüklenen logo varsa "Logoyu kaldır"
// (onay penceresiyle). Yükleme hemen yayınlanır; sonuç bildirimle verilir, sayfanın verisi sunucudan yeniden okunur.
// Dosyanın reddi alanın altında yazar, odak yükleme düğmesine gider (ortak form yapısı, karar 0159). Logo mağaza
// ayarıdır: değiştirmek magaza-ayarlari.degistir ister, izni olmayan yalnız önizlemeyi görür.
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { DosyaYukleme } from "../../../bilesenler/parcalar/dosya-yukleme";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { yuklenebilenTurler } from "../../kayitlar/dosya";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { dosyaHatasiMetni, useDosyaYuklemesi } from "../dosya-yuklemesi";
import { AlanKabi, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { panelIstegi } from "../panel-istegi";
import { temaHatasiMetni, temaUclari } from "./hatalar";
import type { EkranLogosu } from "./veri";

// Taslağın görsel alanı: önizleme, kaynağın yazısı ve düğmeler tek kenarlı kutuda.
function LogoKutusu({
  logo,
  kaynakMetni,
  children,
}: {
  logo: EkranLogosu;
  kaynakMetni: string;
  children?: ReactNode;
}) {
  const metin = usePanelMetni();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-kucuk border border-alan-kenari p-2">
      {logo.adres === null ? null : (
        <div className="flex h-12 max-w-panel basis-full items-center justify-start tablet:basis-auto">
          {/* Logo sitenin kendi ucundan, özetli adresle gelir; Next'in görsel iyileştiricisinden geçmez. */}
          {/* biome-ignore lint/performance/noImgElement: logo ucunun kendi önbelleği ve etiketi var. */}
          <img
            src={logo.adres}
            alt={metin("yonetim.tema.logo.onizleme")}
            className="max-h-full max-w-full object-contain object-left"
          />
        </div>
      )}
      <p className="m-0 min-w-0 flex-1 basis-full text-kucuk tablet:basis-0">{kaynakMetni}</p>
      {children}
    </div>
  );
}

export function LogoBolumu({
  logo,
  enCokDosyaBoyutu,
  dosyaTurleri,
  degistirebilir,
}: {
  logo: EkranLogosu;
  enCokDosyaBoyutu: string;
  // Yüklenebilen türlerin adları ("JPEG, PNG veya WebP"), sunucudan.
  dosyaTurleri: string;
  // Yöneticinin magaza-ayarlari.degistir izni (sunucudan).
  degistirebilir: boolean;
}) {
  const metin = usePanelMetni();
  const router = useRouter();
  const pf = usePanelFormu();
  const { yukleme, yukle, iptalEt } = useDosyaYuklemesi();
  const [kaldirSorusu, setKaldirSorusu] = useState(false);
  const hata = pf.hata("dosya");
  const hataKimligi = "tema-logo-hata";
  const yukleKimligi = "tema-logo-yukle";
  const dosyaHatasi = (sonuc: Parameters<typeof dosyaHatasiMetni>[0]) =>
    doldur(metin(dosyaHatasiMetni(sonuc)), { boyut: enCokDosyaBoyutu, turler: dosyaTurleri });
  // Kaldırmadan sonra "Logoyu kaldır" düğmesi kalkar: odak sayfanın yeni verisi gelince yükleme düğmesine gider
  // (onay penceresi odağı kalkan düğmeye vermiş olur).
  const kaldirildi = useRef(false);
  useEffect(() => {
    if (!kaldirildi.current || logo.kaynak === "yuklenen") return;
    kaldirildi.current = false;
    document.getElementById(yukleKimligi)?.focus();
  }, [logo.kaynak]);

  const dosyaSecildi = async (dosya: File) => {
    pf.temizle();
    const sonuc = await yukle(temaUclari.logoYukle, dosya);
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      router.refresh();
      bildirimGoster("basari", metin("yonetim.tema.logo.yuklendi"));
      return;
    }
    if (sonuc.kod === "iptal") {
      bildirimGoster("bilgi", metin("yonetim.dosya.iptalEdildi"));
      return;
    }
    pf.hatalariGoster({ dosya: dosyaHatasi(sonuc) }, []);
  };

  const kaldir = async () => {
    const sonuc = await panelIstegi(temaUclari.logoKaldir, {});
    if (sonuc.tamam) {
      kaldirildi.current = true;
      router.refresh();
      bildirimGoster("basari", metin("yonetim.tema.logo.kaldirildi"));
      return;
    }
    bildirimGoster("tehlike", metin(temaHatasiMetni(sonuc)));
  };

  const kaynakMetni =
    logo.kaynak === "yuklenen"
      ? metin("yonetim.tema.logo.yuklenen")
      : logo.kaynak === "ilk"
        ? metin("yonetim.tema.logo.ilk")
        : metin("yonetim.tema.logo.yok");

  return (
    <section aria-labelledby="tema-logo" className="flex flex-col gap-3">
      <h2 id="tema-logo" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.tema.logo.baslik")}
      </h2>
      <Kart className="gap-3">
        {degistirebilir ? (
          <PanelFormu durum={pf} gonder={() => undefined} className="gap-0">
            <AlanKabi ad="dosya" etiket={metin("yonetim.tema.logo.alan")}>
              <LogoKutusu logo={logo} kaynakMetni={kaynakMetni}>
                <DosyaYukleme
                  id={yukleKimligi}
                  secEtiketi={metin("yonetim.tema.logo.yukle")}
                  ikon="yukle"
                  tur="sade"
                  kabul={yuklenebilenTurler}
                  onSecildi={([dosya]) => {
                    if (dosya !== undefined) void dosyaSecildi(dosya);
                  }}
                  yukleme={yukleme}
                  ilerlemeEtiketi={doldur(metin("yonetim.dosya.ilerleme"), {
                    ad: metin("yonetim.tema.logo.ad"),
                  })}
                  iptalEtiketi={metin("yonetim.dosya.iptal")}
                  onIptal={iptalEt}
                  {...(hata === undefined
                    ? {}
                    : { "aria-invalid": true, "aria-describedby": hataKimligi })}
                >
                  {logo.kaynak === "yuklenen" && yukleme === null ? (
                    <Dugme tur="sade" onClick={() => setKaldirSorusu(true)}>
                      {metin("yonetim.tema.logo.kaldir")}
                    </Dugme>
                  ) : null}
                </DosyaYukleme>
              </LogoKutusu>
              {hata === undefined ? null : (
                <p id={hataKimligi} className="m-0 mt-2 font-kalin text-tehlike-yazi">
                  {hata}
                </p>
              )}
            </AlanKabi>
          </PanelFormu>
        ) : (
          <LogoKutusu logo={logo} kaynakMetni={kaynakMetni} />
        )}
        <p className="m-0 text-kucuk text-soluk-yazi">
          {doldur(metin("yonetim.tema.logo.aciklama"), {
            boyut: enCokDosyaBoyutu,
            turler: dosyaTurleri,
          })}
        </p>
      </Kart>
      <OnayPenceresi
        acik={kaldirSorusu}
        acikDegisince={setKaldirSorusu}
        baslik={metin("yonetim.tema.logo.kaldirBaslik")}
        aciklama={metin("yonetim.tema.logo.kaldirAciklama")}
        onayEtiketi={metin("yonetim.tema.logo.kaldir")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={kaldir}
      />
    </section>
  );
}
