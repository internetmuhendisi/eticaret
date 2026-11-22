"use client";
// Tema ekranının logo bölümü (kart 0094, karar 0165; tema ayarlarının geri kalanı kart 0260): şimdiki logonun
// önizlemesi ve kaynağı, "Logo yükle" (ortak yükleme parçası: ilerleme ve iptal), yüklenen logo varsa "Logoyu kaldır"
// (onay penceresiyle). Yükleme hemen yayınlanır; sonuç bildirimle verilir, sayfanın verisi sunucudan yeniden okunur.
// Dosyanın reddi alanın altında yazar, odak yükleme düğmesine gider (ortak form yapısı, karar 0159). Logo mağaza
// ayarıdır: değiştirmek magaza-ayarlari.degistir ister, izni olmayan yalnız önizlemeyi görür.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { DosyaYukleme } from "../../../bilesenler/parcalar/dosya-yukleme";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Kart, KartAciklamasi } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { yuklenebilenTurler } from "../../kayitlar/dosya";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { dosyaHatasiMetni, useDosyaYuklemesi } from "../dosya-yuklemesi";
import { AlanKabi, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { panelIstegi } from "../panel-istegi";
import type { EkranLogosu } from "./veri";

export const logoUclari = { yukle: "logo-yukle", kaldir: "logo-kaldir" } as const;

export function LogoBolumu({
  logo,
  enCokDosyaBoyutu,
  degistirebilir,
}: {
  logo: EkranLogosu;
  enCokDosyaBoyutu: string;
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
  const dosyaHatasi = (sonuc: Parameters<typeof dosyaHatasiMetni>[0]) =>
    doldur(metin(dosyaHatasiMetni(sonuc)), { boyut: enCokDosyaBoyutu });

  const dosyaSecildi = async (dosya: File) => {
    pf.temizle();
    const sonuc = await yukle(logoUclari.yukle, dosya);
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
    const sonuc = await panelIstegi(logoUclari.kaldir, {});
    if (sonuc.tamam) {
      router.refresh();
      bildirimGoster("basari", metin("yonetim.tema.logo.kaldirildi"));
      return;
    }
    bildirimGoster("tehlike", dosyaHatasi(sonuc));
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
      <Kart className="gap-4">
        <KartAciklamasi>
          {doldur(metin("yonetim.tema.logo.aciklama"), { boyut: enCokDosyaBoyutu })}
        </KartAciklamasi>
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
          {logo.adres === null ? null : (
            <div className="flex h-20 w-full max-w-panel items-center justify-center rounded-orta border border-kenar bg-zemin p-3">
              {/* Logo sitenin kendi ucundan, özetli adresle gelir; Next'in görsel iyileştiricisinden geçmez. */}
              {/* biome-ignore lint/performance/noImgElement: logo ucunun kendi önbelleği ve etiketi var. */}
              <img
                src={logo.adres}
                alt={metin("yonetim.tema.logo.onizleme")}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          <p className="m-0">{kaynakMetni}</p>
        </div>
        {degistirebilir ? (
          <PanelFormu durum={pf} gonder={() => undefined} className="gap-3">
            <AlanKabi ad="dosya" etiket={metin("yonetim.tema.logo.alan")}>
              <div className="flex flex-wrap items-start gap-3">
                <DosyaYukleme
                  secEtiketi={metin("yonetim.tema.logo.yukle")}
                  kabul={yuklenebilenTurler}
                  onSecildi={(dosya) => void dosyaSecildi(dosya)}
                  yukleme={yukleme}
                  ilerlemeEtiketi={doldur(metin("yonetim.dosya.ilerleme"), {
                    ad: metin("yonetim.tema.logo.ad"),
                  })}
                  iptalEtiketi={metin("yonetim.dosya.iptal")}
                  onIptal={iptalEt}
                  {...(hata === undefined
                    ? {}
                    : { "aria-invalid": true, "aria-describedby": hataKimligi })}
                />
                {logo.kaynak === "yuklenen" && yukleme === null ? (
                  <Dugme tur="sade" onClick={() => setKaldirSorusu(true)}>
                    {metin("yonetim.tema.logo.kaldir")}
                  </Dugme>
                ) : null}
              </div>
              {hata === undefined ? null : (
                <p id={hataKimligi} className="m-0 mt-2 font-kalin text-tehlike-yazi">
                  {hata}
                </p>
              )}
            </AlanKabi>
          </PanelFormu>
        ) : null}
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
