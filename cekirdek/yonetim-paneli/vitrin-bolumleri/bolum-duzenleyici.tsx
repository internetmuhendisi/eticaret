"use client";
// Bölümün düzenleme formu ve kaydı (kart 0142): görünüm seçimi ve tariften çıkan alanlar (BolumFormu), "Kaydet ve
// yayınla". Vitrin bölümleri ekranının penceresi ve Slider kısayolunun sayfası aynı formu kullanır. Kayıt
// kullananın verdiği işle yapılır (ekleme ya da değişiklik ucu); ortak form yapısıyla (kart 0259) sunucunun alan
// hataları alanların altında, öteki hatalar formun başındaki özette görünür; kaydedilmemiş değişiklikle çıkarken sorulur.
import { useEffect, useRef, useState } from "react";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { usePanelMetni } from "../../metinler/panel-metni";
import type { BolumDegerleri, BolumTarifi } from "../../vitrin/bolum-kutuphanesi/tarif";
import { BolumFormu, type BolumFormuSecenekleri } from "../bolum-formu";
import { AlanKabi, KaydetCubugu, PanelFormu, usePanelFormu } from "../form/panel-formu";
import type { PanelHatasi, PanelSonucu } from "../panel-istegi";
import { alanHatalari, islemHatasiMetni } from "./hatalar";

export type BolumKaydi = { gorunum: string; degerler: BolumDegerleri };

// Yeni bölümün ilk değerleri: en az öğe isteyen listeler o kadar boş öğeyle açılır (yeni slider bir slaytla).
export const yeniDegerler = (tarif: BolumTarifi): BolumDegerleri =>
  Object.fromEntries(
    Object.entries(tarif.alanlar).flatMap(([kod, alan]) =>
      alan.tur === "liste" && alan.enAz > 0
        ? [[kod, Array.from({ length: alan.enAz }, () => ({}))]]
        : [],
    ),
  );

export function BolumDuzenleyici({
  tarif,
  ilk,
  secenekler,
  kaydet,
  kaydedince,
  vazgec,
  sayfada = false,
  degisince,
}: {
  tarif: BolumTarifi;
  // Bölümün bugünkü görünümü ve değerleri; yeni bölümde ilk görünüm ve boş değerler.
  ilk: BolumKaydi;
  secenekler: BolumFormuSecenekleri;
  kaydet: (kayit: BolumKaydi) => Promise<PanelSonucu<unknown>>;
  kaydedince: () => void;
  // Verilirse formun altında Vazgeç durur (pencere).
  vazgec?: () => void;
  // Form pencerede değil sayfada (Slider sayfası, kart 0169): alt çubuk kenara uzanmaz, sayfanın altına yapışır.
  sayfada?: boolean;
  // Kaydedilmemiş değişiklik olup olmadığı: pencere kapatılmadan önce sorar.
  degisince?: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const [gorunum, setGorunum] = useState(ilk.gorunum);
  const degerler = useRef<BolumDegerleri>(ilk.degerler);
  const [degisti, setDegisti] = useState(false);
  // Değişikliğin sırası: kayıt sürerken yazılan değişiklik kayıttan sonra da "kaydedilmemiş" kalır (kart 0227).
  const surum = useRef(0);
  const degistir = () => {
    surum.current += 1;
    setDegisti(true);
    // Çizimi beklemeden: hemen basılan Escape de sorsun.
    degisince?.(true);
  };
  // Ortak form yapısı (kart 0259): hata (alanın yoluyla), özet, odak, çıkarken soru ("Kaydet ve çık" bu formu
  // kaydeder).
  const pf = usePanelFormu({ degisti, kaydet: () => gonder() });

  // biome-ignore lint/correctness/useExhaustiveDependencies: kullananın verdiği işlev her çizimde yenidir.
  useEffect(() => degisince?.(degisti), [degisti]);

  const gonder = async (): Promise<boolean> => {
    const gonderilen = surum.current;
    const sonuc = await pf.isle(() => kaydet({ gorunum, degerler: degerler.current }));
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      if (surum.current === gonderilen) setDegisti(false);
      pf.temizle();
      kaydedince();
      return true;
    }
    const hata: PanelHatasi = sonuc;
    const alanlar = Object.fromEntries(
      Object.entries(alanHatalari(hata)).map(([yol, anahtar]) => [yol, metin(anahtar)]),
    );
    // Alanı olan hata alanın altında; yoksa işlemin genel hatası özette.
    pf.hatalariGoster(
      alanlar,
      Object.keys(alanlar).length > 0 ? [] : [metin(islemHatasiMetni(hata))],
    );
    return false;
  };

  return (
    <PanelFormu
      durum={pf}
      gonder={async () => {
        await gonder();
      }}
    >
      {tarif.gorunumler.length > 1 ? (
        <AlanKabi ad="gorunum" etiket={metin("yonetim.bolumler.form.gorunum")}>
          <SecenekGrubu
            baslik={metin("yonetim.bolumler.form.gorunum")}
            etiket={metin("yonetim.bolumler.form.gorunum")}
            ogeler={tarif.gorunumler.map((secenek) => ({
              deger: secenek.kod,
              ad: metin(secenek.ad),
            }))}
            deger={gorunum}
            onDegerDegisti={(yeni) => {
              setGorunum(yeni);
              degistir();
            }}
            secilemezEki=""
          />
        </AlanKabi>
      ) : null}
      <BolumFormu
        tarif={tarif}
        ilkDegerler={ilk.degerler}
        secenekler={secenekler}
        hatalar={pf.hatalar}
        degisince={(yeni) => {
          degerler.current = yeni;
          degistir();
        }}
      />
      <KaydetCubugu
        sayfada={sayfada}
        kaydetEtiketi={metin("yonetim.bolumler.form.kaydet")}
        {...(vazgec === undefined ? {} : { vazgec })}
      />
    </PanelFormu>
  );
}
